# PureNorth Backup v15 — 2026-07-09

## Innehall
- RUT-fix: 50% av arbetskostnad INKL moms (Skatteverket) i alla kalkylatorer + backend
- Skador & Olyckor: CRUD, foto (base64), koppling till bokningar, PDF + Excel export, kopplat till Ekonomi
- Kreditfaktura: obligatorisk anledning, speglar alla rader (inkl paminnelseavgift), KREDITFAKTURA-titel + banner i PDF
- Fakturalas: endast utkast kan redigeras/tas bort. Krediterad faktura kan ej skickas/paminnas/andra status
- RUT-rapport exkluderar krediterade fakturor
- Sakerhet: rate limiting, XSS-sanering, CORS last, JWT 24h

---

## backend/server.py
```py
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response, Form, File, UploadFile
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated
from datetime import datetime, timezone, timedelta, date as DateClass
from bson import ObjectId
from io import BytesIO
from xml.sax.saxutils import quoteattr
import base64
import bcrypt
import resend
import jwt
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(str)]


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=404, detail="Hittades inte")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


import re as _re
def sanitize_text(value, max_len=2000):
    """Strip HTML tags, angle brackets and control chars; cap length."""
    if not isinstance(value, str):
        return value
    v = _re.sub(r"<[^>]*>", "", value)          # remove HTML tags
    v = v.replace("<", "").replace(">", "")      # remove stray angle brackets
    v = _re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", v)  # control chars
    return v.strip()[:max_len]

def sanitize_payload(d: dict, fields: list, max_len=2000) -> dict:
    for f in fields:
        if f in d and isinstance(d[f], str):
            d[f] = sanitize_text(d[f], max_len)
    return d

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class BookingCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=1)
    address: Optional[str] = None
    kvm: Optional[str] = None
    services: List[str] = Field(default_factory=list)
    preferred_date: Optional[str] = None
    other_description: Optional[str] = None


class Booking(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    email: str
    phone: str
    address: Optional[str] = None
    kvm: Optional[str] = None
    services: List[str] = Field(default_factory=list)
    preferred_date: Optional[str] = None
    other_description: Optional[str] = None
    status: str = "new"
    created_at: str


class StatusUpdate(BaseModel):
    status: str


class ReviewCreate(BaseModel):
    name: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=1)


class Review(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    rating: int
    text: str
    approved: bool = False
    created_at: str


class ApproveUpdate(BaseModel):
    approved: bool


# ---- Employees ----
class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    color: str = "#166534"
    hourly_rate: float = 0
    personnummer: Optional[str] = None
    employment_type: str = "fastanstalld"  # "fastanstalld" or "vikarie"
    skatt_typ: Optional[str] = "A-skatt"  # A-skatt | F-skatt
    fskatt_nr: Optional[str] = None
    fskatt_verified: Optional[bool] = False


class Employee(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    phone: Optional[str] = None
    color: str = "#166534"
    skatt_typ: Optional[str] = "A-skatt"
    fskatt_nr: Optional[str] = None
    fskatt_verified: Optional[bool] = False
    hourly_rate: float = 0
    personnummer: Optional[str] = None
    employment_type: str = "fastanstalld"
    created_at: str


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None
    skatt_typ: Optional[str] = None
    fskatt_nr: Optional[str] = None
    fskatt_verified: Optional[bool] = None
    hourly_rate: Optional[float] = None
    personnummer: Optional[str] = None
    employment_type: Optional[str] = None


# ---- Shifts (Schema) ----
class ShiftCreate(BaseModel):
    employee_id: str
    date: str
    start_time: str
    end_time: str
    title: str = Field(..., min_length=1)
    note: Optional[str] = None
    booking_id: Optional[str] = None


class ShiftUpdate(BaseModel):
    employee_id: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    title: Optional[str] = None
    note: Optional[str] = None
    booking_id: Optional[str] = None


class Shift(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    employee_id: str
    date: str
    start_time: str
    end_time: str
    title: str
    note: Optional[str] = None
    booking_id: Optional[str] = None
    created_at: str


# ---- Frånvaro (Absence) ----
class AbsenceCreate(BaseModel):
    employee_id: str
    type: str = Field(..., min_length=1)
    start_date: str
    end_date: str
    note: Optional[str] = None


class AbsenceUpdate(BaseModel):
    employee_id: Optional[str] = None
    type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    note: Optional[str] = None


class Absence(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    employee_id: str
    type: str
    start_date: str
    end_date: str
    note: Optional[str] = None
    created_at: str


# ---- Utlägg (Expenses) ----
class ExpenseCreate(BaseModel):
    employee_id: str
    date: str
    amount: float = Field(..., ge=0)
    antal: Optional[int] = 1
    unit_price: Optional[float] = None
    moms_rate: float = 0.0
    category: str = "Övrigt"
    description: Optional[str] = None
    receipt_image: Optional[str] = None


class ExpenseUpdate(BaseModel):
    employee_id: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    antal: Optional[int] = None
    unit_price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    moms_rate: Optional[int] = None
    receipt_image: Optional[str] = None


class Expense(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    employee_id: str
    date: str
    amount: float
    category: str = "Övrigt"
    description: Optional[str] = None
    status: str = "pending"
    created_at: str
    moms_rate: Optional[float] = 0.0
    antal: Optional[int] = 1
    unit_price: Optional[float] = None
    receipt_image: Optional[str] = None


# ---- Payroll settings (OB-tillägg + salary codes for PAXML) ----
class PayrollSettings(BaseModel):
    # OB1: Kväll mån-lör 18:00-24:00 (25.69 kr/tim per Serviceentreprenadavtalet 2025)
    ob1_label: str = "Kväll (mån–lör 18–24)"
    ob1_extra: float = 25.69
    ob1_days: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5])
    ob1_start: str = "18:00"
    ob1_end: str = "23:59"
    # OB2: Helg lördag-söndag hela dagen (54.08 kr/tim per Serviceentreprenadavtalet 2025)
    ob2_label: str = "Helg (lör–sön)"
    ob2_extra: float = 54.08
    ob2_days: List[int] = Field(default_factory=lambda: [5, 6])
    ob2_start: str = "00:00"
    ob2_end: str = "23:59"
    code_normal: str = "100"
    code_ob1: str = "210"
    code_ob2: str = "220"
    code_expense: str = "710"
    company_orgnr: Optional[str] = None


async def get_payroll_settings_obj() -> PayrollSettings:
    doc = await db.settings.find_one({"_key": "payroll"})
    if not doc:
        return PayrollSettings()
    doc.pop("_id", None)
    doc.pop("_key", None)
    return PayrollSettings(**doc)


# ---- Invoice settings ----
class InvoiceSettings(BaseModel):
    company_name: str = "PureNorth Städ"
    company_orgnr: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    bankgiro: Optional[str] = None
    plusgiro: Optional[str] = None
    iban: Optional[str] = None
    vat_rate: float = 25.0
    payment_terms_days: int = 30
    next_invoice_number: int = 1001
    company_logo: Optional[str] = None  # base64 encoded image


async def get_invoice_settings_obj() -> InvoiceSettings:
    doc = await db.settings.find_one({"_key": "invoice"})
    if not doc:
        return InvoiceSettings()
    doc.pop("_id", None)
    doc.pop("_key", None)
    return InvoiceSettings(**doc)


async def get_next_invoice_number() -> int:
    doc = await db.settings.find_one({"_key": "invoice"})
    if not doc:
        defaults = InvoiceSettings().model_dump()
        defaults["_key"] = "invoice"
        await db.settings.insert_one(defaults)
        doc = defaults
    number = doc.get("next_invoice_number", 1001)
    await db.settings.update_one({"_key": "invoice"}, {"$set": {"next_invoice_number": number + 1}})
    return number


# ---- Invoices (Fakturering) ----
class InvoiceItemModel(BaseModel):
    service: Optional[str] = None
    description: str = Field(..., min_length=1)
    quantity: float = 1
    unit_price: float = 0
    is_material: bool = False
    kvm: Optional[float] = None


class InvoiceCreate(BaseModel):
    booking_id: Optional[str] = None
    customer_name: str = Field(..., min_length=1)
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_personnummer: Optional[str] = None
    customer_type: str = "private"
    rut_eligible: bool = True
    items: List[InvoiceItemModel]
    note: Optional[str] = None
    due_date: Optional[str] = None
    due_days: Optional[int] = None
    notes: Optional[str] = None
    subtotal: Optional[float] = None
    rut_deduction: Optional[float] = None
    vat_amount: Optional[float] = None
    total_amount: Optional[float] = None
    customer_pays: Optional[float] = None
    is_credit_note: Optional[bool] = False
    credits_invoice_number: Optional[int] = None
    credit_reason: Optional[str] = None


class InvoiceStatusUpdate(BaseModel):
    status: str


class Invoice(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    invoice_number: int
    booking_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_personnummer: Optional[str] = None
    customer_type: str = "private"
    rut_eligible: bool = True
    items: List[InvoiceItemModel]
    note: Optional[str] = None
    due_date: str
    status: str = "draft"
    labor_total: float = 0.0
    material_total: float = 0.0
    subtotal: float = 0.0
    vat_amount: float = 0.0
    total_amount: float = 0.0
    rut_deduction: float = 0.0
    customer_pays: float = 0.0
    created_at: str
    paid_at: Optional[str] = None
    reminder_count: Optional[int] = 0
    last_reminder_at: Optional[str] = None
    is_credit_note: Optional[bool] = False
    credits_invoice_number: Optional[int] = None
    credited: Optional[bool] = False
    credit_reason: Optional[str] = None


def calc_invoice_amounts(items: list, rut_eligible: bool, customer_type: str, vat_rate: float):
    labor_total = sum(i["quantity"] * i["unit_price"] for i in items if not i.get("is_material"))
    material_total = sum(i["quantity"] * i["unit_price"] for i in items if i.get("is_material"))
    subtotal = labor_total + material_total
    vat_amount = subtotal * vat_rate / 100.0
    total_amount = subtotal + vat_amount
    rut_deduction = 0.0
    if rut_eligible and customer_type == "private":
        # RUT = 50% of labor cost INCLUDING vat (Skatteverket rule)
        labor_incl_vat = labor_total * (1 + vat_rate / 100.0)
        rut_deduction = round(labor_incl_vat * 0.5, 2)
    customer_pays = total_amount - rut_deduction
    return {
        "labor_total": round(labor_total, 2),
        "material_total": round(material_total, 2),
        "subtotal": round(subtotal, 2),
        "vat_amount": round(vat_amount, 2),
        "total_amount": round(total_amount, 2),
        "rut_deduction": rut_deduction,
        "customer_pays": round(customer_pays, 2),
    }


def build_invoice_pdf(inv: dict, settings: InvoiceSettings) -> bytes:
    from reportlab.platypus import Image as RLImage
    from reportlab.lib.utils import ImageReader

    buf = BytesIO()
    page_w, page_h = A4
    inv_num = inv.get("invoice_number", "")
    customer = inv.get("customer_name", "")
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"Faktura #{inv_num} - {customer}",
        author=settings.company_name or "PureNorth Städ",
        subject="Faktura")
    styles = getSampleStyleSheet()

    def ps(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    label_style  = ps("lbl",  fontSize=7,  textColor=colors.HexColor("#888888"), leading=10, spaceAfter=1)
    value_style  = ps("val",  fontSize=9,  textColor=colors.HexColor("#1a1a1a"), leading=12)
    bold_style   = ps("bld",  fontSize=9,  textColor=colors.HexColor("#1a1a1a"), leading=12, fontName="Helvetica-Bold")
    small_style  = ps("sml",  fontSize=7.5,textColor=colors.HexColor("#555555"), leading=10)
    footer_style = ps("ftr",  fontSize=7,  textColor=colors.HexColor("#999999"), leading=9)

    elements = []

    # ── HEADER: logo left, FAKTURA right ────────────────────────────────────
    logo_cell = ""
    if settings.company_logo:
        try:
            logo_data = base64.b64decode(settings.company_logo.split(",")[-1])
            logo_buf = BytesIO(logo_data)
            ir = ImageReader(logo_buf)
            iw, ih = ir.getSize()
            max_h = 16*mm
            ratio = max_h / ih
            logo_buf.seek(0)
            logo_cell = RLImage(logo_buf, width=iw*ratio, height=max_h)
        except:
            logo_cell = Paragraph(settings.company_name or "", ps("cn", fontSize=14, fontName="Helvetica-Bold"))
    else:
        logo_cell = Paragraph(settings.company_name or "", ps("cn", fontSize=14, fontName="Helvetica-Bold"))
    _is_credit = inv.get("is_credit_note", False)
    _title_txt = "KREDITFAKTURA" if _is_credit else "FAKTURA"
    _title_col = "#c2410c" if _is_credit else "#141414"
    faktura_title = Paragraph(
        f'<font size="{18 if _is_credit else 22}" color="{_title_col}"><b>{_title_txt}</b></font>  <font size="13" color="#888888">#{inv["invoice_number"]}</font>',
        ps("ft", alignment=2)
    )
    hdr = Table([[logo_cell, faktura_title]], colWidths=[90*mm, None])

    hdr.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("ALIGN",(1,0),(1,0),"RIGHT"),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))
    elements.append(hdr)
    # Credit note banner with reason
    if _is_credit:
        _credits = inv.get("credits_invoice_number")
        _reason = inv.get("credit_reason") or "-"
        _banner_txt = f'<b>Krediterar faktura #{_credits}</b><br/>Anledning: {_reason}' if _credits else f'<b>Kreditfaktura</b><br/>Anledning: {_reason}'
        _banner = Table([[Paragraph(_banner_txt, ps("cb", fontSize=9, textColor=colors.HexColor("#7c2d12")))]], colWidths=[None])
        _banner.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#fff7ed")),
            ("BOX",(0,0),(-1,-1),0.7,colors.HexColor("#fdba74")),
            ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
            ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
        ]))
        elements.append(Spacer(1, 4*mm))
        elements.append(_banner)
    elements.append(Spacer(1, 4*mm))

    # ── DIVIDER ──────────────────────────────────────────────────────────────
    elements.append(Table([[""]], colWidths=[page_w - 40*mm]))
    elements[-1].setStyle(TableStyle([
        ("LINEBELOW",(0,0),(-1,-1),1.5,colors.HexColor("#141414")),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))
    elements.append(Spacer(1, 5*mm))

    # ── SENDER + RECIPIENT + INVOICE DETAILS ────────────────────────────────
    def info_block(label, lines):
        block = [Paragraph(label, label_style)]
        for l in lines:
            if l: block.append(Paragraph(str(l), value_style))
        return block

    sender = info_block("FRÅN", [
        settings.company_name,
        settings.company_address,
        settings.company_orgnr and f"Org.nr {settings.company_orgnr}",
        settings.company_email,
        settings.company_phone,
    ])
    recipient = info_block("TILL", [
        inv["customer_name"],
        inv.get("customer_address"),
        inv.get("customer_email"),
        inv.get("customer_phone"),
        inv.get("customer_personnummer") and f"Personnr. {inv['customer_personnummer']}",
    ])
    details = [
        [Paragraph("FAKTURADATUM", label_style), Paragraph(inv["created_at"][:10], value_style)],
        [Paragraph("FÖRFALLODATUM", label_style), Paragraph(inv["due_date"], bold_style)],
        [Paragraph("BETALNINGSVILLKOR", label_style), Paragraph(f"{settings.payment_terms_days or inv.get('payment_terms_days') or inv.get('due_days') or 30} dagar netto", value_style)],
    ]
    if settings.bankgiro:
        details.append([Paragraph("BANKGIRO", label_style), Paragraph(settings.bankgiro, value_style)])
    if settings.iban:
        details.append([Paragraph("IBAN", label_style), Paragraph(settings.iban, small_style)])

    details_tbl = Table(details, colWidths=[28*mm, 37*mm])
    details_tbl.setStyle(TableStyle([
        ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),1),
    ]))

    top_row = Table([[sender, recipient, details_tbl]], colWidths=[65*mm, 65*mm, 65*mm])
    top_row.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))
    elements.append(top_row)
    elements.append(Spacer(1, 8*mm))

    # ── ITEMS TABLE ──────────────────────────────────────────────────────────
    HOURLY = ("hemstädning","kontorsstädning","storstädning","byggstädning","trappstädning",
               "hemstadning","kontorstadning","storstadning","byggstadning","trappstadning")
    def is_hourly(desc): return desc.strip().lower() in HOURLY

    col_hdr_style = ParagraphStyle("ch", parent=styles["Normal"], fontSize=8,
        textColor=colors.white, fontName="Helvetica-Bold")
    col_val_style = ParagraphStyle("cv", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#1a1a1a"))
    col_val_r = ParagraphStyle("cvr", parent=col_val_style, alignment=2)

    data = [[
        Paragraph("BESKRIVNING", col_hdr_style),
        Paragraph("ANT/TIM", col_hdr_style),
        Paragraph("À-PRIS", col_hdr_style),
        Paragraph("BELOPP", col_hdr_style),
    ]]
    for item in inv["items"]:
        line_total = item["quantity"] * item["unit_price"]
        qty_label = f'{item["quantity"]:g} tim' if is_hourly(item["description"]) else f'{item["quantity"]:g}'
        data.append([
            Paragraph(item["description"], col_val_style),
            Paragraph(qty_label, col_val_r),
            Paragraph(f'{item["unit_price"]:,.2f}', col_val_r),
            Paragraph(f'{line_total:,.2f}', col_val_r),
        ])

    items_table = Table(data, colWidths=[85*mm, 22*mm, 30*mm, 30*mm])
    row_count = len(data)
    items_table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), colors.HexColor("#141414")),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#F8F9FA")]),
        ("FONTSIZE",(0,0),(-1,-1),9),
        ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
        ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
        ("LINEBELOW",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LINEBELOW",(0,0),(-1,0),0,colors.white),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 6*mm))

    # ── TOTALS ───────────────────────────────────────────────────────────────
    totals = [
        ["Delsumma (exkl. moms)", f"{inv['subtotal']:,.2f} kr"],
        [f"Moms ({settings.vat_rate:g}%)", f"{inv['vat_amount']:,.2f} kr"],
        ["Totalt inkl. moms", f"{inv['total_amount']:,.2f} kr"],
    ]
    if inv.get("rut_eligible") and inv.get("rut_deduction", 0) > 0:
        totals.append([f"RUT-avdrag (50% av arbetskostnad)", f"-{inv['rut_deduction']:,.2f} kr"])
    reminder_fee_pdf = inv.get("reminder_fee", 0) or 0
    att_betala = inv.get("customer_pays", 0)
    if reminder_fee_pdf > 0:
        totals.append([f"Påminnelseavgift", f"{reminder_fee_pdf:,.2f} kr"])
    totals.append(["ATT BETALA", f"{att_betala:,.2f} kr"])

    tot_styles = []
    last = len(totals) - 1
    for i, row in enumerate(totals):
        is_last = i == last
        totals[i] = [
            Paragraph(row[0], bold_style if is_last else small_style),
            Paragraph(row[1], bold_style if is_last else small_style),
        ]
        if is_last:
            tot_styles += [
                ("LINEABOVE",(0,i),(-1,i),1.2,colors.HexColor("#141414")),
                ("BACKGROUND",(0,i),(-1,i),colors.HexColor("#F0F0F0")),
                ("TOPPADDING",(0,i),(-1,i),6),("BOTTOMPADDING",(0,i),(-1,i),6),
            ]

    totals_table = Table(totals, colWidths=[None, 40*mm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
        ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("LINEBELOW",(0,0),(-1,-2),0.3,colors.HexColor("#E2E8F0")),
    ] + tot_styles))
    elements.append(totals_table)

    # ── NOTES ────────────────────────────────────────────────────────────────
    if inv.get("notes"):
        elements.append(Spacer(1, 6*mm))
        elements.append(Paragraph("Meddelande", label_style))
        elements.append(Paragraph(inv["notes"], small_style))

    # ── FOOTER ───────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 10*mm))
    footer_parts = []
    if settings.company_name: footer_parts.append(settings.company_name)
    if settings.company_orgnr: footer_parts.append(f"Org.nr {settings.company_orgnr}")
    if settings.bankgiro: footer_parts.append(f"Bankgiro {settings.bankgiro}")
    if settings.company_email: footer_parts.append(settings.company_email)
    footer_line = "  ·  ".join(p for p in footer_parts if p)
    if footer_line:
        ft = Table([[Paragraph(footer_line, footer_style)]], colWidths=[page_w-40*mm])
        ft.setStyle(TableStyle([
            ("LINEABOVE",(0,0),(-1,-1),0.5,colors.HexColor("#CCCCCC")),
            ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),0),
            ("LEFTPADDING",(0,0),(-1,-1),0),
        ]))
        elements.append(ft)

    if inv.get("note"):
        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph(inv["note"], styles["Normal"]))

    doc.build(elements)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Payroll calculation helpers
# ---------------------------------------------------------------------------
def _time_to_minutes(t: str) -> int:
    h, m = t.split(":")
    h = int(h)
    m = int(m)
    if h >= 24:
        return 24 * 60
    # treat 23:59 as end of day (same as 24:00)
    if h == 23 and m == 59:
        return 24 * 60
    return h * 60 + m


def _overlap_minutes(s1, e1, s2, e2) -> int:
    return max(0, min(e1, e2) - max(s1, s2))


def split_shift_hours(date_str: str, start_str: str, end_str: str, settings: PayrollSettings):
    y, m, d = map(int, date_str.split("-"))
    weekday = DateClass(y, m, d).weekday()

    start_m = _time_to_minutes(start_str)
    end_m = _time_to_minutes(end_str)
    if end_m <= start_m:
        end_m += 24 * 60
    total_minutes = end_m - start_m

    ob1_minutes = 0
    ob2_minutes = 0
    if weekday in settings.ob1_days:
        ob1_minutes = _overlap_minutes(start_m, end_m, _time_to_minutes(settings.ob1_start), _time_to_minutes(settings.ob1_end))
    if weekday in settings.ob2_days:
        ob2_minutes = _overlap_minutes(start_m, end_m, _time_to_minutes(settings.ob2_start), _time_to_minutes(settings.ob2_end))

    combined = ob1_minutes + ob2_minutes
    if combined > total_minutes:
        excess = combined - total_minutes
        reduce1 = min(ob1_minutes, excess)
        ob1_minutes -= reduce1

    normal_minutes = max(0, total_minutes - ob1_minutes - ob2_minutes)
    return normal_minutes / 60.0, ob1_minutes / 60.0, ob2_minutes / 60.0


async def build_payroll_summary(start: str, end: str):
    settings = await get_payroll_settings_obj()
    employees = await db.employees.find().to_list(1000)
    shifts = await db.shifts.find({"date": {"$gte": start, "$lte": end}}).to_list(5000)
    absences = await db.absences.find({"start_date": {"$lte": end}, "end_date": {"$gte": start}}).to_list(2000)
    expenses = await db.expenses.find({"date": {"$gte": start, "$lte": end}}).to_list(2000)

    range_start = DateClass(*map(int, start.split("-")))
    range_end = DateClass(*map(int, end.split("-")))

    summary = {}
    absence_dates_by_employee = {}
    for emp in employees:
        eid = str(emp["_id"])
        summary[eid] = {
            "name": emp["name"],
            "personnummer": emp.get("personnummer") or "",
            "hourly_rate": emp.get("hourly_rate", 0) or 0,
            "employment_type": emp.get("employment_type", "fastanstalld"),
            "normal_h": 0.0,
            "ob1_h": 0.0,
            "ob2_h": 0.0,
            "expense_total": 0.0,
            "absence_days": 0,
            "absence_scheduled_days": 0,
            "absence_lost_amount": 0.0,
        }
        absence_dates_by_employee[eid] = set()

    for a in absences:
        eid = a["employee_id"]
        if eid not in summary:
            continue
        sd = DateClass(*map(int, a["start_date"].split("-")))
        ed = DateClass(*map(int, a["end_date"].split("-")))
        clip_s = max(sd, range_start)
        clip_e = min(ed, range_end)
        if clip_e >= clip_s:
            summary[eid]["absence_days"] += (clip_e - clip_s).days + 1
            d = clip_s
            while d <= clip_e:
                absence_dates_by_employee[eid].add(d.isoformat())
                d += timedelta(days=1)

    overlap_dates_by_employee = {eid: set() for eid in summary}

    for s in shifts:
        eid = s["employee_id"]
        if eid not in summary:
            continue
        n, o1, o2 = split_shift_hours(s["date"], s["start_time"], s["end_time"], settings)
        row = summary[eid]
        if s["date"] in absence_dates_by_employee.get(eid, set()):
            rate = row["hourly_rate"]
            row["absence_lost_amount"] += n * rate + o1 * settings.ob1_extra + o2 * settings.ob2_extra
            overlap_dates_by_employee[eid].add(s["date"])
        else:
            row["normal_h"] += n
            row["ob1_h"] += o1
            row["ob2_h"] += o2

    for eid, dates in overlap_dates_by_employee.items():
        summary[eid]["absence_scheduled_days"] = len(dates)

    for e in expenses:
        eid = e["employee_id"]
        if eid in summary:
            summary[eid]["expense_total"] += e["amount"]

    # ── Sjuklön calculation (only for "Sjuk" absences) ──────────────────
    # Rules: sjuklön = 80% of scheduled shift pay
    #        karensavdrag = 20% of one average week's sjuklön
    for eid, row in summary.items():
        row["sick_shifts_h"] = 0.0
        row["sjuklon_gross"] = 0.0
        row["karensavdrag"] = 0.0
        row["sjuklon_net"] = 0.0

    # Get sick absences only
    sick_absences = [a for a in absences if a.get("type", "").lower() == "sjuk"]
    sick_dates_by_employee = {}
    for a in sick_absences:
        eid = a["employee_id"]
        if eid not in summary:
            continue
        sd = DateClass(*map(int, a["start_date"].split("-")))
        ed = DateClass(*map(int, a["end_date"].split("-")))
        clip_s = max(sd, range_start)
        clip_e = min(ed, range_end)
        if eid not in sick_dates_by_employee:
            sick_dates_by_employee[eid] = set()
        d = clip_s
        while d <= clip_e:
            sick_dates_by_employee[eid].add(d.isoformat())
            d += timedelta(days=1)

    # Calculate sjuklön for sick shifts
    for s in shifts:
        eid = s["employee_id"]
        if eid not in summary:
            continue
        if s["date"] not in sick_dates_by_employee.get(eid, set()):
            continue
        n, o1, o2 = split_shift_hours(s["date"], s["start_time"], s["end_time"], settings)
        total_h = n + o1 + o2
        rate = summary[eid]["hourly_rate"]
        summary[eid]["sick_shifts_h"] += total_h
        summary[eid]["sjuklon_gross"] += total_h * rate * 0.8

    for eid, row in summary.items():
        if row["sjuklon_gross"] > 0:
            # karensavdrag = 20% of one week's sjuklön
            # one week avg = sjuklon_gross / sick_weeks (min 1)
            sick_days = len(sick_dates_by_employee.get(eid, set()))
            sick_weeks = max(1, sick_days / 5.0)
            weekly_sjuklon = row["sjuklon_gross"] / sick_weeks
            row["karensavdrag"] = round(weekly_sjuklon * 0.20, 2)
            row["sjuklon_net"] = round(max(0, row["sjuklon_gross"] - row["karensavdrag"]), 2)

    for eid, row in summary.items():
        rate = row["hourly_rate"]
        base_pay = row["normal_h"] * rate
        ob1_pay = row["ob1_h"] * settings.ob1_extra
        ob2_pay = row["ob2_h"] * settings.ob2_extra
        row["base_pay"] = base_pay
        row["ob1_pay"] = ob1_pay
        row["ob2_pay"] = ob2_pay
        row["total_pay"] = base_pay + ob1_pay + ob2_pay + row["expense_total"] + row["sjuklon_net"]
        # Nettolön = bruttolön - prelskatt (30%)
        brutto = base_pay + ob1_pay + ob2_pay + row["sjuklon_net"]
        row["brutto_pay"] = round(brutto, 2)
        row["prelskatt"] = round(brutto * 0.30, 2)
        row["netto_pay"] = round(brutto - brutto * 0.30 + row["expense_total"], 2)

    return summary, settings


def build_xlsx_bytes(summary: dict) -> bytes:
    PRELSKATT = 0.30
    ARBETSGIVARAVGIFT = 0.3142
    SEMESTER = 0.12
    wb = Workbook()
    ws = wb.active
    ws.title = "Löneunderlag"
    headers = [
        "Anställd", "Typ", "Personnummer", "Lön/h (kr)",
        "Normaltid (h)", "OB1 (h)", "OB2 (h)", "OB-tillägg (kr)",
        "Grundlön (kr)", "Semesterersättning 12% (kr)", "Arbetsgivaravgift 31.42% (kr)",
        "Bruttolön (kr)", "Prelskatt 30% (kr)", "Nettolön (kr)",
        "Utlägg (kr)", "Frånvarodagar", "Förlorad lön (kr)",
        "Sjuklön netto (kr)", "Total kostnad arbetsgivare (kr)",
    ]
    ws.append(headers)
    # Style header row
    from openpyxl.styles import Font, PatternFill, Alignment
    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", wrap_text=True)

    total_row = ["TOTALT", "", "", "", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for row in summary.values():
        type_label = "Vikarie" if row.get("employment_type") == "vikarie" else "Fast anställd"
        brutto = round(row["normal_h"]*row["hourly_rate"] + row["ob1_h"]*row.get("ob1_extra",0) + row["ob2_h"]*row.get("ob2_extra",0) + row.get("sjuklon_net",0), 2)
        ob_kr = round(row["ob1_h"]*row.get("ob1_extra",0) + row["ob2_h"]*row.get("ob2_extra",0), 2)
        grundlon = round(row["normal_h"]*row["hourly_rate"], 2)
        semester = round(brutto * SEMESTER, 2)
        ag_avg = round(brutto * ARBETSGIVARAVGIFT, 2)
        prelskatt = round(brutto * PRELSKATT, 2)
        netto = round(brutto - prelskatt, 2)
        utlagg = round(row.get("expense_total", 0), 2)
        total_cost = round(brutto + ag_avg + semester, 2)

        ws.append([
            row["name"], type_label, row.get("personnummer",""),
            row["hourly_rate"],
            round(row["normal_h"], 2), round(row["ob1_h"], 2), round(row["ob2_h"], 2), ob_kr,
            grundlon, semester, ag_avg, brutto, -prelskatt, netto,
            utlagg, row["absence_days"], round(row.get("absence_lost_amount",0), 2),
            round(row.get("sjuklon_net",0), 2), total_cost,
        ])
        for j, val in enumerate([4,5,6,7,8,9,10,11,12,13,14,16,17,18]):
            total_row[val] = round(total_row[val] + [grundlon,round(row["normal_h"],2),round(row["ob1_h"],2),round(row["ob2_h"],2),ob_kr,semester,ag_avg,brutto,-prelskatt,netto,utlagg,round(row.get("absence_lost_amount",0),2),round(row.get("sjuklon_net",0),2),total_cost][j], 2)

    ws.append(total_row)
    # Style totals row
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True, size=9)
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    for col in ws.columns:
        max_len = max(len(str(c.value)) if c.value is not None else 0 for c in col)
        ws.column_dimensions[col[0].column_letter].width = max(12, min(max_len + 2, 25))

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_paxml_str(summary: dict, settings: PayrollSettings, start: str, end: str) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<paxml version="2.0" xmlns="http://www.paxml.se/2.0">')
    lines.append('  <header>')
    lines.append('    <format>LONETRANS</format>')
    if settings.company_orgnr:
        lines.append(f'    <orgnr>{quoteattr(settings.company_orgnr)[1:-1]}</orgnr>')
    lines.append(f'    <skapad>{datetime.now(timezone.utc).isoformat()}</skapad>')
    lines.append(f'    <period start="{start}" slut="{end}"/>')
    lines.append('  </header>')
    lines.append('  <lonetransaktioner>')
    for eid, row in summary.items():
        persnr = quoteattr(row["personnummer"] or "")
        if row["normal_h"]:
            lines.append(f'    <lonetrans anstid={quoteattr(eid)} persnr={persnr} kod="{settings.code_normal}" antal="{round(row["normal_h"], 2)}" enhet="TIM"/>')
        if row["ob1_h"]:
            lines.append(f'    <lonetrans anstid={quoteattr(eid)} persnr={persnr} kod="{settings.code_ob1}" antal="{round(row["ob1_h"], 2)}" enhet="TIM"/>')
        if row["ob2_h"]:
            lines.append(f'    <lonetrans anstid={quoteattr(eid)} persnr={persnr} kod="{settings.code_ob2}" antal="{round(row["ob2_h"], 2)}" enhet="TIM"/>')
        if row["expense_total"]:
            lines.append(f'    <lonetrans anstid={quoteattr(eid)} persnr={persnr} kod="{settings.code_expense}" belopp="{round(row["expense_total"], 2)}" enhet="KR"/>')
    lines.append('  </lonetransaktioner>')
    lines.append('</paxml>')
    return "\n".join(lines)



# ---- Price List ----
class PriceItem(BaseModel):
    id: str
    service: str
    description: Optional[str] = None
    unit: str = "tim"  # "tim", "kvm", "st", "fast"
    price: float = 0
    is_rut_eligible: bool = True
    is_active: bool = True


class PriceListSettings(BaseModel):
    items: List[PriceItem] = Field(default_factory=list)

# ---------------------------------------------------------------------------
# App / Router
# ---------------------------------------------------------------------------
def real_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return get_remote_address(request)

limiter = Limiter(key_func=real_client_ip)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "PureNorth Städ API"}


# ---- Auth ----
@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Fel e-post eller lösenord")
    token = create_access_token(str(user["_id"]), email)
    return {
        "token": token,
        "user": {"email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")},
    }


@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return {"email": current["email"], "name": current.get("name", "Admin"), "role": current.get("role", "admin")}


# ---- Bookings ----
@api_router.post("/bookings", response_model=Booking, response_model_by_alias=False)
@limiter.limit("10/minute")
async def create_booking(request: Request, payload: BookingCreate):
    doc = payload.model_dump()
    doc = sanitize_payload(doc, ["name", "phone", "address", "kvm", "preferred_date", "other_description"], max_len=1000)
    doc["services"] = [sanitize_text(s, 100) for s in doc.get("services", [])][:10]
    doc["status"] = "new"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.bookings.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Booking(**doc)


@api_router.get("/bookings", response_model=List[Booking], response_model_by_alias=False)
async def list_bookings(current=Depends(get_current_user)):
    docs = await db.bookings.find().sort("created_at", -1).to_list(1000)
    return [Booking(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.patch("/bookings/{booking_id}/status")
async def update_status(booking_id: str, payload: StatusUpdate, current=Depends(get_current_user)):
    result = await db.bookings.update_one(
        {"_id": to_object_id(booking_id)}, {"$set": {"status": payload.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bokning hittades inte")
    # Send confirmation email when status changes to "contacted"
    if payload.status == "contacted":
        doc = await db.bookings.find_one({"_id": to_object_id(booking_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            inv_settings = await get_invoice_settings_obj()
            await send_booking_confirmation(doc, inv_settings)
    return {"success": True}


@api_router.patch("/bookings/{booking_id}")
async def update_booking(booking_id: str, payload: dict, current=Depends(get_current_user)):
    updates = {k: v for k, v in payload.items() if k not in ["_id", "id", "created_at"]}
    await db.bookings.update_one({"_id": to_object_id(booking_id)}, {"$set": updates})
    doc = await db.bookings.find_one({"_id": to_object_id(booking_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Bokning hittades inte")
    doc["_id"] = str(doc["_id"])
    return Booking(**doc)


@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current=Depends(get_current_user)):
    result = await db.bookings.delete_one({"_id": to_object_id(booking_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bokning hittades inte")
    return {"success": True}


# ---- Reviews ----
@api_router.post("/reviews", response_model=Review, response_model_by_alias=False)
@limiter.limit("5/minute")
async def create_review(request: Request, payload: ReviewCreate):
    doc = payload.model_dump()
    doc = sanitize_payload(doc, ["name"], max_len=100)
    doc = sanitize_payload(doc, ["text"], max_len=2000)
    doc["approved"] = False
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reviews.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Review(**doc)


@api_router.get("/reviews/approved", response_model=List[Review], response_model_by_alias=False)
async def list_approved_reviews():
    docs = await db.reviews.find({"approved": True}).sort("created_at", -1).to_list(1000)
    return [Review(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.get("/reviews", response_model=List[Review], response_model_by_alias=False)
async def list_reviews(current=Depends(get_current_user)):
    docs = await db.reviews.find().sort("created_at", -1).to_list(1000)
    return [Review(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.patch("/reviews/{review_id}/approve")
async def approve_review(review_id: str, payload: ApproveUpdate, current=Depends(get_current_user)):
    result = await db.reviews.update_one(
        {"_id": to_object_id(review_id)}, {"$set": {"approved": payload.approved}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Omdöme hittades inte")
    return {"success": True}


@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, current=Depends(get_current_user)):
    result = await db.reviews.delete_one({"_id": to_object_id(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Omdöme hittades inte")
    return {"success": True}


# ---- Employees ----
@api_router.post("/employees", response_model=Employee, response_model_by_alias=False)
async def create_employee(payload: EmployeeCreate, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.employees.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Employee(**doc)


@api_router.get("/employees", response_model=List[Employee], response_model_by_alias=False)
async def list_employees(current=Depends(get_current_user)):
    docs = await db.employees.find().sort("created_at", 1).to_list(1000)
    return [Employee(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.patch("/employees/{employee_id}", response_model=Employee, response_model_by_alias=False)
async def update_employee(employee_id: str, payload: EmployeeUpdate, current=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        result = await db.employees.update_one({"_id": to_object_id(employee_id)}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Anställd hittades inte")
    doc = await db.employees.find_one({"_id": to_object_id(employee_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Anställd hittades inte")
    doc["_id"] = str(doc["_id"])
    return Employee(**doc)


@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current=Depends(get_current_user)):
    result = await db.employees.delete_one({"_id": to_object_id(employee_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Anställd hittades inte")
    await db.shifts.delete_many({"employee_id": employee_id})
    return {"success": True}


# ---- Shifts (Schema) ----
@api_router.post("/shifts", response_model=Shift, response_model_by_alias=False)
async def create_shift(payload: ShiftCreate, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.shifts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Shift(**doc)


@api_router.get("/shifts", response_model=List[Shift], response_model_by_alias=False)
async def list_shifts(start: Optional[str] = None, end: Optional[str] = None, current=Depends(get_current_user)):
    query = {}
    if start and end:
        query["date"] = {"$gte": start, "$lte": end}
    docs = await db.shifts.find(query).sort("date", 1).to_list(2000)
    return [Shift(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.patch("/shifts/{shift_id}", response_model=Shift, response_model_by_alias=False)
async def update_shift(shift_id: str, payload: ShiftUpdate, current=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        result = await db.shifts.update_one({"_id": to_object_id(shift_id)}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Pass hittades inte")
    doc = await db.shifts.find_one({"_id": to_object_id(shift_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Pass hittades inte")
    doc["_id"] = str(doc["_id"])
    return Shift(**doc)


@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, current=Depends(get_current_user)):
    result = await db.shifts.delete_one({"_id": to_object_id(shift_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pass hittades inte")
    return {"success": True}


# ---- Frånvaro (Absence) ----
@api_router.post("/absences", response_model=Absence, response_model_by_alias=False)
async def create_absence(payload: AbsenceCreate, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.absences.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Absence(**doc)


@api_router.get("/absences", response_model=List[Absence], response_model_by_alias=False)
async def list_absences(start: Optional[str] = None, end: Optional[str] = None, current=Depends(get_current_user)):
    query = {}
    if start and end:
        query["start_date"] = {"$lte": end}
        query["end_date"] = {"$gte": start}
    docs = await db.absences.find(query).sort("start_date", -1).to_list(2000)
    return [Absence(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.patch("/absences/{absence_id}", response_model=Absence, response_model_by_alias=False)
async def update_absence(absence_id: str, payload: AbsenceUpdate, current=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        result = await db.absences.update_one({"_id": to_object_id(absence_id)}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Frånvaro hittades inte")
    doc = await db.absences.find_one({"_id": to_object_id(absence_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Frånvaro hittades inte")
    doc["_id"] = str(doc["_id"])
    return Absence(**doc)


@api_router.delete("/absences/{absence_id}")
async def delete_absence(absence_id: str, current=Depends(get_current_user)):
    result = await db.absences.delete_one({"_id": to_object_id(absence_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Frånvaro hittades inte")
    return {"success": True}


# ---- Utlägg (Expenses) ----
@api_router.post("/expenses", response_model=Expense, response_model_by_alias=False)
async def create_expense(payload: ExpenseCreate, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["status"] = "pending"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.expenses.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Expense(**doc)


@api_router.get("/expenses", response_model=List[Expense], response_model_by_alias=False)
async def list_expenses(start: Optional[str] = None, end: Optional[str] = None, current=Depends(get_current_user)):
    query = {}
    if start and end:
        query["date"] = {"$gte": start, "$lte": end}
    docs = await db.expenses.find(query).sort("date", -1).to_list(2000)
    return [Expense(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.patch("/expenses/{expense_id}", response_model=Expense, response_model_by_alias=False)
async def update_expense(expense_id: str, payload: ExpenseUpdate, current=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        result = await db.expenses.update_one({"_id": to_object_id(expense_id)}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Utlägg hittades inte")
    doc = await db.expenses.find_one({"_id": to_object_id(expense_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Utlägg hittades inte")
    doc["_id"] = str(doc["_id"])
    return Expense(**doc)


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current=Depends(get_current_user)):
    result = await db.expenses.delete_one({"_id": to_object_id(expense_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utlägg hittades inte")
    return {"success": True}


# ---- Payroll settings ----
@api_router.get("/settings/payroll", response_model=PayrollSettings)
async def get_payroll_settings(current=Depends(get_current_user)):
    return await get_payroll_settings_obj()


@api_router.put("/settings/payroll", response_model=PayrollSettings)
async def set_payroll_settings(payload: PayrollSettings, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["_key"] = "payroll"
    await db.settings.update_one({"_key": "payroll"}, {"$set": doc}, upsert=True)
    return payload


# ---- Payroll summary + export ----
@api_router.get("/payroll/summary")
async def payroll_summary(start: str, end: str, current=Depends(get_current_user)):
    summary, settings = await build_payroll_summary(start, end)
    return {
        "settings": settings.model_dump(),
        "rows": [{"employee_id": eid, **row} for eid, row in summary.items()],
    }


@api_router.get("/payroll/export")
async def payroll_export(start: str, end: str, format: str = "xlsx", current=Depends(get_current_user)):
    summary, settings = await build_payroll_summary(start, end)
    if format == "pdf":
        inv_settings = await get_invoice_settings_obj()
        company = inv_settings.company_name or "PureNorth Städ"
        buf = BytesIO()
        from reportlab.lib.pagesizes import landscape
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
            topMargin=12*mm, bottomMargin=12*mm, leftMargin=15*mm, rightMargin=15*mm,
            title=f"Lönesammanställning {start} - {end}",
            author="PureNorth Städ")
        styles = getSampleStyleSheet()
        elements = []
        def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
        # Header
        hdr = Table([[
            ParagraphStyle and Paragraph(company, ps("h", fontSize=16, fontName="Helvetica-Bold", textColor=colors.white)),
            Paragraph(f"LÖNESAMMANSTÄLLNING<br/>{start} – {end}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
        ]], colWidths=[100*mm, None])
        hdr.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
            ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
            ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ]))
        # Header block
        hdr_data = [[
            Paragraph(f"<b>{company}</b>", ps("ch", fontSize=16, fontName="Helvetica-Bold", textColor=colors.white)),
            Paragraph(f"<b>LÖNESAMMANSTÄLLNING</b><br/>{start} – {end}", ps("ct", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
        ]]
        hdr_tbl = Table(hdr_data, colWidths=[100*mm, None])
        hdr_tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
            ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
            ("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),12),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ]))
        elements.append(hdr_tbl)
        elements.append(Paragraph(
            f"Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC",
            ps("d", fontSize=8, textColor=colors.HexColor("#94a3b8"), spaceBefore=4, spaceAfter=8)
        ))
        PRELSKATT = 0.30
        # Table
        PRELSKATT = 0.30
        ARBETSGIVARAVGIFT = 0.3142
        SEMESTER = 0.12
        data = [["Namn", "Typ", "Lön/h", "Normal(h)", "OB(kr)", "Brutto", "Semester", "AG-avgift", "Prelskatt", "Nettolön", "Utlägg", "Frånvaro", "Förlorad lön", "Sjuklön"]]
        total_brutto = total_netto = total_utlagg = total_ag = total_sem = total_prel = 0
        for r in summary.values():
            brutto = r["normal_h"]*r["hourly_rate"] + r["ob1_h"]*settings.ob1_extra + r["ob2_h"]*settings.ob2_extra + r.get("sjuklon_net",0)
            ob_kr = r["ob1_h"]*settings.ob1_extra + r["ob2_h"]*settings.ob2_extra
            prelskatt = round(brutto * PRELSKATT, 2)
            netto = round(brutto - prelskatt, 2)
            ag = round(brutto * ARBETSGIVARAVGIFT, 2)
            sem = round(brutto * SEMESTER, 2)
            utlagg = r.get("expense_total", 0)
            franvaro = r.get("absence_days", 0)
            forlorad = round(r.get("absence_lost_amount", 0), 2)
            sjuklon = round(r.get("sjuklon_net", 0), 2)
            typ = "Vikarie" if r.get("employment_type") == "vikarie" else "Fast"
            total_brutto += brutto; total_netto += netto; total_utlagg += utlagg
            total_ag += ag; total_sem += sem; total_prel += prelskatt
            data.append([
                r["name"], typ, f'{r["hourly_rate"]:.0f} kr', f'{r["normal_h"]:.1f}',
                f'{ob_kr:.2f}', f'{brutto:.2f}', f'{sem:.2f}',
                f'{ag:.2f}', f'-{prelskatt:.2f}', f'{netto:.2f}', f'{utlagg:.2f}',
                str(franvaro), f'-{forlorad:.2f}' if forlorad > 0 else "-",
                f'{sjuklon:.2f}' if sjuklon > 0 else "-"
            ])
        data.append(["TOTALT", "", "", "", "", f'{total_brutto:.2f}', f'{total_sem:.2f}',
                     f'{total_ag:.2f}', f'-{total_prel:.2f}', f'{total_netto:.2f}', f'{total_utlagg:.2f}', "", "", ""])
        tbl = Table(data, colWidths=[32*mm, 14*mm, 14*mm, 16*mm, 15*mm, 19*mm, 18*mm, 19*mm, 17*mm, 19*mm, 15*mm, 14*mm, 18*mm, 15*mm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("FONTSIZE",(0,0),(-1,-1),7),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
            ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),2),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("ALIGN",(2,0),(-1,-1),"RIGHT"),
            ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),
            ("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
        ]))
        elements.append(tbl)
        doc.build(elements)
        return Response(content=buf.getvalue(), media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="lon_{start}_{end}.pdf"'})
    if format == "paxml":
        xml_str = build_paxml_str(summary, settings, start, end)
        return Response(
            content=xml_str,
            media_type="application/xml",
            headers={"Content-Disposition": f'attachment; filename="lon_{start}_{end}.paxml.xml"'},
        )
    xlsx_bytes = build_xlsx_bytes(summary)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="lon_{start}_{end}.xlsx"'},
    )


# ---- Invoices (Fakturering) ----
@api_router.get("/settings/invoice", response_model=InvoiceSettings)
async def get_invoice_settings(current=Depends(get_current_user)):
    return await get_invoice_settings_obj()


@api_router.put("/settings/invoice", response_model=InvoiceSettings)
async def set_invoice_settings(payload: InvoiceSettings, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["_key"] = "invoice"
    # preserve next_invoice_number and logo if not provided
    existing = await db.settings.find_one({"_key": "invoice"})
    if existing:
        if doc.get("company_logo") is None and existing.get("company_logo"):
            doc["company_logo"] = existing["company_logo"]
        if doc.get("next_invoice_number", 1001) == 1001 and existing.get("next_invoice_number", 1001) > 1001:
            doc["next_invoice_number"] = existing["next_invoice_number"]
    await db.settings.update_one({"_key": "invoice"}, {"$set": doc}, upsert=True)
    result = await db.settings.find_one({"_key": "invoice"})
    result.pop("_id", None)
    result.pop("_key", None)
    return InvoiceSettings(**result)


@api_router.put("/settings/invoice/logo")
async def set_invoice_logo(request: Request, current=Depends(get_current_user)):
    body = await request.json()
    logo = body.get("company_logo")
    await db.settings.update_one({"_key": "invoice"}, {"$set": {"company_logo": logo}}, upsert=True)
    return {"success": True}


@api_router.post("/invoices", response_model=Invoice, response_model_by_alias=False)
async def create_invoice(payload: InvoiceCreate, current=Depends(get_current_user)):
    inv_settings = await get_invoice_settings_obj()
    items = [i.model_dump() for i in payload.items]
    if payload.subtotal is None:
        amounts = calc_invoice_amounts(items, payload.rut_eligible, payload.customer_type, inv_settings.vat_rate)
    else:
        amounts = {}
    number = await get_next_invoice_number()
    due_date = payload.due_date or (DateClass.today() + timedelta(days=inv_settings.payment_terms_days)).isoformat()

    doc = payload.model_dump()
    doc["items"] = items
    doc["invoice_number"] = number
    doc["due_date"] = due_date
    if payload.credit_reason:
        doc["credit_reason"] = sanitize_text(payload.credit_reason, 300)
    doc["status"] = "credit" if payload.is_credit_note else "draft"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["paid_at"] = None
    if payload.is_credit_note and payload.credits_invoice_number:
        await db.invoices.update_one(
            {"invoice_number": payload.credits_invoice_number},
            {"$set": {"credited": True}}
        )
    # Use frontend amounts if provided, otherwise recalculate
    if payload.subtotal is None:
        doc.update(amounts)

    result = await db.invoices.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Invoice(**doc)


@api_router.get("/invoices", response_model=List[Invoice], response_model_by_alias=False)
async def list_invoices(current=Depends(get_current_user)):
    docs = await db.invoices.find().sort("invoice_number", -1).to_list(2000)
    result = []
    for d in docs:
        try:
            result.append(Invoice(**{**d, "_id": str(d["_id"])}))
        except Exception as e:
            logger.error(f"Skipping invalid invoice {d.get('invoice_number')}: {e}")
    return result



# ── Auto Reminder Cron ────────────────────────────────────────────────────────
@api_router.post("/invoices/auto-remind")
async def auto_remind_overdue(request: Request):
    return {"status": "disabled"}

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current=Depends(get_current_user)):
    inv = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if not inv:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")
    if inv.get("is_credit_note"):
        raise HTTPException(status_code=403, detail="Kreditfakturor kan inte tas bort.")
    if inv.get("credited"):
        raise HTTPException(status_code=403, detail="Krediterad faktura kan inte tas bort.")
    if inv.get("status") not in ["draft", None]:
        raise HTTPException(status_code=403, detail="Skickad faktura kan inte tas bort. Skapa en kreditfaktura istället.")
    await db.invoices.delete_one({"_id": to_object_id(invoice_id)})
    return {"success": True}


@api_router.put("/invoices/{invoice_id}", response_model=Invoice, response_model_by_alias=False)
async def update_invoice(invoice_id: str, payload: InvoiceCreate, current=Depends(get_current_user)):
    existing = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")
    if existing.get("status") not in ["draft", None]:
        raise HTTPException(status_code=403, detail="Fakturan är låst och kan inte ändras.")
    inv_settings = await get_invoice_settings_obj()
    items = [i.model_dump() for i in payload.items]
    amounts = calc_invoice_amounts(items, payload.rut_eligible, payload.customer_type, inv_settings.vat_rate)
    due_date = payload.due_date or existing.get("due_date") or (DateClass.today() + timedelta(days=inv_settings.payment_terms_days)).isoformat()

    updates = payload.model_dump()
    updates["items"] = items
    updates["due_date"] = due_date
    updates.update(amounts)

    await db.invoices.update_one({"_id": to_object_id(invoice_id)}, {"$set": updates})
    doc = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    doc["_id"] = str(doc["_id"])
    return Invoice(**doc)


@api_router.patch("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, payload: InvoiceStatusUpdate, current=Depends(get_current_user)):
    valid = ["draft", "sent", "paid", "overdue", "cancelled"]
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail="Ogiltig status.")
    inv = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if inv and inv.get("is_credit_note"):
        raise HTTPException(status_code=403, detail="Kreditfakturans status kan inte ändras.")
    if inv and inv.get("credited"):
        raise HTTPException(status_code=403, detail="Krediterad faktura kan inte ändra status.")
    updates = {"status": payload.status}
    if payload.status == "paid":
        updates["paid_at"] = datetime.now(timezone.utc).isoformat()
    await db.invoices.update_one({"_id": to_object_id(invoice_id)}, {"$set": updates})
    doc = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    doc["_id"] = str(doc["_id"])
    return doc

@api_router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str, current=Depends(get_current_user)):
    doc = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")
    inv_settings = await get_invoice_settings_obj()
    doc["_id"] = str(doc["_id"])
    pdf_bytes = build_invoice_pdf(doc, inv_settings)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="faktura_{doc["invoice_number"]}.pdf"'},
    )



@api_router.get("/payroll/slip")
async def payroll_slip(start: str, end: str, employee_id: str, current=Depends(get_current_user)):
    summary, settings = await build_payroll_summary(start, end)
    if employee_id not in summary:
        raise HTTPException(status_code=404, detail="Anställd hittades inte")
    row = summary[employee_id]
    inv_settings = await get_invoice_settings_obj()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm,
        title="Lönebesked - " + row.get("name","") + " " + start + " - " + end,
            author="PureNorth Städ")
    styles = getSampleStyleSheet()
    elements = []

    # Header: logo + company name
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=18)
    if inv_settings.company_logo:
        try:
            from reportlab.platypus import Image as RLImage
            from reportlab.lib.utils import ImageReader
            logo_data = base64.b64decode(inv_settings.company_logo.split(",")[-1])
            logo_buf = BytesIO(logo_data)
            ir = ImageReader(logo_buf)
            iw, ih = ir.getSize()
            ratio = (15 * mm) / ih
            logo_buf.seek(0)
            logo_img = RLImage(logo_buf, width=iw * ratio, height=15 * mm)
            hdr = Table([[logo_img, Paragraph(f'<b>{inv_settings.company_name or "Lönebesked"}</b>', title_style)]],
                colWidths=[iw * ratio + 5 * mm, None])
            hdr.setStyle(TableStyle([("VALIGN", (0,0),(-1,-1),"MIDDLE"),
                ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),4),
                ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
            elements.append(hdr)
        except Exception:
            elements.append(Paragraph(inv_settings.company_name or "Lönebesked", title_style))
    else:
        elements.append(Paragraph(inv_settings.company_name or "Lönebesked", title_style))

    elements.append(Paragraph("Lönebesked", styles["Heading2"]))
    elements.append(Spacer(1, 4*mm))

    # Employee info
    emp_type = "Fast anställd" if row.get("employment_type") == "fastanstalld" else "Vikarie"
    info_data = [
        ["Anställd:", row["name"]],
        ["Personnummer:", row["personnummer"] or "-"],
        ["Anställningstyp:", emp_type],
        ["Period:", f"{start} – {end}"],
    ]
    info_table = Table(info_data, colWidths=[50*mm, None])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0,0),(-1,-1), 10),
        ("FONTNAME", (0,0),(0,-1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8*mm))

    # ── Pay details table ──────────────────────────────────────────────
    rate = row["hourly_rate"]
    pay_data = [["Post", "Timmar/Antal", "À-pris (kr)", "Belopp (kr)"]]
    pay_data.append(["Normaltid", f'{row["normal_h"]:.2f} tim', f'{rate:.2f}', f'{row["base_pay"]:.2f}'])
    if row["ob1_h"] > 0:
        pay_data.append([f'OB1 ({settings.ob1_label})', f'{row["ob1_h"]:.2f} tim', f'{settings.ob1_extra:.2f}', f'{row["ob1_pay"]:.2f}'])
    if row["ob2_h"] > 0:
        pay_data.append([f'OB2 ({settings.ob2_label})', f'{row["ob2_h"]:.2f} tim', f'{settings.ob2_extra:.2f}', f'{row["ob2_pay"]:.2f}'])
    if row["expense_total"] > 0:
        pay_data.append(["Utlägg", "-", "-", f'{row["expense_total"]:.2f}'])

    # Sjuklön section
    if row.get("sjuklon_gross", 0) > 0:
        pay_data.append(["── Sjukfrånvaro ──", "", "", ""])
        pay_data.append([f'Sjuklön brutto (80% av sjuklön)', f'{row.get("sick_shifts_h",0):.2f} tim', f'{rate*0.8:.2f}', f'{row["sjuklon_gross"]:.2f}'])
        pay_data.append(["Karensavdrag (20% av veckosjuklön)", "", "", f'-{row["karensavdrag"]:.2f}'])
        pay_data.append(["Sjuklön netto (utbetalas)", "", "", f'{row["sjuklon_net"]:.2f}'])

    # Absence/loss section (fast anställd only)
    if row.get("absence_lost_amount", 0) > 0 and row.get("employment_type") == "fastanstalld" and row.get("sjuklon_gross", 0) == 0:
        pay_data.append(["Förlorad lön (ej sjukfrånvaro)", "", "", f'-{row["absence_lost_amount"]:.2f}'])

    pay_table = Table(pay_data, colWidths=[90*mm, 30*mm, 28*mm, 28*mm])
    pay_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#141414")),
        ("TEXTCOLOR", (0,0),(-1,0), colors.white),
        ("FONTSIZE", (0,0),(-1,-1), 9),
        ("ALIGN", (1,0),(-1,-1), "RIGHT"),
        ("GRID", (0,0),(-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOTTOMPADDING", (0,0),(-1,0), 8),
        ("TOPPADDING", (0,0),(-1,0), 8),
        ("BACKGROUND", (0,4),(-1,4), colors.HexColor("#F8FAFC")) if row.get("sjuklon_gross",0) > 0 else ("FONTSIZE",(0,0),(0,0),9),
        ("FONTNAME", (0,4),(0,4), "Helvetica-Bold") if row.get("sjuklon_gross",0) > 0 else ("FONTSIZE",(0,0),(0,0),9),
        ("TEXTCOLOR", (3,5),(3,7), colors.HexColor("#16a34a")) if row.get("sjuklon_gross",0) > 0 else ("FONTSIZE",(0,0),(0,0),9),
    ]))
    elements.append(pay_table)
    elements.append(Spacer(1, 6*mm))

    # ── Summary box ───────────────────────────────────────────────────
    elements.append(Spacer(1, 4*mm))
    summary_data = []
    PRELSKATT = 0.30
    ARBETSGIVARAVGIFT = 0.3142
    SEMESTER = 0.12
    brutto = row["normal_h"]*row["hourly_rate"] + row["ob1_pay"] + row["ob2_pay"] + row.get("sjuklon_net",0)
    semester_kr = round(brutto * SEMESTER, 2)
    ag_avg = round(brutto * ARBETSGIVARAVGIFT, 2)
    prelskatt = round(brutto * PRELSKATT, 2)
    netto = round(brutto - prelskatt, 2)
    total_cost_employer = round(brutto + ag_avg + semester_kr, 2)

    summary_data.append(["Grundlön (normaltid):", f'{row["base_pay"]:.2f} kr'])
    if row["ob1_pay"] > 0:
        summary_data.append([f'OB1-tillägg:', f'{row["ob1_pay"]:.2f} kr'])
    if row["ob2_pay"] > 0:
        summary_data.append([f'OB2-tillägg:', f'{row["ob2_pay"]:.2f} kr'])
    if row["expense_total"] > 0:
        summary_data.append(["Utlägg:", f'{row["expense_total"]:.2f} kr'])
    if row.get("sjuklon_net", 0) > 0:
        summary_data.append(["Sjuklön netto:", f'{row["sjuklon_net"]:.2f} kr'])
        summary_data.append(["  (varav karensavdrag):", f'-{row["karensavdrag"]:.2f} kr'])
    if row.get("absence_days", 0) > 0:
        summary_data.append(["Frånvarodagar:", f'{row["absence_days"]} dagar'])
    summary_data.append(["", ""])
    summary_data.append(["Bruttolön:", f'{brutto:.2f} kr'])
    summary_data.append(["Preliminärskatt (30%):", f'-{prelskatt:.2f} kr'])
    summary_data.append(["", ""])
    summary_data.append(["NETTOLÖN:", f'{netto:.2f} kr'])
    summary_data.append(["", ""])
    summary_data.append(["", ""])
    summary_data.append(["Semesterersättning (12%):", f'{semester_kr:.2f} kr'])
    summary_data.append(["Arbetsgivaravgift (31.42%):", f'{ag_avg:.2f} kr'])
    summary_data.append(["Total kostnad för arbetsgivare:", f'{total_cost_employer:.2f} kr'])

    # Split into two sections: employee view and employer view
    # Find nettolön index
    netto_idx = next((i for i,r in enumerate(summary_data) if "NETTOLÖN" in str(r[0])), len(summary_data)-1)
    employer_idx = next((i for i,r in enumerate(summary_data) if "Semesterersättning" in str(r[0])), None)

    total_table = Table(summary_data, colWidths=[110*mm, 45*mm])
    ts = [
        ("FONTSIZE", (0,0),(-1,-1), 10),
        ("ALIGN", (1,0),(-1,-1), "RIGHT"),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("TOPPADDING", (0,0),(-1,-1), 3),
        # Brutto line
        ("LINEABOVE", (0,netto_idx-2),(1,netto_idx-2), 0.5, colors.HexColor("#E2E8F0")),
        # Netto line - highlight
        ("BACKGROUND", (0,netto_idx),(-1,netto_idx), colors.HexColor("#141414")),
        ("TEXTCOLOR", (0,netto_idx),(-1,netto_idx), colors.white),
        ("FONTNAME", (0,netto_idx),(-1,netto_idx), "Helvetica-Bold"),
        ("FONTSIZE", (0,netto_idx),(-1,netto_idx), 12),
        ("TOPPADDING", (0,netto_idx),(-1,netto_idx), 8),
        ("BOTTOMPADDING", (0,netto_idx),(-1,netto_idx), 8),
    ]
    if employer_idx:
        ts += [
            ("LINEABOVE", (0,employer_idx),(1,employer_idx), 0.5, colors.HexColor("#E2E8F0")),
            ("FONTSIZE", (0,employer_idx),(-1,-1), 9),
            ("TEXTCOLOR", (0,employer_idx),(-1,-1), colors.HexColor("#64748b")),
            ("FONTNAME", (0,-1),(-1,-1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0,-1),(-1,-1), colors.HexColor("#141414")),
            ("FONTSIZE", (0,-1),(-1,-1), 10),
        ]
    total_table.setStyle(TableStyle(ts))
    elements.append(total_table)

    # ── Legal note ────────────────────────────────────────────────────
    elements.append(Spacer(1, 8*mm))
    note_style = ParagraphStyle("note", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#94a3b8"))
    elements.append(Paragraph(
        "Sjuklön beräknad enligt sjuklönelagen (1991:1047): 80% av ordinarie lön dag 1–14. "
        "Karensavdrag = 20% av genomsnittlig veckosjuklön. Vid sjukdom >14 dagar ansöker den anställde om sjukpenning från Försäkringskassan.",
        note_style
    ))

    doc.build(elements)
    fname = f"lonebesked_{row['name'].replace(' ','_')}_{start}_{end}.pdf"
    return Response(content=buf.getvalue(), media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{fname}"'})


# ---- Price List endpoints ----
DEFAULT_PRICES = [
    {"id": "hem", "service": "Hemstädning", "description": "Löpande hemstädning per timme", "unit": "tim", "price": 478, "is_rut_eligible": True, "is_active": True},
    {"id": "stor", "service": "Storstädning", "description": "Grundlig storstädning per timme", "unit": "tim", "price": 520, "is_rut_eligible": True, "is_active": True},
    {"id": "flytt", "service": "Flyttstädning", "description": "Komplett flyttstädning per kvm", "unit": "kvm", "price": 45, "is_rut_eligible": True, "is_active": True},
    {"id": "flytt_fast_lgh", "service": "Flyttstädning lägenhet (fast)", "description": "Fast pris 1-2 rok", "unit": "fast", "price": 2500, "is_rut_eligible": True, "is_active": True},
    {"id": "kontor", "service": "Kontorsstädning", "description": "Kontorsstädning per timme (ex. moms)", "unit": "tim", "price": 350, "is_rut_eligible": False, "is_active": True},
    {"id": "fonster", "service": "Fönsterputs", "description": "Per fönster (in- och utsida)", "unit": "st", "price": 80, "is_rut_eligible": True, "is_active": True},
    {"id": "ugn", "service": "Ugnstvätt", "description": "Djuprengöring av ugn", "unit": "st", "price": 400, "is_rut_eligible": True, "is_active": True},
    {"id": "kyl", "service": "Kyl/frys rengöring", "description": "Rengöring av kyl och frys", "unit": "st", "price": 300, "is_rut_eligible": True, "is_active": True},
    {"id": "bygg", "service": "Byggstädning", "description": "Byggstädning per timme (ex. moms)", "unit": "tim", "price": 450, "is_rut_eligible": False, "is_active": True},
    {"id": "trappa", "service": "Trappstädning", "description": "Per trapphus och tillfälle", "unit": "st", "price": 350, "is_rut_eligible": False, "is_active": True},
]


@api_router.get("/settings/pricelist")
async def get_pricelist(current=Depends(get_current_user)):
    doc = await db.settings.find_one({"_key": "pricelist"})
    if not doc or not doc.get("items"):
        return {"items": DEFAULT_PRICES}
    return {"items": doc["items"]}


@api_router.put("/settings/pricelist")
async def set_pricelist(payload: PriceListSettings, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["_key"] = "pricelist"
    await db.settings.update_one({"_key": "pricelist"}, {"$set": doc}, upsert=True)
    return payload



# ── Economy / Ekonomiöversikt ────────────────────────────────────────────────
def recalc_invoice(inv):
    """Return invoice with stored values - DB is already updated when reminder fee added"""
    return inv

@api_router.get("/economy/overview")
async def economy_overview(start: str, end: str, current=Depends(get_current_user)):
    ARBETSGIVARAVGIFT = 0.3142
    PRELSKATT = 0.30
    SEMESTERERSATTNING = 0.12

    # ── Invoices ──────────────────────────────────────────────────
    invoices = await db.invoices.find({
        "created_at": {"$gte": start, "$lte": end + "T23:59:59"}
    }).to_list(2000)

    # Core revenue calculations
    invoices = [i for i in invoices if i.get("invoice_number")]
    forsaljning_excl_moms = sum(i.get("subtotal") or 0 for i in invoices)
    utgaende_moms = sum(i.get("vat_amount") or 0 for i in invoices)
    rut_avdrag = sum(i.get("rut_deduction") or 0 for i in invoices)
    kund_betalar = sum(i.get("customer_pays") or 0 for i in invoices)
    betalda = sum(i.get("customer_pays") or 0 for i in invoices if i.get("status") == "paid")
    obetalda = sum(i.get("customer_pays") or 0 for i in invoices if i.get("status") not in ["paid", "cancelled"])

    # Påminnelseavgifter (no moms)
    paminnelse_avgifter = sum(
        sum(item.get("quantity",1) * item.get("unit_price",0)
            for item in inv.get("items",[])
            if "Påminnelseavgift" in item.get("service",""))
        for inv in invoices
    )

    invoice_count = len(invoices)
    paid_count = sum(1 for i in invoices if i.get("status") == "paid")

    # ── Payroll ───────────────────────────────────────────────────
    payroll_summary, payroll_settings = await build_payroll_summary(start, end)
    gross_salary = sum(
        r["normal_h"] * r["hourly_rate"] +
        r["ob1_h"] * payroll_settings.ob1_extra +
        r["ob2_h"] * payroll_settings.ob2_extra +
        r.get("sjuklon_net", 0)
        for r in payroll_summary.values()
    )
    arbetsgivaravgifter = round(gross_salary * ARBETSGIVARAVGIFT, 2)
    semesterersattning = round(gross_salary * SEMESTERERSATTNING, 2)
    prelskatt_estimate = round(gross_salary * PRELSKATT, 2)
    total_payroll_cost = round(gross_salary + arbetsgivaravgifter + semesterersattning, 2)
    utlagg_total = sum(r.get("expense_total", 0) for r in payroll_summary.values())

    # Per employee
    employee_costs = []
    for eid, row in payroll_summary.items():
        gross = (row["normal_h"]*row["hourly_rate"] + row["ob1_h"]*payroll_settings.ob1_extra +
                 row["ob2_h"]*payroll_settings.ob2_extra + row.get("sjuklon_net",0))
        employee_costs.append({
            "name": row["name"],
            "employment_type": row.get("employment_type","fastanstalld"),
            "normal_h": row["normal_h"],
            "hourly_rate": row["hourly_rate"],
            "gross_salary": round(gross, 2),
            "ag_avgift": round(gross * ARBETSGIVARAVGIFT, 2),
            "semester": round(gross * SEMESTERERSATTNING, 2),
            "prelskatt": round(gross * PRELSKATT, 2),
            "netto_lon": round(gross * (1 - PRELSKATT), 2),
            "total_cost": round(gross * (1 + ARBETSGIVARAVGIFT + SEMESTERERSATTNING), 2),
            "expense_total": row.get("expense_total", 0),
        })

    # ── Material costs ────────────────────────────────────────────
    real_costs = await db.costs.find({
        "date": {"$gte": start[:10], "$lte": end[:10]}
    }).to_list(1000)
    material_total_incl = sum(c.get("amount", 0) for c in real_costs)
    ingaende_moms_mat = sum(
        c.get("amount",0) - c.get("amount",0)/(1+c.get("moms_rate",25)/100)
        for c in real_costs
    )
    material_excl_moms = material_total_incl - ingaende_moms_mat

    expenses = await db.expenses.find({
        "date": {"$gte": start[:10], "$lte": end[:10]}
    }).to_list(1000)
    ingaende_moms_exp = sum(
        e.get("amount",0) - e.get("amount",0)/(1+e.get("moms_rate",0)/100)
        for e in expenses if e.get("moms_rate",0) > 0
    )
    ingaende_moms_total = round(ingaende_moms_mat + ingaende_moms_exp, 2)
    # Incidents / Skador (open damages count as costs)
    incidents = await db.incidents.find({"date": {"$gte": start[:10], "$lte": end[:10]}}).to_list(1000)
    skador_total = round(sum(i.get("cost", 0) for i in incidents if i.get("status") != "closed"), 2)
    skador_count = len(incidents)

    # ── Moms ─────────────────────────────────────────────────────
    moms_att_betala = round(utgaende_moms - ingaende_moms_total, 2)

    # ── AGI ──────────────────────────────────────────────────────
    agi_to_pay = round(arbetsgivaravgifter + prelskatt_estimate, 2)

    # ── Profit ───────────────────────────────────────────────────
    total_intakter = forsaljning_excl_moms + paminnelse_avgifter
    total_kostnader = total_payroll_cost + utlagg_total + material_excl_moms + skador_total
    rorelseresultat = round(total_intakter - total_kostnader, 2)
    rorselsemarginal = round((rorelseresultat / total_intakter * 100) if total_intakter > 0 else 0, 1)

    # ── Costs by category ─────────────────────────────────────────
    costs_by_category = {}
    for c in real_costs:
        cat = c.get("category","material")
        costs_by_category[cat] = costs_by_category.get(cat,0) + c.get("amount",0)

    return {
        "period": {"start": start, "end": end},
        "revenue": {
            "forsaljning_excl_moms": round(forsaljning_excl_moms, 2),
            "paminnelse_avgifter": round(paminnelse_avgifter, 2),
            "total_intakter": round(total_intakter, 2),
            "utgaende_moms": round(utgaende_moms, 2),
            "rut_avdrag": round(rut_avdrag, 2),
            "kund_betalar": round(kund_betalar, 2),
            "betalda": round(betalda, 2),
            "obetalda": round(obetalda, 2),
            "invoice_count": invoice_count,
            "paid_count": paid_count,
            # Legacy fields for compatibility
            "excl_vat": round(forsaljning_excl_moms, 2),
            "vat_collected": round(utgaende_moms, 2),
            "rut_deductions": round(rut_avdrag, 2),
            "total_invoiced": round(kund_betalar, 2),
            "paid": round(betalda, 2),
            "unpaid": round(obetalda, 2),
            "reminder_fees": round(paminnelse_avgifter, 2),
        },
        "payroll": {
            "gross_salary": round(gross_salary, 2),
            "arbetsgivaravgifter": arbetsgivaravgifter,
            "arbetsgivaravgift_pct": ARBETSGIVARAVGIFT * 100,
            "semesterersattning": semesterersattning,
            "prelskatt_estimate": prelskatt_estimate,
            "total_payroll_cost": total_payroll_cost,
            "utlagg": round(utlagg_total, 2),
            "employees": employee_costs,
        },
        "material_costs": {
            "total_incl_moms": round(material_total_incl, 2),
            "total_excl_moms": round(material_excl_moms, 2),
            "ingaende_moms": round(ingaende_moms_mat, 2),
            "by_category": {k: round(v,2) for k,v in costs_by_category.items()},
            "count": len(real_costs),
        },
        "incidents": {
            "total": skador_total,
            "count": skador_count,
        },
        "vat": {
            "collected": round(utgaende_moms, 2),
            "ingoing_estimate": round(ingaende_moms_total, 2),
            "to_pay": round(moms_att_betala, 2),
            # Legacy
            "ingoing_estimate": round(ingaende_moms_total, 2),
        },
        "obligations": {
            "salaries_to_pay": round(gross_salary * (1-PRELSKATT), 2),
            "agi_to_pay": agi_to_pay,
            "arbetsgivaravgifter": arbetsgivaravgifter,
            "prelskatt_estimate": prelskatt_estimate,
            "vat_to_pay": round(moms_att_betala, 2),
            "total_to_pay": round(gross_salary*(1-PRELSKATT) + agi_to_pay + moms_att_betala, 2),
        },
        "result": {
            "revenue_excl_vat": round(total_intakter, 2),
            "total_costs": round(total_kostnader, 2),
            "operating_profit": rorelseresultat,
            "profit_margin": rorselsemarginal,
        },
        "constants": {
            "arbetsgivaravgift_pct": ARBETSGIVARAVGIFT * 100,
            "prelskatt_pct": PRELSKATT * 100,
            "semesterersattning_pct": SEMESTERERSATTNING * 100,
        }
    }


# ── CRM - Kundregister ────────────────────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    personnummer: Optional[str] = None
    customer_type: str = "private"  # private / company
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    personnummer: Optional[str] = None
    customer_type: Optional[str] = None
    notes: Optional[str] = None

class Customer(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    personnummer: Optional[str] = None
    customer_type: str = "private"
    notes: Optional[str] = None
    booking_count: int = 0
    invoice_count: int = 0
    total_invoiced: float = 0.0
    last_booking: Optional[str] = None
    created_at: str


@api_router.post("/customers", response_model=Customer, response_model_by_alias=False)
async def create_customer(payload: CustomerCreate, current=Depends(get_current_user)):
    # Check if customer already exists by email or phone
    query = {}
    if payload.email:
        query["email"] = payload.email.lower()
    elif payload.phone:
        query["phone"] = payload.phone
    if query:
        existing = await db.customers.find_one(query)
        if existing:
            existing["_id"] = str(existing["_id"])
            return Customer(**existing)
    doc = payload.model_dump()
    doc = sanitize_payload(doc, ["name", "phone", "address", "personnummer", "notes"], max_len=500)
    if doc.get("email"):
        doc["email"] = doc["email"].lower()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["booking_count"] = 0
    doc["invoice_count"] = 0
    doc["total_invoiced"] = 0.0
    doc["last_booking"] = None
    result = await db.customers.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Customer(**doc)


async def enrich_customer(c: dict) -> dict:
    cid = str(c["_id"])
    c["_id"] = cid
    email = (c.get("email") or "").strip().lower()
    phone = (c.get("phone") or "").strip()

    # Only query if we have actual identifying info
    bookings = []
    invoices = []

    if email and phone:
        bookings = await db.bookings.find({"$or": [{"email": email}, {"phone": phone}]}).sort("created_at", -1).to_list(1000)
    elif email:
        bookings = await db.bookings.find({"email": email}).sort("created_at", -1).to_list(1000)
    elif phone:
        bookings = await db.bookings.find({"phone": phone}).sort("created_at", -1).to_list(1000)

    if email:
        invoices = await db.invoices.find({"customer_email": email}).to_list(1000)

    c["booking_count"] = len(bookings)
    c["last_booking"] = bookings[0].get("preferred_date") or bookings[0]["created_at"][:10] if bookings else None
    c["invoice_count"] = len(invoices)
    c["total_invoiced"] = sum(i.get("customer_pays", 0) for i in invoices)
    return c


@api_router.get("/customers", response_model=List[Customer], response_model_by_alias=False)
async def list_customers(current=Depends(get_current_user)):
    docs = await db.customers.find().sort("name", 1).to_list(2000)
    result = []
    for d in docs:
        enriched = await enrich_customer(d)
        result.append(Customer(**enriched))
    return result


# ── Customers Excel Export ────────────────────────────────────────────────────
@api_router.get("/customers/export-xlsx")
async def export_customers_xlsx(current=Depends(get_current_user)):
    """Export customers to Excel"""
    customers = await db.customers.find().sort("name", 1).to_list(5000)
    invoices = await db.invoices.find().to_list(5000)

    # Calculate stats per customer
    inv_by_customer = {}
    for inv in invoices:
        name = inv.get("customer_name","")
        if name not in inv_by_customer:
            inv_by_customer[name] = {"count":0,"total":0,"paid":0,"last":""}
        inv_by_customer[name]["count"] += 1
        inv_by_customer[name]["total"] += inv.get("customer_pays",0)
        if inv.get("status") == "paid":
            inv_by_customer[name]["paid"] += inv.get("customer_pays",0)
        date = inv.get("created_at","")[:10]
        if date > inv_by_customer[name]["last"]:
            inv_by_customer[name]["last"] = date

    wb = Workbook()
    ws = wb.active
    ws.title = "Kunder"

    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    headers = [
        "Namn", "E-post", "Telefon", "Adress", "Personnummer",
        "Typ", "Antal fakturor", "Totalt fakturerat (kr)",
        "Totalt betalt (kr)", "Senaste faktura",
    ]
    ws.append(headers)

    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for c in customers:
        name = c.get("name","")
        stats = inv_by_customer.get(name, {"count":0,"total":0,"paid":0,"last":"-"})
        ws.append([
            name,
            c.get("email",""),
            c.get("phone",""),
            c.get("address",""),
            c.get("personnummer",""),
            "Företag" if c.get("customer_type") == "company" else "Privat",
            stats["count"],
            round(stats["total"],2),
            round(stats["paid"],2),
            stats["last"] or "-",
        ])
        for cell in ws[ws.max_row]:
            cell.font = Font(size=9)

    col_widths = [25, 25, 15, 30, 15, 10, 16, 22, 20, 15]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width

    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="kunder.xlsx"'}
    )




# ── Customers PDF Export ──────────────────────────────────────────────────────
@api_router.get("/customers/export-pdf")
async def export_customers_pdf(current=Depends(get_current_user)):
    """Export customers list to PDF"""
    customers = await db.customers.find().sort("name", 1).to_list(5000)
    invoices = await db.invoices.find().to_list(5000)
    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"

    # Stats per customer
    inv_by_customer = {}
    for inv in invoices:
        name = inv.get("customer_name","")
        if name not in inv_by_customer:
            inv_by_customer[name] = {"count":0,"total":0,"paid":0,"last":""}
        inv_by_customer[name]["count"] += 1
        inv_by_customer[name]["total"] += inv.get("customer_pays",0)
        if inv.get("status") == "paid":
            inv_by_customer[name]["paid"] += inv.get("customer_pays",0)
        date = inv.get("created_at","")[:10]
        if date > inv_by_customer[name]["last"]:
            inv_by_customer[name]["last"] = date

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm,
        title="Kundregister", author=company)
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    page_w = A4[0]
    elements = []

    # Header
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ps("h", fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>KUNDREGISTER</b><br/>Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[100*mm, None])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    elements.append(hdr)
    elements.append(Spacer(1,3*mm))

    # Summary
    total_invoiced = sum(s["total"] for s in inv_by_customer.values())
    active = sum(1 for s in inv_by_customer.values() if s["count"] > 0)
    sum_data = [[
        Paragraph(f"<b>Antal kunder</b><br/>{len(customers)} st", ps("sb", fontSize=9)),
        Paragraph(f"<b>Aktiva kunder</b><br/>{active} st", ps("sb", fontSize=9, textColor=colors.HexColor("#15803d"))),
        Paragraph(f"<b>Totalt fakturerat</b><br/>{total_invoiced:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#1e40af"))),
    ]]
    sum_tbl = Table(sum_data, colWidths=[(page_w-40*mm)/3]*3)
    sum_tbl.setStyle(TableStyle([
        ("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
        ("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))
    elements.append(sum_tbl)
    elements.append(Spacer(1,5*mm))

    # Customer table
    data = [["Namn", "E-post", "Telefon", "Typ", "Fakturor", "Totalt (kr)", "Senaste faktura"]]
    for c in customers:
        name = c.get("name","")
        stats = inv_by_customer.get(name, {"count":0,"total":0,"paid":0,"last":"-"})
        data.append([
            name,
            c.get("email","") or "-",
            c.get("phone","") or "-",
            "Företag" if c.get("customer_type") == "company" else "Privat",
            str(stats["count"]),
            f'{stats["total"]:.2f}' if stats["total"] > 0 else "-",
            stats["last"] or "-",
        ])

    tbl = Table(data, colWidths=[40*mm, 48*mm, 25*mm, 14*mm, 14*mm, 20*mm, 25*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),8.5),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
        ("ALIGN",(4,0),(5,-1),"RIGHT"),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1,4*mm))
    elements.append(Paragraph(
        f"{company}  ·  Kundregister  ·  {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"))
    ))

    doc.build(elements)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="kundregister.pdf"'}
    )


@api_router.get("/customers/{customer_id}", response_model_by_alias=False)
async def get_customer(customer_id: str, current=Depends(get_current_user)):
    doc = await db.customers.find_one({"_id": to_object_id(customer_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Kund hittades inte")
    enriched = await enrich_customer(doc)
    email = enriched.get("email", "")
    phone = enriched.get("phone", "")
    query = {}
    if email:
        query = {"$or": [{"email": email}, {"phone": phone}]} if phone else {"email": email}
    elif phone:
        query = {"phone": phone}
    bookings = await db.bookings.find(query).sort("created_at", -1).to_list(100) if query else []
    invoices = await db.invoices.find({"customer_email": email}).sort("invoice_number", -1).to_list(100) if email else []
    for b in bookings:
        b["_id"] = str(b["_id"])
    for i in invoices:
        i["_id"] = str(i["_id"])
    return {
        "customer": Customer(**enriched).model_dump(),
        "bookings": bookings,
        "invoices": invoices,
    }


@api_router.patch("/customers/{customer_id}", response_model=Customer, response_model_by_alias=False)
async def update_customer(customer_id: str, payload: CustomerUpdate, current=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates = sanitize_payload(updates, ["name", "phone", "address", "personnummer", "notes"], max_len=500)
    if updates:
        await db.customers.update_one({"_id": to_object_id(customer_id)}, {"$set": updates})
    doc = await db.customers.find_one({"_id": to_object_id(customer_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Kund hittades inte")
    enriched = await enrich_customer(doc)
    return Customer(**enriched)


@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current=Depends(get_current_user)):
    result = await db.customers.delete_one({"_id": to_object_id(customer_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kund hittades inte")
    return {"success": True}


@api_router.post("/customers/import-from-bookings")
async def import_customers_from_bookings(current=Depends(get_current_user)):
    bookings = await db.bookings.find().to_list(5000)
    created = 0
    updated = 0
    for b in bookings:
        email = b.get("email", "").lower()
        phone = b.get("phone", "")
        name = b.get("name", "")
        if not name:
            continue
        existing = None
        if email:
            existing = await db.customers.find_one({"email": email})
        if not existing and phone:
            existing = await db.customers.find_one({"phone": phone})
        if existing:
            # Update if missing info
            updates = {}
            if not existing.get("email") and email:
                updates["email"] = email
            if not existing.get("phone") and phone:
                updates["phone"] = phone
            if updates:
                await db.customers.update_one({"_id": existing["_id"]}, {"$set": updates})
                updated += 1
        else:
            doc = {
                "name": name,
                "email": email or None,
                "phone": phone or None,
                "address": None,
                "personnummer": None,
                "customer_type": "private",
                "notes": None,
                "booking_count": 0,
                "invoice_count": 0,
                "total_invoiced": 0.0,
                "last_booking": None,
                "created_at": b.get("created_at", datetime.now(timezone.utc).isoformat()),
            }
            await db.customers.insert_one(doc)
            created += 1
    return {"created": created, "updated": updated}


# ── Dashboard ─────────────────────────────────────────────────────────────────
@api_router.get("/dashboard")
async def dashboard(current=Depends(get_current_user)):
    today = DateClass.today().isoformat()
    week_start = (DateClass.today() - timedelta(days=DateClass.today().weekday())).isoformat()
    week_end = (DateClass.today() + timedelta(days=6 - DateClass.today().weekday())).isoformat()
    month_start = DateClass.today().replace(day=1).isoformat()
    month_end = DateClass.today().isoformat()

    # ── Today's shifts ──────────────────────────────────────────────
    todays_shifts = await db.shifts.find({"date": today}).sort("start_time", 1).to_list(50)
    employees = await db.employees.find().to_list(100)
    emp_map = {str(e["_id"]): e for e in employees}
    for s in todays_shifts:
        s["_id"] = str(s["_id"])
        emp = emp_map.get(s["employee_id"], {})
        s["employee_name"] = emp.get("name", "Okänd")
        s["employee_color"] = emp.get("color", "#141414")

    # ── New bookings ─────────────────────────────────────────────────
    new_bookings = await db.bookings.find({"status": "new"}).sort("created_at", -1).to_list(20)
    for b in new_bookings:
        b["_id"] = str(b["_id"])

    # ── Upcoming bookings (next 7 days) ──────────────────────────────
    upcoming = await db.bookings.find({
        "preferred_date": {"$gte": today, "$lte": week_end},
        "status": {"$ne": "done"}
    }).sort("preferred_date", 1).to_list(10)
    for b in upcoming:
        b["_id"] = str(b["_id"])

    # ── Unpaid invoices ───────────────────────────────────────────────
    unpaid = await db.invoices.find({"status": {"$in": ["draft","sent","overdue"]}}).sort("due_date", 1).to_list(20)
    for i in unpaid:
        i["_id"] = str(i["_id"])
    unpaid_total = sum(i.get("customer_pays", 0) for i in unpaid)
    overdue = [i for i in unpaid if i.get("due_date", "9999") < today]

    # ── This week stats ───────────────────────────────────────────────
    week_shifts = await db.shifts.find({"date": {"$gte": week_start, "$lte": week_end}}).to_list(500)
    week_bookings = await db.bookings.find({"created_at": {"$gte": week_start}}).to_list(500)

    # ── This month stats ──────────────────────────────────────────────
    month_invoices = await db.invoices.find({
        "created_at": {"$gte": month_start}
    }).to_list(500)
    month_revenue = sum(i.get("subtotal", 0) for i in month_invoices)
    month_paid = sum(i.get("customer_pays", 0) for i in month_invoices if i.get("status") == "paid")

    # ── Sick employees today ──────────────────────────────────────────
    sick_today = await db.absences.find({
        "start_date": {"$lte": today},
        "end_date": {"$gte": today},
        "type": "Sjuk"
    }).to_list(20)
    sick_names = []
    for a in sick_today:
        emp = emp_map.get(a["employee_id"], {})
        sick_names.append(emp.get("name", "Okänd"))

    # ── Absent employees today (all types) ────────────────────────────
    absent_today = await db.absences.find({
        "start_date": {"$lte": today},
        "end_date": {"$gte": today},
    }).to_list(20)

    # ── Material costs this month ─────────────────────────────────────
    month_costs = await db.costs.find({
        "date": {"$gte": month_start, "$lte": month_end}
    }).to_list(500)
    month_material_cost = sum(c.get("amount", 0) for c in month_costs)

    return {
        "today": today,
        "todays_shifts": todays_shifts,
        "todays_shift_count": len(todays_shifts),
        "sick_today": sick_names,
        "absent_today_count": len(absent_today),
        "new_bookings": new_bookings[:5],
        "new_bookings_count": len(new_bookings),
        "upcoming_bookings": upcoming,
        "unpaid_invoices": unpaid[:5],
        "unpaid_invoices_count": len(unpaid),
        "unpaid_total": round(unpaid_total, 2),
        "overdue_count": len(overdue),
        "week": {
            "shifts": len(week_shifts),
            "new_bookings": len(week_bookings),
            "start": week_start,
            "end": week_end,
        },
        "month": {
            "revenue": round(month_revenue, 2),
            "paid": round(month_paid, 2),
            "invoice_count": len(month_invoices),
        },
        "employee_count": len(employees),
        "month_material_cost": round(month_material_cost, 2),
        "month_costs_count": len(month_costs),
    }


# ── Password Reset ────────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    # Always return success to avoid email enumeration
    if not user:
        return {"success": True, "message": "Om e-postadressen finns skickas ett återställningsmail."}

    import secrets
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

    await db.password_resets.insert_one({
        "email": email,
        "token": token,
        "expires": expires,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    reset_url = f"https://purenorth-stad.vercel.app/admin?reset_token={token}"

    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    try:
        resend.Emails.send({
            "from": "PureNorth Städ <onboarding@resend.dev>",
            "to": email,
            "subject": "Återställ ditt lösenord — PureNorth Städ",
            "html": f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
              <h2 style="color:#141414;margin-bottom:8px;">Återställ lösenord</h2>
              <p style="color:#64748b;margin-bottom:24px;">Klicka på knappen nedan för att skapa ett nytt lösenord. Länken är giltig i 2 timmar.</p>
              <a href="{reset_url}" style="display:inline-block;background:#141414;color:white;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:600;font-size:15px;">
                Återställ lösenord
              </a>
              <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Om du inte begärt detta kan du ignorera detta mail.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
              <p style="color:#94a3b8;font-size:12px;">PureNorth Städ — Miljövänlig städning i Umeå</p>
            </div>
            """
        })
    except Exception as e:
        logger.error("Failed to send reset email: %s", e)

    return {"success": True, "message": "Om e-postadressen finns skickas ett återställningsmail."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    now = datetime.now(timezone.utc).isoformat()
    reset_doc = await db.password_resets.find_one({
        "token": payload.token,
        "used": False,
        "expires": {"$gt": now},
    })
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Ogiltig eller utgången återställningslänk.")

    email = reset_doc["email"]
    new_hash = hash_password(payload.new_password)
    await db.users.update_one({"email": email}, {"$set": {"password_hash": new_hash}})
    await db.password_resets.update_one({"_id": reset_doc["_id"]}, {"$set": {"used": True}})

    return {"success": True, "message": "Lösenordet har uppdaterats. Du kan nu logga in."}


# ── Recurring Bookings ────────────────────────────────────────────────────────
class RecurringBookingCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = "admin@purenorth.se"
    phone: str = Field(..., min_length=1)
    kvm: Optional[str] = None
    services: List[str] = Field(default_factory=list)
    preferred_date: str  # first occurrence YYYY-MM-DD
    other_description: Optional[str] = None
    invoice_id: Optional[str] = None
    recurrence: str = "weekly"  # weekly, biweekly, monthly
    occurrences: int = Field(default=6, ge=2, le=52)


@api_router.post("/bookings/recurring")
async def create_recurring_bookings(payload: RecurringBookingCreate, current=Depends(get_current_user)):
    from datetime import date as DateClass2
    y, m, d = map(int, payload.preferred_date.split("-"))
    start_date = DateClass2(y, m, d)

    if payload.recurrence == "weekly":
        delta = timedelta(weeks=1)
    elif payload.recurrence == "biweekly":
        delta = timedelta(weeks=2)
    else:  # monthly
        delta = None  # handled separately

    created = []
    current_date = start_date

    for i in range(payload.occurrences):
        if payload.recurrence == "monthly":
            # Add months
            month = start_date.month + i
            year = start_date.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            import calendar
            day = min(start_date.day, calendar.monthrange(year, month)[1])
            current_date = DateClass2(year, month, day)
        
        doc = {
            "name": payload.name,
            "email": payload.email,
            "phone": payload.phone,
            "kvm": payload.kvm,
            "services": payload.services,
            "preferred_date": current_date.isoformat(),
            "other_description": payload.other_description,
            "status": "new",
            "is_recurring": True,
            "recurrence": payload.recurrence,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.bookings.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        created.append(doc)

        if payload.recurrence != "monthly":
            current_date += delta

    return {"created": len(created), "bookings": [{"id": str(b["_id"]), "date": b["preferred_date"]} for b in created]}


# ── Statistics / Analytics ───────────────────────────────────────────────────
@api_router.get("/stats/overview")
async def stats_overview(months: int = 6, current=Depends(get_current_user)):
    from datetime import date as D
    today = D.today()

    # Build last N months
    monthly = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_start = f"{y}-{m:02d}-01"
        import calendar
        last_day = calendar.monthrange(y, m)[1]
        month_end = f"{y}-{m:02d}-{last_day:02d}"
        label = f"{['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][m-1]} {y}"

        # Revenue
        invoices = await db.invoices.find({
            "created_at": {"$gte": month_start, "$lte": month_end + "T23:59:59"}
        }).to_list(500)
        revenue = sum(i.get("subtotal", 0) for i in invoices)
        paid = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") == "paid")

        # Bookings
        bookings = await db.bookings.find({
            "created_at": {"$gte": month_start, "$lte": month_end + "T23:59:59"}
        }).to_list(500)
        new_b = sum(1 for b in bookings if b.get("status") == "new")
        done_b = sum(1 for b in bookings if b.get("status") == "done")

        # Shifts / hours
        shifts = await db.shifts.find({"date": {"$gte": month_start, "$lte": month_end}}).to_list(500)
        total_hours = 0
        for s in shifts:
            try:
                sh, sm = map(int, s["start_time"].split(":"))
                eh, em = map(int, s["end_time"].split(":"))
                h = (eh * 60 + em - sh * 60 - sm) / 60
                if h < 0: h += 24
                total_hours += h
            except:
                pass

        monthly.append({
            "label": label,
            "revenue": round(revenue, 2),
            "paid": round(paid, 2),
            "bookings": len(bookings),
            "bookings_new": new_b,
            "bookings_done": done_b,
            "shifts": len(shifts),
            "hours": round(total_hours, 1),
        })

    # Top services
    all_bookings = await db.bookings.find().to_list(5000)
    service_count = {}
    for b in all_bookings:
        for s in b.get("services", []):
            service_count[s] = service_count.get(s, 0) + 1
    top_services = sorted(service_count.items(), key=lambda x: -x[1])[:6]

    # Booking status breakdown
    status_count = {"new": 0, "contacted": 0, "done": 0}
    for b in all_bookings:
        st = b.get("status", "new")
        if st in status_count:
            status_count[st] += 1

    # Employee hours this month
    month_start_curr = f"{today.year}-{today.month:02d}-01"
    import calendar as cal
    last_day_curr = cal.monthrange(today.year, today.month)[1]
    month_end_curr = f"{today.year}-{today.month:02d}-{last_day_curr:02d}"
    curr_shifts = await db.shifts.find({"date": {"$gte": month_start_curr, "$lte": month_end_curr}}).to_list(500)
    employees = await db.employees.find().to_list(100)
    emp_hours = {}
    emp_map = {str(e["_id"]): e["name"] for e in employees}
    for s in curr_shifts:
        eid = s["employee_id"]
        try:
            sh, sm = map(int, s["start_time"].split(":"))
            eh, em = map(int, s["end_time"].split(":"))
            h = (eh * 60 + em - sh * 60 - sm) / 60
            if h < 0: h += 24
            emp_hours[eid] = emp_hours.get(eid, 0) + h
        except:
            pass
    employee_hours = [{"name": emp_map.get(eid, "Okänd"), "hours": round(h, 1)} for eid, h in sorted(emp_hours.items(), key=lambda x: -x[1])]

    return {
        "monthly": monthly,
        "top_services": [{"service": s, "count": c} for s, c in top_services],
        "status_breakdown": status_count,
        "employee_hours_this_month": employee_hours,
        "totals": {
            "revenue": round(sum(m["revenue"] for m in monthly), 2),
            "bookings": sum(m["bookings"] for m in monthly),
            "hours": round(sum(m["hours"] for m in monthly), 1),
        }
    }


@api_router.get("/economy/report-pdf")
async def economy_report_pdf(start: str, end: str, current=Depends(get_current_user)):
    # Reuse economy overview data
    ARBETSGIVARAVGIFT = 0.3142
    PRELSKATT = 0.30
    SEMESTERERSATTNING = 0.12

    invoices = await db.invoices.find({
        "created_at": {"$gte": start, "$lte": end + "T23:59:59"}
    }).to_list(2000)

    revenue_excl_vat = sum(i.get("subtotal", 0) for i in invoices)
    vat_collected = sum(i.get("vat_amount", 0) for i in invoices)
    rut_deductions = sum(i.get("rut_deduction", 0) for i in invoices)
    total_invoiced = sum(i.get("total_amount", 0) for i in invoices)
    paid_invoices = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") == "paid")
    unpaid_invoices = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") != "paid")

    payroll_summary, payroll_settings = await build_payroll_summary(start, end)
    gross_salary = sum(
        r["normal_h"] * r["hourly_rate"] +
        r["ob1_h"] * payroll_settings.ob1_extra +
        r["ob2_h"] * payroll_settings.ob2_extra +
        r.get("sjuklon_net", 0)
        for r in payroll_summary.values()
    )
    arbetsgivaravgifter = round(gross_salary * ARBETSGIVARAVGIFT, 2)
    semesterersattning = round(gross_salary * SEMESTERERSATTNING, 2)
    prelskatt = round(gross_salary * PRELSKATT, 2)
    total_payroll_cost = round(gross_salary + arbetsgivaravgifter + semesterersattning, 2)
    utlagg_total = sum(r.get("expense_total", 0) for r in payroll_summary.values())
    paminnelse_fees = sum(
        sum(item.get("quantity",1)*item.get("unit_price",0)
            for item in inv.get("items",[])
            if "Påminnelseavgift" in item.get("service",""))
        for inv in invoices
    )
    total_intakter_pdf = revenue_excl_vat + paminnelse_fees
    operating_profit = round(total_intakter_pdf - total_payroll_cost - utlagg_total, 2)
    profit_margin = round((operating_profit / total_intakter_pdf * 100) if total_intakter_pdf > 0 else 0, 1)
    vat_to_pay = round(vat_collected, 2)
    agi_to_pay = round(arbetsgivaravgifter + prelskatt, 2)

    inv_settings = await get_invoice_settings_obj()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"Ekonomirapport {start} - {end}",
            author="PureNorth Städ")
    styles = getSampleStyleSheet()
    elements = []

    # Header
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=20)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#64748b"))
    elements.append(Paragraph(inv_settings.company_name or "Ekonomirapport", title_style))
    elements.append(Paragraph(f"Ekonomirapport · Period: {start} – {end}", sub_style))
    elements.append(Paragraph(f"Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC", sub_style))
    elements.append(Spacer(1, 8*mm))

    def section(title):
        elements.append(Spacer(1, 4*mm))
        elements.append(Paragraph(title, styles["Heading2"]))
        elements.append(Spacer(1, 2*mm))

    def table2(rows, highlight_last=True):
        t = Table(rows, colWidths=[110*mm, 50*mm])
        style = [
            ("FONTSIZE", (0,0),(-1,-1), 10),
            ("ALIGN", (1,0),(-1,-1), "RIGHT"),
            ("GRID", (0,0),(-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("TOPPADDING", (0,0),(-1,-1), 6),
            ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#F8FAFC")),
            ("FONTNAME", (0,0),(-1,0), "Helvetica-Bold"),
        ]
        if highlight_last:
            style += [
                ("FONTNAME", (0,-1),(-1,-1), "Helvetica-Bold"),
                ("LINEABOVE", (0,-1),(-1,-1), 1, colors.HexColor("#141414")),
            ]
        t.setStyle(TableStyle(style))
        elements.append(t)

    # Calculate reminder fees and correct totals
    kund_betalar = sum(i.get("customer_pays", 0) for i in invoices)
    betalda = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") == "paid")
    obetalda = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") not in ["paid","cancelled"])

    # Revenue
    section("Intäkter")
    rev_rows = [
        ["Post", "Belopp"],
        ["Försäljning tjänster (exkl. moms)", f"{revenue_excl_vat:,.2f} kr"],
    ]
    if paminnelse_fees > 0:
        rev_rows.append(["Påminnelseavgifter (ingen moms)", f"{paminnelse_fees:,.2f} kr"])
    rev_rows += [
        ["Utgående moms (25%)", f"{vat_collected:,.2f} kr"],
        ["RUT-avdrag (betalas av Skatteverket)", f"{rut_deductions:,.2f} kr"],
        ["Kund betalar totalt", f"{kund_betalar:,.2f} kr"],
        ["Betalda fakturor", f"{betalda:,.2f} kr"],
        ["Obetalda fakturor", f"{obetalda:,.2f} kr"],
        ["TOTALA INTÄKTER (exkl. moms)", f"{revenue_excl_vat + paminnelse_fees:,.2f} kr"],
    ]
    table2(rev_rows)

    # Payroll
    section("Personalkostnader")
    table2([
        ["Post", "Belopp"],
        ["Bruttolöner", f"{gross_salary:,.2f} kr"],
        [f"Arbetsgivaravgifter ({ARBETSGIVARAVGIFT*100:.2f}%)", f"{arbetsgivaravgifter:,.2f} kr"],
        [f"Semesterersättning ({SEMESTERERSATTNING*100:.0f}%)", f"{semesterersattning:,.2f} kr"],
        ["Utlägg", f"{utlagg_total:,.2f} kr"],
        ["TOTAL PERSONALKOSTNAD", f"{total_payroll_cost + utlagg_total:,.2f} kr"],
    ])

    # Per employee
    if payroll_summary:
        section("Kostnad per anställd")
        emp_rows = [["Anställd", "Typ", "Timmar", "Bruttolön", "Arb.avg", "Total"]]
        for row in payroll_summary.values():
            gross = row["normal_h"]*row["hourly_rate"] + row["ob1_h"]*payroll_settings.ob1_extra + row["ob2_h"]*payroll_settings.ob2_extra
            ag = round(gross * ARBETSGIVARAVGIFT, 2)
            sem = round(gross * SEMESTERERSATTNING, 2)
            total_c = round(gross + ag + sem, 2)
            emp_type = "Vikarie" if row.get("employment_type") == "vikarie" else "Fast"
            hours = round(row["normal_h"] + row["ob1_h"] + row["ob2_h"], 1)
            emp_rows.append([row["name"], emp_type, f"{hours} h", f"{gross:,.0f} kr", f"{ag:,.0f} kr", f"{total_c:,.0f} kr"])
        t = Table(emp_rows, colWidths=[45*mm, 18*mm, 18*mm, 26*mm, 22*mm, 26*mm])
        t.setStyle(TableStyle([
            ("FONTSIZE", (0,0),(-1,-1), 9),
            ("ALIGN", (2,0),(-1,-1), "RIGHT"),
            ("GRID", (0,0),(-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#141414")),
            ("TEXTCOLOR", (0,0),(-1,0), colors.white),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("TOPPADDING", (0,0),(-1,-1), 5),
        ]))
        elements.append(t)

    # Moms
    section("🧾 Momsredovisning")
    table2([
        ["Post", "Belopp"],
        ["Utgående moms", f"{vat_collected:,.2f} kr"],
        ["MOMS ATT BETALA", f"{vat_to_pay:,.2f} kr"],
    ])

    # Obligations
    section("📋 Skyldigheter till Skatteverket")
    table2([
        ["Post", "Belopp"],
        ["Arbetsgivaravgifter", f"{arbetsgivaravgifter:,.2f} kr"],
        [f"Preliminärskatt (ca {PRELSKATT*100:.0f}%)", f"{prelskatt:,.2f} kr"],
        ["AGI totalt (senast 12:e varje månad)", f"{agi_to_pay:,.2f} kr"],
        ["Moms (kvartalsvis)", f"{vat_to_pay:,.2f} kr"],
        ["TOTALT TILL SKATTEVERKET", f"{agi_to_pay + vat_to_pay:,.2f} kr"],
    ])

    # Result
    section("📊 Rörelseresultat")
    profit_color = colors.HexColor("#166534") if operating_profit >= 0 else colors.HexColor("#be123c")
    table2([
        ["Post", "Belopp"],
        ["Intäkter (exkl. moms)", f"{total_intakter_pdf:,.2f} kr"],
        ["Personalkostnader", f"-{total_payroll_cost + utlagg_total:,.2f} kr"],
        ["RÖRELSERESULTAT", f"{operating_profit:,.2f} kr ({profit_margin}%)"],
    ])

    # Footer note
    elements.append(Spacer(1, 10*mm))
    note_style = ParagraphStyle("note", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#94a3b8"))
    elements.append(Paragraph(
        "⚠️ Denna rapport är ett uppskattningsverktyg. Bokföringsskatt (20,6%) ingår inte. "
        "Kontrollera alltid med din redovisningskonsult eller revisor. "
        f"Arbetsgivaravgifter: {ARBETSGIVARAVGIFT*100:.2f}% (Skatteverket 2026). "
        f"Semesterersättning: {SEMESTERERSATTNING*100:.0f}% (semesterlagen).",
        note_style
    ))

    doc.build(elements)
    fname = f"ekonomirapport_{start}_{end}.pdf"
    return Response(content=buf.getvalue(), media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{fname}"'})


# ── User Management ───────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)
    role: str = "staff"  # "admin", "staff", or "sales"
    employee_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: str
    name: str
    role: str
    employee_id: Optional[str] = None
    created_at: str


async def require_admin(current=Depends(get_current_user)):
    if current.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Åtkomst nekad. Kräver admin-behörighet.")
    return current


@api_router.get("/users", response_model=List[UserOut], response_model_by_alias=False)
async def list_users(current=Depends(require_admin)):
    docs = await db.users.find().sort("created_at", 1).to_list(100)
    return [UserOut(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.post("/users", response_model=UserOut, response_model_by_alias=False)
async def create_user(payload: UserCreate, current=Depends(require_admin)):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="E-postadressen används redan.")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role if payload.role in ("admin", "staff", "sales") else "staff",
        "employee_id": payload.employee_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return UserOut(**doc)


@api_router.patch("/users/{user_id}", response_model=UserOut, response_model_by_alias=False)
async def update_user(user_id: str, payload: UserUpdate, current=Depends(require_admin)):
    updates = {}
    if payload.name:
        updates["name"] = payload.name
    if payload.role and payload.role in ("admin", "staff", "sales"):
        updates["role"] = payload.role
    if payload.password:
        updates["password_hash"] = hash_password(payload.password)
    if updates:
        await db.users.update_one({"_id": to_object_id(user_id)}, {"$set": updates})
    doc = await db.users.find_one({"_id": to_object_id(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Användare hittades inte")
    doc["_id"] = str(doc["_id"])
    return UserOut(**doc)


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current=Depends(require_admin)):
    # Prevent deleting yourself
    if str(current.get("_id", "")) == user_id or current.get("id") == user_id:
        raise HTTPException(status_code=400, detail="Du kan inte ta bort ditt eget konto.")
    result = await db.users.delete_one({"_id": to_object_id(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Användare hittades inte")
    return {"success": True}


# ── Global Search ─────────────────────────────────────────────────────────────
@api_router.get("/search")
async def global_search(q: str, current=Depends(get_current_user)):
    if not q or len(q.strip()) < 2:
        return {"results": []}
    
    query = q.strip()
    results = []
    
    # Search bookings
    bookings = await db.bookings.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"phone": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}},
        ]
    }).limit(5).to_list(5)
    for b in bookings:
        results.append({
            "type": "booking",
            "id": str(b["_id"]),
            "title": b.get("name", ""),
            "sub": f'{", ".join(b.get("services", []))} · {b.get("preferred_date", "")}',
            "status": b.get("status", ""),
        })

    # Search customers
    customers = await db.customers.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"phone": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}},
        ]
    }).limit(5).to_list(5)
    for c in customers:
        results.append({
            "type": "customer",
            "id": str(c["_id"]),
            "title": c.get("name", ""),
            "sub": f'{c.get("phone", "")} · {c.get("email", "")}',
            "status": "",
        })

    # Search invoices
    invoices = await db.invoices.find({
        "$or": [
            {"customer_name": {"$regex": query, "$options": "i"}},
            {"customer_email": {"$regex": query, "$options": "i"}},
            {"invoice_number": {"$regex": query, "$options": "i"}},
        ]
    }).limit(5).to_list(5)
    for inv in invoices:
        results.append({
            "type": "invoice",
            "id": str(inv["_id"]),
            "title": f'Faktura #{inv.get("invoice_number", "")}',
            "sub": f'{inv.get("customer_name", "")} · {inv.get("customer_pays", 0):.0f} kr',
            "status": inv.get("status", ""),
        })

    # Search employees
    employees = await db.employees.find({
        "name": {"$regex": query, "$options": "i"}
    }).limit(3).to_list(3)
    for e in employees:
        results.append({
            "type": "employee",
            "id": str(e["_id"]),
            "title": e.get("name", ""),
            "sub": f'{e.get("employment_type", "")} · {e.get("hourly_rate", 0):.0f} kr/tim',
            "status": "",
        })

    return {"results": results, "query": query, "total": len(results)}


# ── Email Notifications ───────────────────────────────────────────────────────
async def send_booking_confirmation(booking: dict, inv_settings=None):
    """Send booking confirmation email to customer"""
    email = booking.get("email", "")
    if not email or email == "admin@purenorth.se":
        return False

    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend.api_key:
        return False

    name = booking.get("name", "")
    services = ", ".join(booking.get("services", []))
    date = booking.get("preferred_date", "")
    company = inv_settings.company_name if inv_settings else "PureNorth Städ"
    phone = inv_settings.company_phone if hasattr(inv_settings, "company_phone") and inv_settings.company_phone else "070-624 04 03"

    date_str = ""
    if date:
        try:
            from datetime import datetime as DT
            d = DT.strptime(date, "%Y-%m-%d")
            MONTHS_SV = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"]
            date_str = f"{d.day} {MONTHS_SV[d.month-1]} {d.year}"
        except:
            date_str = date

    try:
        admin_email = os.environ.get("ADMIN_EMAIL", "akhazzane.othmane@gmail.com")
        resend.Emails.send({
            "from": f"{company} <onboarding@resend.dev>",
            "to": admin_email,  # Temporary: send to admin until domain verified
            "subject": f"Bokningsbekräftelse till {name} – {company}",
            "html": f"""
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
              <div style="background:#141414;padding:32px 36px;">
                <h1 style="color:white;font-size:24px;margin:0;font-weight:700;">{company}</h1>
                <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:14px;">Bokningsbekräftelse</p>
              </div>
              <div style="padding:36px;">
                <p style="font-size:16px;color:#141414;margin:0 0 24px;">Hej <strong>{name}</strong>! </p>
                <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
                  Tack för att du kontaktade oss! Vi har tagit emot din bokningsförfrågan och återkommer inom kort för att bekräfta din tid.
                </p>

                <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:0 0 24px;border:1px solid #e2e8f0;">
                  <h3 style="font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Din bokning</h3>
                  {"<table style='width:100%;border-collapse:collapse;'><tr><td style='padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:80px;'>Datum</td><td style='padding:8px 0;border-bottom:1px solid #e2e8f0;color:#141414;font-size:14px;font-weight:600;'>" + date_str + "</td></tr></table>" if date_str else ""}
                  {"<table style='width:100%;border-collapse:collapse;'><tr><td style='padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:80px;'>Tjänst</td><td style='padding:8px 0;border-bottom:1px solid #e2e8f0;color:#141414;font-size:14px;font-weight:600;'>" + services + "</td></tr></table>" if services else ""}
                  {"<table style='width:100%;border-collapse:collapse;'><tr><td style='padding:8px 0;color:#64748b;font-size:13px;width:80px;'>Yta</td><td style='padding:8px 0;color:#141414;font-size:14px;font-weight:600;'>" + str(booking.get("kvm","")) + " kvm</td></tr></table>" if booking.get("kvm") else ""}
                </div>

                <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
                  Har du frågor? Tveka inte att höra av dig!
                </p>

                <div style="text-align:center;margin:0 0 24px;">
                  <a href="tel:{phone.replace('-','').replace(' ','')}"
                    style="display:inline-block;background:#141414;color:white;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:600;font-size:15px;">
                    Ring oss: {phone}
                  </a>
                </div>

                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
                <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
                  {company} · Miljövänlig städning i Umeå · 50% RUT-avdrag
                </p>
              </div>
            </div>
            """
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send booking confirmation: {e}")
        return False


# ── Material Costs ────────────────────────────────────────────────────────────
class MaterialCost(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    category: str = "material"
    amount: float
    antal: Optional[int] = 1
    unit_price: Optional[float] = None
    moms_rate: Optional[float] = 25.0
    date: str
    notes: Optional[str] = None
    created_at: str

class MaterialCostCreate(BaseModel):
    name: str
    category: str = "material"
    amount: float
    antal: Optional[int] = 1
    unit_price: Optional[float] = None
    moms_rate: float = 25.0
    date: str
    notes: Optional[str] = None

@api_router.get("/costs")
async def list_costs(current=Depends(get_current_user)):
    docs = await db.costs.find().sort("date", -1).to_list(1000)
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs

@api_router.post("/costs")
async def create_cost(payload: MaterialCostCreate, current=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.costs.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@api_router.patch("/costs/{cost_id}")
async def update_cost(cost_id: str, payload: MaterialCostCreate, current=Depends(get_current_user)):
    updates = payload.model_dump()
    await db.costs.update_one({"_id": to_object_id(cost_id)}, {"$set": updates})
    doc = await db.costs.find_one({"_id": to_object_id(cost_id)})
    doc["_id"] = str(doc["_id"])
    return doc

@api_router.delete("/costs/{cost_id}")
async def delete_cost(cost_id: str, current=Depends(get_current_user)):
    await db.costs.delete_one({"_id": to_object_id(cost_id)})
    return {"success": True}

@api_router.get("/costs/overview")
async def costs_overview(start: str = None, end: str = None, current=Depends(get_current_user)):
    # Build date filter
    date_filter = {}
    if start: date_filter["$gte"] = start
    if end:   date_filter["$lte"] = end

    cost_query = {"date": date_filter} if date_filter else {}
    inv_query = {}
    payroll_query = {}

    if start or end:
        if start: inv_query["created_at"] = {"$gte": start}
        if end:   inv_query["created_at"] = {**inv_query.get("created_at", {}), "$lte": end + "T23:59:59"}

    # Revenue from paid invoices
    invoices = await db.invoices.find({**inv_query, "status": "paid"}).to_list(1000)
    revenue = sum(i.get("customer_pays", 0) for i in invoices)

    # Material costs
    costs = await db.costs.find(cost_query).to_list(1000)
    material_total = sum(c.get("amount", 0) for c in costs)
    material_excl_moms = sum(c.get("amount", 0) / (1 + c.get("moms_rate", 25)/100) for c in costs)
    ingaende_moms = material_total - material_excl_moms
    material_by_cat = {}
    for c in costs:
        cat = c.get("category", "material")
        material_by_cat[cat] = material_by_cat.get(cat, 0) + c.get("amount", 0)


    # Profit calculation
    net_profit = revenue - material_total
    margin = (net_profit / revenue * 100) if revenue > 0 else 0

    return {
        "revenue": round(revenue, 2),
        "material_costs": round(material_total, 2),
        "material_excl_moms": round(material_excl_moms, 2),
        "ingaende_moms": round(ingaende_moms, 2),
        "material_by_category": {k: round(v, 2) for k, v in material_by_cat.items()},
        "employee_costs": 0,
        "total_costs": round(material_total, 2),
        "net_profit": round(net_profit, 2),
        "margin": round(margin, 1),
        "costs_list": [{**{k: str(v) if k == "_id" else v for k, v in c.items()}} for c in costs],
    }


# ── Receipt Upload ────────────────────────────────────────────────────────────
@api_router.post("/expenses/submit")
async def submit_expense(
    employee_id: str = Form(...),
    date: str = Form(...),
    amount: float = Form(...),
    antal: int = Form(1),
    unit_price: float = Form(0.0),
    moms_rate: float = Form(25.0),
    category: str = Form("Material"),
    description: str = Form(""),
    receipt: UploadFile = File(None),
    current=Depends(get_current_user)
):
    """Staff submits expense with optional receipt photo"""
    doc = {
        "employee_id": employee_id,
        "date": date,
        "amount": amount,
        "antal": antal,
        "unit_price": unit_price,
        "moms_rate": moms_rate,
        "category": category,
        "description": description,
        "status": "pending",
        "submitted_by": current.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "receipt_image": None,
    }

    # Handle receipt image upload
    if receipt and receipt.filename:
        try:
            contents = await receipt.read()
            import base64
            ext = receipt.filename.split(".")[-1].lower()
            mime = "image/jpeg" if ext in ["jpg","jpeg"] else "image/png" if ext == "png" else "image/jpeg"
            doc["receipt_image"] = f"data:{mime};base64,{base64.b64encode(contents).decode()}"
        except Exception as e:
            logger.error(f"Receipt upload error: {e}")

    result = await db.expenses.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

# ── Incidents / Skador (work accidents/damages) ───────────────────────────────
@api_router.post("/incidents")
async def create_incident(
    date: str = Form(...),
    location: str = Form(""),
    employee_id: str = Form(""),
    description: str = Form(...),
    cost: float = Form(0.0),
    status: str = Form("reported"),
    photo: UploadFile = File(None),
    current=Depends(get_current_user)
):
    """Employee or admin reports a work incident/damage with optional photo"""
    doc = {
        "date": sanitize_text(date, 40),
        "location": sanitize_text(location, 300),
        "employee_id": employee_id,
        "description": sanitize_text(description, 2000),
        "cost": cost,
        "status": status if status in ["reported", "insurance", "paid", "closed"] else "reported",
        "submitted_by": current.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "photo": None,
    }
    if photo and photo.filename:
        try:
            contents = await photo.read()
            import base64
            ext = photo.filename.split(".")[-1].lower()
            mime = "image/jpeg" if ext in ["jpg","jpeg"] else "image/png" if ext == "png" else "image/jpeg"
            doc["photo"] = f"data:{mime};base64,{base64.b64encode(contents).decode()}"
        except Exception as e:
            logger.error(f"Incident photo error: {e}")
    result = await db.incidents.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@api_router.get("/incidents")
async def list_incidents(current=Depends(get_current_user)):
    docs = await db.incidents.find().sort("created_at", -1).to_list(500)
    for d in docs:
        d["_id"] = str(d["_id"])
        if d.get("employee_id"):
            try:
                emp = await db.employees.find_one({"_id": to_object_id(d["employee_id"])})
                d["employee_name"] = emp.get("name", "") if emp else ""
            except Exception:
                d["employee_name"] = ""
    return docs

@api_router.get("/incidents/export-xlsx")
async def export_incidents_xlsx(current=Depends(get_current_user)):
    """Export incidents/skador to Excel"""
    incidents = await db.incidents.find().sort("date", -1).to_list(5000)
    STATUS_SV = {"reported": "Rapporterad", "insurance": "Försäkring", "paid": "Betald", "closed": "Avslutad"}
    wb = Workbook()
    ws = wb.active
    ws.title = "Skador"
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    headers = ["Datum", "Plats / Kund", "Anställd", "Beskrivning", "Kostnad (kr)", "Status", "Rapporterad av"]
    ws.append(headers)
    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
    total = 0.0
    for i in incidents:
        emp_name = ""
        if i.get("employee_id"):
            try:
                emp = await db.employees.find_one({"_id": to_object_id(i["employee_id"])})
                emp_name = emp.get("name", "") if emp else ""
            except Exception:
                pass
        cost = i.get("cost", 0)
        if i.get("status") != "closed":
            total += cost
        ws.append([
            i.get("date", ""),
            i.get("location", ""),
            emp_name,
            i.get("description", ""),
            round(cost, 2),
            STATUS_SV.get(i.get("status", ""), i.get("status", "")),
            i.get("submitted_by", ""),
        ])
        for cell in ws[ws.max_row]:
            cell.font = Font(size=9)
    ws.append(["", "", "", "SUMMA (öppna)", round(total, 2), "", ""])
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True, size=9)
    col_widths = [12, 30, 18, 40, 14, 14, 22]
    for idx, width in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(idx)].width = width
    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="skador.xlsx"'}
    )

@api_router.get("/incidents/export-pdf")
async def export_incidents_pdf(current=Depends(get_current_user)):
    """Export incidents/skador to PDF"""
    incidents = await db.incidents.find().sort("date", -1).to_list(5000)
    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    STATUS_SV = {"reported": "Rapporterad", "insurance": "Forsakring", "paid": "Betald", "closed": "Avslutad"}
    styles = getSampleStyleSheet()
    cell_style = ParagraphStyle("cell", parent=styles["Normal"], fontSize=8, leading=10)
    head_style = ParagraphStyle("head", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.white, fontName="Helvetica-Bold")
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=16)
    elements = []
    elements.append(Paragraph(f"{company} - Skador & Olyckor", title_style))
    elements.append(Spacer(1, 6*mm))
    data = [[Paragraph(h, head_style) for h in ["Datum", "Plats / Kund", "Anstalld", "Beskrivning", "Kostnad", "Status"]]]
    total = 0.0
    for i in incidents:
        emp_name = ""
        if i.get("employee_id"):
            try:
                emp = await db.employees.find_one({"_id": to_object_id(i["employee_id"])})
                emp_name = emp.get("name", "") if emp else ""
            except Exception:
                pass
        cost = i.get("cost", 0)
        if i.get("status") != "closed":
            total += cost
        data.append([
            Paragraph(str(i.get("date", "")), cell_style),
            Paragraph(str(i.get("location", "")), cell_style),
            Paragraph(str(emp_name), cell_style),
            Paragraph(str(i.get("description", "")), cell_style),
            Paragraph(f'{cost:,.2f} kr', cell_style),
            Paragraph(STATUS_SV.get(i.get("status", ""), ""), cell_style),
        ])
    data.append([Paragraph("", cell_style), Paragraph("", cell_style), Paragraph("", cell_style),
                 Paragraph("SUMMA (oppna)", head_style), Paragraph(f'{total:,.2f} kr', head_style), Paragraph("", cell_style)])
    table = Table(data, colWidths=[20*mm, 40*mm, 28*mm, 55*mm, 22*mm, 22*mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#141414")),
        ("BACKGROUND", (0,-1), (-1,-1), colors.HexColor("#f1f5f9")),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    elements.append(table)
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm, leftMargin=12*mm, rightMargin=12*mm, title=f"{company} - Skador & Olyckor", author=company)
    doc.build(elements)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{company} - Skador.pdf"'}
    )

@api_router.patch("/incidents/{incident_id}")
async def update_incident(incident_id: str, payload: dict, current=Depends(get_current_user)):
    updates = {}
    for k in ["status", "cost", "description", "location"]:
        if k in payload and payload[k] is not None:
            updates[k] = sanitize_text(str(payload[k]), 2000) if isinstance(payload[k], str) else payload[k]
    if updates:
        await db.incidents.update_one({"_id": to_object_id(incident_id)}, {"$set": updates})
    doc = await db.incidents.find_one({"_id": to_object_id(incident_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Skada hittades inte")
    doc["_id"] = str(doc["_id"])
    return doc

@api_router.delete("/incidents/{incident_id}")
async def delete_incident(incident_id: str, current=Depends(get_current_user)):
    result = await db.incidents.delete_one({"_id": to_object_id(incident_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skada hittades inte")
    return {"success": True}

@api_router.get("/expenses/pending")
async def get_pending_expenses(current=Depends(get_current_user)):
    """Get all pending expense submissions"""
    docs = await db.expenses.find({"status": "pending"}).sort("created_at", -1).to_list(100)
    for d in docs:
        d["_id"] = str(d["_id"])
        # Get employee name
        try:
            emp = await db.employees.find_one({"_id": to_object_id(d["employee_id"])})
            d["employee_name"] = emp.get("name", "Okänd") if emp else "Okänd"
        except:
            d["employee_name"] = "Okänd"
    return docs

@api_router.patch("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: str, current=Depends(get_current_user)):
    """Admin approves expense - moves to approved status"""
    await db.expenses.update_one(
        {"_id": to_object_id(expense_id)},
        {"$set": {"status": "approved", "approved_by": current.get("email"), "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@api_router.patch("/expenses/{expense_id}/reject")
async def reject_expense(expense_id: str, current=Depends(get_current_user)):
    """Admin rejects expense"""
    await db.expenses.update_one(
        {"_id": to_object_id(expense_id)},
        {"$set": {"status": "rejected"}}
    )
    return {"success": True}

@api_router.get("/expenses/my")
async def get_my_expenses(current=Depends(get_current_user)):
    """Get current user's submitted expenses"""
    email = current.get("email", "")
    docs = await db.expenses.find({"submitted_by": email}).sort("created_at", -1).to_list(100)
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs


# ── Send Invoice by Email ─────────────────────────────────────────────────────
@api_router.post("/invoices/{invoice_id}/send")
async def send_invoice_email(invoice_id: str, current=Depends(get_current_user)):
    _inv = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if _inv and _inv.get("credited"):
        raise HTTPException(status_code=403, detail="Krediterad faktura kan inte skickas igen.")
    doc = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")

    customer_email = doc.get("customer_email", "")
    if not customer_email:
        raise HTTPException(status_code=400, detail="Kunden har ingen e-postadress")

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    inv_num = doc.get("invoice_number", "")
    customer_name = doc.get("customer_name", "")
    due_date = doc.get("due_date", "")
    amount = doc.get("customer_pays", 0)

    # Generate PDF
    pdf_bytes = build_invoice_pdf(doc, inv_settings)
    import base64
    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="E-posttjänst ej konfigurerad")

    admin_email = os.environ.get("ADMIN_EMAIL", "akhazzane.othmane@gmail.com")

    try:
        resend.Emails.send({
            "from": f"{company} <onboarding@resend.dev>",
            "to": admin_email,  # Temp until domain verified
            "subject": f"Faktura #{inv_num} från {company}",
            "html": f"""
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;">
              <div style="background:#141414;padding:28px 36px;">
                <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">{company}</h1>
                <p style="color:rgba(255,255,255,0.55);margin:6px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Faktura</p>
              </div>
              <div style="padding:36px;border:1px solid #e2e8f0;border-top:none;">
                <p style="font-size:17px;color:#141414;margin:0 0 8px;font-weight:600;">Hej {customer_name},</p>
                <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  Tack för att du anlitade oss! Bifogat finner du din faktura.
                </p>
                <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:0 0 24px;border-left:3px solid #141414;">
                  <p style="margin:0 0 8px;font-size:14px;color:#141414;"><span style="color:#64748b;">Fakturanummer</span> &nbsp; <strong>#{inv_num}</strong></p>
                  <p style="margin:0 0 8px;font-size:14px;color:#141414;"><span style="color:#64748b;">Förfallodatum</span> &nbsp; <strong>{due_date}</strong></p>
                  <p style="margin:0;font-size:14px;color:#141414;"><span style="color:#64748b;">Att betala</span> &nbsp; <strong>{amount:.2f} kr</strong></p>
                </div>
                <p style="color:#64748b;font-size:14px;margin:0 0 24px;">
                  Fakturan finns bifogad som PDF. Har du frågor är du välkommen att kontakta oss.
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;"/>
                <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
                  {company} · Miljövänlig städning i Umeå · 50% RUT-avdrag
                </p>
              </div>
            </div>
            """,
            "attachments": [{
                "filename": f"faktura_{inv_num}.pdf",
                "content": pdf_b64,
            }]
        })

        # Update invoice status to sent
        await db.invoices.update_one(
            {"_id": to_object_id(invoice_id)},
            {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
        )

        return {"success": True, "message": f"Faktura skickad till {customer_email}"}

    except Exception as e:
        logger.error(f"Failed to send invoice: {e}")
        raise HTTPException(status_code=500, detail=f"Kunde inte skicka faktura: {str(e)}")


# ── Monthly Report for Konsult ───────────────────────────────────────────────
@api_router.get("/reports/monthly")
async def monthly_report_pdf(month: str, current=Depends(get_current_user)):
    """Generate comprehensive monthly report for redovisningskonsult
    month format: YYYY-MM (e.g. 2025-01)
    """
    from reportlab.platypus import Image as RLImage
    year, mon = month.split("-")
    import calendar
    last_day = calendar.monthrange(int(year), int(mon))[1]
    start = f"{month}-01"
    end = f"{month}-{last_day:02d}"
    start_dt = f"{start}T00:00:00"
    end_dt = f"{end}T23:59:59"

    ARBETSGIVARAVGIFT = 0.3142
    PRELSKATT = 0.30
    SEMESTERERSATTNING = 0.12

    # ── Data collection ────────────────────────────────────────────
    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    orgnr = inv_settings.company_orgnr or "—"

    invoices_raw = await db.invoices.find({"created_at": {"$gte": start_dt, "$lte": end_dt}}).to_list(2000)
    invoices = [recalc_invoice(i) for i in invoices_raw]
    payroll_summary, payroll_settings = await build_payroll_summary(start, end)
    costs = await db.costs.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)
    expenses = await db.expenses.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)
    bookings = await db.bookings.find({"created_at": {"$gte": start_dt, "$lte": end_dt}}).to_list(1000)

    # ── Calculations ───────────────────────────────────────────────
    # Revenue
    revenue_excl_vat = sum(i.get("subtotal", 0) for i in invoices)
    paminnelse_fees = sum(
        sum(item.get("quantity",1)*item.get("unit_price",0)
            for item in inv.get("items",[])
            if "Påminnelseavgift" in item.get("service",""))
        for inv in invoices
    )
    total_intakter = revenue_excl_vat + paminnelse_fees
    vat_collected = sum(i.get("vat_amount", 0) for i in invoices)
    rut_deductions = sum(i.get("rut_deduction", 0) for i in invoices)
    paid_amount = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") == "paid")
    unpaid_amount = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") != "paid")

    # Payroll
    gross_salary = sum(
        r["normal_h"] * r["hourly_rate"] +
        r["ob1_h"] * payroll_settings.ob1_extra +
        r["ob2_h"] * payroll_settings.ob2_extra +
        r.get("sjuklon_net", 0)
        for r in payroll_summary.values()
    )
    arbetsgivaravgifter = round(gross_salary * ARBETSGIVARAVGIFT, 2)
    semesterersattning = round(gross_salary * SEMESTERERSATTNING, 2)
    prelskatt = round(gross_salary * PRELSKATT, 2)
    total_payroll = round(gross_salary + arbetsgivaravgifter + semesterersattning, 2)
    utlagg_total = sum(e.get("amount", 0) for e in expenses)

    # Material costs
    material_total_incl = sum(c.get("amount", 0) for c in costs)
    ingaende_moms = sum(c.get("amount", 0) - c.get("amount", 0) / (1 + c.get("moms_rate", 25)/100) for c in costs)
    utlagg_moms = sum(e.get("amount", 0) - e.get("amount", 0) / (1 + e.get("moms_rate", 0)/100) for e in expenses if e.get("moms_rate", 0) > 0)
    total_ingaende_moms = round(ingaende_moms + utlagg_moms, 2)

    # VAT
    vat_to_pay = round(vat_collected - total_ingaende_moms, 2)
    agi_to_pay = round(arbetsgivaravgifter + prelskatt, 2)

    # Profit
    total_costs = total_payroll + utlagg_total + (material_total_incl - ingaende_moms)
    operating_profit = round(total_intakter - total_costs, 2)
    margin = round((operating_profit / total_intakter * 100) if total_intakter > 0 else 0, 1)

    # ── PDF Build ──────────────────────────────────────────────────
    buf = BytesIO()
    page_w, page_h = A4
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"Månadsrapport {month}",
            author="PureNorth Städ")

    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)

    h1 = ps("h1", fontSize=20, fontName="Helvetica-Bold", textColor=colors.HexColor("#141414"), spaceAfter=2)
    h2 = ps("h2", fontSize=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#141414"), spaceBefore=8, spaceAfter=4, borderPad=2)
    normal = ps("n", fontSize=9, textColor=colors.HexColor("#1a1a1a"), leading=13)
    small = ps("s", fontSize=8, textColor=colors.HexColor("#64748b"), leading=11)
    bold = ps("b", fontSize=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#1a1a1a"), leading=13)

    elements = []

    # ── HEADER ─────────────────────────────────────────────────────
    import locale
    MONTHS_SV = ["","Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
    month_name = MONTHS_SV[int(mon)]

    header_data = [[
        Paragraph(f"<b>{company}</b>", ps("ch", fontSize=16, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>MÅNADSRAPPORT</b><br/>{month_name} {year}", ps("ct", fontSize=11, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]]
    header_tbl = Table(header_data, colWidths=[100*mm, None])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),12),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    elements.append(header_tbl)

    # Company info
    info_line = f"Org.nr: {orgnr}  ·  Period: {start} – {end}  ·  Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    elements.append(Paragraph(info_line, ps("info", fontSize=8, textColor=colors.HexColor("#94a3b8"), spaceBefore=3, spaceAfter=6)))

    # Divider
    div = Table([[""]], colWidths=[page_w-40*mm])
    div.setStyle(TableStyle([("LINEBELOW",(0,0),(-1,-1),1,colors.HexColor("#141414")),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    elements.append(div)
    elements.append(Spacer(1,4*mm))

    def section_header(title, color="#141414"):
        t = Table([[Paragraph(title, ps("sh", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white))]], colWidths=[page_w-40*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor(color)),
            ("LEFTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
        ]))
        elements.append(t)

    def data_row(label, value, is_total=False, color=None):
        lbl_style = bold if is_total else normal
        val_style = bold if is_total else normal
        val_para = Paragraph(value, ps("vr", fontSize=9, fontName="Helvetica-Bold" if is_total else "Helvetica",
            textColor=colors.HexColor(color) if color else colors.HexColor("#1a1a1a"), alignment=2))
        row = [[Paragraph(label, lbl_style), val_para]]
        t = Table(row, colWidths=[120*mm, None])
        bg = colors.HexColor("#F8FAFC") if is_total else colors.white
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),bg),
            ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LINEBELOW",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ]))
        elements.append(t)

    def kr(n): return f"{n:,.2f} kr".replace(",",".")
    def konto(k): return f"[Konto {k}]"

    # ── 1. INTÄKTER ────────────────────────────────────────────────
    elements.append(Spacer(1,3*mm))
    section_header("1. INTÄKTER (FÖRSÄLJNING)", "#1e40af")
    data_row(f"Antal fakturor", str(len(invoices)))
    data_row(f"Antal bokningar", str(len(bookings)))
    data_row(f"Försäljning tjänster  {konto('3000')}", kr(revenue_excl_vat))
    if paminnelse_fees > 0:
        data_row(f"Påminnelseavgifter  {konto('3590')}", kr(paminnelse_fees))
    data_row(f"Utgående moms 25%  {konto('2610')}", kr(vat_collected))
    data_row(f"RUT-avdrag  {konto('3001')}", kr(rut_deductions))
    data_row("Betalt av kunder", kr(paid_amount))
    data_row("Obetalt (kundfordringar)", kr(unpaid_amount))
    data_row("TOTALT INTÄKTER (exkl. moms)", kr(total_intakter), is_total=True, color="#1e40af")

    elements.append(Spacer(1,3*mm))

    # ── 2. PERSONALKOSTNADER ───────────────────────────────────────
    section_header("2. PERSONALKOSTNADER", "#7c3aed")
    data_row(f"Bruttolön  {konto('7210')}", kr(gross_salary))
    data_row(f"Arbetsgivaravgift 31.42%  {konto('7510')}", kr(arbetsgivaravgifter))
    data_row(f"Semesterersättning 12%  {konto('7290')}", kr(semesterersattning))
    data_row(f"Preliminärskatt (skuld)  {konto('2710')}", kr(prelskatt))
    data_row(f"Utlägg reseersättning  {konto('7331')}", kr(utlagg_total))
    data_row("TOTALT PERSONALKOSTNADER", kr(total_payroll + utlagg_total), is_total=True, color="#7c3aed")

    # Per employee
    if payroll_summary:
        elements.append(Spacer(1,2*mm))
        emp_header = [["Namn", "Tim", "Bruttolön", "AG-avgift", "Semester", "Summa"]]
        emp_data = emp_header.copy()
        for r in payroll_summary.values():
            gross = r["normal_h"]*r["hourly_rate"] + r["ob1_h"]*payroll_settings.ob1_extra + r["ob2_h"]*payroll_settings.ob2_extra + r.get("sjuklon_net",0)
            emp_data.append([
                r["name"], f"{r['normal_h']:.1f}",
                kr(gross), kr(gross*ARBETSGIVARAVGIFT),
                kr(gross*SEMESTERERSATTNING), kr(gross*(1+ARBETSGIVARAVGIFT+SEMESTERERSATTNING))
            ])
        emp_tbl = Table(emp_data, colWidths=[50*mm, 18*mm, 30*mm, 25*mm, 25*mm, 30*mm])
        emp_tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#F1F5F9")),
            ("FONTSIZE",(0,0),(-1,-1),8),("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ]))
        elements.append(emp_tbl)

    elements.append(Spacer(1,3*mm))

    # ── 3. MATERIALKOSTNADER ───────────────────────────────────────
    section_header("3. MATERIALKOSTNADER & UTLÄGG", "#0369a1")
    data_row(f"Städmaterial  {konto('5410')}", kr(material_total_incl))
    data_row(f"Bränsle  {konto('5612')}", "Se utlägg")
    data_row(f"Milersättning  {konto('7331')}", "Se utlägg")
    data_row(f"Parkering  {konto('5651')}", "Se utlägg")
    data_row(f"Ingående moms material  {konto('2640')}", f"-{kr(ingaende_moms)}", color="#15803d")
    data_row(f"Ingående moms utlägg  {konto('2640')}", f"-{kr(utlagg_moms)}", color="#15803d")
    data_row("NETTOKOSTNAD MATERIAL (exkl. moms)", kr(material_total_incl - ingaende_moms), is_total=True, color="#0369a1")

    elements.append(Spacer(1,3*mm))

    # ── 4. MOMSREDOVISNING ─────────────────────────────────────────
    section_header("4. MOMSREDOVISNING (ATT REDOVISA TILL SKATTEVERKET)", "#b45309")
    data_row(f"Utgående moms försäljning  {konto('2610')}", kr(vat_collected))
    data_row(f"Ingående moms inköp + utlägg  {konto('2640')}", f"-{kr(total_ingaende_moms)}", color="#15803d")
    data_row("MOMS ATT BETALA → Bankgiro 5050-1055", kr(vat_to_pay), is_total=True, color="#b45309")

    elements.append(Spacer(1,3*mm))

    # ── 5. ARBETSGIVARDEKLARATION ──────────────────────────────────
    section_header("5. ARBETSGIVARDEKLARATION (AGI) - BETALA SENAST DEN 12:E", "#dc2626")
    data_row(f"Arbetsgivaravgift  {konto('7510')}", kr(arbetsgivaravgifter))
    data_row(f"Preliminärskatt  {konto('2710')}", kr(prelskatt))
    data_row("TOTALT ATT BETALA SKATTEVERKET → Bankgiro 5050-1055", kr(agi_to_pay), is_total=True, color="#dc2626")

    elements.append(Spacer(1,3*mm))

    # ── 6. RESULTAT ────────────────────────────────────────────────
    section_header("6. RÖRELSERESULTAT", "#15803d")
    data_row(f"Intäkter exkl. moms  {konto('3000')}", kr(total_intakter))
    data_row(f"Personalkostnader  {konto('7210/7510')}", f"-{kr(total_payroll + utlagg_total)}")
    data_row(f"Materialkostnader exkl. moms  {konto('5410')}", f"-{kr(material_total_incl - ingaende_moms)}")
    profit_color = "#15803d" if operating_profit >= 0 else "#dc2626"
    data_row("RÖRELSERESULTAT", kr(operating_profit), is_total=True, color=profit_color)
    data_row("Rörelsemarginal", f"{margin}%")

    elements.append(Spacer(1,4*mm))

    # ── BAS KONTOPLAN NOTE ─────────────────────────────────────────
    note_text = "Kontonummer enligt BAS-kontoplanen 2025. Kontrollera med din redovisningskonsult att kontona stämmer med ert bokföringssystem."
    elements.append(Paragraph(note_text, ps("note", fontSize=7, textColor=colors.HexColor("#94a3b8"), spaceBefore=2, spaceAfter=4)))

    # ── FAKTURA LIST ───────────────────────────────────────────────
    if invoices:
        section_header("7. FAKTURALISTA", "#475569")
        inv_header = [["Faktura #", "Kund", "Datum", "Exkl. moms", "Påm.avg", "Moms", "Att betala", "Status"]]
        inv_rows = inv_header.copy()
        for i in sorted(invoices, key=lambda x: x.get("created_at","")):
            status_map = {"paid":"Betald","draft":"Utkast","sent":"Skickad","overdue":"Förfallen"}
            pam_fee = sum(
                item.get("quantity",1)*item.get("unit_price",0)
                for item in i.get("items",[])
                if "Påminnelseavgift" in item.get("service","")
            )
            inv_rows.append([
                i.get("invoice_number",""),
                i.get("customer_name","")[:20],
                i.get("created_at","")[:10],
                f'{i.get("subtotal",0):.2f}',
                f'{pam_fee:.2f}' if pam_fee > 0 else "-",
                f'{i.get("vat_amount",0):.2f}',
                f'{i.get("customer_pays",0):.2f}',
                status_map.get(i.get("status",""),""),
            ])
        inv_tbl = Table(inv_rows, colWidths=[18*mm, 38*mm, 18*mm, 20*mm, 16*mm, 18*mm, 22*mm, 18*mm])
        inv_tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#F1F5F9")),
            ("FONTSIZE",(0,0),(-1,-1),7.5),("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("ALIGN",(3,0),(-1,-1),"RIGHT"),
        ]))
        elements.append(inv_tbl)

    elements.append(Spacer(1,4*mm))

    # ── FOOTER ─────────────────────────────────────────────────────
    footer_line = f"{company}  ·  Org.nr {orgnr}  ·  Månadsrapport {month_name} {year}  ·  Konfidentiellt"
    ft = Table([[Paragraph(footer_line, ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8")))]], colWidths=[page_w-40*mm])
    ft.setStyle(TableStyle([
        ("LINEABOVE",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
        ("TOPPADDING",(0,0),(-1,-1),4),("LEFTPADDING",(0,0),(-1,-1),0),
    ]))
    elements.append(ft)

    doc.build(elements)
    pdf_bytes = buf.getvalue()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="manadsrapport_{month}.pdf"'}
    )


# ── SIE4 Export ───────────────────────────────────────────────────────────────
@api_router.get("/reports/sie")
async def export_sie(month: str, current=Depends(get_current_user)):
    """Export SIE4 file for redovisningskonsult
    month format: YYYY-MM
    """
    import calendar
    year, mon = month.split("-")
    last_day = calendar.monthrange(int(year), int(mon))[1]
    start = f"{month}-01"
    end = f"{month}-{last_day:02d}"
    start_dt = f"{start}T00:00:00"
    end_dt = f"{end}T23:59:59"

    ARBETSGIVARAVGIFT = 0.3142
    PRELSKATT = 0.30
    SEMESTERERSATTNING = 0.12

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    orgnr = (inv_settings.company_orgnr or "").replace("-","")

    # Collect data
    invoices_raw = await db.invoices.find({"created_at": {"$gte": start_dt, "$lte": end_dt}}).to_list(2000)
    invoices = [recalc_invoice(i) for i in invoices_raw]
    payroll_summary, payroll_settings = await build_payroll_summary(start, end)
    costs = await db.costs.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)
    expenses = await db.expenses.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)

    # Calculate totals
    revenue = sum(i.get("subtotal", 0) for i in invoices)
    paminnelse_fees = sum(
        sum(item.get("quantity",1)*item.get("unit_price",0)
            for item in inv.get("items",[])
            if "Påminnelseavgift" in item.get("service",""))
        for inv in invoices
    )
    vat_out = sum(i.get("vat_amount", 0) for i in invoices)
    rut = sum(i.get("rut_deduction", 0) for i in invoices)

    gross_salary = sum(
        r["normal_h"] * r["hourly_rate"] +
        r["ob1_h"] * payroll_settings.ob1_extra +
        r["ob2_h"] * payroll_settings.ob2_extra +
        r.get("sjuklon_net", 0)
        for r in payroll_summary.values()
    )
    ag_avg = round(gross_salary * ARBETSGIVARAVGIFT, 2)
    semester = round(gross_salary * SEMESTERERSATTNING, 2)
    prelskatt = round(gross_salary * PRELSKATT, 2)
    utlagg = sum(e.get("amount", 0) for e in expenses)

    material = sum(c.get("amount", 0) for c in costs)
    vat_in_mat = sum(c.get("amount",0) - c.get("amount",0)/(1+c.get("moms_rate",25)/100) for c in costs)
    vat_in_exp = sum(e.get("amount",0) - e.get("amount",0)/(1+e.get("moms_rate",0)/100) for e in expenses if e.get("moms_rate",0) > 0)
    vat_in = round(vat_in_mat + vat_in_exp, 2)

    # Build SIE4 content
    now = datetime.now(timezone.utc)
    gen_date = now.strftime("%Y%m%d")
    period = month.replace("-","")

    # Verification entries (verifikationer)
    ver_num = 1
    verifikationer = []

    # 1. Revenue entries per invoice
    for inv in invoices:
        date = (inv.get("created_at","")[:10] or start).replace("-","")
        sub = inv.get("subtotal", 0)
        vat = inv.get("vat_amount", 0)
        pays = inv.get("customer_pays", 0)
        rut_d = inv.get("rut_deduction", 0)
        inv_num = inv.get("invoice_number", "")
        customer = inv.get("customer_name", "")
        ver = f'#VER A {ver_num} {date} "Faktura #{inv_num} - {customer}"\n'
        ver += f'  #TRANS 3000 {{}} {-sub:.2f} {date} "Försäljning"\n'
        ver += f'  #TRANS 2610 {{}} {-vat:.2f} {date} "Utgående moms"\n'
        if rut_d > 0:
            ver += f'  #TRANS 3001 {{}} {rut_d:.2f} {date} "RUT-avdrag"\n'
        pam_fee = sum(item.get("quantity",1)*item.get("unit_price",0)
            for item in inv.get("items",[])
            if "Påminnelseavgift" in item.get("service",""))
        if pam_fee > 0:
            ver += f'  #TRANS 3590 {{}} {-pam_fee:.2f} {date} "Påminnelseavgift"\n'
        ver += f'  #TRANS 1510 {{}} {pays:.2f} {date} "Kundfordran"\n'
        verifikationer.append(ver)
        ver_num += 1

    # 2. Payroll entry
    if gross_salary > 0:
        date = end.replace("-","")
        ver = f'#VER L {ver_num} {date} "Löner {month}"\n'
        ver += f'  #TRANS 7210 {{}} {gross_salary:.2f} {date} "Bruttolön"\n'
        ver += f'  #TRANS 7510 {{}} {ag_avg:.2f} {date} "Arbetsgivaravgift"\n'
        ver += f'  #TRANS 7290 {{}} {semester:.2f} {date} "Semesterersättning"\n'
        ver += f'  #TRANS 2710 {{}} {-prelskatt:.2f} {date} "Prelskatt skuld"\n'
        ver += f'  #TRANS 2731 {{}} {-ag_avg:.2f} {date} "AG-avgift skuld"\n'
        ver += f'  #TRANS 1930 {{}} {-(gross_salary+semester-prelskatt):.2f} {date} "Utbetald lön"\n'
        verifikationer.append(ver)
        ver_num += 1

    # 3. Material costs
    for c in costs:
        date = c.get("date","").replace("-","")
        amount = c.get("amount", 0)
        vat_c = amount - amount/(1+c.get("moms_rate",25)/100)
        net = amount - vat_c
        cat = c.get("category","material")
        konto = {"material":"5410","equipment":"5410","transport":"5612","other":"6990"}.get(cat,"5410")
        name = c.get("name","Material")
        ver = f'#VER K {ver_num} {date} "{name}"\n'
        ver += f'  #TRANS {konto} {{}} {net:.2f} {date} "{name}"\n'
        ver += f'  #TRANS 2640 {{}} {vat_c:.2f} {date} "Ingående moms"\n'
        ver += f'  #TRANS 1930 {{}} {-amount:.2f} {date} "Betalning"\n'
        verifikationer.append(ver)
        ver_num += 1

    # Build SIE file
    MONTHS_SV = ["","Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
    sie_lines = [
        f'#FLAGGA 0',
        f'#FORMAT UTF-8',
        f'#SIETYP 4',
        f'#PROGRAM "PureNorth Admin" "1.0"',
        f'#GEN {gen_date} "PureNorth Admin"',
        f'#FNAMN "{company}"',
        f'#ORGNR {orgnr}',
        f'#RAR 0 {period}01 {period}{last_day:02d}',
        f'#TAXAR {year}',
        f'#VALUTA SEK',
        f'',
        f'#KONTO 1510 "Kundfordringar"',
        f'#KONTO 1930 "Företagskonto"',
        f'#KONTO 2610 "Utgående moms 25%"',
        f'#KONTO 2640 "Ingående moms"',
        f'#KONTO 2710 "Personalskatt"',
        f'#KONTO 2731 "Arbetsgivaravgifter"',
        f'#KONTO 3000 "Försäljning tjänster"',
        f'#KONTO 3001 "RUT-avdrag"',
        f'#KONTO 3590 "Påminnelseavgifter"',
        f'#KONTO 5410 "Förbrukningsinventarier"',
        f'#KONTO 5612 "Bränsle och drivmedel"',
        f'#KONTO 6990 "Övriga kostnader"',
        f'#KONTO 7210 "Löner"',
        f'#KONTO 7290 "Semesterersättning"',
        f'#KONTO 7331 "Milersättning"',
        f'#KONTO 7510 "Arbetsgivaravgifter"',
        f'',
    ]

    # Add IB (ingående balans) - simplified
    sie_lines.append(f'#IB 0 1930 0.00')
    sie_lines.append(f'')

    # Add verifications
    for ver in verifikationer:
        sie_lines.append(ver)

    # Add UB (utgående balans)
    sie_lines.append(f'')
    sie_lines.append(f'#UB 0 1510 {sum(i.get("customer_pays",0) for i in invoices if i.get("status") != "paid"):.2f}')

    sie_content = "\n".join(sie_lines)

    # Encode to UTF-8
    sie_bytes = sie_content.encode("utf-8")

    return Response(
        content=sie_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="sie_{month}.se"'}
    )


# ── AGI XML Export ────────────────────────────────────────────────────────────
@api_router.get("/reports/agi")
async def export_agi(month: str, current=Depends(get_current_user)):
    """Export AGI (Arbetsgivardeklaration) XML for Skatteverket
    month format: YYYY-MM
    """
    import calendar
    year, mon = month.split("-")
    last_day = calendar.monthrange(int(year), int(mon))[1]
    start = f"{month}-01"
    end = f"{month}-{last_day:02d}"

    ARBETSGIVARAVGIFT = 0.3142
    PRELSKATT = 0.30

    inv_settings = await get_invoice_settings_obj()
    orgnr = (inv_settings.company_orgnr or "").replace("-","")
    company = inv_settings.company_name or "PureNorth Städ"

    payroll_summary, payroll_settings = await build_payroll_summary(start, end)
    employees = await db.employees.find().to_list(100)
    emp_map = {str(e["_id"]): e for e in employees}

    now = datetime.now(timezone.utc)
    period = month.replace("-","")  # YYYYMM

    # Build XML
    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<Skatteverket xmlns="http://www.skatteverket.se/schema/instans/arbetsgivardeklaration" xmlns:agd="http://www.skatteverket.se/schema/instans/arbetsgivardeklaration">')
    lines.append(f'  <Avsandare>')
    lines.append(f'    <ProgramnameProduktnr>{company} Admin 1.0</ProgramnameProduktnr>')
    lines.append(f'    <Tidpunkt>{now.strftime("%Y-%m-%dT%H:%M:%S")}</Tidpunkt>')
    lines.append(f'  </Avsandare>')
    lines.append(f'  <Blankettgemensamt>')
    lines.append(f'    <Arbetsgivare>')
    lines.append(f'      <AgRegistreradId>{orgnr}</AgRegistreradId>')
    lines.append(f'    </Arbetsgivare>')
    lines.append(f'  </Blankettgemensamt>')

    total_ag_avg = 0
    total_prelskatt = 0

    for eid, row in payroll_summary.items():
        emp = emp_map.get(eid, {})
        personnr = emp.get("personnummer", "").replace("-","")
        name = row["name"]
        brutto = (
            row["normal_h"] * row["hourly_rate"] +
            row["ob1_h"] * payroll_settings.ob1_extra +
            row["ob2_h"] * payroll_settings.ob2_extra +
            row.get("sjuklon_net", 0)
        )
        prelskatt = round(brutto * PRELSKATT, 2)
        ag_avg = round(brutto * ARBETSGIVARAVGIFT, 2)
        total_ag_avg += ag_avg
        total_prelskatt += prelskatt

        if not personnr:
            continue

        lines.append(f'  <Blankett>')
        lines.append(f'    <Arendeinformation>')
        lines.append(f'      <Arendeagare>{orgnr}</Arendeagare>')
        lines.append(f'      <Period>{period}</Period>')
        lines.append(f'    </Arendeinformation>')
        lines.append(f'    <Blankettinnehall>')
        lines.append(f'      <HU>')
        lines.append(f'        <ArbetsgivareHUGROUP>')
        lines.append(f'          <AgRegistreradId faltkod="201">{orgnr}</AgRegistreradId>')
        lines.append(f'        </ArbetsgivareHUGROUP>')
        lines.append(f'        <RedovisningsPeriod faltkod="006">{period}</RedovisningsPeriod>')
        lines.append(f'        <SummaArbAvgSlf faltkod="487">{int(total_ag_avg)}</SummaArbAvgSlf>')
        lines.append(f'        <SummaSkatteavdr faltkod="497">{int(total_prelskatt)}</SummaSkatteavdr>')
        lines.append(f'      </HU>')
        lines.append(f'      <IU>')
        lines.append(f'        <ArbetsgivareIUGROUP>')
        lines.append(f'          <AgRegistreradId faltkod="201">{orgnr}</AgRegistreradId>')
        lines.append(f'        </ArbetsgivareIUGROUP>')
        lines.append(f'        <BetalningsmottagareIUGROUP>')
        lines.append(f'          <Fodelsetid faltkod="215">{personnr}</Fodelsetid>')
        lines.append(f'        </BetalningsmottagareIUGROUP>')
        lines.append(f'        <RedovisningsPeriod faltkod="006">{period}</RedovisningsPeriod>')
        lines.append(f'        <Specifikationsnummer faltkod="570">001</Specifikationsnummer>')
        lines.append(f'        <AvdrPrelSkatt faltkod="001">{int(prelskatt)}</AvdrPrelSkatt>')
        lines.append(f'        <KontantErsattningKU10 faltkod="011">{int(brutto)}</KontantErsattningKU10>')
        lines.append(f'      </IU>')
        lines.append(f'    </Blankettinnehall>')
        lines.append(f'  </Blankett>')

    lines.append('</Skatteverket>')

    xml_content = "\n".join(lines)

    return Response(
        content=xml_content.encode("utf-8"),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="agi_{month}.xml"'}
    )


# ── Momsdeklaration PDF ───────────────────────────────────────────────────────
@api_router.get("/reports/moms")
async def export_moms_pdf(month: str, current=Depends(get_current_user)):
    """Export Momsdeklaration PDF in Skatteverket format
    month format: YYYY-MM
    """
    import calendar
    year, mon = month.split("-")
    last_day = calendar.monthrange(int(year), int(mon))[1]
    start = f"{month}-01"
    end = f"{month}-{last_day:02d}"
    start_dt = f"{start}T00:00:00"
    end_dt = f"{end}T23:59:59"

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    orgnr = inv_settings.company_orgnr or ""

    MONTHS_SV = ["","Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
    month_name = MONTHS_SV[int(mon)]

    # Collect data
    invoices_raw = await db.invoices.find({"created_at": {"$gte": start_dt, "$lte": end_dt}}).to_list(2000)
    invoices = [recalc_invoice(i) for i in invoices_raw]
    costs = await db.costs.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)
    expenses = await db.expenses.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)

    # Calculate moms
    # Utgående moms (from invoices)
    sales_excl = sum(i.get("subtotal", 0) for i in invoices)
    paminnelse_fees = sum(
        sum(item.get("quantity",1)*item.get("unit_price",0)
            for item in inv.get("items",[])
            if "Påminnelseavgift" in item.get("service",""))
        for inv in invoices
    )
    total_sales = sales_excl + paminnelse_fees
    vat_out_25 = sum(i.get("vat_amount", 0) for i in invoices)

    # Ingående moms (from costs + expenses)
    vat_in_mat = sum(c.get("amount",0) - c.get("amount",0)/(1+c.get("moms_rate",25)/100) for c in costs if c.get("moms_rate",25) > 0)
    vat_in_exp = sum(e.get("amount",0) - e.get("amount",0)/(1+e.get("moms_rate",0)/100) for e in expenses if e.get("moms_rate",0) > 0)
    vat_in_total = round(vat_in_mat + vat_in_exp, 2)

    moms_to_pay = round(vat_out_25 - vat_in_total, 2)

    # Build PDF
    buf = BytesIO()
    page_w, page_h = A4
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"Momsdeklaration {month}",
            author="PureNorth Städ")

    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)

    elements = []

    # ── HEADER ─────────────────────────────────────────────────────
    hdr = Table([[
        Paragraph(f"<b>MOMSDEKLARATION</b>", ps("h", fontSize=16, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"{month_name} {year}", ps("s", fontSize=11, textColor=colors.white, alignment=2))
    ]], colWidths=[120*mm, None])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),12),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    elements.append(hdr)

    # Company info
    elements.append(Paragraph(
        f"{company}  ·  Org.nr: {orgnr}  ·  Redovisningsperiod: {start} – {end}",
        ps("info", fontSize=8, textColor=colors.HexColor("#64748b"), spaceBefore=4, spaceAfter=6)
    ))

    # Divider
    div = Table([[""]], colWidths=[page_w-40*mm])
    div.setStyle(TableStyle([("LINEBELOW",(0,0),(-1,-1),1,colors.HexColor("#141414")),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    elements.append(div)
    elements.append(Spacer(1,5*mm))

    def row(ruta, label, value, bold=False, color=None):
        val_color = colors.HexColor(color) if color else colors.HexColor("#141414")
        fn = "Helvetica-Bold" if bold else "Helvetica"
        data = [[
            Paragraph(f"<b>Ruta {ruta}</b>", ps("r", fontSize=8, textColor=colors.HexColor("#94a3b8"))),
            Paragraph(label, ps("l", fontSize=9, fontName=fn, textColor=colors.HexColor("#1a1a1a"))),
            Paragraph(f"{value:,.2f} kr".replace(",","."), ps("v", fontSize=9, fontName=fn, textColor=val_color, alignment=2))
        ]]
        t = Table(data, colWidths=[18*mm, 120*mm, None])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#F8FAFC") if bold else colors.white),
            ("LINEBELOW",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
            ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
        ]))
        elements.append(t)

    def section(title, color="#141414"):
        t = Table([[Paragraph(title, ps("sh", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white))]], colWidths=[page_w-40*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor(color)),
            ("LEFTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
        ]))
        elements.append(t)

    # ── A. MOMS ATT REDOVISA ────────────────────────────────────────
    section("A. MOMS ATT REDOVISA (UTGÅENDE MOMS)", "#1e40af")
    row("05", "Momspliktig försäljning (exkl. moms)", sales_excl)
    if paminnelse_fees > 0:
        row("06", "Påminnelseavgifter (momsfria intäkter)", paminnelse_fees)
    row("10", "Utgående moms 25%", vat_out_25)
    row("11", "Utgående moms 12%", 0)
    row("12", "Utgående moms 6%", 0)

    elements.append(Spacer(1,3*mm))

    # ── B. AVDRAGSGILL INGÅENDE MOMS ───────────────────────────────
    section("B. AVDRAGSGILL INGÅENDE MOMS", "#0369a1")
    row("48", "Ingående moms att dra av", vat_in_total, color="#15803d")

    elements.append(Spacer(1,3*mm))

    # ── SUMMARY ────────────────────────────────────────────────────
    section("SAMMANFATTNING - ATT BETALA/FÅ TILLBAKA", "#b45309")
    row("49", "Moms att betala (+) eller få tillbaka (−)",
        moms_to_pay, bold=True, color="#dc2626" if moms_to_pay > 0 else "#15803d")

    elements.append(Spacer(1,5*mm))

    # ── PAYMENT INFO ───────────────────────────────────────────────
    if moms_to_pay > 0:
        pay_info = f"Betala {moms_to_pay:,.2f} kr till Skatteverket · Bankgiro: 5050-1055 · Ref: {orgnr} · Senast 26:e".replace(",",".")
        pay_color = "#dc2626"
    else:
        pay_info = f"Du får tillbaka {abs(moms_to_pay):,.2f} kr från Skatteverket".replace(",",".")
        pay_color = "#15803d"

    pt = Table([[Paragraph(pay_info, ps("pi", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white))]], colWidths=[page_w-40*mm])
    pt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor(pay_color)),
        ("LEFTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))
    elements.append(pt)

    elements.append(Spacer(1,5*mm))

    # ── INVOICE BREAKDOWN ──────────────────────────────────────────
    if invoices:
        section("FAKTUROR I PERIODEN", "#475569")
        inv_data = [["Faktura #", "Kund", "Datum", "Exkl. moms", "Påm.avg", "Moms 25%", "Att betala"]]
        for i in sorted(invoices, key=lambda x: x.get("created_at","")):
            pam = sum(item.get("quantity",1)*item.get("unit_price",0)
                for item in i.get("items",[])
                if "Påminnelseavgift" in item.get("service",""))
            inv_data.append([
                i.get("invoice_number",""),
                i.get("customer_name","")[:20],
                i.get("created_at","")[:10],
                f'{i.get("subtotal",0):.2f}',
                f'{pam:.2f}' if pam > 0 else "-",
                f'{i.get("vat_amount",0):.2f}',
                f'{i.get("customer_pays",0):.2f}',
            ])
        inv_tbl = Table(inv_data, colWidths=[18*mm, 48*mm, 20*mm, 24*mm, 16*mm, 20*mm, 24*mm])
        inv_tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#F1F5F9")),
            ("FONTSIZE",(0,0),(-1,-1),8),
            ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("ALIGN",(3,0),(-1,-1),"RIGHT"),
        ]))
        elements.append(inv_tbl)

    elements.append(Spacer(1,4*mm))

    # ── FOOTER ─────────────────────────────────────────────────────
    note = "Denna deklaration är baserad på fakturametoden. Kontrollera med din redovisningskonsult innan du skickar till Skatteverket."
    elements.append(Paragraph(note, ps("note", fontSize=7, textColor=colors.HexColor("#94a3b8"))))
    elements.append(Paragraph(
        f"{company}  ·  Org.nr {orgnr}  ·  Momsdeklaration {month_name} {year}  ·  Skapad {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"), spaceBefore=3)
    ))

    doc.build(elements)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="momsdeklaration_{month}.pdf"'}
    )


# ── Bokföringsunderlag PDF ────────────────────────────────────────────────────
@api_router.get("/reports/bokforing")
async def export_bokforing_pdf(month: str, current=Depends(get_current_user)):
    """Export Bokföringsunderlag with BAS account codes per transaction"""
    import calendar
    year, mon = month.split("-")
    last_day = calendar.monthrange(int(year), int(mon))[1]
    start = f"{month}-01"
    end = f"{month}-{last_day:02d}"
    start_dt = f"{start}T00:00:00"
    end_dt = f"{end}T23:59:59"

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    orgnr = inv_settings.company_orgnr or ""

    MONTHS_SV = ["","Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
    month_name = MONTHS_SV[int(mon)]

    invoices = await db.invoices.find({"created_at": {"$gte": start_dt, "$lte": end_dt}}).to_list(2000)
    costs = await db.costs.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)
    expenses = await db.expenses.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"Bokföringsunderlag {month}",
            author="PureNorth Städ")
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    page_w = A4[0]
    elements = []

    # Header
    hdr = Table([[
        Paragraph("<b>BOKFÖRINGSUNDERLAG</b>", ps("h", fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"{month_name} {year}", ps("s", fontSize=10, textColor=colors.white, alignment=2))
    ]], colWidths=[120*mm, None])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    elements.append(hdr)
    elements.append(Paragraph(
        f"{company}  ·  Org.nr: {orgnr}  ·  Period: {start} – {end}  ·  Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        ps("info", fontSize=8, textColor=colors.HexColor("#64748b"), spaceBefore=3, spaceAfter=6)
    ))

    def section_hdr(title, color="#1e40af"):
        t = Table([[Paragraph(title, ps("sh", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white))]], colWidths=[page_w-40*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor(color)),
            ("LEFTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
        ]))
        elements.append(t)

    def trans_table(rows):
        """rows: list of [konto, kontonamn, debet, kredit, beskrivning]"""
        hrow = [["Konto", "Kontonamn", "Debet (kr)", "Kredit (kr)", "Beskrivning"]]
        data = hrow + rows
        t = Table(data, colWidths=[18*mm, 55*mm, 28*mm, 28*mm, None])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#F1F5F9")),
            ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1),8),
            ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("ALIGN",(2,0),(3,-1),"RIGHT"),
            ("TEXTCOLOR",(2,1),(2,-1),colors.HexColor("#1e40af")),
            ("TEXTCOLOR",(3,1),(3,-1),colors.HexColor("#dc2626")),
        ]))
        elements.append(t)

    # ── 1. FAKTUROR ────────────────────────────────────────────────
    elements.append(Spacer(1,3*mm))
    section_hdr("1. FAKTUROR (KUNDFORDRINGAR)", "#1e40af")

    for inv in sorted(invoices, key=lambda x: x.get("created_at","")):
        inv_num = inv.get("invoice_number","")
        customer = inv.get("customer_name","")
        date = inv.get("created_at","")[:10]
        status = inv.get("status","")
        items = inv.get("items", [])
        rut = inv.get("rut_deduction", 0)
        reminder_count = inv.get("reminder_count", 0)

        # Calculate excl. Påminnelseavgift (which has no moms)
        work_items = [i for i in items if i.get("service") != "Påminnelseavgift"]
        sub = sum(i.get("quantity",1) * i.get("unit_price",0) for i in work_items)
        vat_rate = 25
        vat = round(sub * vat_rate / 100, 2)
        pam_fee_total = sum(i.get("quantity",1)*i.get("unit_price",0) for i in items if i.get("service") == "Påminnelseavgift")
        pays = round(sub + vat - rut + pam_fee_total, 2)

        # Check for reminder fee
        reminder_fee_item = next((i for i in items if i.get("service") == "Påminnelseavgift"), None)

        elements.append(Spacer(1,2*mm))
        elements.append(Paragraph(
            f"<b>Faktura #{inv_num}</b>  ·  {customer}  ·  {date}  ·  Status: {status}" +
            (f"  ·  Påminnelse #{reminder_count}" if reminder_count > 0 else ""),
            ps("fh", fontSize=8, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e40af"), spaceBefore=2, spaceAfter=1)
        ))

        rows = [
            ["1510", "Kundfordringar", f"{pays:.2f}", "", f"Faktura #{inv_num} - {customer}"],
        ]
        # Regular items
        for item in items:
            if item.get("service") == "Påminnelseavgift":
                continue
            item_total = item.get("quantity",1) * item.get("unit_price",0)
            rows.append(["3000", item.get("service","Försäljning"), "", f"{item_total:.2f}", "Intäkt exkl. moms"])

        rows.append(["2610", "Utgående moms 25%", "", f"{vat:.2f}", "Moms på försäljning"])

        if rut > 0:
            rows.append(["3001", "RUT-avdrag", f"{rut:.2f}", "", "RUT-reduktion"])

        # Reminder fee as separate entry
        if reminder_fee_item:
            fee = reminder_fee_item.get("quantity",1) * reminder_fee_item.get("unit_price",0)
            rows.append(["3590", "Påminnelseavgifter", "", f"{fee:.2f}", f"Påminnelseavgift #{reminder_count}"])

        trans_table(rows)

    # ── 2. MATERIALKOSTNADER ───────────────────────────────────────
    if costs:
        elements.append(Spacer(1,4*mm))
        section_hdr("2. MATERIALKOSTNADER", "#0369a1")
        cat_konto = {"material":"5410","equipment":"5420","transport":"5612","other":"6990","parking":"5651"}
        cat_name = {"material":"Förbrukningsinventarier","equipment":"Maskiner","transport":"Bränsle","other":"Övriga kostnader","parking":"Parkering"}

        for c in sorted(costs, key=lambda x: x.get("date","")):
            amount = c.get("amount", 0)
            mrate = c.get("moms_rate", 25)
            vat_c = round(amount - amount/(1+mrate/100), 2) if mrate > 0 else 0
            net = round(amount - vat_c, 2)
            cat = c.get("category","material")
            konto = cat_konto.get(cat,"5410")
            kname = cat_name.get(cat,"Kostnad")
            name = c.get("name","")
            date = c.get("date","")

            elements.append(Spacer(1,2*mm))
            elements.append(Paragraph(
                f"<b>{name}</b>  ·  {date}  ·  {c.get('category','')}",
                ps("ch", fontSize=8, fontName="Helvetica-Bold", textColor=colors.HexColor("#0369a1"), spaceBefore=2, spaceAfter=1)
            ))
            rows = [
                [konto, kname, f"{net:.2f}", "", f"Kostnad exkl. moms"],
                ["2640", "Ingående moms", f"{vat_c:.2f}", "", f"Moms {mrate}%"],
                ["1930", "Företagskonto", "", f"{amount:.2f}", "Betalning"],
            ]
            trans_table(rows)

    # ── 3. UTLÄGG ──────────────────────────────────────────────────
    if expenses:
        elements.append(Spacer(1,4*mm))
        section_hdr("3. UTLÄGG (ANSTÄLLDA)", "#7c3aed")
        exp_konto = {"Material":"5410","Bränsle":"5612","Milersättning":"7331","Parkering":"5651","Övrigt":"6990"}

        for e in sorted(expenses, key=lambda x: x.get("date","")):
            amount = e.get("amount", 0)
            mrate = e.get("moms_rate", 0)
            vat_e = round(amount - amount/(1+mrate/100), 2) if mrate > 0 else 0
            net = round(amount - vat_e, 2)
            cat = e.get("category","Övrigt")
            konto = exp_konto.get(cat,"6990")
            name = e.get("description","") or cat
            date = e.get("date","")

            elements.append(Spacer(1,2*mm))
            elements.append(Paragraph(
                f"<b>{name}</b>  ·  {date}  ·  {cat}",
                ps("eh", fontSize=8, fontName="Helvetica-Bold", textColor=colors.HexColor("#7c3aed"), spaceBefore=2, spaceAfter=1)
            ))
            rows = [
                [konto, cat, f"{net:.2f}", "", "Utlägg exkl. moms"],
            ]
            if vat_e > 0:
                rows.append(["2640", "Ingående moms", f"{vat_e:.2f}", "", f"Moms {mrate}%"])
            rows.append(["2890", "Skuld anställd", "", f"{amount:.2f}", "Att ersätta"])
            trans_table(rows)

    # Footer
    elements.append(Spacer(1,4*mm))
    elements.append(Paragraph(
        "Bokföringsunderlag enligt BAS-kontoplanen 2025. Kontrollera med din redovisningskonsult.",
        ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"))
    ))

    doc.build(elements)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="bokforingsunderlag_{month}.pdf"'}
    )


# ── Invoice Reminder ──────────────────────────────────────────────────────────
@api_router.post("/invoices/{invoice_id}/remind")
async def send_invoice_reminder(invoice_id: str, current=Depends(get_current_user)):
    _inv = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if _inv and (_inv.get("credited") or _inv.get("is_credit_note")):
        raise HTTPException(status_code=403, detail="Påminnelse kan inte skickas för krediterad faktura.")
    """Send payment reminder to customer for overdue invoice"""
    doc = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")

    customer_email = doc.get("customer_email", "")
    if not customer_email:
        raise HTTPException(status_code=400, detail="Kunden har ingen e-postadress")

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    inv_num = doc.get("invoice_number", "")
    customer_name = doc.get("customer_name", "")
    due_date = doc.get("due_date", "")
    amount = doc.get("customer_pays", 0)
    reminder_count = doc.get("reminder_count", 0) + 1

    # Calculate days overdue
    try:
        from datetime import date as DateObj
        due = DateObj.fromisoformat(due_date)
        days_overdue = (DateObj.today() - due).days
    except:
        days_overdue = 0

    # Reminder fee (Swedish law: 60 kr after first reminder)
    reminder_fee = 60 if reminder_count >= 2 else 0
    total_with_fee = amount + reminder_fee

    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="E-posttjänst ej konfigurerad")

    admin_email = os.environ.get("ADMIN_EMAIL", "akhazzane.othmane@gmail.com")

    subject = f"Påminnelse #{reminder_count}: Faktura #{inv_num} – {company}"
    if reminder_count >= 3:
        subject = f"Sista betalningspåminnelse: Faktura #{inv_num} – {company}"

    html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;">
      <div style="background:#dc2626;padding:28px 36px;">
        <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">{company}</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">
          {'Påminnelse #' + str(reminder_count) if reminder_count < 3 else 'Sista betalningspåminnelse'}
        </p>
      </div>
      <div style="padding:36px;border:1px solid #e2e8f0;border-top:none;">
        <p style="font-size:17px;color:#141414;margin:0 0 8px;font-weight:600;">Hej {customer_name},</p>
        <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 24px;">
          Vi har inte mottagit betalning för nedanstående faktura som förföll för
          <strong style="color:#dc2626;">{days_overdue} dagar sedan</strong>.
          Vänligen betala snarast möjligt för att undvika inkasso.
        </p>
        <div style="background:#fef2f2;border-radius:8px;padding:20px;margin:0 0 24px;border-left:3px solid #dc2626;">
          <p style="margin:0 0 8px;font-size:14px;"><span style="color:#64748b;">Fakturanummer</span> &nbsp; <strong>#{inv_num}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;"><span style="color:#64748b;">Förfallodatum</span> &nbsp; <strong>{due_date}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;"><span style="color:#64748b;">Ursprungligt belopp</span> &nbsp; <strong>{amount:.2f} kr</strong></p>
          {'<p style="margin:0 0 8px;font-size:14px;"><span style="color:#64748b;">Påminnelseavgift</span> &nbsp; <strong>' + str(reminder_fee) + ' kr</strong></p>' if reminder_fee > 0 else ''}
          <p style="margin:0;font-size:16px;font-weight:700;color:#dc2626;">Att betala: {total_with_fee:.2f} kr</p>
        </div>
        {'<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;margin:0 0 16px;"><p style="color:#dc2626;font-size:13px;font-weight:600;margin:0;">Om betalning inte inkommer inom 10 dagar lämnas ärendet till inkassobolag för vidare åtgärd.</p></div>' if reminder_count >= 2 else ''}
        <p style="color:#64748b;font-size:14px;margin:0 0 16px;">
          Vid frågor, kontakta oss gärna.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;"/>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
          {company} · Miljövänlig städning i Umeå
        </p>
      </div>
    </div>
    """
    try:
        # 1. Build update_fields first
        update_fields = {
            "status": "overdue",
            "reminder_count": reminder_count,
            "last_reminder_at": datetime.now(timezone.utc).isoformat()
        }
        if reminder_fee > 0:
            items = [i for i in doc.get("items", []) if i.get("service") not in ("Påminnelseavgift", "Paminnelseavgift")]
            items.append({
                "service": "Påminnelseavgift",
                "description": "Påminnelseavgift enligt inkassolagen (ingen moms)",
                "quantity": 1,
                "unit_price": reminder_fee,
                "is_material": False,
            })
            work_items = [i for i in items if i.get("service") != "Påminnelseavgift"]
            subtotal = sum(i["quantity"] * i["unit_price"] for i in work_items)
            vat_amount = round(subtotal * 0.25, 2)
            rut_deduction = doc.get("rut_deduction", 0) or 0
            customer_pays = round(subtotal + vat_amount - rut_deduction + reminder_fee, 2)
            update_fields["items"] = items
            update_fields["subtotal"] = round(subtotal, 2)
            update_fields["vat_amount"] = vat_amount
            update_fields["total_amount"] = round(subtotal + vat_amount, 2)
            update_fields["customer_pays"] = customer_pays
        # 2. Save to DB first
        await db.invoices.update_one(
            {"_id": to_object_id(invoice_id)},
            {"$set": update_fields}
        )
        # 3. Fetch updated and generate PDF
        updated_doc = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
        updated_doc["_id"] = str(updated_doc["_id"])
        pdf_bytes = build_invoice_pdf(updated_doc, inv_settings)
        import base64
        pdf_b64 = base64.b64encode(pdf_bytes).decode()
        resend.Emails.send({
            "from": f"{company} <onboarding@resend.dev>",
            "to": admin_email,
            "subject": subject,
            "html": html,
            "attachments": [{
                "filename": f"faktura_{inv_num}.pdf",
                "content": pdf_b64,
            }]
        })

        return {
            "success": True,
            "reminder_count": reminder_count,
            "reminder_fee": reminder_fee,
            "message": f"Påminnelse #{reminder_count} skickad!"
        }

    except Exception as e:
        logger.error(f"Failed to send reminder: {e}")
        raise HTTPException(status_code=500, detail=f"Kunde inte skicka påminnelse: {str(e)}")





# ── RUT Report ────────────────────────────────────────────────────────────────
@api_router.get("/reports/rut")
async def rut_report_pdf(month: str, current=Depends(get_current_user)):
    """Export RUT report for Skatteverket application"""
    import calendar
    year, mon = month.split("-")
    last_day = calendar.monthrange(int(year), int(mon))[1]
    start = f"{month}-01"
    end = f"{month}-{last_day:02d}"
    start_dt = f"{start}T00:00:00"
    end_dt = f"{end}T23:59:59"

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    orgnr = inv_settings.company_orgnr or ""

    MONTHS_SV = ["","Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
    month_name = MONTHS_SV[int(mon)]

    # Get invoices with RUT
    invoices = await db.invoices.find({
        "created_at": {"$gte": start_dt, "$lte": end_dt},
        "rut_deduction": {"$gt": 0},
        "credited": {"$ne": True},
        "is_credit_note": {"$ne": True}
    }).to_list(2000)

    total_rut = sum(i.get("rut_deduction", 0) for i in invoices)
    total_paid = sum(i.get("rut_deduction", 0) for i in invoices if i.get("status") == "paid")
    total_pending = total_rut - total_paid

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"RUT-rapport {month}",
            author="PureNorth Städ")
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    page_w = A4[0]
    elements = []

    # Header
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ps("h", fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>RUT-AVDRAG RAPPORT</b><br/>{month_name} {year}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[100*mm, None])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#15803d")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),12),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    elements.append(hdr)
    elements.append(Paragraph(
        f"{company}  ·  Org.nr: {orgnr}  ·  Period: {start} – {end}  ·  Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        ps("info", fontSize=8, textColor=colors.HexColor("#64748b"), spaceBefore=4, spaceAfter=6)
    ))

    # Summary boxes
    summary_data = [[
        Paragraph(f"<b>Totalt RUT att ansöka</b><br/><br/>{total_rut:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#15803d"))),
        Paragraph(f"<b>Antal fakturor</b><br/><br/>{len(invoices)} st", ps("sb", fontSize=9, textColor=colors.HexColor("#141414"))),
        Paragraph(f"<b>Ansökt (betalda)</b><br/><br/>{total_paid:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#1e40af"))),
    ]]
    summary_tbl = Table(summary_data, colWidths=[(page_w-40*mm)/3]*3)
    summary_tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,0),colors.HexColor("#f0fdf4")),
        ("BACKGROUND",(1,0),(1,0),colors.HexColor("#f8fafc")),
        ("BACKGROUND",(2,0),(2,0),colors.HexColor("#eff6ff")),
        ("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
        ("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))
    elements.append(summary_tbl)
    elements.append(Spacer(1,5*mm))

    # How to apply
    elements.append(Paragraph("HUR DU ANSÖKER OM RUT-AVDRAG", ps("sh", fontSize=9, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=2)))
    steps = [
        "1. Gå till skatteverket.se → Logga in med BankID",
        "2. Välj 'ROT och RUT-avdrag' → 'Begär utbetalning'",
        "3. Fyll i kundens personnummer och RUT-belopp per faktura",
        "4. Skatteverket betalar ut inom 2-4 veckor",
    ]
    for step in steps:
        elements.append(Paragraph(step, ps("s", fontSize=8, textColor=colors.HexColor("#475569"), spaceBefore=1)))
    elements.append(Spacer(1,5*mm))

    # Invoice list
    elements.append(Paragraph("FAKTUROR MED RUT-AVDRAG", ps("sh", fontSize=9, fontName="Helvetica-Bold", spaceBefore=2, spaceAfter=2)))

    if not invoices:
        elements.append(Paragraph("Inga fakturor med RUT-avdrag denna period.", ps("s", fontSize=9, textColor=colors.HexColor("#94a3b8"))))
    else:
        inv_data = [["Faktura #", "Kund", "Personnummer", "Tjänst", "Arbetskostnad", "RUT 50%", "Status"]]
        for inv in sorted(invoices, key=lambda x: x.get("created_at","")):
            work_items = [i for i in inv.get("items",[]) if "Påminnelseavgift" not in i.get("service","")]
            svc_names = set()
            for it in work_items:
                svc = it.get("service","") or it.get("description","")
                if svc: svc_names.add(svc.split("(")[0].strip())
            services = ", ".join(svc_names) or "Städtjänst"
            rut = inv.get("rut_deduction", 0)
            labor = rut * 2
            personnr = inv.get("customer_personnummer", "") or "—"
            status = "Betald" if inv.get("status") == "paid" else "Obetald"
            inv_data.append([
                str(inv.get("invoice_number","")),
                inv.get("customer_name","")[:18],
                personnr,
                services[:22],
                f"{labor:.2f}",
                f"{rut:.2f}",
                status,
            ])

        # Totals row
        inv_data.append(["", "TOTALT", "", "", f"{total_rut*2:,.2f}".replace(",","."), f"{total_rut:,.2f}".replace(",","."), ""])

        inv_tbl = Table(inv_data, colWidths=[15*mm, 35*mm, 28*mm, 32*mm, 24*mm, 20*mm, 18*mm])
        inv_tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#15803d")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
            ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#f0fdf4")),
            ("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1),8),
            ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("ALIGN",(4,0),(5,-1),"RIGHT"),
        ]))
        elements.append(inv_tbl)

    elements.append(Spacer(1,5*mm))
    elements.append(Paragraph(
        f"OBS: Kunden måste ha betalat sin del innan du kan ansöka om RUT. Kontrollera att personnummer är korrekt.",
        ps("note", fontSize=7, textColor=colors.HexColor("#94a3b8"))
    ))

    doc.build(elements)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="rut_rapport_{month}.pdf"'}
    )


# ── Kostnader PDF Export ──────────────────────────────────────────────────────
@api_router.get("/costs/report-pdf")
async def costs_report_pdf(month: str, current=Depends(get_current_user)):
    """Export Kostnader PDF with monthly comparison"""
    import calendar
    year, mon = month.split("-")
    last_day = calendar.monthrange(int(year), int(mon))[1]
    start = f"{month}-01"
    end = f"{month}-{last_day:02d}"

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    MONTHS_SV = ["","Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
    month_name = MONTHS_SV[int(mon)]

    # Current month costs
    costs = await db.costs.find({"date": {"$gte": start, "$lte": end}}).to_list(1000)
    total = sum(c.get("amount",0) for c in costs)
    ingaende_moms = sum(c.get("amount",0) - c.get("amount",0)/(1+c.get("moms_rate",25)/100) for c in costs)
    excl_moms = total - ingaende_moms
    by_cat = {}
    for c in costs:
        cat = c.get("category","material")
        by_cat[cat] = by_cat.get(cat,0) + c.get("amount",0)

    # Last 6 months comparison
    monthly_data = []
    for i in range(5, -1, -1):
        d = DateClass(int(year), int(mon), 1)
        for _ in range(i):
            d = (d.replace(day=1) - timedelta(days=1)).replace(day=1)
        m_start = d.strftime("%Y-%m-01")
        m_last = calendar.monthrange(d.year, d.month)[1]
        m_end = f"{d.strftime('%Y-%m')}-{m_last:02d}"
        m_costs = await db.costs.find({"date": {"$gte": m_start, "$lte": m_end}}).to_list(1000)
        m_total = sum(c.get("amount",0) for c in m_costs)
        monthly_data.append({
            "month": MONTHS_SV[d.month][:3] + f" {d.year}",
            "total": m_total,
            "count": len(m_costs),
        })

    # Build PDF
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"Kostnadsrapport {month}",
        author=company)
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    page_w = A4[0]
    elements = []

    # Header
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ps("h", fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>KOSTNADSRAPPORT</b><br/>{month_name} {year}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[100*mm, None])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    elements.append(hdr)
    elements.append(Spacer(1,4*mm))

    # Summary boxes
    sum_data = [[
        Paragraph(f"<b>Totalt inkl. moms</b><br/>{total:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#141414"))),
        Paragraph(f"<b>Ingående moms</b><br/>{ingaende_moms:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#15803d"))),
        Paragraph(f"<b>Nettokostnad (exkl. moms)</b><br/>{excl_moms:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#1e40af"))),
        Paragraph(f"<b>Antal poster</b><br/>{len(costs)} st", ps("sb", fontSize=9, textColor=colors.HexColor("#64748b"))),
    ]]
    sum_tbl = Table(sum_data, colWidths=[(page_w-40*mm)/4]*4)
    sum_tbl.setStyle(TableStyle([
        ("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
        ("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("BACKGROUND",(0,0),(0,0),colors.HexColor("#F8FAFC")),
    ]))
    elements.append(sum_tbl)
    elements.append(Spacer(1,5*mm))

    # Category breakdown
    if by_cat:
        elements.append(Paragraph("KOSTNADER PER KATEGORI", ps("sh", fontSize=9, fontName="Helvetica-Bold", spaceBefore=2, spaceAfter=2)))
        cat_names = {"material":"Städmaterial","equipment":"Utrustning","transport":"Transport","parking":"Parkering","other":"Övrigt"}
        cat_data = [["Kategori", "Belopp inkl. moms", "Andel %"]]
        for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]):
            pct = (amt/total*100) if total > 0 else 0
            cat_data.append([cat_names.get(cat,cat), f"{amt:.2f} kr", f"{pct:.1f}%"])
        cat_data.append(["TOTALT", f"{total:.2f} kr", "100%"])
        cat_tbl = Table(cat_data, colWidths=[80*mm, 60*mm, 30*mm])
        cat_tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1),9),
            ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
            ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
            ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),
            ("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
            ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ]))
        elements.append(cat_tbl)
        elements.append(Spacer(1,5*mm))

    # Detailed list
    if costs:
        elements.append(Paragraph("DETALJERAD KOSTNADSLISTA", ps("sh", fontSize=9, fontName="Helvetica-Bold", spaceBefore=2, spaceAfter=2)))
        det_data = [["Datum", "Namn", "Kategori", "Moms %", "Belopp"]]
        cat_names = {"material":"Material","equipment":"Utrustning","transport":"Transport","parking":"Parkering","other":"Övrigt"}
        for c in sorted(costs, key=lambda x: x.get("date","")):
            det_data.append([
                c.get("date",""),
                c.get("name","")[:30],
                cat_names.get(c.get("category",""),""),
                f"{c.get('moms_rate',25)}%",
                f"{c.get('amount',0):.2f} kr",
            ])
        det_tbl = Table(det_data, colWidths=[25*mm, 70*mm, 30*mm, 20*mm, 30*mm])
        det_tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#475569")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1),8),
            ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
            ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("ALIGN",(4,0),(-1,-1),"RIGHT"),
        ]))
        elements.append(det_tbl)
        elements.append(Spacer(1,5*mm))

    # Monthly comparison
    elements.append(Paragraph("JÄMFÖRELSE SENASTE 6 MÅNADER", ps("sh", fontSize=9, fontName="Helvetica-Bold", spaceBefore=2, spaceAfter=2)))
    max_val = max(m["total"] for m in monthly_data) or 1
    comp_data = [["Månad", "Kostnader", "Poster", "Graf"]]
    for m in monthly_data:
        bar_len = int((m["total"] / max_val) * 30) if max_val > 0 else 0
        bar = "█" * bar_len
        is_current = m["month"].startswith(month_name[:3])
        comp_data.append([
            m["month"],
            f"{m['total']:.2f} kr",
            f"{m['count']} st",
            Paragraph(f'<font color="{"#141414" if is_current else "#94a3b8"}">{bar}</font>', ps("bar", fontSize=7)),
        ])
    comp_tbl = Table(comp_data, colWidths=[35*mm, 40*mm, 20*mm, None])
    comp_tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#475569")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),8),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(1,0),(2,-1),"RIGHT"),
    ]))
    elements.append(comp_tbl)

    # Lönsamhet section
    elements.append(Spacer(1,5*mm))
    elements.append(Paragraph("LÖNSAMHETSANALYS", ps("sh", fontSize=9, fontName="Helvetica-Bold", spaceBefore=2, spaceAfter=2)))

    # Get revenue for this month
    invoices = await db.invoices.find({
        "created_at": {"$gte": start + "T00:00:00", "$lte": end + "T23:59:59"},
        "status": "paid"
    }).to_list(1000)
    revenue = sum(i.get("customer_pays",0) for i in invoices)
    bruttovinst = round(revenue - total, 2)
    bruttomarginal = round((bruttovinst / revenue * 100) if revenue > 0 else 0, 1)

    lon_data = [
        ["Post", "Belopp"],
        ["Intäkter (betalda fakturor)", f"{revenue:.2f} kr"],
        ["Materialkostnader (inkl. moms)", f"-{total:.2f} kr"],
        ["Ingående moms (avdragsgill)", f"+{round(ingaende_moms,2):.2f} kr"],
        ["Nettokostnader (exkl. moms)", f"-{round(excl_moms,2):.2f} kr"],
        ["BRUTTOVINST", f"{bruttovinst:.2f} kr"],
        ["Bruttomarginal", f"{bruttomarginal}%"],
    ]
    lon_tbl = Table(lon_data, colWidths=[120*mm, None])
    lon_tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),9),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ("BACKGROUND",(0,-2),(-1,-1),colors.HexColor("#F1F5F9")),
        ("FONTNAME",(0,-2),(-1,-1),"Helvetica-Bold"),
        ("TEXTCOLOR",(1,-2),(1,-2),colors.HexColor("#15803d") if bruttovinst >= 0 else colors.HexColor("#dc2626")),
        ("LINEABOVE",(0,-2),(-1,-2),1,colors.HexColor("#141414")),
    ]))
    elements.append(lon_tbl)

    elements.append(Spacer(1,4*mm))
    elements.append(Paragraph(
        f"{company}  ·  Kostnadsrapport {month_name} {year}  ·  Skapad {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"))
    ))

    doc.build(elements)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="kostnader_{month}.pdf"'}
    )


# ── Invoices Excel Export ─────────────────────────────────────────────────────
@api_router.get("/invoices/export-xlsx")
async def export_invoices_xlsx(start: str = None, end: str = None, current=Depends(get_current_user)):
    """Export invoices to Excel"""
    query = {}
    if start and end:
        query["created_at"] = {"$gte": start, "$lte": end + "T23:59:59"}
    elif start:
        query["created_at"] = {"$gte": start}
    elif end:
        query["created_at"] = {"$lte": end + "T23:59:59"}

    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(5000)

    wb = Workbook()
    ws = wb.active
    ws.title = "Fakturor"

    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    # Headers
    headers = [
        "Faktura #", "Datum", "Förfallodatum", "Kund", "E-post",
        "Typ", "Tjänst", "Exkl. moms (kr)", "Moms 25% (kr)",
        "Totalt inkl. moms (kr)", "RUT-avdrag (kr)", "Påminnelseavgift (kr)",
        "Att betala (kr)", "Status", "Påminnelser",
    ]
    ws.append(headers)

    # Style header
    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for col, cell in enumerate(ws[1], 1):
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", wrap_text=True)

    status_map = {"paid": "Betald", "draft": "Utkast", "sent": "Skickad", "overdue": "Förfallen", "cancelled": "Avbruten"}

    total_excl = total_moms = total_rut = total_pam = total_pays = 0
    paid_count = unpaid_count = 0

    for inv in invoices:
        items = inv.get("items", [])
        pam_fee = sum(item.get("quantity",1)*item.get("unit_price",0) for item in items if "Påminnelseavgift" in item.get("service",""))
        services = ", ".join(set(i.get("service","") for i in items if "Påminnelseavgift" not in i.get("service","")))
        status = inv.get("status","")
        excl = inv.get("subtotal", 0)
        moms = inv.get("vat_amount", 0)
        rut = inv.get("rut_deduction", 0)
        pays = inv.get("customer_pays", 0)

        total_excl += excl
        total_moms += moms
        total_rut += rut
        total_pam += pam_fee
        total_pays += pays
        if status == "paid": paid_count += 1
        else: unpaid_count += 1

        row = [
            inv.get("invoice_number",""),
            inv.get("created_at","")[:10],
            inv.get("due_date",""),
            inv.get("customer_name",""),
            inv.get("customer_email",""),
            "Företag" if inv.get("customer_type") == "company" else "Privat",
            services[:50],
            round(excl, 2),
            round(moms, 2),
            round(excl + moms, 2),
            round(rut, 2),
            round(pam_fee, 2),
            round(pays, 2),
            status_map.get(status, status),
            inv.get("reminder_count", 0),
        ]
        ws.append(row)

        # Color status
        status_colors = {"paid": "DCFCE7", "overdue": "FEE2E2", "sent": "EFF6FF", "draft": "F8FAFC"}
        fill_color = status_colors.get(status, "FFFFFF")
        for cell in ws[ws.max_row]:
            cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
            cell.font = Font(size=9)
            cell.alignment = Alignment(horizontal="left")

    # Totals row
    ws.append(["TOTALT", "", "", "", "", "", "",
        round(total_excl,2), round(total_moms,2), round(total_excl+total_moms,2),
        round(total_rut,2), round(total_pam,2), round(total_pays,2), "", ""])
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True, size=9)
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    # Summary sheet
    ws2 = wb.create_sheet("Sammanfattning")
    ws2.append(["Post", "Värde"])
    ws2.append(["Antal fakturor", len(invoices)])
    ws2.append(["Betalda", paid_count])
    ws2.append(["Obetalda", unpaid_count])
    ws2.append(["Total exkl. moms", round(total_excl,2)])
    ws2.append(["Total moms", round(total_moms,2)])
    ws2.append(["Total RUT-avdrag", round(total_rut,2)])
    ws2.append(["Total påminnelseavgifter", round(total_pam,2)])
    ws2.append(["Totalt att betala", round(total_pays,2)])
    for cell in ws2[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")

    # Column widths
    col_widths = [12, 12, 14, 25, 25, 10, 30, 16, 14, 18, 14, 18, 14, 12, 12]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    ws2.column_dimensions["A"].width = 25
    ws2.column_dimensions["B"].width = 18

    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="fakturor.xlsx"'}
    )


# ── Invoices List PDF Export ──────────────────────────────────────────────────
@api_router.get("/invoices/export-pdf")
async def export_invoices_pdf(start: str = None, end: str = None, current=Depends(get_current_user)):
    query = {}
    if start and end:
        query["created_at"] = {"$gte": start, "$lte": end + "T23:59:59"}
    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(5000)
    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"

    total_excl = sum(i.get("subtotal",0) for i in invoices)
    total_moms = sum(i.get("vat_amount",0) for i in invoices)
    total_rut = sum(i.get("rut_deduction",0) for i in invoices)
    total_pam = sum(sum(item.get("quantity",1)*item.get("unit_price",0) for item in i.get("items",[]) if "Påminnelseavgift" in item.get("service","")) for i in invoices)
    total_pays = sum(i.get("customer_pays",0) for i in invoices)
    paid = sum(1 for i in invoices if i.get("status") == "paid")

    from reportlab.lib.pagesizes import landscape
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
        topMargin=12*mm, bottomMargin=12*mm, leftMargin=15*mm, rightMargin=15*mm,
        title="Fakturalista", author=company)
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    page_w = landscape(A4)[0]
    elements = []

    # Header
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ps("h", fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>FAKTURALISTA</b><br/>Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[120*mm, None])
    hdr.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    elements.append(hdr)
    elements.append(Spacer(1,3*mm))

    # Summary
    sum_data = [[
        Paragraph(f"<b>Antal</b><br/>{len(invoices)} st", ps("sb", fontSize=9)),
        Paragraph(f"<b>Betalda</b><br/>{paid} st", ps("sb", fontSize=9, textColor=colors.HexColor("#15803d"))),
        Paragraph(f"<b>Obetalda</b><br/>{len(invoices)-paid} st", ps("sb", fontSize=9, textColor=colors.HexColor("#dc2626"))),
        Paragraph(f"<b>Exkl. moms</b><br/>{total_excl:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#1e40af"))),
        Paragraph(f"<b>RUT-avdrag</b><br/>{total_rut:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#7c3aed"))),
        Paragraph(f"<b>Att betala</b><br/>{total_pays:.2f} kr", ps("sb", fontSize=9)),
    ]]
    sum_tbl = Table(sum_data, colWidths=[(page_w-30*mm)/6]*6)
    sum_tbl.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    elements.append(sum_tbl)
    elements.append(Spacer(1,4*mm))

    status_map = {"paid":"Betald","draft":"Utkast","sent":"Skickad","overdue":"Förfallen","cancelled":"Avbruten"}
    status_colors = {"paid":colors.HexColor("#15803d"),"overdue":colors.HexColor("#dc2626"),"sent":colors.HexColor("#1e40af"),"draft":colors.HexColor("#64748b")}

    data = [["#","Datum","Förfaller","Kund","Tjänst","Exkl. moms","Moms","RUT","Påm.avg","Att betala","Status","Påm."]]
    for inv in invoices:
        items = inv.get("items",[])
        pam = sum(item.get("quantity",1)*item.get("unit_price",0) for item in items if "Påminnelseavgift" in item.get("service",""))
        svc_set = set()
        for it in items:
            if "Påminnelseavgift" not in it.get("service",""):
                svc = it.get("service","") or it.get("description","")
                svc = svc.split("(")[0].strip()  # Remove "(100 kvm → 5 tim)" part
                if svc: svc_set.add(svc)
        services = ", ".join(svc_set)[:30] or "Städtjänst"
        data.append([str(inv.get("invoice_number","")),inv.get("created_at","")[:10],inv.get("due_date",""),inv.get("customer_name","")[:20],services,f'{inv.get("subtotal",0):.2f}',f'{inv.get("vat_amount",0):.2f}',f'{inv.get("rut_deduction",0):.2f}',f'{pam:.2f}' if pam>0 else "-",f'{inv.get("customer_pays",0):.2f}',status_map.get(inv.get("status",""),""),str(inv.get("reminder_count",0))])
    data.append(["TOTALT","","","","",f"{total_excl:.2f}",f"{total_moms:.2f}",f"{total_rut:.2f}",f"{total_pam:.2f}",f"{total_pays:.2f}","",""])

    tbl = Table(data, colWidths=[16*mm,22*mm,22*mm,38*mm,38*mm,24*mm,18*mm,18*mm,18*mm,24*mm,20*mm,12*mm])
    ts = [("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),7.5),("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),("ALIGN",(5,0),(-1,-1),"RIGHT"),("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold")]
    for row_idx, inv in enumerate(invoices, 1):
        col = status_colors.get(inv.get("status",""))
        if col: ts.append(("TEXTCOLOR",(10,row_idx),(10,row_idx),col))
    tbl.setStyle(TableStyle(ts))
    elements.append(tbl)
    elements.append(Spacer(1,3*mm))
    elements.append(Paragraph(f"{company}  ·  Fakturalista  ·  {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"))))
    doc.build(elements)
    return Response(content=buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": 'inline; filename="fakturor.pdf"'})



# ── Costs Excel Export ────────────────────────────────────────────────────────
@api_router.get("/costs/export-xlsx")
async def export_costs_xlsx(start: str = None, end: str = None, current=Depends(get_current_user)):
    """Export costs to Excel with monthly comparison"""
    import calendar
    query = {}
    if start and end:
        query["date"] = {"$gte": start, "$lte": end}
    elif start:
        query["date"] = {"$gte": start}
    elif end:
        query["date"] = {"$lte": end}

    costs = await db.costs.find(query).sort("date", -1).to_list(5000)

    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    wb = Workbook()

    # ── Sheet 1: Kostnader ─────────────────────────────────────────
    ws = wb.active
    ws.title = "Kostnader"

    headers = ["Datum", "Namn", "Kategori", "Moms %", "Belopp inkl. moms (kr)", "Ingående moms (kr)", "Nettokostnad exkl. moms (kr)"]
    ws.append(headers)

    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    cat_names = {"material":"Städmaterial","equipment":"Utrustning","transport":"Transport","parking":"Parkering","other":"Övrigt"}

    total_incl = total_moms = total_excl = 0
    for c in costs:
        amt = c.get("amount",0)
        mrate = c.get("moms_rate",25)
        moms = round(amt - amt/(1+mrate/100), 2) if mrate > 0 else 0
        excl = round(amt - moms, 2)
        total_incl += amt; total_moms += moms; total_excl += excl
        ws.append([
            c.get("date",""),
            c.get("name",""),
            cat_names.get(c.get("category",""),""),
            f"{mrate}%",
            round(amt,2),
            moms,
            excl,
        ])
        for cell in ws[ws.max_row]:
            cell.font = Font(size=9)

    # Totals
    ws.append(["TOTALT","","","", round(total_incl,2), round(total_moms,2), round(total_excl,2)])
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True, size=9)
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    col_widths = [14, 30, 16, 10, 24, 20, 24]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # ── Sheet 2: Per kategori ──────────────────────────────────────
    ws2 = wb.create_sheet("Per kategori")
    ws2.append(["Kategori", "Antal poster", "Belopp inkl. moms (kr)", "Ingående moms (kr)", "Nettokostnad (kr)"])
    for cell in ws2[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill

    by_cat = {}
    for c in costs:
        cat = cat_names.get(c.get("category","material"),"Övrigt")
        if cat not in by_cat:
            by_cat[cat] = {"count":0,"total":0,"moms":0,"excl":0}
        amt = c.get("amount",0)
        mrate = c.get("moms_rate",25)
        moms = round(amt - amt/(1+mrate/100), 2) if mrate > 0 else 0
        by_cat[cat]["count"] += 1
        by_cat[cat]["total"] += amt
        by_cat[cat]["moms"] += moms
        by_cat[cat]["excl"] += round(amt-moms, 2)

    for cat, vals in sorted(by_cat.items()):
        ws2.append([cat, vals["count"], round(vals["total"],2), round(vals["moms"],2), round(vals["excl"],2)])
        for cell in ws2[ws2.max_row]: cell.font = Font(size=9)

    for i, w in enumerate([20,14,24,20,20], 1):
        ws2.column_dimensions[get_column_letter(i)].width = w

    # ── Sheet 3: Månadsöversikt ────────────────────────────────────
    ws3 = wb.create_sheet("Månadsöversikt")
    ws3.append(["Månad", "Antal poster", "Totalt inkl. moms (kr)", "Ingående moms (kr)", "Nettokostnad (kr)"])
    for cell in ws3[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill

    by_month = {}
    for c in costs:
        month = c.get("date","")[:7]
        if month not in by_month:
            by_month[month] = {"count":0,"total":0,"moms":0,"excl":0}
        amt = c.get("amount",0)
        mrate = c.get("moms_rate",25)
        moms = round(amt - amt/(1+mrate/100), 2) if mrate > 0 else 0
        by_month[month]["count"] += 1
        by_month[month]["total"] += amt
        by_month[month]["moms"] += moms
        by_month[month]["excl"] += round(amt-moms, 2)

    for month in sorted(by_month.keys(), reverse=True):
        vals = by_month[month]
        ws3.append([month, vals["count"], round(vals["total"],2), round(vals["moms"],2), round(vals["excl"],2)])
        for cell in ws3[ws3.max_row]: cell.font = Font(size=9)

    for i, w in enumerate([14,14,24,20,20], 1):
        ws3.column_dimensions[get_column_letter(i)].width = w

    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="kostnader.xlsx"'}
    )


# ── Bookings PDF Export ───────────────────────────────────────────────────────
@api_router.get("/bookings/export-pdf")
async def export_bookings_pdf(current=Depends(get_current_user)):
    bookings = await db.bookings.find().sort("created_at", -1).to_list(5000)
    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    status_map = {"new":"Ny","contacted":"Kontaktad","done":"Klar","cancelled":"Avbruten"}
    buf = BytesIO()
    from reportlab.lib.pagesizes import landscape
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
        topMargin=12*mm, bottomMargin=12*mm, leftMargin=15*mm, rightMargin=15*mm,
        title="Bokningslista", author=company)
    styles = getSampleStyleSheet()
    elements = []
    # Header
    from reportlab.lib.units import mm as mm2
    page_w = landscape(A4)[0]
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ParagraphStyle("h", parent=styles["Normal"], fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>BOKNINGSLISTA</b><br/>Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ParagraphStyle("s", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[120*mm, None])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ]))
    elements.append(hdr)
    elements.append(Spacer(1, 5*mm))
    # Table
    data = [["Datum", "Kund", "Telefon", "E-post", "Tjänst", "Status"]]
    for b in bookings:
        data.append([
            (b.get("created_at","")[:10] or b.get("preferred_date","") or "-"),
            (b.get("name","") or "-")[:25],
            (b.get("phone","") or "-"),
            (b.get("email","") or "-")[:30],
            (", ".join(b.get("services",[]) or []))[:30] or "-",
            status_map.get(b.get("status","new"), "Ny"),
        ])
    tbl = Table(data, colWidths=[25*mm, 45*mm, 30*mm, 55*mm, 55*mm, 20*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),8),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#F8FAFC")]),
        ("LEFTPADDING",(0,0),(-1,-1),4),
        ("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),3),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
    ]))
    elements.append(tbl)
    doc.build(elements)
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="bokningar.pdf"'})

# ── Bookings Excel Export ─────────────────────────────────────────────────────
@api_router.get("/bookings/export-xlsx")
async def export_bookings_xlsx(start: str = None, end: str = None, current=Depends(get_current_user)):
    query = {}
    if start and end:
        query["created_at"] = {"$gte": start, "$lte": end + "T23:59:59"}
    bookings = await db.bookings.find(query).sort("created_at", -1).to_list(5000)

    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = "Bokningar"

    headers = ["Datum", "Namn", "E-post", "Telefon", "Adress", "Tjänster", "Yta/Antal", "Önskat datum", "Anteckning", "Status"]
    ws.append(headers)

    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    status_map = {"new":"Ny","contacted":"Kontaktad","quoted":"Offert","done":"Klar","cancelled":"Avbruten"}
    status_colors = {"new":"DBEAFE","contacted":"FEF3C7","quoted":"EDE9FE","done":"DCFCE7","cancelled":"FEE2E2"}

    by_status = {}
    for b in bookings:
        s = b.get("status","new")
        by_status[s] = by_status.get(s,0) + 1
        services = ", ".join(b.get("services",[]) or [b.get("service","")])
        status = status_map.get(s, s)
        ws.append([
            b.get("created_at","")[:10],
            b.get("name",""),
            b.get("email",""),
            b.get("phone",""),
            b.get("address","") or "-",
            services,
            b.get("kvm","") or "-",
            b.get("preferred_date","") or "-",
            b.get("other_description","") or "-",
            status,
        ])
        fill_color = status_colors.get(b.get("status","new"), "FFFFFF")
        for cell in ws[ws.max_row]:
            cell.font = Font(size=9)
            cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")

    # Summary sheet
    ws2 = wb.create_sheet("Sammanfattning")
    ws2.append(["Status", "Antal"])
    for cell in ws2[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
    for s, label in status_map.items():
        ws2.append([label, by_status.get(s,0)])
        for cell in ws2[ws2.max_row]: cell.font = Font(size=9)
    ws2.append(["TOTALT", len(bookings)])
    for cell in ws2[ws2.max_row]: cell.font = Font(bold=True, size=9)

    col_widths = [14, 22, 28, 16, 25, 30, 12, 16, 30, 14]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws2.column_dimensions["A"].width = 16
    ws2.column_dimensions["B"].width = 10

    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="bokningar.xlsx"'}
    )


# ── Schema PDF Export ─────────────────────────────────────────────────────────
@api_router.get("/shifts/export-pdf")
async def export_shifts_pdf(start: str, end: str, current=Depends(get_current_user)):
    """Export schema/shifts to PDF"""
    shifts = await db.shifts.find({"date": {"$gte": start, "$lte": end}}).sort("date", 1).to_list(5000)
    employees = await db.employees.find().to_list(100)
    emp_map = {str(e["_id"]): e for e in employees}
    # Get absences for this period
    absences = await db.absences.find({"start_date": {"$lte": end}, "end_date": {"$gte": start}}).to_list(1000)
    absence_map = {}
    for ab in absences:
        eid = ab.get("employee_id","")
        if eid not in absence_map: absence_map[eid] = []
        absence_map[eid].append({"type": ab.get("absence_type","sjuk"), "start": ab.get("start_date",""), "end": ab.get("end_date","")})
    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"

    # Group by employee
    by_emp = {}
    for s in shifts:
        eid = s.get("employee_id","")
        if eid not in by_emp:
            emp = emp_map.get(eid, {})
            by_emp[eid] = {"name": emp.get("name","Okänd"), "shifts": [], "total_h": 0}
        # Calculate hours
        try:
            from datetime import datetime as DT
            st = DT.strptime(s["start_time"], "%H:%M")
            et = DT.strptime(s["end_time"], "%H:%M")
            h = round((et - st).seconds / 3600, 2)
        except:
            h = 0
        by_emp[eid]["shifts"].append({**s, "hours": h})
        by_emp[eid]["total_h"] += h

    from reportlab.lib.pagesizes import landscape
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
        topMargin=12*mm, bottomMargin=12*mm, leftMargin=15*mm, rightMargin=15*mm,
        title=f"Schema {start} - {end}", author=company)
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    page_w = landscape(A4)[0]
    elements = []

    # Header
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ps("h", fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>SCHEMA</b><br/>{start} – {end}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[120*mm, None])
    hdr.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    elements.append(hdr)
    elements.append(Spacer(1,3*mm))

    # Summary
    total_shifts = len(shifts)
    total_hours = sum(e["total_h"] for e in by_emp.values())
    sum_data = [[
        Paragraph(f"<b>Antal pass</b><br/>{total_shifts} st", ps("sb", fontSize=9)),
        Paragraph(f"<b>Antal anställda</b><br/>{len(by_emp)} st", ps("sb", fontSize=9, textColor=colors.HexColor("#1e40af"))),
        Paragraph(f"<b>Totala timmar</b><br/>{total_hours:.1f} tim", ps("sb", fontSize=9, textColor=colors.HexColor("#15803d"))),
    ]]
    sum_tbl = Table(sum_data, colWidths=[(page_w-30*mm)/3]*3)
    sum_tbl.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    elements.append(sum_tbl)
    elements.append(Spacer(1,5*mm))

    # Shifts table
    data = [["Datum", "Anställd", "Start", "Slut", "Timmar", "OB", "Notering"]]
    for eid, emp_data in sorted(by_emp.items(), key=lambda x: x[1]["name"]):
        for s in emp_data["shifts"]:
            ob = "OB1" if s.get("is_ob1") else ("OB2" if s.get("is_ob2") else "-")
            # Check if employee is absent this day
            emp_absences = absence_map.get(eid, [])
            sick_note = ""
            for ab in emp_absences:
                if ab["start"] <= s.get("date","") <= ab["end"]:
                    atype_map = {"sjuk":"🤒 Sjuk","semester":"🏖 Semester","vab":"👶 VAB","permission":"📋 Permission"}
                    sick_note = atype_map.get(ab["type"], ab["type"])
                    break
            data.append([
                s.get("date",""),
                emp_data["name"],
                s.get("start_time",""),
                s.get("end_time",""),
                f'{s["hours"]:.1f} tim',
                ob,
                sick_note or s.get("note","") or "-",
            ])
        # Employee subtotal
        data.append(["", f'SUMMA {emp_data["name"]}', "", "", f'{emp_data["total_h"]:.1f} tim', "", ""])

    # Grand total
    data.append(["TOTALT", "", "", "", f'{total_hours:.1f} tim', "", ""])

    tbl = Table(data, colWidths=[25*mm, 55*mm, 20*mm, 20*mm, 22*mm, 16*mm, None])
    ts = [
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),8.5),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#F8FAFC")]),
        ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),
        ("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
    ]
    # Style subtotal rows
    for i, row in enumerate(data[1:], 1):
        if row[1].startswith("SUMMA"):
            ts.append(("BACKGROUND",(0,i),(-1,i),colors.HexColor("#EFF6FF")))
            ts.append(("FONTNAME",(0,i),(-1,i),"Helvetica-Bold"))
            ts.append(("TEXTCOLOR",(0,i),(-1,i),colors.HexColor("#1e40af")))

    tbl.setStyle(TableStyle(ts))
    elements.append(tbl)
    elements.append(Spacer(1,3*mm))
    elements.append(Paragraph(f"{company}  ·  Schema {start} – {end}  ·  {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"))))

    doc.build(elements)
    return Response(content=buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="schema_{start}_{end}.pdf"'})


# ── Schema Excel Export ───────────────────────────────────────────────────────
@api_router.get("/shifts/export-xlsx")
async def export_shifts_xlsx(start: str, end: str, current=Depends(get_current_user)):
    """Export schema/shifts to Excel"""
    shifts = await db.shifts.find({"date": {"$gte": start, "$lte": end}}).sort("date", 1).to_list(5000)
    employees = await db.employees.find().to_list(100)
    emp_map = {str(e["_id"]): e for e in employees}

    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = Workbook()

    # ── Sheet 1: Alla pass ────────────────────────────────────────
    ws = wb.active
    ws.title = "Alla pass"

    headers = ["Datum", "Veckodag", "Anställd", "Start", "Slut", "Timmar", "OB1", "OB2", "Notering"]
    ws.append(headers)

    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    DAYS_SV = ["Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag","Söndag"]
    total_hours = 0

    # Load absences
    absences_list = await db.absences.find({"start_date": {"$lte": end}, "end_date": {"$gte": start}}).to_list(1000)
    absence_map_xl = {}
    for ab in absences_list:
        eid = ab.get("employee_id","")
        if eid not in absence_map_xl: absence_map_xl[eid] = []
        absence_map_xl[eid].append({"type": ab.get("absence_type","sjuk"), "start": ab.get("start_date",""), "end": ab.get("end_date","")})

    for s in shifts:
        eid = s.get("employee_id","")
        emp = emp_map.get(eid, {})
        try:
            from datetime import datetime as DT, date as DateObj
            d = DateObj.fromisoformat(s["date"])
            weekday = DAYS_SV[d.weekday()]
            st = DT.strptime(s["start_time"], "%H:%M")
            et = DT.strptime(s["end_time"], "%H:%M")
            h = round((et - st).seconds / 3600, 2)
        except:
            weekday = ""
            h = 0
        total_hours += h
        # Check absence
        sick_note = ""
        for ab in absence_map_xl.get(eid, []):
            if ab["start"] <= s.get("date","") <= ab["end"]:
                atype_map = {"sjuk":"Sjuk","semester":"Semester","vab":"VAB","permission":"Permission"}
                sick_note = atype_map.get(ab["type"], ab["type"])
                break
        ws.append([
            s.get("date",""),
            weekday,
            emp.get("name","Okänd"),
            s.get("start_time",""),
            s.get("end_time",""),
            h,
            "✓" if s.get("is_ob1") else "",
            "✓" if s.get("is_ob2") else "",
            sick_note or s.get("note","") or "",
        ])
        # Highlight sick rows
        if sick_note:
            for cell in ws[ws.max_row]:
                cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
        for cell in ws[ws.max_row]:
            cell.font = Font(size=9)

    # Totals
    ws.append(["TOTALT","","","","", round(total_hours,2),"","",""])
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True, size=9)
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    col_widths = [14, 12, 25, 10, 10, 10, 8, 8, 25]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # ── Sheet 2: Per anställd ─────────────────────────────────────
    ws2 = wb.create_sheet("Per anställd")
    ws2.append(["Anställd", "Antal pass", "Totala timmar", "OB1 timmar", "OB2 timmar"])
    for cell in ws2[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill

    by_emp = {}
    for s in shifts:
        eid = s.get("employee_id","")
        emp = emp_map.get(eid,{})
        name = emp.get("name","Okänd")
        if name not in by_emp:
            by_emp[name] = {"count":0,"hours":0,"ob1":0,"ob2":0}
        try:
            st = DT.strptime(s["start_time"],"%H:%M")
            et = DT.strptime(s["end_time"],"%H:%M")
            h = round((et-st).seconds/3600,2)
        except: h = 0
        by_emp[name]["count"] += 1
        by_emp[name]["hours"] += h
        if s.get("is_ob1"): by_emp[name]["ob1"] += h
        if s.get("is_ob2"): by_emp[name]["ob2"] += h

    for name, vals in sorted(by_emp.items()):
        ws2.append([name, vals["count"], round(vals["hours"],2), round(vals["ob1"],2), round(vals["ob2"],2)])
        for cell in ws2[ws2.max_row]: cell.font = Font(size=9)

    ws2.append(["TOTALT", sum(v["count"] for v in by_emp.values()), round(total_hours,2),"",""])
    for cell in ws2[ws2.max_row]:
        cell.font = Font(bold=True, size=9)
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    for i, w in enumerate([25,14,16,14,14], 1):
        ws2.column_dimensions[get_column_letter(i)].width = w

    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="schema_{start}_{end}.xlsx"'}
    )


# ── Utlägg PDF Export ─────────────────────────────────────────────────────────
@api_router.get("/expenses/export-pdf")
async def export_expenses_pdf(start: str = None, end: str = None, current=Depends(get_current_user)):
    """Export expenses/utlägg to PDF"""
    query = {}
    if start and end:
        query["date"] = {"$gte": start, "$lte": end}
    expenses = await db.expenses.find(query).sort("date", -1).to_list(5000)
    employees = await db.employees.find().to_list(100)
    emp_map = {str(e["_id"]): e["name"] for e in employees}
    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"

    total = sum(e.get("amount",0) for e in expenses)
    total_moms = sum(e.get("amount",0) - e.get("amount",0)/(1+e.get("moms_rate",0)/100) for e in expenses if e.get("moms_rate",0) > 0)
    by_status = {"approved":0,"pending":0,"rejected":0}
    for e in expenses:
        s = e.get("status","pending")
        by_status[s] = by_status.get(s,0) + e.get("amount",0)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm,
        title="Utlägg", author=company)
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    page_w = A4[0]
    elements = []

    # Header
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ps("h", fontSize=14, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>UTLÄGG</b><br/>Skapad: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[100*mm, None])
    hdr.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    elements.append(hdr)
    elements.append(Spacer(1,3*mm))

    # Summary
    sum_data = [[
        Paragraph(f"<b>Totalt belopp</b><br/>{total:.2f} kr", ps("sb", fontSize=9)),
        Paragraph(f"<b>Godkänt</b><br/>{by_status['approved']:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#15803d"))),
        Paragraph(f"<b>Väntar</b><br/>{by_status['pending']:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#b45309"))),
        Paragraph(f"<b>Ingående moms</b><br/>{total_moms:.2f} kr", ps("sb", fontSize=9, textColor=colors.HexColor("#1e40af"))),
    ]]
    sum_tbl = Table(sum_data, colWidths=[(page_w-40*mm)/4]*4)
    sum_tbl.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    elements.append(sum_tbl)
    elements.append(Spacer(1,5*mm))

    # Expenses table
    status_map = {"approved":"Godkänd","pending":"Väntar","rejected":"Avvisad","paid":"Utbetald"}
    status_colors_map = {"approved":colors.HexColor("#15803d"),"pending":colors.HexColor("#b45309"),"rejected":colors.HexColor("#dc2626")}

    data = [["Datum","Anställd","Kategori","Beskrivning","Moms %","Belopp","Status"]]
    for e in expenses:
        eid = e.get("employee_id","")
        emp_name = emp_map.get(eid) or e.get("employee_name","") or "Okänd"
        data.append([
            e.get("date",""),
            emp_name[:20],
            e.get("category","") or "-",
            (e.get("description","") or "-")[:30],
            f'{e.get("moms_rate",0)}%',
            f'{e.get("amount",0):.2f} kr',
            status_map.get(e.get("status","pending"),""),
        ])

    data.append(["TOTALT","","","","",f'{total:.2f} kr',""])

    tbl = Table(data, colWidths=[22*mm, 38*mm, 25*mm, 45*mm, 16*mm, 25*mm, 22*mm])
    ts = [
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),8.5),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ROWBACKGROUNDS",(0,1),(-1,-2),[colors.white, colors.HexColor("#F8FAFC")]),
        ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),
        ("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
        ("ALIGN",(5,0),(5,-1),"RIGHT"),
    ]
    for row_idx, e in enumerate(expenses, 1):
        col = status_colors_map.get(e.get("status","pending"))
        if col: ts.append(("TEXTCOLOR",(6,row_idx),(6,row_idx),col))
    tbl.setStyle(TableStyle(ts))
    elements.append(tbl)

    elements.append(Spacer(1,4*mm))
    elements.append(Paragraph(f"{company}  ·  Utlägg  ·  {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"))))

    doc.build(elements)
    return Response(content=buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": 'inline; filename="utlagg.pdf"'})


# ── Utlägg Excel Export ───────────────────────────────────────────────────────
@api_router.get("/expenses/export-xlsx")
async def export_expenses_xlsx(start: str = None, end: str = None, current=Depends(get_current_user)):
    """Export expenses/utlägg to Excel"""
    query = {}
    if start and end:
        query["date"] = {"$gte": start, "$lte": end}
    expenses = await db.expenses.find(query).sort("date", -1).to_list(5000)
    employees = await db.employees.find().to_list(100)
    emp_map = {str(e["_id"]): e["name"] for e in employees}

    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = "Utlägg"

    headers = ["Datum", "Anställd", "Kategori", "Beskrivning", "Moms %", "Ingående moms (kr)", "Belopp (kr)", "Status"]
    ws.append(headers)

    header_fill = PatternFill(start_color="141414", end_color="141414", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    status_map = {"approved":"Godkänd","pending":"Väntar","rejected":"Avvisad","paid":"Utbetald"}
    status_colors = {"approved":"DCFCE7","pending":"FEF3C7","rejected":"FEE2E2","paid":"DBEAFE"}

    total = total_moms = 0
    for e in expenses:
        eid = e.get("employee_id","")
        emp_name = emp_map.get(eid) or e.get("employee_name","") or "Okänd"
        amt = e.get("amount",0)
        mrate = e.get("moms_rate",0)
        moms = round(amt - amt/(1+mrate/100), 2) if mrate > 0 else 0
        total += amt
        total_moms += moms
        status = e.get("status","pending")

        ws.append([
            e.get("date",""),
            emp_name,
            e.get("category","") or "-",
            e.get("description","") or "-",
            f'{mrate}%',
            moms,
            amt,
            status_map.get(status, status),
        ])
        fill_color = status_colors.get(status, "FFFFFF")
        for cell in ws[ws.max_row]:
            cell.font = Font(size=9)
            cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")

    # Totals
    ws.append(["TOTALT","","","","", round(total_moms,2), round(total,2),""])
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True, size=9)
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    # Summary sheet
    ws2 = wb.create_sheet("Per kategori")
    ws2.append(["Kategori", "Antal", "Belopp (kr)", "Ingående moms (kr)"])
    for cell in ws2[1]:
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.fill = header_fill

    by_cat = {}
    for e in expenses:
        cat = e.get("category","Övrigt")
        if cat not in by_cat: by_cat[cat] = {"count":0,"total":0,"moms":0}
        amt = e.get("amount",0)
        mrate = e.get("moms_rate",0)
        moms = round(amt - amt/(1+mrate/100), 2) if mrate > 0 else 0
        by_cat[cat]["count"] += 1
        by_cat[cat]["total"] += amt
        by_cat[cat]["moms"] += moms

    for cat, vals in sorted(by_cat.items()):
        ws2.append([cat, vals["count"], round(vals["total"],2), round(vals["moms"],2)])
        for cell in ws2[ws2.max_row]: cell.font = Font(size=9)

    col_widths = [14, 22, 16, 30, 10, 20, 16, 14]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for i, w in enumerate([20,10,16,18], 1):
        ws2.column_dimensions[get_column_letter(i)].width = w

    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="utlagg.xlsx"'}
    )


# ── Website Settings ──────────────────────────────────────────────────────────
class WebsiteSettings(BaseModel):
    # Hero
    hero_title: Optional[str] = "Renhet med norrländsk precision i Umeå."
    hero_subtitle: Optional[str] = "Vi definierar premiumstädning genom certifierad expertis och hållbara metoder."
    hero_badge: Optional[str] = "Svanenmärkt & miljöcertifierat"
    hero_image: Optional[str] = ""
    cta_text: Optional[str] = "Boka tid online"
    badge1: Optional[str] = "SRY-kvalifikation"
    badge2: Optional[str] = "Pur-Eco produkter"
    # Kontakt
    phone: Optional[str] = "070-624 04 03"
    email: Optional[str] = ""
    address: Optional[str] = ""
    opening_hours: Optional[str] = "Mån–Fre: 08:00–18:00"
    # Företag
    company_name: Optional[str] = "PureNorth Städ"
    logo_url: Optional[str] = ""
    about_text: Optional[str] = ""
    about_title: Optional[str] = ""
    about_stat1_number: Optional[str] = ""
    about_stat1_label: Optional[str] = ""
    about_stat2_number: Optional[str] = ""
    about_stat2_label: Optional[str] = ""
    about_stat3_number: Optional[str] = ""
    about_stat3_label: Optional[str] = ""
    about_point1: Optional[str] = ""
    about_point2: Optional[str] = ""
    about_point3: Optional[str] = ""
    about_image: Optional[str] = ""
    hero_badge_icon: Optional[str] = "Leaf"
    hero_badge_image: Optional[str] = ""
    badge1_icon: Optional[str] = "ShieldCheck"
    badge1_image: Optional[str] = ""
    badge2_icon: Optional[str] = "Leaf"
    badge2_image: Optional[str] = ""
    show_hero_badge: Optional[bool] = True
    show_hero_title: Optional[bool] = True
    show_hero_subtitle: Optional[bool] = True
    show_hero_cta: Optional[bool] = True
    show_hero_phone: Optional[bool] = True
    show_hero_badge1: Optional[bool] = True
    show_hero_badge2: Optional[bool] = True
    show_hero_image: Optional[bool] = True
    show_hero_phone: Optional[bool] = True
    hero_phone_color: Optional[str] = ""
    hero_phone_icon_color: Optional[str] = ""
    hero_phone_bg: Optional[str] = ""
    show_hero_rut: Optional[bool] = True
    hero_rut_percent: Optional[str] = ""
    hero_rut_title: Optional[str] = ""
    hero_rut_text: Optional[str] = ""
    hero_rut_bg: Optional[str] = ""
    hero_rut_circle_bg: Optional[str] = ""
    hero_rut_circle_color: Optional[str] = ""
    hero_rut_title_color: Optional[str] = ""
    hero_rut_text_color: Optional[str] = ""
    vart_label: Optional[str] = ""
    vart_title: Optional[str] = ""
    vart_subtitle: Optional[str] = ""
    vart_bg: Optional[str] = ""
    vart_label_color: Optional[str] = ""
    vart_title_color: Optional[str] = ""
    vart_subtitle_color: Optional[str] = ""
    show_vart: Optional[bool] = True
    vart_slides: Optional[list] = None
    vart_fore_label: Optional[str] = ""
    vart_efter_label: Optional[str] = ""
    vart_fore_label_bg: Optional[str] = ""
    vart_efter_label_bg: Optional[str] = ""
    vart_handle_color: Optional[str] = ""
    vart_transition_type: Optional[str] = "slider"
    navbar_bg: Optional[str] = ""
    navbar_text_color: Optional[str] = ""
    navbar_link_color: Optional[str] = ""
    navbar_btn_color: Optional[str] = ""
    navbar_btn_bg: Optional[str] = ""
    navbar_company_color: Optional[str] = ""
    footer_bg: Optional[str] = ""
    footer_copyright: Optional[str] = ""
    footer_copyright_color: Optional[str] = ""
    show_footer_faq: Optional[bool] = True
    show_footer_kundavtal: Optional[bool] = True
    show_footer_nojd: Optional[bool] = True
    show_footer_varderingar: Optional[bool] = True
    show_footer_malsattning: Optional[bool] = True
    show_footer_integritet: Optional[bool] = True
    footer_faq_color: Optional[str] = ""
    footer_kundavtal_color: Optional[str] = ""
    footer_nojd_color: Optional[str] = ""
    footer_varderingar_color: Optional[str] = ""
    footer_malsattning_color: Optional[str] = ""
    footer_integritet_color: Optional[str] = ""
    faq_label: Optional[str] = ""
    faq_title: Optional[str] = ""
    faq_subtitle: Optional[str] = ""
    faq_label_color: Optional[str] = ""
    faq_title_color: Optional[str] = ""
    faq_subtitle_color: Optional[str] = ""
    faq_bg: Optional[str] = ""
    faq_question_color: Optional[str] = ""
    faq_answer_color: Optional[str] = ""
    show_faq_contact_box: Optional[bool] = True
    faq_box_bg: Optional[str] = ""
    faq_box_title: Optional[str] = ""
    faq_box_text: Optional[str] = ""
    faq_box_title_color: Optional[str] = ""
    faq_box_text_color: Optional[str] = ""
    faq_items: Optional[list] = None
    show_faq_page: Optional[bool] = True
    show_faq_ring_btn: Optional[bool] = True
    show_faq_mail_btn: Optional[bool] = True
    faq_ring_text: Optional[str] = ""
    faq_ring_color: Optional[str] = ""
    faq_ring_bg: Optional[str] = ""
    faq_ring_icon: Optional[str] = "Phone"
    faq_ring_icon_color: Optional[str] = ""
    faq_mail_text: Optional[str] = ""
    faq_mail_color: Optional[str] = ""
    faq_mail_bg: Optional[str] = ""
    faq_mail_icon: Optional[str] = "Mail"
    faq_mail_icon_color: Optional[str] = ""
    kundavtal_eyebrow: Optional[str] = ""
    kundavtal_title: Optional[str] = ""
    kundavtal_intro: Optional[str] = ""
    kundavtal_bg: Optional[str] = ""
    kundavtal_eyebrow_color: Optional[str] = ""
    kundavtal_title_color: Optional[str] = ""
    kundavtal_intro_color: Optional[str] = ""
    kundavtal_heading_color: Optional[str] = ""
    kundavtal_text_color: Optional[str] = ""
    kundavtal_bullet_color: Optional[str] = ""
    kundavtal_sections: Optional[list] = None
    kundavtal_footer_text: Optional[str] = ""
    kundavtal_footer_email: Optional[str] = ""
    kundavtal_footer_color: Optional[str] = ""
    kundavtal_footer_link_color: Optional[str] = ""
    nojd_eyebrow: Optional[str] = ""
    nojd_title: Optional[str] = ""
    nojd_intro: Optional[str] = ""
    nojd_bg: Optional[str] = ""
    nojd_eyebrow_color: Optional[str] = ""
    nojd_title_color: Optional[str] = ""
    nojd_intro_color: Optional[str] = ""
    nojd_heading_color: Optional[str] = ""
    nojd_text_color: Optional[str] = ""
    nojd_card_bg: Optional[str] = ""
    nojd_card_text_color: Optional[str] = ""
    nojd_card_icon_bg: Optional[str] = ""
    nojd_card_icon_color: Optional[str] = ""
    nojd_step_bg: Optional[str] = ""
    nojd_step_text_color: Optional[str] = ""
    nojd_step_num_bg: Optional[str] = ""
    nojd_step_num_color: Optional[str] = ""
    nojd_guarantees: Optional[list] = None
    nojd_steps: Optional[list] = None
    nojd_section1_heading: Optional[str] = ""
    nojd_section1_text: Optional[str] = ""
    nojd_section2_heading: Optional[str] = ""
    nojd_section2_text: Optional[str] = ""
    varderingar_eyebrow: Optional[str] = ""
    varderingar_title: Optional[str] = ""
    varderingar_intro: Optional[str] = ""
    varderingar_bg: Optional[str] = ""
    varderingar_eyebrow_color: Optional[str] = ""
    varderingar_title_color: Optional[str] = ""
    varderingar_intro_color: Optional[str] = ""
    varderingar_card_bg: Optional[str] = ""
    varderingar_card_title_color: Optional[str] = ""
    varderingar_card_text_color: Optional[str] = ""
    varderingar_icon_bg: Optional[str] = ""
    varderingar_icon_color: Optional[str] = ""
    varderingar_values: Optional[list] = None
    mal_eyebrow: Optional[str] = ""
    mal_title: Optional[str] = ""
    mal_intro: Optional[str] = ""
    mal_bg: Optional[str] = ""
    mal_eyebrow_color: Optional[str] = ""
    mal_title_color: Optional[str] = ""
    mal_intro_color: Optional[str] = ""
    mal_card1_title: Optional[str] = ""
    mal_card1_text: Optional[str] = ""
    mal_card1_img: Optional[str] = ""
    mal_card2_title: Optional[str] = ""
    mal_card2_text: Optional[str] = ""
    mal_card2_img: Optional[str] = ""
    mal_card_title_color: Optional[str] = ""
    mal_card_text_color: Optional[str] = ""
    mal_card_bg: Optional[str] = ""
    mal_check1_title: Optional[str] = ""
    mal_check1_text: Optional[str] = ""
    mal_check2_title: Optional[str] = ""
    mal_check2_text: Optional[str] = ""
    mal_check_icon_bg: Optional[str] = ""
    mal_check_icon_color: Optional[str] = ""
    mal_check_title_color: Optional[str] = ""
    mal_check_text_color: Optional[str] = ""
    mal_check_card_bg: Optional[str] = ""
    mal_sry_title: Optional[str] = ""
    mal_sry_text1: Optional[str] = ""
    mal_sry_text2: Optional[str] = ""
    mal_sry_bg: Optional[str] = ""
    mal_sry_title_color: Optional[str] = ""
    mal_sry_text_color: Optional[str] = ""
    mal_sry_icon_bg: Optional[str] = ""
    mal_sry_icon_color: Optional[str] = ""
    mal_check1_icon: Optional[str] = "Check"
    mal_check2_icon: Optional[str] = "Clock"
    mal_sry_icon: Optional[str] = "Award"
    integritet_eyebrow: Optional[str] = ""
    integritet_title: Optional[str] = ""
    integritet_intro: Optional[str] = ""
    integritet_bg: Optional[str] = ""
    integritet_eyebrow_color: Optional[str] = ""
    integritet_title_color: Optional[str] = ""
    integritet_intro_color: Optional[str] = ""
    integritet_heading_color: Optional[str] = ""
    integritet_text_color: Optional[str] = ""
    integritet_bullet_color: Optional[str] = ""
    integritet_sections: Optional[list] = None
    show_navbar_links: Optional[bool] = True
    show_navbar_btn: Optional[bool] = True
    show_navbar_company: Optional[bool] = True
    hero_badge_color: Optional[str] = ""
    hero_badge_bg: Optional[str] = ""
    hero_title_color: Optional[str] = ""
    hero_title_bg: Optional[str] = ""
    hero_subtitle_color: Optional[str] = ""
    hero_subtitle_bg: Optional[str] = ""
    hero_cta_color: Optional[str] = ""
    hero_cta_bg: Optional[str] = ""
    hero_badge1_color: Optional[str] = ""
    hero_badge1_bg: Optional[str] = ""
    hero_badge2_color: Optional[str] = ""
    hero_badge2_bg: Optional[str] = ""
    hero_badge_icon_color: Optional[str] = ""
    hero_badge1_icon_color: Optional[str] = ""
    hero_badge2_icon_color: Optional[str] = ""
    contact_title_color: Optional[str] = ""
    contact_title_bg: Optional[str] = ""
    contact_subtitle_color: Optional[str] = ""
    contact_subtitle_bg: Optional[str] = ""
    contact_description_color: Optional[str] = ""
    contact_box_title_color: Optional[str] = ""
    contact_box_title_bg: Optional[str] = ""
    contact_box_text_color: Optional[str] = ""
    contact_box_bg: Optional[str] = ""
    contact_box_btn_color: Optional[str] = ""
    contact_box_btn_bg: Optional[str] = ""
    show_contact_title: Optional[bool] = True
    show_contact_subtitle: Optional[bool] = True
    show_contact_description: Optional[bool] = True
    show_contact_phone: Optional[bool] = True
    show_contact_address: Optional[bool] = True
    show_contact_hours: Optional[bool] = True
    show_contact_box: Optional[bool] = True
    show_company_name: Optional[bool] = True
    show_phone: Optional[bool] = True
    show_email: Optional[bool] = True
    show_address: Optional[bool] = True
    show_opening_hours: Optional[bool] = True
    company_name_color: Optional[str] = ""
    phone_color: Optional[str] = ""
    email_color: Optional[str] = ""
    address_color: Optional[str] = ""
    opening_hours_color: Optional[str] = ""
    phone_icon_color: Optional[str] = ""
    email_icon_color: Optional[str] = ""
    address_icon_color: Optional[str] = ""
    hours_icon_color: Optional[str] = ""
    show_whyus_label: Optional[bool] = True
    show_whyus_title: Optional[bool] = True
    whyus_label_color: Optional[str] = ""
    whyus_title_color: Optional[str] = ""
    show_sry_card: Optional[bool] = True
    sry_bg: Optional[str] = ""
    sry_title_color: Optional[str] = ""
    sry_text_color: Optional[str] = ""
    sry_icon_color: Optional[str] = ""
    show_eco_card: Optional[bool] = True
    eco_title_color: Optional[str] = ""
    eco_text_color: Optional[str] = ""
    eco_icon_color: Optional[str] = ""
    eco_card_bg: Optional[str] = ""
    show_rut_card: Optional[bool] = True
    rut_title_color: Optional[str] = ""
    rut_text_color: Optional[str] = ""
    rut_icon_color: Optional[str] = ""
    rut_card_bg: Optional[str] = ""
    sry_icon: Optional[str] = "Award"
    eco_icon: Optional[str] = "Leaf"
    rut_icon: Optional[str] = "Percent"
    services_label_color: Optional[str] = ""
    services_title_color: Optional[str] = ""
    show_services_label: Optional[bool] = True
    show_services_title: Optional[bool] = True
    service1_show: Optional[bool] = True
    service1_title: Optional[str] = ""
    service1_desc: Optional[str] = ""
    service1_icon: Optional[str] = "Home"
    service1_img: Optional[str] = ""
    service1_title_color: Optional[str] = ""
    service1_desc_color: Optional[str] = ""
    service1_icon_color: Optional[str] = ""
    service2_show: Optional[bool] = True
    service2_title: Optional[str] = ""
    service2_desc: Optional[str] = ""
    service2_icon: Optional[str] = "Truck"
    service2_img: Optional[str] = ""
    service2_title_color: Optional[str] = ""
    service2_desc_color: Optional[str] = ""
    service2_icon_color: Optional[str] = ""
    service3_show: Optional[bool] = True
    service3_title: Optional[str] = ""
    service3_desc: Optional[str] = ""
    service3_icon: Optional[str] = "Building2"
    service3_img: Optional[str] = ""
    service3_title_color: Optional[str] = ""
    service3_desc_color: Optional[str] = ""
    service3_icon_color: Optional[str] = ""
    service4_show: Optional[bool] = True
    service4_title: Optional[str] = ""
    service4_desc: Optional[str] = ""
    service4_icon: Optional[str] = "Sparkles"
    service4_img: Optional[str] = ""
    service4_title_color: Optional[str] = ""
    service4_desc_color: Optional[str] = ""
    service4_icon_color: Optional[str] = ""
    show_testimonials_label: Optional[bool] = True
    show_testimonials_title: Optional[bool] = True
    testimonials_label_color: Optional[str] = ""
    testimonials_title_color: Optional[str] = ""
    testimonials_card_bg: Optional[str] = ""
    testimonials_text_color: Optional[str] = ""
    testimonials_name_color: Optional[str] = ""
    testimonials_role_color: Optional[str] = ""
    testimonials_icon_color: Optional[str] = ""
    about_point1_icon: Optional[str] = "ShieldCheck"
    about_point2_icon: Optional[str] = "Leaf"
    about_point3_icon: Optional[str] = "Star"
    about_title_color: Optional[str] = ""
    about_text_color: Optional[str] = ""
    about_stat_color: Optional[str] = ""
    about_point1_color: Optional[str] = ""
    about_point1_icon_color: Optional[str] = ""
    about_point2_color: Optional[str] = ""
    about_point2_icon_color: Optional[str] = ""
    about_point3_color: Optional[str] = ""
    about_point3_icon_color: Optional[str] = ""
    about_section_bg: Optional[str] = ""
    about_label: Optional[str] = ""
    about_label_color: Optional[str] = ""
    about_btn_text: Optional[str] = ""
    about_btn_color: Optional[str] = ""
    about_btn_bg: Optional[str] = ""
    show_about_label: Optional[bool] = True
    show_about_title: Optional[bool] = True
    show_about_text: Optional[bool] = True
    show_about_stats: Optional[bool] = True
    show_about_point1: Optional[bool] = True
    show_about_point2: Optional[bool] = True
    show_about_point3: Optional[bool] = True
    show_about_btn: Optional[bool] = True
    show_about_image: Optional[bool] = True
    show_about_in_navbar: Optional[bool] = True
    show_tjanster_in_navbar: Optional[bool] = True
    show_vart_in_navbar: Optional[bool] = True
    show_kontakt_in_navbar: Optional[bool] = True
    show_whyus_in_navbar: Optional[bool] = True
    show_kontaktuppgifter: Optional[bool] = True
    show_omdomen: Optional[bool] = True
    show_hero_section: Optional[bool] = True
    show_logo: Optional[bool] = True
    logo_color: Optional[str] = ""
    admin_company_name: Optional[str] = ""
    admin_panel_label: Optional[str] = ""
    admin_header_bg: Optional[str] = ""
    admin_header_text_color: Optional[str] = ""
    admin_window_title: Optional[str] = ""
    admin_company_name: Optional[str] = ""
    logo_color: Optional[str] = ""
    show_booking: Optional[bool] = True
    booking_bg: Optional[str] = ""
    booking_left_label: Optional[str] = ""
    booking_left_label_color: Optional[str] = ""
    booking_left_title: Optional[str] = ""
    booking_left_title_color: Optional[str] = ""
    booking_left_subtitle: Optional[str] = ""
    booking_left_subtitle_color: Optional[str] = ""
    show_booking_phone_btn: Optional[bool] = True
    booking_phone_btn_label: Optional[str] = ""
    booking_phone_btn_label_color: Optional[str] = ""
    booking_phone_btn_number_color: Optional[str] = ""
    booking_phone_btn_icon: Optional[str] = "Phone"
    booking_phone_btn_icon_color: Optional[str] = ""
    booking_phone_btn_icon_bg: Optional[str] = ""
    booking_phone_btn_bg: Optional[str] = ""
    booking_phone_btn_border_color: Optional[str] = ""
    booking_form_label_color: Optional[str] = ""
    booking_form_input_bg: Optional[str] = ""
    booking_form_input_border: Optional[str] = ""
    booking_form_input_text: Optional[str] = ""
    booking_submit_text: Optional[str] = ""
    booking_submit_color: Optional[str] = ""
    booking_submit_bg: Optional[str] = ""
    booking_success_title: Optional[str] = ""
    booking_success_text: Optional[str] = ""
    booking_success_color: Optional[str] = ""
    booking_services: Optional[list] = None
    booking_form_bg: Optional[str] = ""
    show_booking_form: Optional[bool] = True
    booking_title: Optional[str] = ""
    booking_subtitle: Optional[str] = ""
    booking_btn_text: Optional[str] = ""
    booking_success_title: Optional[str] = ""
    booking_success_text: Optional[str] = ""
    booking_bg: Optional[str] = ""
    booking_title_color: Optional[str] = ""
    booking_subtitle_color: Optional[str] = ""
    booking_btn_color: Optional[str] = ""
    booking_btn_bg: Optional[str] = ""
    booking_input_bg: Optional[str] = ""
    booking_label_color: Optional[str] = ""
    booking_services: Optional[list] = None
    booking_form_bg: Optional[str] = ""
    show_booking_phone: Optional[bool] = True
    booking_phone_icon: Optional[str] = "Phone"
    booking_phone_icon_color: Optional[str] = ""
    booking_phone_icon_bg: Optional[str] = ""
    booking_phone_text_color: Optional[str] = ""
    booking_phone_label_color: Optional[str] = ""
    booking_phone_border_color: Optional[str] = ""
    # Sociala medier
    facebook_url: Optional[str] = ""
    instagram_url: Optional[str] = ""
    # Kontaktsektion
    contact_title: Optional[str] = ""
    contact_subtitle: Optional[str] = ""
    contact_description: Optional[str] = ""
    contact_box_title: Optional[str] = ""
    contact_box_text: Optional[str] = ""
    contact_box_btn: Optional[str] = ""
    # Varför oss
    whyus_label: Optional[str] = ""
    whyus_title: Optional[str] = ""
    sry_title: Optional[str] = ""
    sry_text: Optional[str] = ""
    sry_tags: Optional[str] = ""
    eco_title: Optional[str] = ""
    eco_text: Optional[str] = ""
    rut_title: Optional[str] = ""
    rut_text: Optional[str] = ""
    # Tjänster
    services_label: Optional[str] = ""
    services_title: Optional[str] = ""
    services: Optional[list] = []
    # Navbar
    nav_company: Optional[str] = ""
    nav_boka_text: Optional[str] = ""
    nav_links: Optional[list] = []
    # SEO
    seo_title: Optional[str] = ""
    seo_description: Optional[str] = ""
    seo_keywords: Optional[str] = ""
    seo_og_image: Optional[str] = ""
    # Färger
    primary_color: Optional[str] = "#166534"
    secondary_color: Optional[str] = "#141414"
    # Omdömen
    testimonials_label: Optional[str] = ""
    testimonials_title: Optional[str] = ""
    featured_reviews: Optional[list] = []

@api_router.get("/settings/website")
async def get_website_settings():
    defaults = WebsiteSettings().dict()
    doc = await db.website_settings.find_one({"_id": "main"})
    if not doc:
        return defaults
    doc.pop("_id", None)
    return {**defaults, **doc}

@api_router.patch("/settings/website")
async def update_website_settings(payload: WebsiteSettings, current=Depends(get_current_user)):
    data = {k: v for k, v in payload.dict().items() if v is not None}
    # Sanitize text values only (skip colors #hex, URLs, booleans, and nested lists/dicts)
    for k, v in list(data.items()):
        if isinstance(v, str) and not v.startswith("#") and not v.startswith("http") and not v.startswith("data:"):
            data[k] = sanitize_text(v, max_len=5000)
    await db.website_settings.update_one(
        {"_id": "main"},
        {"$set": data},
        upsert=True
    )
    return {"success": True}

@api_router.post("/settings/website/upload-image")
async def upload_website_image(file: UploadFile = File(...), current=Depends(get_current_user)):
    """Upload image and return base64 URL"""
    import base64
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    media_type = file.content_type or "image/jpeg"
    data_url = f"data:{media_type};base64,{b64}"
    return {"url": data_url}


# ── Årsredovisning Underlag ───────────────────────────────────────────────────
@api_router.get("/reports/arsredovisning")
async def arsredovisning_pdf(year: str, current=Depends(get_current_user)):
    """Annual report for accountant/konsult"""
    import calendar as cal_mod

    start = f"{year}-01-01"
    end = f"{year}-12-31"
    start_dt = f"{start}T00:00:00"
    end_dt = f"{end}T23:59:59"

    inv_settings = await get_invoice_settings_obj()
    company = inv_settings.company_name or "PureNorth Städ"
    orgnr = inv_settings.company_orgnr or ""

    # ── Fetch all data ────────────────────────────────────────────────────────
    invoices = await db.invoices.find({"created_at": {"$gte": start_dt, "$lte": end_dt}}).to_list(5000)
    paid_invoices = [i for i in invoices if i.get("status") == "paid"]
    costs = await db.costs.find({"date": {"$gte": start, "$lte": end}}).to_list(5000)
    expenses = await db.expenses.find({"date": {"$gte": start, "$lte": end}}).to_list(5000)
    employees = await db.employees.find().to_list(100)

    # ── Revenue calculations ──────────────────────────────────────────────────
    total_revenue_excl = sum(i.get("subtotal", 0) for i in invoices)
    total_vat_out = sum(i.get("vat_amount", 0) for i in invoices)
    total_rut = sum(i.get("rut_deduction", 0) for i in invoices)
    pam_fees = sum(sum(it.get("quantity",1)*it.get("unit_price",0) for it in i.get("items",[]) if "Påminnelseavgift" in it.get("service","")) for i in invoices)
    total_paid = sum(i.get("customer_pays", 0) for i in paid_invoices)
    total_unpaid = sum(i.get("customer_pays", 0) for i in invoices if i.get("status") != "paid")

    # ── Cost calculations ─────────────────────────────────────────────────────
    material_total = sum(c.get("amount", 0) for c in costs)
    material_vat_in = sum(c.get("amount",0) - c.get("amount",0)/(1+c.get("moms_rate",25)/100) for c in costs)
    expense_total = sum(e.get("amount", 0) for e in expenses)
    expense_vat_in = sum(e.get("amount",0) - e.get("amount",0)/(1+e.get("moms_rate",0)/100) for e in expenses if e.get("moms_rate",0) > 0)
    total_vat_in = round(material_vat_in + expense_vat_in, 2)

    # ── Payroll calculations ──────────────────────────────────────────────────
    PRELSKATT = 0.30
    ARBETSGIVARAVGIFT = 0.3142
    SEMESTER = 0.12
    payroll_summary, payroll_settings = await build_payroll_summary(start, end)
    total_brutto = sum(r["normal_h"]*r["hourly_rate"] + r["ob1_h"]*payroll_settings.ob1_extra + r["ob2_h"]*payroll_settings.ob2_extra + r.get("sjuklon_net",0) for r in payroll_summary.values())
    total_ag = round(total_brutto * ARBETSGIVARAVGIFT, 2)
    total_prel = round(total_brutto * PRELSKATT, 2)
    total_sem = round(total_brutto * SEMESTER, 2)
    total_netto = round(total_brutto - total_prel, 2)

    # ── Monthly breakdown ─────────────────────────────────────────────────────
    monthly = {}
    MONTHS_SV = ["","Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"]
    for i in range(1, 13):
        monthly[i] = {"revenue": 0, "costs": 0, "invoices": 0}
    for inv in invoices:
        try:
            m = int(inv.get("created_at","")[:7].split("-")[1])
            monthly[m]["revenue"] += inv.get("subtotal", 0)
            monthly[m]["invoices"] += 1
        except: pass
    for c in costs:
        try:
            m = int(c.get("date","")[:7].split("-")[1])
            monthly[m]["costs"] += c.get("amount", 0)
        except: pass

    # ── Build PDF ─────────────────────────────────────────────────────────────
    from reportlab.lib.pagesizes import A4
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm,
        title=f"Årsredovisning {year}",
        author=company)
    styles = getSampleStyleSheet()
    def ps(name, **kw): return ParagraphStyle(name, parent=styles["Normal"], **kw)
    elements = []
    page_w = A4[0] - 40*mm

    # Header
    hdr = Table([[
        Paragraph(f"<b>{company}</b>", ps("h", fontSize=16, fontName="Helvetica-Bold", textColor=colors.white)),
        Paragraph(f"<b>ÅRSREDOVISNING UNDERLAG</b><br/>Räkenskapsår: {year}<br/>Org.nr: {orgnr}", ps("s", fontSize=10, fontName="Helvetica-Bold", textColor=colors.white, alignment=2))
    ]], colWidths=[100*mm, None])
    hdr.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#141414")),("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),12),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    elements.append(hdr)
    elements.append(Spacer(1,5*mm))

    # ── Section 1: Intäkter ───────────────────────────────────────────────────
    elements.append(Paragraph("1. INTÄKTER", ps("h2", fontSize=11, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3)))
    int_data = [
        ["Post", "Konto", "Belopp (kr)"],
        ["Försäljning tjänster (exkl. moms)", "3000", f"{total_revenue_excl:.2f}"],
        ["Påminnelseavgifter (ingen moms)", "3590", f"{pam_fees:.2f}"],
        ["Utgående moms 25%", "2610", f"{total_vat_out:.2f}"],
        ["RUT-avdrag (betalas av Skatteverket)", "3001", f"{total_rut:.2f}"],
        ["TOTALA INTÄKTER", "", f"{total_revenue_excl + pam_fees:.2f}"],
        ["Varav betalda", "", f"{total_paid:.2f}"],
        ["Varav obetalda (kundfordringar)", "1510", f"{total_unpaid:.2f}"],
    ]
    t1 = Table(int_data, colWidths=[100*mm, 25*mm, None])
    t1.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#1e3a5f")),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(2,0),(-1,-1),"RIGHT"),
        ("BACKGROUND",(0,5),(-1,5),colors.HexColor("#F1F5F9")),("FONTNAME",(0,5),(-1,5),"Helvetica-Bold"),
    ]))
    elements.append(t1)
    elements.append(Spacer(1,4*mm))

    # ── Section 2: Kostnader ──────────────────────────────────────────────────
    elements.append(Paragraph("2. KOSTNADER", ps("h2", fontSize=11, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3)))
    kost_data = [
        ["Post", "Konto", "Belopp (kr)"],
        ["Bruttolöner", "7210", f"{total_brutto:.2f}"],
        ["Semesterersättning (12%)", "7290", f"{total_sem:.2f}"],
        ["Arbetsgivaravgift (31.42%)", "7510", f"{total_ag:.2f}"],
        ["Materialkostnader (inkl. moms)", "5410", f"{material_total:.2f}"],
        ["Utlägg anställda", "7331", f"{expense_total:.2f}"],
        ["TOTALA KOSTNADER", "", f"{total_brutto + total_sem + total_ag + material_total + expense_total:.2f}"],
    ]
    t2 = Table(kost_data, colWidths=[100*mm, 25*mm, None])
    t2.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#7c3aed")),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(2,0),(-1,-1),"RIGHT"),
        ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
    ]))
    elements.append(t2)
    elements.append(Spacer(1,4*mm))

    # ── Section 3: Moms ───────────────────────────────────────────────────────
    elements.append(Paragraph("3. MOMSREDOVISNING", ps("h2", fontSize=11, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3)))
    moms_att_betala = round(total_vat_out - total_vat_in, 2)
    moms_data = [
        ["Post", "Konto", "Belopp (kr)"],
        ["Utgående moms (25% på försäljning)", "2610", f"{total_vat_out:.2f}"],
        ["Ingående moms (material + utlägg)", "2640", f"-{total_vat_in:.2f}"],
        ["NETTOMOMS ATT BETALA SKATTEVERKET", "", f"{moms_att_betala:.2f}"],
    ]
    t3 = Table(moms_data, colWidths=[100*mm, 25*mm, None])
    t3.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0f766e")),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(2,0),(-1,-1),"RIGHT"),
        ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
    ]))
    elements.append(t3)
    elements.append(Spacer(1,4*mm))

    # ── Section 4: Lön ────────────────────────────────────────────────────────
    elements.append(Paragraph("4. LÖNESAMMANSTÄLLNING", ps("h2", fontSize=11, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3)))
    lon_data = [["Anställd", "Brutto (kr)", "Prelskatt (kr)", "Netto (kr)", "AG-avgift (kr)"]]
    for r in payroll_summary.values():
        brutto = r["normal_h"]*r["hourly_rate"] + r["ob1_h"]*payroll_settings.ob1_extra + r["ob2_h"]*payroll_settings.ob2_extra + r.get("sjuklon_net",0)
        prel = round(brutto * PRELSKATT, 2)
        netto = round(brutto - prel, 2)
        ag = round(brutto * ARBETSGIVARAVGIFT, 2)
        lon_data.append([r["name"], f"{brutto:.2f}", f"{prel:.2f}", f"{netto:.2f}", f"{ag:.2f}"])
    lon_data.append(["TOTALT", f"{total_brutto:.2f}", f"{total_prel:.2f}", f"{total_netto:.2f}", f"{total_ag:.2f}"])
    t4 = Table(lon_data, colWidths=[60*mm, 28*mm, 28*mm, 28*mm, 28*mm])
    t4.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#b45309")),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
    ]))
    elements.append(t4)
    elements.append(Spacer(1,4*mm))

    # ── Section 5: Månadsöversikt ─────────────────────────────────────────────
    elements.append(Paragraph("5. MÅNADSÖVERSIKT", ps("h2", fontSize=11, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3)))
    mån_data = [["Månad", "Fakturor", "Intäkter (kr)", "Kostnader (kr)", "Resultat (kr)"]]
    for m in range(1, 13):
        rev = monthly[m]["revenue"]
        cost = monthly[m]["costs"]
        res = round(rev - cost, 2)
        mån_data.append([MONTHS_SV[m], str(monthly[m]["invoices"]), f"{rev:.2f}", f"{cost:.2f}", f"{res:.2f}"])
    total_res = sum(monthly[m]["revenue"] - monthly[m]["costs"] for m in range(1,13))
    mån_data.append(["TOTALT", str(len(invoices)), f"{total_revenue_excl:.2f}", f"{material_total:.2f}", f"{total_res:.2f}"])
    t5 = Table(mån_data, colWidths=[20*mm, 20*mm, 38*mm, 38*mm, 38*mm])
    t5.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#166534")),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),8.5),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#F1F5F9")),("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
    ]))
    elements.append(t5)
    elements.append(Spacer(1,5*mm))

    # ── Resultaträkning ───────────────────────────────────────────────────────
    total_costs_all = total_brutto + total_sem + total_ag + material_total + expense_total
    resultat = round(total_revenue_excl + pam_fees - total_costs_all, 2)
    elements.append(Paragraph("RESULTATRÄKNING", ps("h2", fontSize=11, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3)))
    res_data = [
        ["Post", "Belopp (kr)"],
        ["Nettoomsättning (exkl. moms)", f"{total_revenue_excl + pam_fees:.2f}"],
        ["Personalkostnader", f"-{total_brutto + total_sem + total_ag:.2f}"],
        ["Övriga externa kostnader", f"-{material_total + expense_total:.2f}"],
        ["RÖRELSERESULTAT (EBIT)", f"{resultat:.2f}"],
    ]
    t6 = Table(res_data, colWidths=[120*mm, None])
    t6.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#141414")),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),
        ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ALIGN",(1,0),(-1,-1),"RIGHT"),
        ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#DCFCE7") if resultat >= 0 else colors.HexColor("#FEE2E2")),
        ("FONTNAME",(0,-1),(-1,-1),"Helvetica-Bold"),
        ("TEXTCOLOR",(1,-1),(1,-1),colors.HexColor("#15803d") if resultat >= 0 else colors.HexColor("#dc2626")),
    ]))
    elements.append(t6)

    elements.append(Spacer(1,5*mm))
    elements.append(Paragraph(
        f"{company}  ·  Årsredovisning underlag {year}  ·  Skapad {datetime.now(timezone.utc).strftime('%Y-%m-%d')}  ·  Konfidentiellt",
        ps("ft", fontSize=7, textColor=colors.HexColor("#94a3b8"))
    ))

    doc.build(elements)
    return Response(content=buf.getvalue(), media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="arsredovisning_{year}.pdf"'})


# ── F-skatt Kontroll ──────────────────────────────────────────────────────────
@api_router.get("/employees/fskatt-kontroll")
async def fskatt_kontroll(current=Depends(get_current_user)):
    """Get F-skatt status for all employees"""
    employees = await db.employees.find().to_list(100)
    result = []
    for e in employees:
        eid = str(e["_id"])
        skatt_typ = e.get("skatt_typ", "A-skatt")
        fskatt_nr = e.get("fskatt_nr", "")
        verified = e.get("fskatt_verified", False)
        
        # Determine status
        if skatt_typ == "F-skatt":
            if verified and fskatt_nr:
                status = "ok"
                status_text = "F-skatt verifierad"
            elif fskatt_nr and not verified:
                status = "warning"
                status_text = "F-skatt ej verifierad"
            else:
                status = "error"
                status_text = "F-skattsedel saknas"
        else:
            status = "ok"
            status_text = "A-skatt (prelskatt dras av arbetsgivare)"
        
        pnr = e.get("personnummer", "")
        pnr_result = validate_personnummer(pnr) if pnr else {"valid": None, "error": "Personnummer saknas"}
        pnr_valid = pnr_result["valid"]
        pnr_error = pnr_result.get("error")

        # Override status if personnummer is invalid
        if pnr_valid == False:
            status = "error"
            status_text = f"Ogiltigt personnummer: {pnr_error}"
        elif pnr_valid is None:
            status = "warning"
            status_text = "Personnummer saknas"

        result.append({
            "id": eid,
            "name": e.get("name", ""),
            "personnummer": pnr,
            "employment_type": e.get("employment_type", ""),
            "skatt_typ": skatt_typ,
            "fskatt_nr": fskatt_nr,
            "fskatt_verified": verified,
            "status": status,
            "status_text": status_text,
            "pnr_valid": pnr_valid,
            "pnr_error": pnr_error,
        })
    
    return {
        "employees": result,
        "total": len(result),
        "ok": sum(1 for r in result if r["status"] == "ok"),
        "warnings": sum(1 for r in result if r["status"] == "warning"),
        "errors": sum(1 for r in result if r["status"] == "error"),
    }

@api_router.patch("/employees/{employee_id}/fskatt")
async def update_fskatt(employee_id: str, payload: dict, current=Depends(get_current_user)):
    """Update F-skatt info for employee"""
    allowed = {"skatt_typ", "fskatt_nr", "fskatt_verified"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    await db.employees.update_one(
        {"_id": to_object_id(employee_id)},
        {"$set": updates}
    )
    return {"success": True}


# ── Personnummer Validering ───────────────────────────────────────────────────
def validate_personnummer(pnr: str) -> dict:
    """Validate Swedish personnummer using Luhn algorithm"""
    import re
    
    # Clean input
    clean = re.sub(r'[-\s]', '', pnr)
    
    # Handle 12-digit (YYYYMMDD + 4)
    if len(clean) == 12:
        clean = clean[2:]  # Remove century
    
    if len(clean) != 10:
        return {"valid": False, "error": "Personnummer måste ha 10 siffror (YYMMDD-XXXX)"}
    
    if not clean.isdigit():
        return {"valid": False, "error": "Personnummer får bara innehålla siffror"}
    
    # Validate date part
    yy, mm, dd = int(clean[0:2]), int(clean[2:4]), int(clean[4:6])
    if mm < 1 or mm > 12:
        return {"valid": False, "error": f"Ogiltigt månadstal: {mm:02d}"}
    if dd < 1 or dd > 31:
        return {"valid": False, "error": f"Ogiltigt dagtal: {dd:02d}"}
    
    # Luhn algorithm
    digits = [int(d) for d in clean[:9]]
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 0:
            v = d * 2
            total += v - 9 if v > 9 else v
        else:
            total += d
    
    check = (10 - (total % 10)) % 10
    if check != int(clean[9]):
        return {"valid": False, "error": f"Kontrollsiffran är fel (ska vara {check}, fick {clean[9]})"}
    
    return {"valid": True, "error": None, "formatted": f"{clean[:6]}-{clean[6:]}"}

@api_router.post("/employees/validate-personnummer")
async def validate_pnr(payload: dict, current=Depends(get_current_user)):
    pnr = payload.get("personnummer", "")
    return validate_personnummer(pnr)


@api_router.patch("/invoices/by-booking/{booking_id}")
async def update_invoice_by_booking(booking_id: str, payload: dict, current=Depends(get_current_user)):
    """Update invoice linked to a booking - tries booking_id first, then customer_name"""
    
    updates = {k: v for k, v in payload.items() 
               if k in {"customer_name","customer_email","customer_phone","customer_address","notes"} and v}
    
    if not updates:
        return {"updated": False, "message": "No valid fields"}

    # Try by booking_id first
    invoice = await db.invoices.find_one({"booking_id": booking_id})
    
    # Fallback: match by customer_name from payload
    if not invoice and payload.get("customer_name"):
        invoice = await db.invoices.find_one(
            {"customer_name": payload["customer_name"]}
        )
    
    # Fallback: match by original_name (booking name before edit)
    if not invoice and payload.get("original_name"):
        invoice = await db.invoices.find_one(
            {"customer_name": payload["original_name"]}
        )

    if not invoice:
        return {"updated": False, "message": "No invoice found"}
    
    # Also save booking_id for future updates
    updates["booking_id"] = booking_id
    
    await db.invoices.update_many(
        {"_id": invoice["_id"]},
        {"$set": updates}
    )
    return {"updated": True}


@api_router.patch("/bookings/{booking_id}/link-invoice")
async def link_invoice_to_booking(booking_id: str, payload: dict, current=Depends(get_current_user)):
    """Save invoice_id to booking after invoice creation"""
    invoice_id = payload.get("invoice_id")
    await db.bookings.update_one(
        {"_id": to_object_id(booking_id)},
        {"$set": {"invoice_id": invoice_id}}
    )
    return {"success": True}

@api_router.patch("/bookings/{booking_id}/update-invoice")
async def update_invoice_from_booking(booking_id: str, payload: dict, current=Depends(get_current_user)):
    """Update linked invoice when booking is edited"""
    booking = await db.bookings.find_one({"_id": to_object_id(booking_id)})
    if not booking or not booking.get("invoice_id"):
        return {"updated": False, "message": "No linked invoice"}
    
    invoice_id = booking["invoice_id"]
    updates = {}
    
    if payload.get("name"): updates["customer_name"] = payload["name"]
    if payload.get("email"): updates["customer_email"] = payload["email"]
    if payload.get("phone"): updates["customer_phone"] = payload["phone"]
    if payload.get("address"): updates["customer_address"] = payload["address"]
    if payload.get("notes"): updates["notes"] = payload["notes"]
    
    # Update prices if provided
    if payload.get("subtotal"): updates["subtotal"] = payload["subtotal"]
    if payload.get("rut_deduction"): updates["rut_deduction"] = payload["rut_deduction"]
    if payload.get("vat_amount"): updates["vat_amount"] = payload["vat_amount"]
    if payload.get("total_amount"): updates["total_amount"] = payload["total_amount"]
    if payload.get("customer_pays"): updates["customer_pays"] = payload["customer_pays"]
    if payload.get("items"): updates["items"] = payload["items"]
    
    await db.invoices.update_one(
        {"_id": to_object_id(invoice_id)},
        {"$set": updates}
    )
    return {"updated": True, "invoice_id": invoice_id}


@api_router.post("/bookings/{booking_id}/sync-invoice")
async def sync_invoice_from_booking(booking_id: str, payload: dict, current=Depends(get_current_user)):
    """Sync invoice with booking changes"""
    booking = await db.bookings.find_one({"_id": to_object_id(booking_id)})
    if not booking or not booking.get("invoice_id"):
        return {"updated": False, "message": "No linked invoice"}
    
    invoice_id = booking["invoice_id"]
    invoice = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if not invoice:
        return {"updated": False, "message": "Invoice not found"}
    
    updates = {}
    
    # Contact info updates
    if "name" in payload: updates["customer_name"] = payload["name"]
    if "email" in payload: updates["customer_email"] = payload["email"]
    if "phone" in payload: updates["customer_phone"] = payload["phone"]
    if "address" in payload: updates["customer_address"] = payload["address"]
    if "notes" in payload: updates["notes"] = payload["notes"]
    
    # Price recalculation if kvm or services changed
    if "kvm" in payload or "services" in payload:
        kvm = float(payload.get("kvm") or booking.get("kvm") or 0)
        services = payload.get("services") or booking.get("services") or []
        
        pricelist = await db.price_lists.find_one({}) or {}
        items_db = pricelist.get("items", [])
        active_items = [i for i in items_db if i.get("is_active")]
        
        KVM_KEYWORDS = ["städning", "storstäd", "flytt", "kontors", "fönster"]
        
        new_items = []
        labor_total = 0
        
        for svc in services:
            svc_lower = svc.lower()
            match = next((i for i in active_items if 
                i["service"].lower() in svc_lower or 
                svc_lower in i["service"].lower()), None)
            if not match:
                continue
            
            unit = match.get("unit", "tim")
            rate = match.get("price", 0)
            is_rut = match.get("is_rut_eligible", True)
            
            if unit == "kvm":
                qty = kvm or 1
                line_total = qty * rate
            elif unit == "tim":
                qty = max(1, round(kvm / 20)) if kvm else 1
                line_total = qty * rate
            else:
                qty = 1
                line_total = rate
            
            labor_total += line_total
            new_items.append({
                "service": match["service"],
                "description": match["service"],
                "quantity": qty,
                "unit_price": rate,
                "is_material": False,
                "is_rut_eligible": is_rut,
            })
        
        if new_items:
            inv_settings = await get_invoice_settings_obj()
            vat = labor_total * inv_settings.vat_rate / 100
            total = labor_total + vat
            rut = round(labor_total * 0.5, 2) if invoice.get("rut_eligible") else 0
            customer_pays = total - rut
            
            updates["items"] = new_items
            updates["labor_total"] = round(labor_total, 2)
            updates["subtotal"] = round(labor_total, 2)
            updates["vat_amount"] = round(vat, 2)
            updates["total_amount"] = round(total, 2)
            updates["rut_deduction"] = rut
            updates["customer_pays"] = round(customer_pays, 2)
    
    if updates:
        await db.invoices.update_one(
            {"_id": to_object_id(invoice_id)},
            {"$set": updates}
        )
        return {"updated": True, "invoice_id": invoice_id}
    
    return {"updated": False, "message": "Nothing to update"}

app.include_router(api_router)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.post("/api/admin/reset-economy")
async def reset_economy_direct(current=Depends(get_current_user)):
    await db.invoices.delete_many({})
    await db.expenses.delete_many({})
    await db.costs.delete_many({})
    await db.shifts.delete_many({})
    await db.settings.update_one(
        {"_key": "invoice"},
        {"$set": {"next_invoice_number": 1001}},
        upsert=True
    )
    return {"status": "ok", "message": "Economy reset complete"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@api_router.post("/admin/reset-economy")
async def reset_economy(current=Depends(get_current_user)):
    await db.invoices.delete_many({})
    await db.expenses.delete_many({})
    await db.costs.delete_many({})
    await db.shifts.delete_many({})
    await db.settings.update_one(
        {"_key": "invoice"},
        {"$set": {"next_invoice_number": 1001}},
        upsert=True
    )
    return {"status": "ok", "message": "Economy reset complete"}
# auto-remind deploy Fri Jun 26 22:44:29 UTC 2026
# force deploy 1782606093

# redeploy Tue Jun 30 20:59:44 UTC 2026

```

---

## backend/requirements.txt
```txt
fastapi==0.110.1
uvicorn==0.25.0
boto3>=1.34.129
requests-oauthlib>=2.0.0
cryptography>=42.0.8
python-dotenv>=1.0.1
pymongo==4.5.0
pydantic>=2.6.4
email-validator>=2.2.0
pyjwt>=2.10.1
bcrypt==4.1.3
passlib>=1.7.4
tzdata>=2024.2
motor==3.3.1
pytest>=8.0.0
black>=24.1.1
isort>=5.13.2
flake8>=7.0.0
mypy>=1.8.0
python-jose>=3.3.0
requests>=2.31.0
pandas>=2.2.0
numpy>=1.26.0
python-multipart>=0.0.9
jq>=1.6.0
typer>=0.9.0
openpyxl>=3.1.0
reportlab>=4.0.0
resend>=2.0.0

slowapi>=0.1.9

```

---

## frontend/src/App.js
```js
import React from "react";
import "@/App.css";
import { WebsiteProvider } from "@/context/WebsiteContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import FAQ from "@/pages/FAQ";
import Kundavtal from "@/pages/Kundavtal";
import NojdKundgaranti from "@/pages/NojdKundgaranti";
import Integritetspolicy from "@/pages/Integritetspolicy";
import Varderingar from "@/pages/Varderingar";
import Malsattning from "@/pages/Malsattning";
import OmOss from "@/pages/OmOss";

function App() {
  React.useEffect(() => {
    if (window.location.hostname.includes("purenorth-admin") && window.location.pathname === "/") {
      window.location.replace("/admin");
    }
  }, []);
  return (
    <div className="App">
      <AuthProvider>
        <WebsiteProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/om-oss" element={<OmOss />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/kundavtal" element={<Kundavtal />} />
            <Route path="/nojd-kundgaranti" element={<NojdKundgaranti />} />
            <Route path="/integritetspolicy" element={<Integritetspolicy />} />
            <Route path="/varderingar" element={<Varderingar />} />
            <Route path="/malsattning" element={<Malsattning />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/:tab" element={<Admin />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
        </WebsiteProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
// build 1783362130
// rootdir 1783362586
// stad build 1783363008

```

---

## frontend/src/pages/Admin.jsx
```jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, Trash2, Phone, Mail, Calendar, Maximize, Hash, RefreshCw, Check, X, Clock, LayoutDashboard, CalendarDays, Star, CalendarRange, UserMinus, Receipt, Banknote, FileText, Tag, TrendingUp, TrendingDown, Users, BarChart2, Search, MapPin, FileSpreadsheet, Settings, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useWebsite } from "@/context/WebsiteContext";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SchedulePanel from "@/components/SchedulePanel";
import AbsencePanel from "@/components/AbsencePanel";
import ExpensePanel from "@/components/ExpensePanel";
import PayrollPanel from "@/components/PayrollPanel";
import InvoicePanel from "@/components/InvoicePanel";
import PriceListPanel from "@/components/PriceListPanel";
import EconomyPanel from "@/components/EconomyPanel";
import CustomerPanel from "@/components/CustomerPanel";
import CalendarPanel from "@/components/CalendarPanel";
import StatsPanel from "@/components/StatsPanel";
import UsersPanel from "@/components/UsersPanel";
import CostsPanel from "@/components/CostsPanel";
import SettingsPanel from "@/components/SettingsPanel";
import DashboardPanel from "@/components/DashboardPanel";
import BookingCalculator from "@/components/BookingCalculator";
import { ReviewsPanel } from "@/pages/admin/ReviewsPanel";
import { LoginScreen } from "@/pages/admin/LoginScreen";
import { BookingsPanel } from "@/pages/admin/BookingsPanel";
import { Dashboard } from "@/pages/admin/Dashboard";

const STATUS = {
  new: { label: "Ny", cls: "bg-blue-50 text-blue-700" },
  contacted: { label: "Kontaktad", cls: "bg-amber-50 text-amber-700" },
  done: { label: "Klar", cls: "bg-green-50 text-green-700" },
};




export default function Admin() {
  const { user, loading, login } = useAuth();
  const [resetToken, setResetToken] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    if (token) setResetToken(token);
  }, []);

  const doReset = async (e) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) { toast.error("Lösenorden matchar inte."); return; }
    setResetLoading(true);
    try {
      await api.post("/auth/reset-password", { token: resetToken, new_password: resetPassword });
      setResetDone(true);
      setResetToken(null);
      window.history.replaceState({}, "", "/admin");
      toast.success("Lösenordet uppdaterat! Logga in med ditt nya lösenord.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Ogiltig eller utgången länk.");
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Laddar...</div>;
  if (resetToken) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-5">
      <form onSubmit={doReset} className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Nytt lösenord</h1>
        <p className="text-sm text-slate-500 mb-6">Ange ditt nya lösenord nedan.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nytt lösenord</label>
            <input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} required minLength={6}
              className="w-full rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Minst 6 tecken"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bekräfta lösenord</label>
            <input type="password" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)} required
              className="w-full rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Upprepa lösenordet"/>
          </div>
          <button type="submit" disabled={resetLoading} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {resetLoading ? "Uppdaterar..." : "Spara nytt lösenord"}
          </button>
        </div>
      </form>
    </div>
  );
  if (!user) {
    return <LoginScreen onLogin={login} />;
  }
  return <Dashboard />;
}

// reorder Sat Jul  4 08:56:30 UTC 2026
// fix admin Sat Jul  4 09:10:49 UTC 2026
// Sat Jul  4 11:10:34 UTC 2026

```

---

## frontend/src/components/SettingsPanel.jsx
```jsx
import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { SocialSection } from "@/features/settings/sections/SocialSection";
import { SeoSection } from "@/features/settings/sections/SeoSection";
import { AdminSection } from "@/features/settings/sections/AdminSection";
import { NavbarSection } from "@/features/settings/sections/NavbarSection";
import { KontaktSection } from "@/features/settings/sections/KontaktSection";
import { TestimonialsSection } from "@/features/settings/sections/TestimonialsSection";
import { VartArbeteSection } from "@/features/settings/sections/VartArbeteSection";
import { HeroSection } from "@/features/settings/sections/HeroSection";
import { FooterSection } from "@/features/settings/sections/FooterSection";
import { FooterFaqSection } from "@/features/settings/sections/FooterFaqSection";
import { FooterKundavtalSection } from "@/features/settings/sections/FooterKundavtalSection";
import { FooterNojdSection } from "@/features/settings/sections/FooterNojdSection";
import { FooterVarderigarSection } from "@/features/settings/sections/FooterVarderigarSection";
import { FooterMalsattningSection } from "@/features/settings/sections/FooterMalsattningSection";
import { FooterIntegritetSection } from "@/features/settings/sections/FooterIntegritetSection";
import { AboutSection } from "@/features/settings/sections/AboutSection";
import { MediaSection } from "@/features/settings/sections/MediaSection";
import { WhyUsSection } from "@/features/settings/sections/WhyUsSection";
import { ServicesSection } from "@/features/settings/sections/ServicesSection";
import { toast } from "sonner";
import { Save, Upload, Globe, Phone, Image, Type, Info, MapPin, Award, Layers, Plus, Trash2, Menu, Search, Palette, Star, ExternalLink, ClipboardList } from "lucide-react";
import { CircleColor, TextColorPicker, ColorPicker } from "@/shared/ui";

const SECTIONS = [
  { id: "admin", label: "Admin", icon: Menu },
  { id: "hero", label: "Hero", icon: Type },
  { id: "services", label: "Tjänster", icon: Globe },
  { id: "testimonials", label: "Omdömen", icon: Star },
  { id: "vartarbete", label: "Vårt arbete", icon: Image },
  { id: "about", label: "Om oss", icon: Info },
  { id: "whyus", label: "Varför oss", icon: Award },
  { id: "navbar", label: "Navbar", icon: Menu },
  { id: "kontakt", label: "Kontakt", icon: Phone },
  { id: "booking", label: "Bokningsformulär", icon: ClipboardList },
  { id: "footer", label: "Footer", icon: Layers },
  { id: "media", label: "Bilder & Logo", icon: Image },
  { id: "social", label: "Sociala medier", icon: Globe },
  { id: "seo", label: "SEO", icon: Search },
];

export default function SettingsPanel() {
  const [data, setData] = useState({
    hero_title: "", hero_subtitle: "", hero_badge: "", cta_text: "",
    badge1: "", badge2: "", phone: "", email: "", address: "",
    opening_hours: "", company_name: "", about_text: "",
    logo_url: "", hero_image: "", facebook_url: "", instagram_url: "",
    contact_title: "", contact_subtitle: "", contact_description: "", contact_box_title: "", contact_box_text: "", contact_box_btn: "",
  });
  const [section, setSection] = useState("admin");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const logoRef = useRef();
  const aboutImgRef = useRef();
  const mal1ImgRef = useRef();
  const mal2ImgRef = useRef();
  const badgeImgRef = useRef();
  const badge1ImgRef = useRef();
  const badge2ImgRef = useRef();
  const heroImgRef = useRef();

  useEffect(() => {
    api.get("/settings/website").then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/settings/website", data);
      toast.success("Webbplatsinställningar sparade! ✅");
    } catch { toast.error("Kunde inte spara."); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file, key) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/settings/website/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      set(key, res.data.url);
      toast.success("Bild uppladdad! ✅");
    } catch { toast.error("Uppladdning misslyckades."); }
  };

  const inp = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#141414] transition-colors";
  const lbl = "text-sm font-medium text-slate-700 block mb-1";

  if (loading) return <div className="text-center py-20 text-slate-400">Laddar...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-900">Webbplatsinställningar</h2>
          <p className="text-sm text-slate-500 mt-1">Redigera text och bilder på din webbplats</p>
        </div>
        <div className="flex gap-2">
          <button onClick={async () => {
            if (!window.confirm("Återställ alla inställningar till standard?")) return;
            const defaults = {
              hero_badge: "Svanenmärkt & miljöcertifierat",
              hero_title: "Renhet med norrländsk precision i Umeå.",
              hero_subtitle: "Vi definierar premiumstädning genom certifierad expertis och hållbara metoder.",
              cta_text: "Boka tid online",
              badge1: "SRY-kvalifikation",
              badge2: "Pur-Eco produkter",
              phone: "070-624 04 03",
              company_name: "PureNorth Städ",
              opening_hours: "Mån–Fre: 08:00–18:00",
              contact_title: "Kontakt",
              contact_subtitle: "Vi finns i Umeå",
              contact_description: "Har du frågor eller vill boka en städning? Hör av dig så hjälper vi dig.",
              contact_box_title: "PureNorth Städ",
              contact_box_text: "Miljövänlig städning med SRY-utbildad personal och Svanenmärkta Pur-Eco produkter. För ett renare hem och en renare natur.",
              contact_box_btn: "Boka tid nu",
              hero_badge_color: "#166534",
              hero_badge_bg: "#dcfce7",
              hero_title_color: "#141414",
              hero_title_bg: "transparent",
              hero_subtitle_color: "#475569",
              hero_subtitle_bg: "transparent",
              hero_cta_color: "#ffffff",
              hero_cta_bg: "#141414",
              hero_badge1_color: "#475569",
              hero_badge1_bg: "transparent",
              hero_badge2_color: "#475569",
              hero_badge2_bg: "transparent",
              hero_image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
              about_image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
              contact_title_color: "",
              contact_subtitle_color: "",
              contact_description_color: "",
              contact_box_title_color: "",
              contact_box_text_color: "rgba(255,255,255,0.75)",
              contact_box_bg: "#141414",
              contact_box_btn_color: "#141414",
              contact_box_btn_bg: "#ffffff",
              booking_bg: "#141414",
              booking_title_color: "#ffffff",
              booking_subtitle_color: "#ffffff",
              booking_btn_color: "#141414",
              booking_btn_bg: "#ffffff",
              booking_label_color: "#ffffff",
              booking_phone_icon: "Phone",
              booking_phone_icon_bg: "#ffffff",
              booking_phone_icon_color: "#141414",
              booking_phone_text_color: "#ffffff",
              booking_phone_label_color: "#ffffff",
              admin_company_name: "",
              admin_panel_label: "Adminpanel",
              admin_header_bg: "#ffffff",
              admin_header_text_color: "#0f172a",
              testimonials_label_color: "",
              testimonials_title_color: "",
              testimonials_card_bg: "",
              testimonials_text_color: "",
              testimonials_name_color: "",
              testimonials_role_color: "",
              testimonials_icon_color: "",
              hero_rut_percent: "50%",
              hero_rut_title: "RUT-avdrag",
              hero_rut_text: "Dras direkt på fakturan",
              hero_rut_bg: "#ffffff",
              hero_rut_circle_bg: "#166534",
              hero_rut_circle_color: "#166534",
              hero_rut_title_color: "#0f172a",
              hero_rut_text_color: "#64748b",
              integritet_sections: [
                {"heading":"Behandling av personuppgifter","bullets":["För att kunna erbjuda dig våra tjänster behöver vi behandla dina personuppgifter.","Vi värnar om din personliga integritet och eftersträvar alltid en hög nivå av dataskydd.","PureNorth Städ avser att behandla personuppgifter i enlighet med dataskyddsförordningen GDPR."]},
                {"heading":"1. Allmänt","text":"Denna integritetspolicy beskriver hur PureNorth Städ samlar in och behandlar dina personuppgifter."},
                {"heading":"2. Personuppgiftsansvarig","text":"Respektive bolag som du lämnat personuppgifter till är personuppgiftsansvarig för behandling av dina uppgifter."},
                {"heading":"3. Insamling av information","text":"Vi samlar in information från dig när du besöker vår hemsida eller på annat sätt har kontakt med oss."},
                {"heading":"4. Vilken information behandlar vi?","bullets":["Namn och identifikationsnummer","Adress","Telefonnummer och e-post","Betalningsuppgifter","Uppgifter om dina beställningar"]},
                {"heading":"5. Användning av information","bullets":["Fullgöra våra förpliktelser gentemot dig som kund","Möjliggöra allmän kundvård och kundservice","Hantera kundförhållandet och tillhandahålla våra tjänster"]},
                {"heading":"6. De lagliga grunderna","text":"Uppfyllande av avtal: vi behandlar dina personuppgifter för att kunna fullgöra avtalet med dig som kund."},
                {"heading":"7. Hur länge sparar vi informationen","text":"Vi sparar uppgifter om kunder i högst 24 månader efter senaste interaktion."},
                {"heading":"8. E-handelssäkerhet","text":"PureNorth Städ är de enda som äger informationen som samlas in på våra webbplatser."},
                {"heading":"9. Utlämnande till tredje part","text":"Vi säljer inte personligt identifierbar information till utomstående parter."},
                {"heading":"10. Informationsskydd","text":"Vi använder avancerade krypteringsmetoder för att skydda känsliga uppgifter."},
                {"heading":"11. Dina rättigheter","text":"Du har rätt att kostnadsfritt erhålla ett registerutdrag över vilken information som finns registrerad om dig."},
                {"heading":"12. Cookies","text":"När du besöker vår hemsida använder vi cookies för att ge dig en mer användarvänlig webbplats."},
                {"heading":"13. Ändring av integritetspolicy","text":"PureNorth Städ har rätt att när som helst ändra integritetspolicyn."},
                {"heading":"14. Kontaktinformation","text":"Har du frågor kring denna policy kan du kontakta oss på kundtjanst@purenorthstad.se."}
              ],
              contact_title_color: "",
              contact_subtitle_color: "",
              contact_description_color: "",
              contact_box_title_color: "",
              contact_box_text_color: "rgba(255,255,255,0.75)",
              contact_box_bg: "#141414",
              contact_box_btn_color: "#141414",
              contact_box_btn_bg: "#ffffff",
              booking_bg: "#141414",
              booking_title_color: "#ffffff",
              booking_subtitle_color: "#ffffff",
              booking_btn_color: "#141414",
              booking_btn_bg: "#ffffff",
              booking_label_color: "#ffffff",
              booking_phone_icon: "Phone",
              booking_phone_icon_bg: "#ffffff",
              booking_phone_icon_color: "#141414",
              booking_phone_text_color: "#ffffff",
              booking_phone_label_color: "#ffffff",
              admin_company_name: "",
              admin_panel_label: "Adminpanel",
              admin_header_bg: "#ffffff",
              admin_header_text_color: "#0f172a",
              testimonials_label_color: "",
              testimonials_title_color: "",
              testimonials_card_bg: "",
              testimonials_text_color: "",
              testimonials_name_color: "",
              testimonials_role_color: "",
              testimonials_icon_color: "",
              nav_links: [{"label":"Tjänster","href":"/#tjanster"},{"label":"Om oss","href":"/om-oss"},{"label":"Vårt arbete","href":"/#vart-arbete"},{"label":"Kontakt","href":"/#kontakt"}],
              navbar_bg: "",
              navbar_company_color: "",
              navbar_link_color: "",
              navbar_btn_color: "",
              navbar_btn_bg: "",
              services_label_color: "",
              services_title_color: "",
              services: [
                {"title":"Hemstädning","desc":"Regelbunden eller engångsstädning som ger dig mer tid till det du älskar.","icon_name":"Home","icon_color":"#166534","img":"https://images.pexels.com/photos/36777855/pexels-photo-36777855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"},
                {"title":"Flyttstädning","desc":"Noggrann städning vid in och utflyttning, med nöjd kund garanti.","icon_name":"Truck","icon_color":"#166534","img":"https://images.unsplash.com/photo-1600585152220-90363fe7e115?crop=entropy&cs=srgb&fm=jpg&q=85&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"},
                {"title":"Kontorsstädning","desc":"Professionell städning av arbetsplatser för en frisk arbetsmiljö.","icon_name":"Building2","icon_color":"#166534","img":"https://images.unsplash.com/photo-1449247709967-d4461a6a6103?crop=entropy&cs=srgb&fm=jpg&q=85&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"},
                {"title":"Storstädning","desc":"Djuprengöring av hela bostaden, perfekt inför högtider och säsong.","icon_name":"Sparkles","icon_color":"#166534","img":"https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"}
              ],
              vart_slides: [
                {"before":"/before-1.png","after":"/after-1.png","alt":"Sovrum","testid":"before-after-1","show":true,"mode":"slider"},
                {"before":"/before-2.png","after":"/after-2.png","alt":"Kontor","testid":"before-after-2","show":true,"mode":"slider"}
              ],
              mal_card1_img: "/svanen-new.png",
              mal_card2_img: "https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&w=900",
              faq_items: [
                {"q":"Hur gör jag en bokning?","a":"Om du är intresserad av att göra en bokning hos oss börjar du med att gå in på vårt bokningsformulär och fyller i det."},
                {"q":"Hur kontaktar jag er?","a":"Du kan kontakta oss via telefon eller mejl. Telefon: 0706240403."},
                {"q":"Har ni städgaranti?","a":"Vi lämnar 14 dagars städgaranti."},
                {"q":"Vad gör jag om jag inte är nöjd?","a":"Kontakta oss inom 14 dagar från städdagen."},
                {"q":"Behöver jag ha något städmaterial hemma?","a":"Nej, vi tar med oss allt vi behöver."},
                {"q":"Vad har ni för avbokningsregler?","a":"Du kan avboka kostnadsfritt fram till två veckor innan avtalat datum."},
                {"q":"Måste jag själv göra något för att få RUT-avdrag?","a":"Nej, vi sköter allt administrativt för RUT-avdraget."},
                {"q":"Vad händer om något går sönder?","a":"PureNorth Städ har ansvarsförsäkring som täcker eventuella skador."}
              ],
              nojd_guarantees: ["92% av kunder ger oss topp betyg","Vi följer mäklarsamfundets rekommendationer","Klart inom 24 timmar"],
              nojd_steps: ["Kontakta oss snarast möjligt via telefon eller e-post om du är missnöjd.","Vi tar fram en lösning och åtgärdar problemet så snabbt som möjligt.","Reklamera tjänsten inom tre arbetsdagar efter servicetillfället."],
              varderingar_values: [
                {"icon":"Tag","title":"Priser","text":"För både er och vår personals trygghet matchar vi priset till kvalitén som erbjuds."},
                {"icon":"HeartHandshake","title":"Service","text":"Vi är kända för att alltid bemöta kunder på ett bra sätt."},
                {"icon":"ShieldCheck","title":"Kvalitetssäkring","text":"Vår målsättning är att leverera tjänster av toppkvalité."},
                {"icon":"Ear","title":"Respekt & lyhördhet","text":"Att respektera våra kunder, hem och medarbetare är grunden till en bra vardag."}
              ],
              booking_services: ["Hemstädning","Flyttstädning","Kontorsstädning","Storstädning","Annat"],
              kundavtal_sections: [
                {"heading":"Bokningsvillkor","items":["Bokningen behöver ske via mail.","Vi behöver ett fullständigt personnummer för RUT-ansökan.","Vår städgaranti innebär att ni inom 14 dagar efter utförd tjänst ska kontakta oss."]},
                {"heading":"Betalningsvillkor","items":["Fakturering och betalning hanteras endast elektroniskt.","Betalningsvillkor är 10 dagar."]},
                {"heading":"Avbokningsvillkor","items":["Avbokning sker kostnadsfritt fram till och med två veckor innan avtalad städdag.","Vid avbeställning 8 dagar före, erläggs 25%.","Sker avbeställningen inom 3 dagar, erläggs full kostnad."]}
              ],
              contact_title_color: "",
              contact_subtitle_color: "",
              contact_description_color: "",
              contact_box_title_color: "",
              contact_box_text_color: "rgba(255,255,255,0.75)",
              contact_box_bg: "#141414",
              contact_box_btn_color: "#141414",
              contact_box_btn_bg: "#ffffff",
              booking_bg: "#141414",
              booking_title_color: "#ffffff",
              booking_subtitle_color: "#ffffff",
              booking_btn_color: "#141414",
              booking_btn_bg: "#ffffff",
              booking_label_color: "#ffffff",
              booking_phone_icon: "Phone",
              booking_phone_icon_bg: "#ffffff",
              booking_phone_icon_color: "#141414",
              booking_phone_text_color: "#ffffff",
              booking_phone_label_color: "#ffffff",
              admin_company_name: "",
              admin_panel_label: "Adminpanel",
              admin_header_bg: "#ffffff",
              admin_header_text_color: "#0f172a",
              testimonials_label_color: "",
              testimonials_title_color: "",
              testimonials_card_bg: "",
              testimonials_text_color: "",
              testimonials_name_color: "",
              testimonials_role_color: "",
              testimonials_icon_color: "",
              nav_links: [{"label":"Tjänster","href":"/#tjanster"},{"label":"Om oss","href":"/om-oss"},{"label":"Vårt arbete","href":"/#vart-arbete"},{"label":"Kontakt","href":"/#kontakt"}],
              navbar_bg: "",
              navbar_company_color: "",
              navbar_link_color: "",
              navbar_btn_color: "",
              navbar_btn_bg: "",
              services: [
                {title:"Hemstädning",desc:"Regelbunden eller engångsstädning som ger dig mer tid till det du älskar.",icon_name:"Home",icon_color:"#166534",img:"https://images.pexels.com/photos/36777855/pexels-photo-36777855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"},
                {title:"Flyttstädning",desc:"Noggrann städning vid in och utflyttning, med nöjd kund garanti.",icon_name:"Truck",icon_color:"#166534",img:"https://images.unsplash.com/photo-1600585152220-90363fe7e115?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"},
                {title:"Kontorsstädning",desc:"Professionell städning av arbetsplatser för en frisk arbetsmiljö.",icon_name:"Building2",icon_color:"#166534",img:"https://images.unsplash.com/photo-1449247709967-d4461a6a6103?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"},
                {title:"Storstädning",desc:"Djuprengöring av hela bostaden, perfekt inför högtider och säsong.",icon_name:"Sparkles",icon_color:"#166534",img:"https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"}
              ],
            };
            try {
              await api.patch("/settings/website", defaults);
              window.location.reload();
            } catch { alert("Fel vid återställning."); }
          }} className="inline-flex items-center gap-2 border border-slate-300 text-slate-600 font-semibold px-5 py-2.5 rounded-full hover:bg-slate-100 transition-colors">
            Återställ
          </button>
          <a href="https://purenorth-stad.vercel.app" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold px-5 py-2.5 rounded-full hover:border-slate-400 transition-colors">
            <ExternalLink size={16}/> Visa
          </a>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#141414] hover:bg-black text-white font-semibold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50">
            <Save size={16}/> {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 p-2 space-y-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${section === s.id ? "bg-[#141414] text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                <s.icon size={15}/> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-6 space-y-5">

        {section === "hero" && <HeroSection data={data} set={set} inp={inp} lbl={lbl} heroImgRef={heroImgRef} badgeImgRef={badgeImgRef} badge1ImgRef={badge1ImgRef} badge2ImgRef={badge2ImgRef} uploadImage={uploadImage}/>}

        

        {section === "media" && <MediaSection data={data} set={set} inp={inp} lbl={lbl} logoRef={logoRef} heroImgRef={heroImgRef} uploadImage={uploadImage}/>}

        {section === "social" && <SocialSection data={data} set={set} inp={inp} lbl={lbl}/>}

        

        {section === "whyus" && <WhyUsSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "services" && <ServicesSection data={data} set={set} inp={inp} lbl={lbl} uploadImage={uploadImage}/>}

        {section === "navbar" && <NavbarSection data={data} set={set} inp={inp} lbl={lbl}/>}
        {section === "kontakt" && <KontaktSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "booking" && <>
          <h3 className="font-semibold text-slate-800">Bokningsformulär</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa bokningsformulär</label>
            <button type="button" onClick={()=>set("show_booking", data.show_booking === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.booking_bg||"#141414"} onChange={e=>set("booking_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Vänster sida</h4>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.booking_left_label||""} onChange={e=>set("booking_left_label",e.target.value)} placeholder="Boka tid" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_label_color||"#808080"} onChange={e=>set("booking_left_label_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_left_title||""} onChange={e=>set("booking_left_title",e.target.value)} placeholder="Boka online eller ring oss" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_title_color||"#ffffff"} onChange={e=>set("booking_left_title_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.booking_left_subtitle||""} onChange={e=>set("booking_left_subtitle",e.target.value)} rows={2} placeholder="Fyll i formuläret..." className={inp+" resize-none"}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_subtitle_color||"#b3b3b3"} onChange={e=>set("booking_left_subtitle_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Ring oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa knapp</label>
            <button type="button" onClick={()=>set("show_booking_phone_btn", data.show_booking_phone_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking_phone_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking_phone_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Label text</label>
            <input value={data.booking_phone_btn_label||""} onChange={e=>set("booking_phone_btn_label",e.target.value)} placeholder="Ring oss" className={inp}/>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_phone_btn_bg||"#1f1f1f"} onChange={e=>set("booking_phone_btn_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span><CircleColor value={data.booking_phone_btn_icon_bg||"#ffffff"} onChange={e=>set("booking_phone_btn_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span><CircleColor value={data.booking_phone_btn_icon_color||"#141414"} onChange={e=>set("booking_phone_btn_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span><CircleColor value={data.booking_phone_btn_label_color||"#808080"} onChange={e=>set("booking_phone_btn_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Nummer</span><CircleColor value={data.booking_phone_btn_number_color||"#ffffff"} onChange={e=>set("booking_phone_btn_number_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Höger sida (formulär)</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Form BG</span><CircleColor value={data.booking_form_bg||"#1a1a1a"} onChange={e=>set("booking_form_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span><CircleColor value={data.booking_form_label_color||"#b3b3b3"} onChange={e=>set("booking_form_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Input BG</span><CircleColor value={data.booking_form_input_bg||"#242424"} onChange={e=>set("booking_form_input_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Input text</span><CircleColor value={data.booking_form_input_text||"#ffffff"} onChange={e=>set("booking_form_input_text",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Skicka-knapp</h4>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.booking_submit_text||""} onChange={e=>set("booking_submit_text",e.target.value)} placeholder="Skicka bokningsförfrågan" className={inp}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Text</span><CircleColor value={data.booking_submit_color||"#141414"} onChange={e=>set("booking_submit_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_submit_bg||"#ffffff"} onChange={e=>set("booking_submit_bg",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Success</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_success_title||""} onChange={e=>set("booking_success_title",e.target.value)} placeholder="Tack för din förfrågan!" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.booking_success_text||""} onChange={e=>set("booking_success_text",e.target.value)} placeholder="Vi återkommer så snart vi kan." className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_success_color||"#ffffff"} onChange={e=>set("booking_success_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänster</h4>
          {(data.booking_services||[]).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s||""} onChange={e=>{const arr=[...data.booking_services];arr[idx]=e.target.value;set("booking_services",arr);}} placeholder="Hemstädning" className={inp}/>
              <button onClick={()=>set("booking_services",data.booking_services.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("booking_services",[...(data.booking_services||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>}

        {section === "footer" && <FooterSection data={data} set={set} inp={inp} lbl={lbl} setSection={setSection}/>}

        {section === "footer_faq" && <FooterFaqSection data={data} set={set} inp={inp} lbl={lbl} setSection={setSection}/>}
        {section === "footer_kundavtal" && <FooterKundavtalSection data={data} set={set} inp={inp} lbl={lbl} setSection={setSection}/>}

        {section === "footer_nojd" && <FooterNojdSection data={data} set={set} inp={inp} lbl={lbl} setSection={setSection}/>}

        {section === "footer_varderingar" && <FooterVarderigarSection data={data} set={set} inp={inp} lbl={lbl} setSection={setSection}/>}

        {section === "footer_malsattning" && <FooterMalsattningSection data={data} set={set} inp={inp} lbl={lbl} mal1ImgRef={mal1ImgRef} mal2ImgRef={mal2ImgRef} uploadImage={uploadImage} setSection={setSection}/>}

        {section === "footer_integritet" && <FooterIntegritetSection data={data} set={set} inp={inp} lbl={lbl} setSection={setSection}/>}

        {section === "vartarbete" && <VartArbeteSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "admin" && <AdminSection data={data} set={set} inp={inp} lbl={lbl} logoRef={logoRef} uploadImage={uploadImage}/>}

        {section === "seo" && <SeoSection data={data} set={set} inp={inp} lbl={lbl}/>}



        {section === "testimonials" && <TestimonialsSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "about" && <AboutSection data={data} set={set} inp={inp} lbl={lbl} aboutImgRef={aboutImgRef} uploadImage={uploadImage}/>}

        </div>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        💡 Ändringar syns direkt på webbplatsen efter att du sparar.
      </div>
    </div>
  );
}
// reset fix Thu Jul  2 00:35:23 UTC 2026
// Thu Jul  2 00:43:24 UTC 2026
// force
// Sat Jul  4 00:10:21 UTC 2026
// Sat Jul  4 10:13:46 UTC 2026

```

---

## frontend/src/components/BookingForm.jsx
```jsx
import React from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { motion } from "framer-motion";
import { Phone, Send, CheckCircle2, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useBookingForm } from "@/features/booking/hooks/useBookingForm";

export const BookingForm = () => {
  const ws = useWebsite();
  const {
    form, services, submitting, done, setDone,
    serviceDropdownOpen, setServiceDropdownOpen,
    serviceOptions, quantityInfo, annatSelected,
    toggleService, update, submit,
  } = useBookingForm();

  if (ws.show_booking === false) return null;

  // Color helpers
  const bg = ws.booking_bg || "#141414";
  const leftLabelColor = ws.booking_left_label_color || "#808080";
  const leftTitleColor = ws.booking_left_title_color || "#ffffff";
  const leftSubtitleColor = ws.booking_left_subtitle_color || "#b3b3b3";
  const phoneBtnBg = ws.booking_phone_btn_bg || "#1f1f1f";
  const phoneBtnIconBg = ws.booking_phone_btn_icon_bg || "#ffffff";
  const phoneBtnIconColor = ws.booking_phone_btn_icon_color || "#141414";
  const phoneBtnLabelColor = ws.booking_phone_btn_label_color || "#808080";
  const phoneBtnNumberColor = ws.booking_phone_btn_number_color || "#ffffff";
  const formBg = ws.booking_form_bg || "#1a1a1a";
  const formLabelColor = ws.booking_form_label_color || "#b3b3b3";
  const formInputBg = ws.booking_form_input_bg || "#242424";
  const formInputText = ws.booking_form_input_text || "#ffffff";
  const submitBg = ws.booking_submit_bg || "#ffffff";
  const submitColor = ws.booking_submit_color || "#141414";
  const successColor = ws.booking_success_color || "#ffffff";

  const inp = {
    marginTop: "6px",
    backgroundColor: formInputBg,
    color: formInputText,
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "12px",
    padding: "10px 14px",
    width: "100%",
    fontSize: "15px",
    outline: "none",
  };

  return (
    <section id="boka" className="py-24 sm:py-32" style={{backgroundColor: bg, color: "#ffffff"}}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-5 gap-12">
        {/* Left */}
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: leftLabelColor}}>
            {ws.booking_left_label || "Boka tid"}
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight leading-tight" style={{color: leftTitleColor}}>
            {ws.booking_left_title || "Boka online eller ring oss"}
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{color: leftSubtitleColor}}>
            {ws.booking_left_subtitle || "Fyll i formuläret så återkommer vi med ett förslag. Vill du hellre prata med oss direkt? Slå en signal."}
          </p>
          {ws.show_booking_phone_btn !== false && (
          <a href={`tel:${(ws.phone||"070-624 04 03").replace(/[^0-9]/g,"")}`}
            data-testid="booking-call-btn"
            className="mt-7 inline-flex items-center gap-3 rounded-2xl border px-6 py-4 hover:opacity-80 transition-colors"
            style={{backgroundColor: phoneBtnBg, borderColor: "rgba(255,255,255,0.15)"}}>
            <span className="h-11 w-11 rounded-full flex items-center justify-center"
              style={{backgroundColor: phoneBtnIconBg, color: phoneBtnIconColor}}>
              <Phone size={18}/>
            </span>
            <span>
              <span className="block text-xs" style={{color: phoneBtnLabelColor}}>
                {ws.booking_phone_btn_label || "Ring oss"}
              </span>
              <span className="block font-semibold" style={{color: phoneBtnNumberColor}}>
                {ws.phone || "070-624 04 03"}
              </span>
            </span>
          </a>
          )}
        </div>

        {/* Right - Form */}
        <div className="lg:col-span-3">
          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              data-testid="booking-success"
              className="rounded-3xl border border-white/10 p-10 text-center"
              style={{backgroundColor: formBg}}>
              <CheckCircle2 size={48} className="mx-auto mb-4" style={{color: "#4ade80"}}/>
              <h3 className="font-display font-bold text-2xl mb-2" style={{color: successColor}}>
                {ws.booking_success_title || "Tack för din förfrågan!"}
              </h3>
              <p style={{color: successColor + "b3"}}>
                {ws.booking_success_text || "Vi har tagit emot din bokning och återkommer så snart vi kan."}
              </p>
              <button onClick={() => setDone(false)} data-testid="booking-new-btn"
                className="mt-6 rounded-full px-7 py-3 font-semibold transition-colors"
                style={{backgroundColor: submitBg, color: submitColor}}>
                Gör en ny bokning
              </button>
            </motion.div>
          ) : (
            <form onSubmit={submit} data-testid="booking-form"
              className="rounded-3xl border border-white/10 p-7 sm:p-9 space-y-5"
              style={{backgroundColor: formBg}}>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Namn eller företagsnamn *</label>
                  <input id="name" data-testid="booking-name" value={form.name} onChange={update("name")} placeholder="Anna Andersson" style={inp}/>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>E-post *</label>
                  <input id="email" type="email" data-testid="booking-email" value={form.email} onChange={update("email")} placeholder="namn@exempel.se" style={inp}/>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Telefonnummer *</label>
                  <input id="phone" data-testid="booking-phone" value={form.phone} onChange={update("phone")} placeholder="070-123 45 67" style={inp}/>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Adress (städobjekt)</label>
                  <input id="address" value={form.address} onChange={update("address")} placeholder="Storgatan 1, Umeå" style={inp}/>
                </div>
              </div>

              {/* Service dropdown */}
              <div>
                <label className="text-sm font-medium" style={{color: formLabelColor}}>Vilka tjänster? *</label>
                <div className="mt-2 relative">
                  <button type="button" onClick={() => setServiceDropdownOpen(o => !o)}
                    className="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
                    style={{borderColor: services.length > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)", backgroundColor: formInputBg, color: formInputText}}>
                    <span className="text-[15px]">
                      {services.length === 0 ? "Välj tjänst..." : services[0]}
                    </span>
                    {serviceDropdownOpen ? <ChevronUp size={18} className="shrink-0"/> : <ChevronDown size={18} className="shrink-0"/>}
                  </button>
                  {serviceDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1 rounded-xl border border-white/20 overflow-hidden z-10 relative max-h-56 overflow-y-auto"
                      style={{backgroundColor: "#1a1a1a"}}>
                      {serviceOptions.map(s => (
                        <button key={s} type="button" data-testid={`booking-service-${s}`}
                          onClick={() => toggleService(s)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left text-[15px] transition-colors border-b border-white/10 last:border-b-0 ${services.includes(s) ? "bg-white/10" : "hover:bg-white/5"}`}
                          style={{color: services.includes(s) ? formInputText : "#b3b3b3"}}>
                          <span>{s}</span>
                          {services.includes(s) && <Check size={16} className="shrink-0"/>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {annatSelected && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Beskriv vilken tjänst du önskar *</label>
                  <textarea data-testid="booking-other" value={form.other_description} onChange={update("other_description")}
                    placeholder="Berätta vad du behöver hjälp med..."
                    rows={3} style={{...inp, marginTop: "6px", resize: "none"}}/>
                </motion.div>
              )}


              <div className="grid grid-cols-2 gap-4">
                <div className={quantityInfo ? "" : "col-span-2"}>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Önskat datum för bokning</label>
                  <input id="date" type="date" data-testid="booking-date" value={form.preferred_date} onChange={update("preferred_date")}
                    min={new Date().toISOString().split("T")[0]} style={{...inp, colorScheme: "dark"}}/>
                </div>
                {quantityInfo && (
                  <div>
                    <label className="text-sm font-medium" style={{color: formLabelColor}}>{quantityInfo.label}</label>
                    <input id="kvm" data-testid="booking-kvm" value={form.kvm} onChange={update("kvm")} placeholder={quantityInfo.placeholder} style={inp}/>
                  </div>
                )}
              </div>

                            <button type="submit" disabled={submitting} data-testid="booking-submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full disabled:opacity-60 px-8 py-4 text-base font-semibold transition-colors"
                style={{backgroundColor: submitBg, color: submitColor}}>
                {submitting ? "Skickar..." : <>{ws.booking_submit_text || "Skicka bokningsförfrågan"} <Send size={17}/></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
// Sun Jul  5 09:11:21 UTC 2026

```

---

## frontend/src/components/BookingCalculator.jsx
```jsx
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { FileText } from "lucide-react";

// ── Service type detection ────────────────────────────────────────────────────
const ST_KEYWORDS  = ["fönsterputs","ugnstvätt","kyl/frys","trappstädning"];
const TIM_KEYWORDS = ["hemstädning","storstädning","kontorsstädning","byggstädning"];
const KVM_KEYWORDS = ["flyttstädning"];

const SPEED = { "hemstädning":30, "storstädning":20, "kontorsstädning":35, "byggstädning":18 };

function getType(svcName, unit) {
  const n = svcName.toLowerCase();
  if (unit === "fast") return "fast";
  if (ST_KEYWORDS.some(k  => n.includes(k))) return "st";
  if (KVM_KEYWORDS.some(k => n.includes(k))) return "kvm";
  if (TIM_KEYWORDS.some(k => n.includes(k))) return "tim";
  if (unit === "st")  return "st";
  if (unit === "kvm") return "kvm";
  return "tim";
}

function roundUp(h) { return Math.ceil(h * 2) / 2; }
function fmtKr(n)   { return Number(n).toLocaleString("sv-SE", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " kr"; }

// ── Build one row from service + priceItem + booking qty ──────────────────────
function buildRow(svcName, priceItem, bookingQty) {
  const q    = parseInt(bookingQty) || 0;
  const rate = priceItem.price;
  const isRut = priceItem.is_rut_eligible;
  const type  = getType(svcName, priceItem.unit);
  const speedVal = Object.entries(SPEED).find(([k]) => svcName.toLowerCase().includes(k))?.[1] || 30;

  let tim = 0, kvm = 0, antal = 0, lineTotal = 0;
  let invoiceDesc = priceItem.service;
  let invoiceQty  = 1;

  switch (type) {
    case "fast":
      lineTotal   = rate;
      invoiceDesc = priceItem.service;
      invoiceQty  = 1;
      break;

    case "st":
      antal       = q || 1;
      lineTotal   = antal * rate;
      tim         = roundUp(antal * 0.2);
      invoiceDesc = priceItem.service;
      invoiceQty  = antal;
      break;

    case "kvm":
      kvm         = q || 1;
      lineTotal   = kvm * rate;
      tim         = roundUp(kvm / 15);
      invoiceDesc = `${priceItem.service} (${kvm} kvm)`;
      invoiceQty  = kvm;
      break;

    case "tim":
    default:
      kvm         = q || 0;
      tim         = kvm > 0 ? roundUp(kvm / speedVal) : 1;
      lineTotal   = tim * rate;
      invoiceDesc = `${priceItem.service} (${kvm} kvm → ${tim} tim)`;
      invoiceQty  = tim;
      break;
  }

  return { label: priceItem.service, type, tim, kvm, antal, rate, lineTotal, isRut, invoiceDesc, invoiceQty };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BookingCalculator({ booking, onCreateInvoice }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    api.get("/settings/pricelist")
      .then(r => {
        const active = (r.data.items || []).filter(i => i.is_active);
        const built  = (booking.services || []).map(svc => {
          const item = active.find(p =>
            p.service.toLowerCase().includes(svc.toLowerCase()) ||
            svc.toLowerCase().includes(p.service.toLowerCase())
          );
          return item ? buildRow(svc, item, booking.kvm) : null;
        }).filter(Boolean);
        setRows(built);
      })
      .catch(() => toast.error("Kunde inte hämta prislista."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal      = rows.reduce((s, r) => s + r.lineTotal, 0);
  const rutDeduction  = rows.filter(r => r.isRut).reduce((s, r) => s + r.lineTotal * 1.25 * 0.5, 0);
  const moms          = subtotal * 0.25;
  const totalInclMoms = subtotal + moms;
  const attBetala     = totalInclMoms - rutDeduction;

  // ── Create invoice ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const invoiceItems = rows.map(r => ({
        service:     r.label,
        description: r.invoiceDesc,
        quantity:    r.invoiceQty,
        unit_price:  r.rate,
        is_material: false,
      }));
      const hasRut = rows.some(r => r.isRut);
      const totals = {
        subtotal:      Math.round(subtotal * 100) / 100,
        rut_deduction: Math.round(rutDeduction * 100) / 100,
        vat_amount:    Math.round(moms * 100) / 100,
        total_amount:  Math.round(totalInclMoms * 100) / 100,
        customer_pays: Math.round(attBetala * 100) / 100,
        rut_eligible:  hasRut,
      };
      await onCreateInvoice(invoiceItems, totals);
    } catch { toast.error("Kunde inte skapa faktura."); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <p className="text-sm text-slate-400 p-4">Hämtar priser...</p>;
  if (!rows.length) return (
    <p className="text-sm text-slate-400 p-4 text-center">
      Inga matchande tjänster i prislistan. Kontrollera Prislista.
    </p>
  );

  return (
    <div className="space-y-4">

      {/* ── Items table ── */}
      <div className="rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide">
              <th className="p-3 text-left">Tjänst</th>
              <th className="p-3 text-right">Beräkning</th>
              <th className="p-3 text-right">À-pris</th>
              <th className="p-3 text-right">Belopp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-slate-50 ${i%2===1?"bg-slate-50/40":""}`}>
                <td className="p-3 font-medium text-slate-900">
                  {r.label}
                  {r.isRut && <span className="ml-2 text-xs bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">RUT</span>}
                </td>
                <td className="p-3 text-right text-slate-500 text-xs">
                  {r.type === "st"   && `${r.antal} st`}
                  {r.type === "kvm"  && `${r.kvm} kvm`}
                  {r.type === "tim"  && `${r.kvm} kvm → ${r.tim} tim`}
                  {r.type === "fast" && "Fast pris"}
                </td>
                <td className="p-3 text-right text-slate-500">
                  {r.type === "st"   && `${fmtKr(r.rate)}/st`}
                  {r.type === "kvm"  && `${fmtKr(r.rate)}/kvm`}
                  {r.type === "tim"  && `${fmtKr(r.rate)}/tim`}
                  {r.type === "fast" && fmtKr(r.rate)}
                </td>
                <td className="p-3 text-right font-semibold">{fmtKr(r.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Summary ── */}
      <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Delsumma (exkl. moms)</span>
          <span className="font-medium">{fmtKr(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Moms (25%)</span>
          <span className="font-medium">{fmtKr(moms)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Totalt inkl. moms</span>
          <span className="font-medium">{fmtKr(totalInclMoms)}</span>
        </div>
        {rutDeduction > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600"><span className="hidden sm:inline">RUT-avdrag (50% av arbetskostnad)</span><span className="sm:hidden">RUT-avdrag (50%)</span></span>
            <span className="font-medium text-green-600">-{fmtKr(rutDeduction)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-1">
          <span>ATT BETALA</span>
          <span className="text-green-700">{fmtKr(attBetala)}</span>
        </div>
      </div>

      {/* ── Button ── */}
      <button onClick={handleCreate}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#141414] hover:bg-black text-white font-semibold py-3 transition-colors">
        <FileText size={16}/> Skapa faktura automatiskt
      </button>

    </div>
  );
}


```

---

## frontend/src/components/PriceCalculator.jsx
```jsx
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Calculator, FileText } from "lucide-react";

const SPEED = {
  hem: { kvm: 30, label: "Hemstädning ~30 kvm/tim" },
  flytt: { kvm: 15, label: "Flyttstädning ~15 kvm/tim" },
  stor: { kvm: 20, label: "Storstädning ~20 kvm/tim" },
  bygg: { kvm: 18, label: "Byggstädning ~18 kvm/tim" },
  kontor: { kvm: 35, label: "Kontorsstädning ~35 kvm/tim" },
  trappa: { kvm: null, label: "Fast pris per tillfälle" },
};

function getSpeed(serviceName) {
  const n = serviceName.toLowerCase();
  if (n.includes("hemstäd")) return 30;
  if (n.includes("flytt")) return 15;
  if (n.includes("storstäd")) return 20;
  if (n.includes("byggstäd")) return 18;
  if (n.includes("kontor")) return 35;
  if (n.includes("trapp")) return null;
  if (n.includes("fönster")) return null;
  return null;
}

function kr(n) { return Math.round(n).toLocaleString("sv-SE") + " kr"; }

function ServiceCalc({ item, onAddToInvoice, bookingKvm }) {
  const speed = getSpeed(item.service);
  const isKvm = item.unit === "kvm" || (item.unit === "tim" && speed !== null);
  const isSt = item.unit === "st";
  const isFast = item.unit === "fast";
  const isTim = item.unit === "tim" && speed === null;

  const defaultQty = bookingKvm ? parseInt(bookingKvm) : 0;
  const [qty, setQty] = useState(defaultQty);
  const [qtyInput, setQtyInput] = useState(String(defaultQty));
  React.useEffect(() => {
    if (bookingKvm) { setQty(parseInt(bookingKvm) || 1); setQtyInput(String(parseInt(bookingKvm) || 1)); }
  }, [bookingKvm, isKvm]);
  const [rate, setRate] = useState(item.price);
  const [rateInput, setRateInput] = useState(String(item.price));

  const hoursRaw = isKvm && speed ? qty / speed : isTim ? qty : isSt ? qty * 0.2 : 1;
  const hours = Math.ceil(hoursRaw * 2) / 2; // Round up to nearest 0.5 tim
  const price = isFast ? rate : isKvm ? hours * rate : qty * rate;
  const priceRut = price * 1.25 * 0.5;
  const isRut = item.is_rut_eligible;

  const maxQty = isKvm ? 9999 : isSt ? 9999 : isTim ? 9999 : 1;
  const minQty = 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <p className="font-semibold text-slate-900 text-sm mb-4">{item.service}</p>

      {/* Quantity input */}
      {!isFast && (
        <div className="mb-3">
          <label className="text-xs text-slate-500 block mb-1">
            {isKvm ? "Yta (kvm)" : isSt ? "Antal (st)" : "Timmar"}
          </label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={qtyInput}
              onChange={e=>{setQtyInput(e.target.value);const v=e.target.value===""?0:Math.max(0,+e.target.value||0);setQty(v);}}
              className="w-28 text-center rounded-lg border border-slate-200 text-sm py-2 outline-none focus:border-[#141414]"/>
          </div>
        </div>
      )}

      {/* Rate input */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 block mb-1">
          Pris ({item.unit === "tim" ? "kr/tim" : item.unit === "kvm" ? "kr/kvm" : item.unit === "st" ? "kr/st" : "kr fast"})
        </label>
        <div className="flex items-center gap-2">
          <input type="range" min={100} max={2000} step={10} value={rate}
            onChange={e=>setRate(+e.target.value)} className="flex-1"/>
          <input type="number" min={0} value={rate}
            onChange={e=>setRate(+e.target.value||0)}
            className="w-20 text-center rounded-lg border border-slate-200 text-sm py-1 outline-none focus:border-[#141414]"/>
        </div>
      </div>

      {/* Results */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-2 mb-3">
        {!isFast && speed && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tid (avrundad uppåt)</span>
            <span className="font-medium">{hours.toFixed(1)} tim</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pris</span>
          <span className="font-medium">{kr(price)}</span>
        </div>
        {isRut && (
          <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
            <span className="text-green-600 text-xs">Kund betalar (50% RUT)</span>
            <span className="font-semibold text-green-700">{kr(priceRut)}</span>
          </div>
        )}
      </div>

      <button onClick={() => onAddToInvoice({ service: item.service, qty: isFast ? 1 : qty, rate, hours, price, isRut })}
        className="w-full flex items-center justify-center gap-1.5 rounded-full border border-slate-200 hover:border-[#141414] text-slate-700 text-xs font-semibold py-2 transition-colors">
        <FileText size={13}/> Lägg till faktura
      </button>
    </div>
  );
}

export default function PriceCalculator({ bookingKvm, bookingServices, onCreateInvoice }) {
  const [items, setItems] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);

  useEffect(() => {
    api.get("/settings/pricelist").then(r => {
      const allActive = (r.data.items || []).filter(i => i.is_active);
      if (bookingServices?.length > 0) {
        // First try exact/partial match
        let matched = allActive.filter(i => bookingServices.some(s =>
          i.service.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(i.service.toLowerCase())
        ));
        // If no match found, show all active items
        setItems(matched.length > 0 ? matched : allActive);
      } else {
        setItems(allActive);
      }
    }).catch(() => {});
  }, [bookingServices]);

  const addToInvoice = (item) => {
    setInvoiceItems(prev => {
      const next = prev.find(i => i.service === item.service)
        ? prev.map(i => i.service === item.service ? item : i)
        : [...prev, item];
      // Save to sessionStorage for InvoicePanel to pick up
      sessionStorage.setItem("calc_invoice_items", JSON.stringify(next));
      return next;
    });
    toast.success(`${item.service} lagd till faktura`);
  };

  const totalPrice = invoiceItems.reduce((sum, i) => sum + i.price, 0);
  const totalRut = invoiceItems.filter(i => i.isRut).reduce((sum, i) => sum + i.price * 1.25 * 0.5, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={18} className="text-slate-600"/>
        <h3 className="font-display font-bold text-lg text-slate-900">Priskalkylator</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        {items.map(item => (
          <ServiceCalc key={item.id} item={item} onAddToInvoice={addToInvoice} bookingKvm={bookingKvm}/>
        ))}
      </div>

      {invoiceItems.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <p className="font-semibold text-slate-900 mb-3">Faktura-sammanfattning</p>
          <div className="space-y-2 mb-4">
            {invoiceItems.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-600">{i.service} {i.qty > 1 ? `× ${i.qty}` : ""}</span>
                <div className="text-right">
                  <span className="font-medium">{kr(i.price)}</span>
                  {i.isRut && <span className="text-green-600 text-xs ml-2">(RUT: {kr(i.price*1.25*0.5)})</span>}
                </div>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold">
              <span>Totalt</span>
              <span>{kr(totalPrice)}</span>
            </div>
            {totalRut > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Kund betalar efter RUT</span>
                <span className="font-semibold">{kr(totalPrice - totalRut)}</span>
              </div>
            )}
          </div>
          <button onClick={() => onCreateInvoice && onCreateInvoice(invoiceItems)}
            className="w-full rounded-full bg-[#141414] hover:bg-black text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
            <FileText size={15}/> Skapa faktura automatiskt
          </button>
        </div>
      )}
    </div>
  );
}

```

---

## frontend/src/components/PriceListPanel.jsx
```jsx
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, RotateCcw, Calculator } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UNITS = [
  { value: "tim", label: "Per timme (kr/tim)" },
  { value: "kvm", label: "Per kvm (kr/kvm)" },
  { value: "st", label: "Per styck (kr/st)" },
  { value: "fast", label: "Fast pris (kr)" },
];

const UNIT_LABELS = { tim: "kr/tim", kvm: "kr/kvm", st: "kr/st", fast: "kr fast" };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}




// ── Kalkylator ───────────────────────────────────────────────────────────────
const SPEED = { "hemstädning":30, "storstädning":20, "kontorsstädning":35, "byggstädning":18 };

function getCalcType(name, unit) {
  const n = name.toLowerCase();
  if (unit === "fast") return "fast";
  if (["fönsterputs","ugnstvätt","kyl/frys","trappstädning"].some(k => n.includes(k))) return "st";
  if (n.includes("flyttstädning")) return "kvm";
  if (["hemstädning","storstädning","kontorsstädning","byggstädning"].some(k => n.includes(k))) return "tim";
  if (unit === "st") return "st";
  if (unit === "kvm") return "kvm";
  return "tim";
}

function roundUp(h) { return Math.ceil(h * 2) / 2; }
function fmtKr(n) { return Number(n).toLocaleString("sv-SE", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " kr"; }

function CalcCard({ item }) {

  const type = getCalcType(item.service, item.unit);
  const isRut = item.is_rut_eligible; // from prislista directly
  const speedEntry = Object.entries(SPEED).find(([k]) => item.service.toLowerCase().includes(k));
  const speed = speedEntry ? speedEntry[1] : 30;

  const [qty, setQty] = React.useState(0);
  const [qtyInput, setQtyInput] = React.useState("");
  if (!item.is_active) return null;
  const maxQty = type === "st" ? 30 : 300;
  const minQty = 0;
  const label = type === "st" ? "Antal (st)" : "Yta (kvm)";

  let tim = 0;
  let price = 0;

  if (type === "fast") {
    price = item.price;
  } else if (type === "tim") {
    tim = roundUp(qty / speed);
    price = tim * item.price;
  } else if (type === "kvm") {
    price = qty * item.price;
    tim = roundUp(qty / 15);
  } else if (type === "st") {
    price = qty * item.price;
    tim = roundUp(qty * 0.2);
  }

  const moms = price * 0.25;
  const rutDeduction = isRut ? (price + moms) * 0.5 : 0;
  const totalInclMoms = price + moms;
  const kundBetalar = totalInclMoms - rutDeduction;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-slate-900 text-sm">{item.service}</p>
        {isRut && <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">RUT</span>}
      </div>

      {type !== "fast" && (
        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">{label}</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={500} step={type==="st"?1:5} value={qty}
              onChange={e=>{setQty(+e.target.value);setQtyInput(e.target.value);}} className="flex-1"/>
            <input type="number" min={0} value={qtyInput}
              onChange={e=>setQtyInput(e.target.value)}
              onBlur={e=>{const v=e.target.value===""?0:Math.max(0,+e.target.value||0);setQty(v);setQtyInput(String(v));}}
              onKeyDown={e=>{if(e.key==="Enter"){const v=qtyInput===""?0:Math.max(0,+qtyInput||0);setQty(v);setQtyInput(String(v));}}}
              className="w-20 text-center rounded-lg border border-slate-200 text-sm py-1 outline-none focus:border-[#141414]"/>
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
        {tim > 0 && (
          <div className="flex justify-between text-xs text-slate-500">
            <span>Tid (avrundad)</span>
            <span className="font-medium text-slate-700">{tim.toFixed(1)} tim</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pris ex. moms{isRut ? " & RUT" : ""}</span>
          <span className="font-medium">{fmtKr(price)}</span>
        </div>
        {isRut && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">RUT-avdrag (50%)</span>
            <span className="font-medium text-green-600">-{fmtKr(rutDeduction)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Moms (25%)</span>
          <span className="font-medium">{fmtKr(moms)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
          <span className="text-slate-900">Kund betalar totalt</span>
          <span className="text-green-700">{fmtKr(kundBetalar)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PriceListPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings/pricelist");
      setItems(res.data.items);
    } catch {
      toast.error("Kunde inte hämta prislistan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (id, field, value) => {
    setItems((arr) => arr.map((it) => it.id === id ? { ...it, [field]: value } : it));
    setChanged(true);
  };

  const addItem = () => {
    setItems((arr) => [...arr, {
      id: uid(), service: "", description: "", unit: "tim", price: 0, is_rut_eligible: true, is_active: true
    }]);
    setChanged(true);
  };

  const removeItem = (id) => {
    setItems((arr) => arr.filter((it) => it.id !== id));
    setChanged(true);
  };

  const save = async () => {
    if (items.some((it) => !it.service.trim())) {
      toast.error("Fyll i tjänstnamn för alla rader.");
      return;
    }
    setSaving(true);
    try {
      await api.put("/settings/pricelist", { items });
      toast.success("Prislista sparad! ✅");
      setChanged(false);
    } catch {
      toast.error("Kunde inte spara prislistan.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Återställ till standardpriserna för Umeå?")) return;
    try {
      await api.delete ? null : null;
      // clear then reload defaults
      await api.put("/settings/pricelist", { items: [] });
      const res = await api.get("/settings/pricelist");
      setItems(res.data.items);
      setChanged(false);
      toast.success("Standardpriser återställda.");
    } catch {
      toast.error("Kunde inte återställa.");
    }
  };

  const totalActive = items.filter((i) => i.is_active).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Prislista</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalActive} aktiva tjänster</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-full px-4 py-2 hover:border-slate-400 transition-colors">
            <RotateCcw size={14} /> Återställ
          </button>
          <button onClick={addItem} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-[#141414] transition-colors">
            <Plus size={14} /> Ny rad
          </button>
          <button onClick={save} disabled={saving || !changed} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black disabled:opacity-40 rounded-full px-4 py-2 transition-colors">
            <Save size={14} /> {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <th className="p-4">Tjänst</th>
                  <th className="p-4">Beskrivning</th>
                  <th className="p-4">Enhet</th>
                  <th className="p-4">Pris (kr)</th>
                  <th className="p-4">RUT</th>
                  <th className="p-4">Aktiv</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border-b border-slate-50 last:border-b-0 ${!item.is_active ? "opacity-50" : ""}`}>
                    <td className="p-3">
                      <Input value={item.service} onChange={(e) => update(item.id, "service", e.target.value)} className="h-8 text-sm font-semibold min-w-[140px]" placeholder="T.ex. Hemstädning" />
                    </td>
                    <td className="p-3">
                      <Input value={item.description || ""} onChange={(e) => update(item.id, "description", e.target.value)} className="h-8 text-sm min-w-[160px]" placeholder="Kort beskrivning" />
                    </td>
                    <td className="p-3">
                      <select value={item.unit} onChange={(e) => update(item.id, "unit", e.target.value)} className="rounded-lg border border-slate-200 text-sm px-2.5 py-1.5 outline-none focus:border-[#141414] h-8">
                        {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <Input type="number" step="1" value={item.price} onChange={(e) => update(item.id, "price", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-24" />
                    </td>
                    <td className="p-3">
                      <input type="checkbox" checked={item.is_rut_eligible} onChange={(e) => update(item.id, "is_rut_eligible", e.target.checked)} className="h-4 w-4 rounded" />
                    </td>
                    <td className="p-3">
                      <input type="checkbox" checked={item.is_active} onChange={(e) => update(item.id, "is_active", e.target.checked)} className="h-4 w-4 rounded" />
                    </td>
                    <td className="p-3">
                      <button onClick={() => removeItem(item.id)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className={`p-4 space-y-3 ${!item.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <Input value={item.service} onChange={(e) => update(item.id, "service", e.target.value)} className="font-semibold flex-1" placeholder="Tjänst" />
                  <button onClick={() => removeItem(item.id)} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
                <Input value={item.description || ""} onChange={(e) => update(item.id, "description", e.target.value)} placeholder="Beskrivning" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Enhet</Label>
                    <select value={item.unit} onChange={(e) => update(item.id, "unit", e.target.value)} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3 py-2 outline-none">
                      {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Pris (kr)</Label>
                    <Input type="number" value={item.price} onChange={(e) => update(item.id, "price", parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={item.is_rut_eligible} onChange={(e) => update(item.id, "is_rut_eligible", e.target.checked)} className="h-4 w-4 rounded" />
                    RUT-berättigad
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={item.is_active} onChange={(e) => update(item.id, "is_active", e.target.checked)} className="h-4 w-4 rounded" />
                    Aktiv
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Standardpriser baserade på Umeå-marknaden 2025</p>
        <p className="text-xs text-blue-700">Hemstädning 478 kr/tim (ex. RUT) · Kontorsstädning 350 kr/tim · Fönsterputs 80 kr/st · Priser är riktmärken — justera efter ditt företags kostnadsbild.</p>
      </div>

      {/* ── Kalkylator ── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} className="text-slate-600"/>
          <h3 className="font-display font-bold text-lg text-slate-900">Kundkalkylator</h3>
          <span className="text-xs text-slate-400 ml-1">— se vad kunden betalar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.filter(i => i.is_active).map(item => (
            <CalcCard key={item.id} item={item}/>
          ))}
        </div>
      </div>
    </>
  );
}
 

```

---

## frontend/src/components/InvoicePanel.jsx
```jsx
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileSpreadsheet, X, Trash2, Download, Settings, ChevronDown, ChevronUp, FileText, Link2, Pencil, Eye, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS = {
  draft: { label: "Utkast", cls: "bg-slate-100 text-slate-600" },
  sent: { label: "Skickad", cls: "bg-blue-50 text-blue-700" },
  paid: { label: "Betald", cls: "bg-green-50 text-green-700" },
  overdue: { label: "Förfallen", cls: "bg-red-50 text-red-700" },
};

// SERVICE_TYPES now comes from priceList dynamically

function defaultDueDate(paymentTermsDays) {
  const d = new Date();
  d.setDate(d.getDate() + (paymentTermsDays || 30));
  return d.toISOString().slice(0, 10);
}

function inferItems(initialItems, defaultService = "Hemstädning", defaultPrice = 0) {
  if (!initialItems || initialItems.length === 0) {
    return [{ service: defaultService, description: defaultService, quantity: 1, unit_price: defaultPrice, is_material: false }];
  }
  return initialItems.map((it) => {
    // Clean service name - remove kvm/tim info added by calculator
    const cleanService = (s) => s ? s.replace(/\s*\(.*?\)\s*/g, "").trim() : s;
    const svc = cleanService(it.service || it.description || defaultService);
    const desc = it.description || it.service || defaultService;
    // Detect Påminnelseavgift from either field
    const isPaminnelse = svc.includes("Påminnelse") || desc.includes("Påminnelse") ||
                         (it.unit_price === 60 && it.quantity === 1 && !it.is_material && 
                          (it.description || "").includes("inkasso"));
    return {
      service: isPaminnelse ? "Påminnelseavgift" : svc,
      description: isPaminnelse ? "Påminnelseavgift enligt inkassolagen" : desc,
      quantity: it.quantity,
      unit_price: it.unit_price,
      is_material: it.is_material,
      kvm: it.kvm || 0,
    };
  });
}

function InvoiceSettingsPanel({ settings, onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 mb-6">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-6 py-4">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-900"><Settings size={16} /> Företagsuppgifter och betalning</span>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && (
        <form onSubmit={submit} className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Företagsnamn</Label>
              <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Organisationsnummer</Label>
              <Input value={form.company_orgnr || ""} onChange={(e) => setForm((f) => ({ ...f, company_orgnr: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Adress</Label>
            <Input value={form.company_address || ""} onChange={(e) => setForm((f) => ({ ...f, company_address: e.target.value }))} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">E-post</Label>
              <Input value={form.company_email || ""} onChange={(e) => setForm((f) => ({ ...f, company_email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={form.company_phone || ""} onChange={(e) => setForm((f) => ({ ...f, company_phone: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bankgiro</Label>
              <Input value={form.bankgiro || ""} onChange={(e) => setForm((f) => ({ ...f, bankgiro: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Plusgiro</Label>
              <Input value={form.plusgiro || ""} onChange={(e) => setForm((f) => ({ ...f, plusgiro: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">IBAN</Label>
              <Input value={form.iban || ""} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Moms (%)</Label>
              <Input type="number" step="0.1" value={form.vat_rate} onChange={(e) => setForm((f) => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Betalningsvillkor (dagar)</Label>
              <Input type="number" value={form.payment_terms_days} onChange={(e) => setForm((f) => ({ ...f, payment_terms_days: parseInt(e.target.value) || 30 }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Logotyp (visas i PDF)</Label>
            <div className="mt-1.5 flex items-center gap-3">
              {form.company_logo && (
                <img src={form.company_logo} alt="Logo" className="h-12 w-auto rounded-lg border border-slate-200 object-contain bg-white p-1" />
              )}
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 border border-slate-200 rounded-full px-3 py-2 hover:border-[#141414] transition-colors">
                <Upload size={13} /> {form.company_logo ? "Byt logotyp" : "Ladda upp logotyp"}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const logoData = ev.target.result;
                    setForm((f) => ({ ...f, company_logo: logoData }));
                    try {
                      await api.put("/settings/invoice/logo", { company_logo: logoData });
                      toast.success("Logotyp sparad!");
                    } catch {
                      toast.error("Kunde inte spara logotypen.");
                    }
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
              {form.company_logo && (
                <button type="button" onClick={async () => {
                  setForm((f) => ({ ...f, company_logo: null }));
                  try { await api.put("/settings/invoice/logo", { company_logo: null }); } catch {}
                }} className="text-xs text-red-500 hover:underline">Ta bort</button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400">Nästa fakturanummer: {form.next_invoice_number}</p>
          <button type="submit" disabled={saving} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : "Spara uppgifter"}
          </button>
        </form>
      )}
    </div>
  );
}

function InvoiceModal({ initial, bookings, settings, priceList, onClose, onSave }) {
  const isEdit = Boolean(initial);
  const [customerName, setCustomerName] = useState(initial?.customer_name || "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customer_email || "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customer_phone || "");
  const [customerAddress, setCustomerAddress] = useState(() => {
    if (initial?.customer_address) return initial.customer_address;
    if (initial?.booking_id) {
      const booking = bookings?.find(b => b.id === initial.booking_id);
      return booking?.address || "";
    }
    return "";
  });
  const [customerPersonnummer, setCustomerPersonnummer] = useState(initial?.customer_personnummer || "");
  const [customerType, setCustomerType] = useState(initial?.customer_type || "private");
  const [rutEligible, setRutEligible] = useState(initial ? initial.rut_eligible : false);
  const [bookingId, setBookingId] = useState(initial?.booking_id || "");
  const firstService = priceList.find((p) => p.is_active)?.service || "Hemstädning";
  const firstPrice = priceList.find((p) => p.is_active)?.price || 0;
  const [items, setItems] = useState(() => {
    const inferred = inferItems(initial?.items, firstService, firstPrice);
    // If kvm is null but we have a booking, try to get kvm from it
    if (initial?.booking_id) {
      const booking = bookings?.find(b => b.id === initial.booking_id);
      if (booking?.kvm) {
        return inferred.map(it => ({
          ...it,
          kvm: it.kvm || parseFloat(booking.kvm) || 0
        }));
      }
    }
    return inferred;
  });
  const [note, setNote] = useState(initial?.note || "");
  const [dueDate, setDueDate] = useState(initial?.due_date || defaultDueDate(settings?.payment_terms_days));
  const [saving, setSaving] = useState(false);

  const applyBooking = async (id) => {
    setBookingId(id);
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setCustomerName(b.name);
    setCustomerEmail(b.email || "");
    setCustomerPhone(b.phone || "");

    // Check sessionStorage from calculator first
    const saved = sessionStorage.getItem("calc_invoice_items");
    if (saved) {
      try {
        const calcItems = JSON.parse(saved);
        const newItems = calcItems.map(ci => ({
          service: ci.service, description: ci.service,
          quantity: ci.hours || ci.qty || 1,
          unit_price: ci.rate || 0, is_material: false,
        }));
        setItems(newItems);
        toast.success("Priser hämtade från kalkylatorn!");
        sessionStorage.removeItem("calc_invoice_items");
        return;
      } catch {}
    }

    // Auto-calculate from booking services + kvm
    if (b.services?.length > 0) {
      try {
        const plRes = await api.get("/settings/pricelist");
        const priceItems = (plRes.data.items || []).filter(p => p.is_active);
        const SPEED = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35};
        const ST = ["fönsterputs","ugnstvätt","kyl/frys","trappstädning"];
        const qty = parseInt(b.kvm) || 0;
        const autoItems = b.services.map(svc => {
          const item = priceItems.find(p =>
            p.service.toLowerCase().includes(svc.toLowerCase()) ||
            svc.toLowerCase().includes(p.service.toLowerCase())
          );
          if (!item) return null;
          const speedKey = Object.keys(SPEED).find(k => svc.toLowerCase().includes(k));
          const speed = speedKey ? SPEED[speedKey] : null;
          const st = ST.some(s => svc.toLowerCase().includes(s));
          const isFast = item.unit === "fast";
          let quantity = 1;
          if (isFast) { quantity = 1; }
          else if (st) { quantity = qty || 1; }
          else if (speed && qty) { quantity = Math.ceil((qty / speed) * 2) / 2; }
          else { quantity = qty || 1; }
          const kvm = (speed && qty) ? qty : 0;
          return { service: item.service, description: item.service, quantity, unit_price: item.price, is_material: false, kvm };
        }).filter(Boolean);
        if (autoItems.length > 0) {
          setItems(autoItems);
          toast.success("Priser beräknade automatiskt från bokningen!");
        }
      } catch {}
    }
  };

  const updateItem = (i, field, value) => {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };

  const isCustomService = (svc) => !priceList.find((p) => p.service === svc);

  const updateService = (i, service) => {
    const nonReminder = items.map((item, oIdx) => ({...item, originalIdx: oIdx})).filter(item => item.service !== "Påminnelseavgift");
    const originalIdx = nonReminder[i]?.originalIdx;
    if (originalIdx === undefined) return;
    setItems((arr) => arr.map((it, idx) => {
      if (idx !== i) return it;
      const priceMatch = priceList.find((p) => p.service === service && p.is_active);
      const newPrice = priceMatch ? priceMatch.price : it.unit_price;
      if (service === "Annat" || isCustomService(service)) {
        return { ...it, service, description: "", unit_price: newPrice };
      }
      return { ...it, service, description: service, unit_price: newPrice };
    }));
  };

  const addItem = () => {
    const first = priceList.find(p => p.is_active);
    const svc = first ? first.service : "Hemstädning";
    const price = first ? first.price : 0;
    setItems((arr) => [...arr, { service: svc, description: svc, quantity: 1, unit_price: price, is_material: false }]);
  };
  const removeItem = (i) => {
    // i is index in non-reminder items
    const nonReminder = items.map((item, idx) => ({...item, originalIdx: idx})).filter(item => item.service !== "Påminnelseavgift");
    const originalIdx = nonReminder[i]?.originalIdx;
    if (originalIdx !== undefined) setItems(arr => arr.filter((_, idx) => idx !== originalIdx));
  };

  const laborTotal = items.filter((i) => !i.is_material).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const materialTotal = items.filter((i) => i.is_material).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const subtotal = laborTotal + materialTotal;
  const vatAmount = subtotal * ((settings?.vat_rate ?? 25) / 100);
  const totalAmount = subtotal + vatAmount;
  const rutDeduction = rutEligible && customerType === "private" ? laborTotal * 0.5 : 0;
  const customerPays = totalAmount - rutDeduction;

  const submit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || items.length === 0) return;
    if (items.some((it) => !it.description.trim())) {
      toast.error("Fyll i beskrivning för alla rader.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        booking_id: bookingId || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        customer_personnummer: customerPersonnummer.trim() || null,
        customer_type: customerType,
        rut_eligible: rutEligible,
        items: items.map((i) => ({
          service: i.service,
          description: i.description,
          quantity: parseFloat(i.quantity) || 0,
          unit_price: parseFloat(i.unit_price) || 0,
          is_material: i.is_material,
          kvm: parseFloat(i.kvm) || 0,
        })),
        note: note.trim() || null,
        due_date: dueDate || null,
      };
      await onSave(payload, initial?.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl p-7 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">{isEdit ? `Redigera faktura #${initial.invoice_number}` : "Ny faktura"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!isEdit && (
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><Link2 size={13} /> Koppla till bokning (valfritt)</Label>
              <select value={bookingId} onChange={(e) => applyBooking(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                <option value="">Ingen bokning</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} · {b.email}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-xs">Kundnamn</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Typ</Label>
              <select value={customerType} onChange={(e) => { setCustomerType(e.target.value); if (e.target.value === "company") setRutEligible(false); }} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                <option value="private">Privatperson</option>
                <option value="company">Företag</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-xs">E-post</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Adress</Label>
            <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs">Förfallodatum</Label>
            <Input type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>

          {customerType === "private" && (
            <div className="rounded-xl bg-slate-50 p-3.5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <input type="checkbox" checked={rutEligible} onChange={(e) => setRutEligible(e.target.checked)} className="rounded" />
                RUT-avdrag (50% av arbetskostnad)
              </label>
              {rutEligible && (
                <div>
                  <Label className="text-xs">Personnummer</Label>
                  <Input value={customerPersonnummer} onChange={(e) => setCustomerPersonnummer(e.target.value)} className="mt-1" placeholder="ÅÅMMDD-XXXX" />
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Rader</Label>
              <button type="button" onClick={addItem} className="text-xs font-semibold text-[#141414] inline-flex items-center gap-1"><Plus size={13} /> Lägg till rad</button>
            </div>
            <div className="space-y-2">
              {/* Show Påminnelseavgift as read-only */}
              {items.filter(it => it.service === "Påminnelseavgift").map((it, i) => (
                <div key={`reminder-${i}`} className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Påminnelseavgift (ingen moms)</p>
                    <p className="text-xs text-amber-600">Tillagd automatiskt enligt inkassolagen</p>
                  </div>
                  <p className="text-sm font-bold text-amber-800">+{it.unit_price.toFixed(2)} kr</p>
                </div>
              ))}
              {items.filter(it => it.service !== "Påminnelseavgift").map((it, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px] text-slate-400 mb-1 block">Tjänster</Label>
                    <select value={it.service} onChange={(e) => updateService(i, e.target.value)} className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 outline-none focus:border-[#141414] bg-white">
                      {[...priceList.filter((p) => p.is_active).map((p) => p.service),
                        ...(priceList.some(p => p.service === it.service) ? [] : [it.service]),
                        "Annat"]
                        .filter((s, idx, arr) => arr.indexOf(s) === idx)
                        .map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    </div>
                    {priceList.find((p) => p.service === it.service) && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {priceList.find((p) => p.service === it.service)?.price} kr/{priceList.find((p) => p.service === it.service)?.unit}
                      </span>
                    )}
                  </div>
                  {it.service === "Annat" && (
                    <Input value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Beskrivning" className="text-sm" />
                  )}
                  <div className="grid grid-cols-4 gap-2 items-end">
                    {(() => {
                      const pl = priceList.find(p=>p.service===it.service);
                      const SPEED_MAP = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35};
                      const speedKey = pl ? Object.keys(SPEED_MAP).find(k=>pl.service.toLowerCase().includes(k)) : null;
                      const speed = speedKey ? SPEED_MAP[speedKey] : 20;
                      const isTimBased = pl?.unit === "tim" || pl?.unit === "kvm";
                      if (isTimBased) return (<>
                        <div>
                          <Label className="text-[10px] text-slate-400">Yta (kvm)</Label>
                          <Input type="number" step="1" value={it.kvm||""} onChange={e=>{const kvm=parseFloat(e.target.value)||0;const tim=Math.ceil((kvm/speed)*2)/2;updateItem(i,"kvm",kvm);updateItem(i,"quantity",tim);}} className="text-sm mt-0.5" placeholder="0"/>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-slate-400 mb-2">→</span>
                          <div className="flex-1">
                            <Label className="text-[10px] text-slate-400">tim</Label>
                            <Input type="number" step="0.5" value={it.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} className="text-sm mt-0.5"/>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">À-Pris (kr)</Label>
                          <Input type="number" step="0.01" value={it.unit_price} onChange={e=>updateItem(i,"unit_price",e.target.value)} className="text-sm mt-0.5"/>
                        </div>
                      </>);
                      return (<>
                        <div>
                          <Label className="text-[10px] text-slate-400">{pl?.unit==="st"?"Antal":"Antal"}</Label>
                          <Input type="number" step="0.01" value={it.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} className="text-sm mt-0.5"/>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">À-pris (kr)</Label>
                          <Input type="number" step="0.01" value={it.unit_price} onChange={e=>updateItem(i,"unit_price",e.target.value)} className="text-sm mt-0.5"/>
                        </div>
                        <div/>
                      </>);
                    })()}
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 justify-self-end self-center">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Anteckning (valfritt)</Label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 space-y-1.5 text-sm">
            {(() => {
              // Separate reminder fee (no moms) from regular items
              const reminderItem = items.find(i => i.service === "Påminnelseavgift");
              const reminderFee = reminderItem ? (parseFloat(reminderItem.quantity)||1) * (parseFloat(reminderItem.unit_price)||0) : 0;
              const workItems = items.filter(i => i.service !== "Påminnelseavgift");

              // Step 1: Calculate original invoice
              const laborItems = workItems.filter(i => !i.is_material);
              const matItems = workItems.filter(i => i.is_material);
              const laborSum = laborItems.reduce((s,i) => s + (parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0), 0);
              const matSum = matItems.reduce((s,i) => s + (parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0), 0);
              const delsumma = laborSum + matSum;
              const moms = delsumma * ((settings?.vat_rate ?? 25) / 100);
              const totaltInklMoms = delsumma + moms;
              const rutAvdrag = rutEligible && customerType === "private" ? laborSum * 0.5 : 0;
              const afterRut = totaltInklMoms - rutAvdrag;

              // Step 2: Add Påminnelseavgift AFTER (no moms on it)
              // Use saved customer_pays if available (from DB/calculator)
              const savedPays = initial?.customer_pays;
              const attBetala = savedPays != null && !reminderFee ? savedPays : (afterRut + reminderFee);

              return (<>
                <div className="flex justify-between text-slate-600">
                  <span>Delsumma (exkl. moms)</span><span>{delsumma.toFixed(2)} kr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Moms ({(settings?.vat_rate ?? 25).toFixed(0)}%)</span><span>{moms.toFixed(2)} kr</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Totalt inkl. moms</span><span>{totaltInklMoms.toFixed(2)} kr</span>
                </div>
                {rutAvdrag > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>RUT-avdrag (50%)</span><span>-{rutAvdrag.toFixed(2)} kr</span>
                  </div>
                )}
                {reminderFee > 0 && (
                  <div className="flex justify-between text-amber-700 border-t border-slate-200 pt-1.5">
                    <span>Påminnelseavgift (ingen moms)</span><span>+{reminderFee.toFixed(2)} kr</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200 text-base">
                  <span>ATT BETALA</span><span className="text-green-700">{attBetala.toFixed(2)} kr</span>
                </div>
              </>);
            })()}
          </div>

          <button type="submit" disabled={saving || !customerName.trim()} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : isEdit ? "Spara ändringar" : "Skapa faktura"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function InvoicePanel() {
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [priceList, setPriceList] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, bookRes, setRes, priceRes] = await Promise.all([
        api.get("/invoices"),
        api.get("/bookings"),
        api.get("/settings/invoice"),
        api.get("/settings/pricelist"),
      ]);
      setInvoices(invRes.data);
      setBookings(bookRes.data);
      setSettings(setRes.data);
      setPriceList(priceRes.data.items || []);
    } catch {
      toast.error("Kunde inte hämta fakturor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (form) => {
    try {
      const res = await api.put("/settings/invoice", form);
      setSettings(res.data);
      toast.success("Uppgifter sparade.");
    } catch {
      toast.error("Kunde inte spara uppgifter.");
    }
  };

  const openCreate = () => { setEditingInvoice(null); setModalOpen(true); };
  const openEdit = (inv) => { setEditingInvoice(inv); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingInvoice(null); };

  const saveInvoice = async (payload, id) => {
    try {
      if (id) {
        const res = await api.put(`/invoices/${id}`, payload);
        setInvoices((inv) => inv.map((x) => (x.id === id ? res.data : x)));
        toast.success("Faktura uppdaterad.");
      } else {
        const res = await api.post("/invoices", payload);
        setInvoices((inv) => [res.data, ...inv]);
        toast.success("Faktura skapad.");
      }
      closeModal();
    } catch {
      toast.error("Kunde inte spara fakturan.");
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status });
      setInvoices((inv) => inv.map((x) => (x.id === id ? { ...x, status, paid_at: status === "paid" ? new Date().toISOString() : x.paid_at } : x)));
      toast.success("Status uppdaterad.");
    } catch {
      toast.error("Kunde inte uppdatera status.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort denna faktura?")) return;
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices((inv) => inv.filter((x) => x.id !== id));
      toast.success("Faktura borttagen.");
    } catch {
      toast.error("Kunde inte ta bort fakturan.");
    }
  };

  const sendInvoice = async (inv) => {
    if (!inv.customer_email) {
      toast.error("Kunden har ingen e-postadress.");
      return;
    }
    if (!window.confirm(`Skicka faktura #${inv.invoice_number} till ${inv.customer_email}?`)) return;
    try {
      await api.post(`/invoices/${inv.id}/send`);
      toast.success(`Faktura skickad till ${inv.customer_email}!`);
      load();
    } catch(err) {
      toast.error(err.response?.data?.detail || "Kunde inte skicka faktura.");
    }
  };

  const createKreditfaktura = async (inv) => {
    const reason = window.prompt(`Skapa kreditfaktura för faktura #${inv.invoice_number}.\n\nAnge anledning (t.ex. Fel belopp, Kunden avbokade, Dubbelfakturering):`);
    if (reason === null) return;
    if (!reason.trim()) { toast.error("Anledning krävs för kreditfaktura."); return; }
    try {
      const res = await api.post("/invoices", {
        booking_id: null,
        customer_name: inv.customer_name,
        customer_email: inv.customer_email,
        customer_phone: inv.customer_phone,
        customer_address: inv.customer_address,
        customer_personnummer: null,
        customer_type: inv.customer_type || "private",
        rut_eligible: false,
        items: (inv.items || []).map(it => ({
          service: it.service,
          description: `${it.description || it.service} (kredit)`,
          quantity: it.quantity,
          unit_price: -Math.abs(it.unit_price || 0),
          is_material: it.is_material || false,
          kvm: it.kvm ?? null,
        })),
        subtotal: -(inv.subtotal || 0),
        vat_amount: -(inv.vat_amount || 0),
        total_amount: -(inv.total_amount || 0),
        rut_deduction: -(inv.rut_deduction || 0),
        customer_pays: -(inv.customer_pays || 0),
        note: `Kreditfaktura för faktura #${inv.invoice_number}. Anledning: ${reason.trim()}`,
        due_date: new Date().toISOString().split("T")[0],
        is_credit_note: true,
        credit_reason: reason.trim(),
        credits_invoice_number: inv.invoice_number,
      });
      load();
      setInvoices(prev => [res.data, ...prev]);
      toast.success(`Kreditfaktura #${res.data.invoice_number} skapad!`);
    } catch { toast.error("Kunde inte skapa kreditfaktura."); }
  };

  const sendReminder = async (inv) => {
    if (!inv.customer_email) {
      toast.error("Kunden har ingen e-postadress.");
      return;
    }
    const count = (inv.reminder_count || 0) + 1;
    const fee = count >= 2 ? " (inkl. 60 kr påminnelseavgift)" : "";
    if (!window.confirm(`Skicka påminnelse #${count} till ${inv.customer_email}?${fee}`)) return;
    try {
      const res = await api.post(`/invoices/${inv.id}/remind`);
      toast.success(res.data.message || "Påminnelse skickad!");
      await load();
    } catch(err) {
      toast.error(err.response?.data?.detail || "Kunde inte skicka påminnelse.");
    }
  };

  const viewPdf = (inv) => {
    const token = localStorage.getItem("pn_token") || "";
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    window.open(`${backendUrl}/api/invoices/${inv.id}/pdf?token=${token}`, "_blank");
  };

  const totalOutstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.customer_pays, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Fakturor</h2>
          <p className="text-sm text-slate-500 mt-0.5">Obetalt: {totalOutstanding.toFixed(2)} kr</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/invoices/export-xlsx?token=${token}`;
            a.download = "fakturor.xlsx";
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            window.open(`${base}/api/invoices/export-pdf?token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] rounded-full px-4 py-2 hover:bg-black transition-colors">
          <Plus size={15} /> Ny faktura
        </button>
        </div>
      </div>

      {settings && <InvoiceSettingsPanel settings={settings} onSave={saveSettings} />}

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <FileText size={28} className="text-slate-300" />
          Inga fakturor ännu.
        </div>
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv) => (
            <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border border-slate-100 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h3 className="font-semibold text-slate-900">#{inv.invoice_number} · {inv.customer_name}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS[inv.status]?.cls}`}>{STATUS[inv.status]?.label}</span>
                </div>
                <p className="text-sm text-slate-600">
                  Förfaller {inv.due_date} · <strong>{inv.customer_pays.toFixed(2)} kr</strong>
                  {inv.rut_deduction > 0 && <span className="text-green-700"> (varav RUT -{inv.rut_deduction.toFixed(2)} kr)</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {inv.is_credit_note ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-50 text-orange-700" title={inv.credit_reason ? `Anledning: ${inv.credit_reason}` : ""}>Kreditfaktura</span>
                ) : inv.credited ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">Krediterad</span>
                ) : inv.status === "paid" ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-700">Betald ✓</span>
                ) : (
                  <select value={inv.status} onChange={(e) => setStatus(inv.id, e.target.value)} className="rounded-full border border-slate-200 text-sm px-3.5 py-2 outline-none focus:border-[#141414]">
                    {inv.status === "draft" && <option value="draft">Utkast</option>}
                    {inv.status === "sent" && <option value="sent">Skickad</option>}
                    {inv.status === "overdue" && <option value="overdue">Förfallen</option>}
                    <option value="paid">Betald</option>
                  </select>
                )}
                {inv.status === "draft" ? (
                  <button onClick={() => openEdit(inv)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors" title="Redigera">
                    <Pencil size={16} />
                  </button>
                ) : (
                  <>
                    <button title="Faktura låst" className="h-9 w-9 rounded-full flex items-center justify-center text-slate-200 cursor-not-allowed" disabled>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </button>
                    {!inv.is_credit_note && !inv.credited && (
                      <button onClick={() => createKreditfaktura(inv)} className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg px-2 py-1 transition-colors" title="Skapa kreditfaktura">
                        Kreditfaktura
                      </button>
                    )}
                  </>
                )}
                {!inv.credited && (
                <button onClick={() => sendInvoice(inv)} title="Skicka till kund"
                  className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
                )}
                {(inv.status === "sent" || inv.status === "overdue") && !inv.credited && !inv.is_credit_note && (
                  <button onClick={() => sendReminder(inv)} title={`Skicka påminnelse ${(inv.reminder_count||0)+1}`}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    {inv.reminder_count > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{inv.reminder_count}</span>}
                  </button>
                )}
                <button onClick={() => viewPdf(inv)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors" title="Visa faktura">
                  <Eye size={16} />
                </button>

                {inv.status === "draft" && !inv.is_credit_note && !inv.credited && (
                  <button onClick={() => remove(inv.id)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Ta bort utkast">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <InvoiceModal initial={editingInvoice} bookings={bookings} settings={settings} priceList={priceList} onClose={closeModal} onSave={saveInvoice} />}
      </AnimatePresence>

      <p className="text-xs text-slate-400 mt-4">
        RUT-avdraget beräknas som 50% av arbetskostnaden för privatpersoner. Kontrollera alltid mot Skatteverkets aktuella regler och din redovisningskonsult.
      </p>
    </>
  );
}


```

---

## frontend/src/components/IncidentsPanel.jsx
```jsx
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Upload, AlertTriangle, X, FileSpreadsheet, FileText, TrendingDown, CheckCircle } from "lucide-react";

const STATUS = {
  reported: { label: "Rapporterad", cls: "bg-amber-50 text-amber-700" },
  insurance: { label: "Försäkring", cls: "bg-blue-50 text-blue-700" },
  paid: { label: "Betald", cls: "bg-green-50 text-green-700" },
  closed: { label: "Avslutad", cls: "bg-slate-100 text-slate-600" },
};
function kr(n) { return Math.round(n || 0).toLocaleString("sv-SE") + " kr"; }

function IncidentModal({ onClose, onSave, employees, bookings }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), location: "", employee_id: "", description: "", cost: "", photo: null });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.description) { toast.error("Fyll i datum och beskrivning."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("date", form.date);
      fd.append("location", form.location);
      fd.append("employee_id", form.employee_id);
      fd.append("description", form.description);
      fd.append("cost", parseFloat(form.cost) || 0);
      fd.append("status", "reported");
      if (form.photo) fd.append("photo", form.photo);
      await api.post("/incidents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Skada rapporterad.");
      onSave();
    } catch { toast.error("Något gick fel."); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">Rapportera skada</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Datum</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Plats / Kund (från bokning)</label>
            <select onChange={e=>{const b=bookings.find(x=>(x._id||x.id)===e.target.value);if(b)setForm(f=>({...f,location:b.name+(b.address?" - "+b.address:"")}));}} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]">
              <option value="">— Välj bokning —</option>
              {bookings.map(b=><option key={b._id||b.id} value={b._id||b.id}>{b.name}{b.address?" - "+b.address:""}</option>)}
            </select>
            <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Eller skriv manuellt" className="w-full mt-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Anställd</label>
            <select value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]">
              <option value="">— Välj —</option>
              {employees.map(e=><option key={e._id||e.id} value={e._id||e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Beskrivning</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Vad hände?" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414] resize-none"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Kostnad (kr)</label>
            <input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Foto</label>
            <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 cursor-pointer hover:border-slate-400">
              <Upload size={15}/> {form.photo ? form.photo.name : "Ladda upp bild"}
              <input type="file" accept="image/*" onChange={e=>setForm(f=>({...f,photo:e.target.files[0]}))} className="hidden"/>
            </label>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-full bg-[#141414] text-white py-2.5 font-semibold hover:bg-black disabled:opacity-50 transition-colors">
            {saving ? "Sparar..." : "Spara"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function IncidentsPanel() {
  const [incidents, setIncidents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    try {
      const [inc, emp, bk] = await Promise.all([
        api.get("/incidents"),
        api.get("/employees").catch(()=>({data:[]})),
        api.get("/bookings").catch(()=>({data:[]})),
      ]);
      setIncidents(inc.data || []);
      setEmployees(emp.data || []);
      setBookings(bk.data || []);
    } catch { toast.error("Kunde inte ladda skador."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openTotal = incidents.filter(i=>i.status!=="closed").reduce((s,i)=>s+(i.cost||0),0);
  const closedTotal = incidents.filter(i=>i.status==="closed").reduce((s,i)=>s+(i.cost||0),0);
  const insuranceTotal = incidents.filter(i=>i.status==="insurance").reduce((s,i)=>s+(i.cost||0),0);

  const setStatus = async (id, status) => {
    try { await api.patch(`/incidents/${id}`, { status }); load(); }
    catch { toast.error("Kunde inte uppdatera."); }
  };
  const del = async (id) => {
    if (!window.confirm("Ta bort denna skada?")) return;
    try { await api.delete(`/incidents/${id}`); toast.success("Borttagen."); load(); }
    catch { toast.error("Kunde inte ta bort."); }
  };
  const exportFile = (type) => {
    const token = localStorage.getItem("pn_token");
    const base = process.env.REACT_APP_BACKEND_URL || "";
    if (type === "pdf") { window.open(`${base}/api/incidents/export-pdf?token=${token}`, "_blank"); }
    else { const a = document.createElement("a"); a.href=`${base}/api/incidents/export-xlsx?token=${token}`; a.download="skador.xlsx"; a.click(); }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Skador & Olyckor</h2>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.length} rapporterade skador</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>exportFile("xlsx")} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={()=>exportFile("pdf")} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
          </button>
          <button onClick={()=>setShowModal(true)} className="inline-flex items-center gap-2 rounded-full bg-[#141414] text-white px-4 py-2 text-sm font-semibold hover:bg-black transition-colors">
            <Plus size={16}/> Rapportera skada
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-white border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-amber-500"/><span className="text-xs text-slate-500">Öppna skador</span></div>
          <p className="text-2xl font-bold text-slate-900">{kr(openTotal)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.filter(i=>i.status!=="closed").length} st</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-blue-500"/><span className="text-xs text-slate-500">Hos försäkring</span></div>
          <p className="text-2xl font-bold text-slate-900">{kr(insuranceTotal)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.filter(i=>i.status==="insurance").length} st</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1"><CheckCircle size={16} className="text-green-500"/><span className="text-xs text-slate-500">Avslutade</span></div>
          <p className="text-2xl font-bold text-slate-900">{kr(closedTotal)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.filter(i=>i.status==="closed").length} st</p>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <p className="font-semibold text-slate-900 text-sm">Skaderapporter</p>
          <p className="text-xs text-slate-400">{incidents.length} poster</p>
        </div>
        {loading ? <p className="p-6 text-slate-400 text-sm">Laddar...</p> : incidents.length === 0 ? (
          <p className="p-6 text-slate-400 text-sm text-center">Inga skador rapporterade ännu.</p>
        ) : incidents.map((i) => (
          <div key={i._id} className="flex items-start gap-3 p-4 border-b border-slate-50 last:border-b-0">
            {i.photo && <img src={i.photo} alt="skada" onClick={()=>setPreview(i.photo)} className="w-14 h-14 rounded-xl object-cover cursor-pointer shrink-0 border border-slate-100"/>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS[i.status]?.cls}`}>{STATUS[i.status]?.label}</span>
                <span className="text-xs text-slate-400">{i.date}</span>
                {i.employee_name && <span className="text-xs text-slate-500">· {i.employee_name}</span>}
              </div>
              {i.location && <p className="text-xs text-slate-500 mb-0.5">{i.location}</p>}
              <p className="text-sm text-slate-700 break-words">{i.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="font-bold text-slate-900 text-sm">{kr(i.cost)}</p>
              <select value={i.status} onChange={e=>setStatus(i._id,e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none">
                {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={()=>del(i._id)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && <IncidentModal onClose={()=>setShowModal(false)} onSave={()=>{setShowModal(false);load();}} employees={employees} bookings={bookings}/>}
      {preview && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={()=>setPreview(null)}><img src={preview} alt="skada" className="max-w-full max-h-full rounded-lg"/></div>}
    </>
  );
}

```

---

## frontend/src/components/EconomyPanel.jsx
```jsx
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Users, FileText, CreditCard, Receipt, Eye, DollarSign, Briefcase, Calculator, Landmark, BarChart, Package, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}
function lastOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth()+1, 0);
  return `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,"0")}-${String(last.getDate()).padStart(2,"0")}`;
}

function kr(v) { return `${(v||0).toLocaleString("sv-SE", {minimumFractionDigits:2, maximumFractionDigits:2})} kr`; }

function Card({ title, value, sub, color="slate", icon: Icon, note }) {
  const colors = {
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-red-50 border-red-100 text-red-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    slate: "bg-white border-slate-100 text-slate-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold opacity-80">{title}</p>
        {Icon && <Icon size={18} className="opacity-60" />}
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
      {note && <p className="text-xs mt-2 opacity-60 italic">{note}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h3 className="font-display font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, highlight, sub, indent }) {
  return (
    <div className={`flex justify-between items-center py-2.5 border-b border-slate-50 last:border-b-0 ${indent ? "pl-4" : ""}`}>
      <span className={`text-sm ${highlight ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${highlight ? "text-slate-900 text-base" : "text-slate-700"}`}>{value}</span>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function EconomyPanel() {
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(lastOfMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/economy/overview", { params: { start, end } });
      setData(res.data);
    } catch {
      toast.error("Kunde inte hämta ekonomiöversikt.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const viewReport = () => {
    const token = localStorage.getItem("pn_token") || "";
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    window.open(`${backendUrl}/api/economy/report-pdf?start=${start}&end=${end}&token=${token}`, "_blank");
  };

  if (!data && loading) return <p className="text-slate-500">Laddar...</p>;

  return (
    <>
      {/* Period selector */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h2 className="font-display font-bold text-xl text-slate-900">Ekonomiöversikt</h2>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <Label className="text-xs">Från</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Till</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
          </div>
          <button onClick={load} disabled={loading} className="rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 transition-colors">
            {loading ? "Laddar..." : "Hämta"}
          </button>
          {data && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => { const t=localStorage.getItem("pn_token"),b=process.env.REACT_APP_BACKEND_URL||"",y=start.substring(0,4); window.open(`${b}/api/reports/arsredovisning?year=${y}&token=${t}`,"_blank"); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#141414] bg-[#141414] hover:bg-black text-white text-xs font-semibold px-3 py-2 transition-all">
                <FileText size={13}/> Årsredovisning {start.substring(0,4)}
              </button>
              <button onClick={() => { const t=localStorage.getItem("pn_token"),b=process.env.REACT_APP_BACKEND_URL||"",m=start.substring(0,7); window.open(`${b}/api/reports/monthly?month=${m}&token=${t}`,"_blank"); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-all">
                <FileText size={13}/> Månadsrapport
              </button>
              <button onClick={() => { const t=localStorage.getItem("pn_token"),b=process.env.REACT_APP_BACKEND_URL||"",m=start.substring(0,7); window.open(`${b}/api/reports/moms?month=${m}&token=${t}`,"_blank"); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-all">
                <Receipt size={13}/> Momsdeklaration
              </button>
              <button onClick={() => { const t=localStorage.getItem("pn_token"),b=process.env.REACT_APP_BACKEND_URL||"",m=start.substring(0,7); window.open(`${b}/api/reports/bokforing?month=${m}&token=${t}`,"_blank"); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-all">
                <BarChart size={13}/> Bokföringsunderlag
              </button>
              <button onClick={() => { const t=localStorage.getItem("pn_token"),b=process.env.REACT_APP_BACKEND_URL||"",m=start.substring(0,7),a=document.createElement("a"); a.href=`${b}/api/reports/sie?month=${m}&token=${t}`;a.download=`sie_${m}.se`;a.click(); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-all">
                <Download size={13}/> SIE4 Bokföring
              </button>
              <button onClick={() => { const t=localStorage.getItem("pn_token"),b=process.env.REACT_APP_BACKEND_URL||"",m=start.substring(0,7),a=document.createElement("a"); a.href=`${b}/api/reports/agi?month=${m}&token=${t}`;a.download=`agi_${m}.xml`;a.click(); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-all">
                <Download size={13}/> AGI XML
              </button>
              <button onClick={() => { const t=localStorage.getItem("pn_token"),b=process.env.REACT_APP_BACKEND_URL||"",m=start.substring(0,7); window.open(`${b}/api/reports/rut?month=${m}&token=${t}`,"_blank"); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-all">
                <Landmark size={13}/> RUT-ansökan
              </button>
              <button onClick={() => viewReport()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-all">
                <Eye size={13}/> Visa PDF-rapport
              </button>
            </div>
          )}
        </div>
      </div>

      {data && (
        <>
          {/* ── KPI cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <Card title="Intäkter (exkl. moms)" value={kr(data.revenue.total_revenue || data.revenue.total_intakter || data.revenue.excl_vat)} icon={TrendingUp}
              color={data.revenue.excl_vat > 0 ? "green" : "slate"}
              sub={`${data.revenue.invoice_count} fakturor, ${data.revenue.paid_count} betalda`} />
            <Card title="Rörelseresultat" value={kr(data.result.operating_profit)} icon={data.result.operating_profit >= 0 ? TrendingUp : TrendingDown}
              color={data.result.operating_profit >= 0 ? "green" : "red"}
              sub={`Marginal: ${(data.result.profit_margin || 0).toFixed(1)}%`} />
            <Card title="Total personalkostnad" value={kr(data.payroll.total_payroll_cost)} icon={Users} color="amber"
              sub={`inkl. ${data.constants.arbetsgivaravgift_pct}% avg + ${data.constants.semesterersattning_pct}% sem`} />
            <Card title="Att betala Skatteverket" value={kr(data.obligations.total_to_pay - data.obligations.salaries_to_pay)} icon={AlertCircle} color="red"
              sub="Moms + arbetsgivaravgifter + prelskatt" />
          </div>

          {/* ── Intäkter ─────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><DollarSign size={17} className="text-green-600"/>Intäkter</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <Row label="Försäljning tjänster (exkl. moms)" value={kr(data.revenue.excl_vat)} />
              {data.revenue.reminder_fees > 0 && <Row label="Påminnelseavgifter" value={kr(data.revenue.reminder_fees)} />}
              <Row label="Utgående moms (25%)" value={kr(data.revenue.vat_collected)} />
              <Row label="Totalt fakturerat (inkl. moms)" value={kr(data.revenue.total_invoiced)} highlight />
              <Row label="varav RUT-avdrag (betalas av Skatteverket)" value={kr(data.revenue.rut_deductions)} />
              <Row label="Betalda fakturor" value={kr(data.revenue.paid)} sub={`${data.revenue.paid_count} st`} />
              <Row label="Obetalda fakturor" value={kr(data.revenue.unpaid)} sub={`${data.revenue.invoice_count - data.revenue.paid_count} st`} />
            </div>
          </Section>

          {/* ── Personalkostnader ─────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><Briefcase size={17} className="text-blue-600"/>Personalkostnader</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-3">
              <Row label="Bruttolöner" value={kr(data.payroll.gross_salary)} />
              <Row label={`Arbetsgivaravgifter (${data.constants.arbetsgivaravgift_pct}%)`} value={kr(data.payroll.arbetsgivaravgifter)} note />
              <Row label={`Semesterersättning (${data.constants.semesterersattning_pct}%)`} value={kr(data.payroll.semesterersattning)} />
              <Row label="Utlägg (att ersätta anställda)" value={kr(data.payroll.utlagg)} />
              <Row label="Total personalkostnad" value={kr(data.payroll.total_payroll_cost + data.payroll.utlagg)} highlight />
            </div>

            {/* Per employee */}
            {data.payroll.employees.length > 0 && (
              <div className="rounded-2xl bg-white border border-slate-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      <th className="p-4">Anställd</th>
                      <th className="p-4">Typ</th>
                      <th className="p-4">Timmar</th>
                      <th className="p-4">Bruttolön</th>
                      <th className="p-4">Arb.avg (31,42%)</th>
                      <th className="p-4">Semester (12%)</th>
                      <th className="p-4 font-bold">Total kostnad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payroll.employees.map((e, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-b-0">
                        <td className="p-4 font-semibold text-slate-900">{e.name}</td>
                        <td className="p-4 text-slate-500 text-xs">{e.employment_type === "vikarie" ? "Vikarie" : "Fast"}</td>
                        <td className="p-4 text-slate-600">{(e.normal_h || e.hours || 0).toFixed(1)} h</td>
                        <td className="p-4 text-slate-700">{kr(e.gross_salary || e.gross || 0)}</td>
                        <td className="p-4 text-amber-700">{kr(e.ag_avgift || e.arbetsgivaravgift)}</td>
                        <td className="p-4 text-blue-700">{kr(e.semester || e.semesterersattning)}</td>
                        <td className="p-4 font-bold text-slate-900">{kr(e.total_cost || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Moms ─────────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><Package size={17} className="text-blue-600"/>Materialkostnader</span>}>
            <Row label="Totalt inkl. moms" value={kr(data.material_costs?.total_incl_moms || 0)} />
            <Row label="Totalt exkl. moms" value={kr(data.material_costs?.total_excl_moms || 0)} />
            <Row label="Ingående moms (avdragsgill)" value={`-${kr(data.material_costs?.ingaende_moms || 0)}`} positive />
            <Row label="Antal kostnadsposter" value={`${data.material_costs?.count || 0} st`} />
          </Section>
          <Section title={<span className="flex items-center gap-2"><Calculator size={17} className="text-amber-600"/>Momsredovisning</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <Row label="Utgående moms (samlad från kunder)" value={kr(data.vat.collected)} />
              <Row label="Ingående moms (uppskattad, material)" value={`-${kr(data.vat.ingoing_estimate)}`} />
              <Row label="Moms att betala Skatteverket" value={kr(data.vat.to_pay)} highlight />
              <p className="text-xs text-slate-400 mt-3">Moms redovisas kvartalsvis (eller månadsvis om omsättning {'>'} 40 Mkr/år). Förfallodatum: den 26:e månaden efter kvartalet. Verifiera alltid ingående moms med dina faktiska kostnadskvitton.</p>
            </div>
          </Section>

          {/* ── Att betala ────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><Landmark size={17} className="text-red-600"/>Att betala (Skyldigheter)</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-3">
              <Row label="Löner att betala ut" value={kr(data.obligations.salaries_to_pay)} sub="Till anställda (netto efter prelskatt)" />
              <div className="my-2 border-t border-slate-100" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Till Skatteverket (AGI — senast 12:e varje månad):</p>
              <Row label={`Arbetsgivaravgifter (${data.constants.arbetsgivaravgift_pct}%)`} value={kr(data.obligations.arbetsgivaravgifter)} indent />
              <Row label={`Preliminärskatt (ca ${data.constants.prelskatt_pct}%)`} value={kr(data.obligations.prelskatt_estimate)} indent sub="Uppskattad — beror på anställdas skattetabell" />
              <div className="my-2 border-t border-slate-100" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Momsdeklaration (kvartalsvis):</p>
              <Row label="Moms att betala" value={kr(data.obligations.vat_to_pay)} indent />
            </div>
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-red-800 text-lg">Totalt att betala till Skatteverket</p>
                  <p className="text-xs text-red-600">Arbetsgivaravgifter + prelskatt + moms</p>
                </div>
                <p className="font-bold text-red-800 text-2xl">{kr(data.obligations.agi_to_pay + data.obligations.vat_to_pay)}</p>
              </div>
            </div>
          </Section>

          {/* ── Resultat ─────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><BarChart size={17} className="text-purple-600"/>Resultatsammanfattning</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <Row label="Intäkter (exkl. moms)" value={kr(data.result.revenue_excl_vat)} />
              <Row label="Personalkostnader" value={`-${kr(data.payroll.total_payroll_cost + data.payroll.utlagg)}`} />
              <Row label="Materialkostnader (exkl. moms)" value={`-${kr(data.material_costs?.total_excl_moms || 0)}`} />
              {(data.incidents?.total || 0) > 0 && <Row label={`Skador (${data.incidents?.count || 0} st)`} value={`-${kr(data.incidents?.total || 0)}`} />}
              <Row label="Rörelseresultat" value={kr(data.result.operating_profit)} highlight />
              <Row label="Vinstmarginal" value={`${(data.result.profit_margin || 0).toFixed(1)}%`} />
            </div>
            <div className={`rounded-2xl border p-5 mt-3 ${data.result.operating_profit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
              <div className="flex items-center gap-3">
                {data.result.operating_profit >= 0
                  ? <CheckCircle size={24} className="text-green-600" />
                  : <AlertCircle size={24} className="text-red-600" />}
                <div>
                  <p className={`font-bold text-lg ${data.result.operating_profit >= 0 ? "text-green-800" : "text-red-800"}`}>
                    {data.result.operating_profit >= 0 ? "Positivt resultat" : "Negativt resultat"}
                  </p>
                  <p className={`text-sm ${data.result.operating_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {data.result.operating_profit >= 0
                      ? `Du tjänar ${kr(data.result.operating_profit)} efter personalkostnader för perioden.`
                      : `Du förlorar ${kr(Math.abs(data.result.operating_profit))} för perioden.`}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Denna översikt är ett uppskattningsverktyg baserat på inlagda fakturor och löner. Bokföringsskatt (bolagsskatt 20,6% på vinst) ingår inte. Kontrollera alltid med din redovisningskonsult eller revisor.
              Arbetsgivaravgifter: {data.constants.arbetsgivaravgift_pct}% (Skatteverket 2026). Semesterersättning: {data.constants.semesterersattning_pct}% (lag om semester).
            </p>
          </Section>
        </>
      )}
    </>
  );
}

```

---

## frontend/src/shared/ui/index.jsx
```jsx
import React from "react";

// Toggle switch — used ~40 times across settings
export function Toggle({ value, onChange }) {
  const on = value !== false;
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full transition-colors shrink-0 ${on ? "bg-blue-500" : "bg-slate-200"}`}>
      <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${on ? "translate-x-5" : "translate-x-0"}`}/>
    </button>
  );
}

// Labeled toggle row
export function ToggleRow({ label, value, onChange, className = "" }) {
  return (
    <div className={`flex items-center justify-between mb-1 ${className}`}>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <Toggle value={value} onChange={onChange}/>
    </div>
  );
}

// Circular color picker
export function CircleColor({ value, onChange }) {
  const safeValue = value && value.startsWith("#") && value.length >= 4 ? value : "#141414";
  return (
    <div className="relative h-6 w-6 rounded-full border-2 border-slate-200 shrink-0 cursor-pointer" style={{backgroundColor: value}}>
      <input type="color" value={safeValue} onChange={onChange}
        style={{position:"absolute", opacity:0, top:0, left:0, width:"100%", height:"100%", cursor:"pointer", padding:0, border:"none"}}/>
    </div>
  );
}

// Color picker with label + reset arrow
export function TextColorPicker({ label, colorKey, defaultColor, data, set }) {
  const hasChanged = data[colorKey] && data[colorKey] !== (defaultColor || "");
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">{label}</span>
      <CircleColor value={data[colorKey] || defaultColor || "#141414"} onChange={e => set(colorKey, e.target.value)}/>
      {hasChanged && <button onClick={() => set(colorKey, defaultColor || "")} className="text-xs text-red-400 hover:text-red-600">↺</button>}
    </div>
  );
}

// Inline color with label
export function ColorDot({ label, value, defaultValue, onChange }) {
  return (
    <>
      <span className="text-xs text-slate-500">{label}</span>
      <CircleColor value={value || defaultValue} onChange={onChange}/>
    </>
  );
}

// ColorPicker with Text + BG colors and reset arrow
export function ColorPicker({ label, colorKey, bgKey, defaultColor, defaultBg, data, set }) {
  const colorChanged = data[colorKey] && data[colorKey] !== defaultColor;
  const bgChanged = data[bgKey] && data[bgKey] !== defaultBg;
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
          Text
          <CircleColor value={data[colorKey] || defaultColor || "#141414"} onChange={e => set(colorKey, e.target.value)}/>
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
          BG
          <CircleColor value={data[bgKey] || defaultBg || "#ffffff"} onChange={e => set(bgKey, e.target.value)}/>
        </label>
        {(colorChanged || bgChanged) && (
          <button onClick={() => { set(colorKey, defaultColor || ""); set(bgKey, defaultBg || ""); }}
            className="text-xs text-red-400 hover:text-red-600">↺</button>
        )}
      </div>
    </div>
  );
}

```

---

## frontend/src/features/booking/hooks/useBookingForm.js
```js
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useWebsite } from "@/context/WebsiteContext";

const initialForm = {
  name: "", email: "", phone: "", address: "", kvm: "", preferred_date: "", other_description: "",
};

const KVM_SERVICES = ["Hemstädning", "Flyttstädning", "Storstädning", "Byggstädning"];

export function useBookingForm() {
  const ws = useWebsite();
  const [form, setForm] = useState(initialForm);
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceOptions, setServiceOptions] = useState(["Hemstädning", "Flyttstädning", "Kontorsstädning", "Storstädning", "Annat"]);
  const [priceItems, setPriceItems] = useState([]);

  const needsKvm = services.some(s => KVM_SERVICES.includes(s));

  const quantityInfo = (() => {
    if (services.length === 0) return null;
    if (priceItems.length > 0) {
      const units = services.map(s => { const item = priceItems.find(p => p.service === s); return item ? item.unit : null; }).filter(Boolean);
      if (units.includes("st")) return { label: "Antal (st)", placeholder: "T.ex. 5" };
      if (units.includes("kvm") || units.includes("tim")) return { label: "Yta (kvm)", placeholder: "T.ex. 75" };
      return null;
    }
    if (needsKvm) return { label: "Yta (kvm)", placeholder: "T.ex. 75" };
    return null;
  })();

  useEffect(() => {
    api.get("/settings/pricelist").then((res) => {
      const items = res.data.items?.filter((p) => p.is_active && !p.service.includes("(fast)")) || [];
      const active = items.map((p) => p.service);
      setPriceItems(items);
      if (active.length > 0) setServiceOptions([...active, "Annat"].filter((s, i, arr) => arr.indexOf(s) === i));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (ws.booking_services?.length > 0) setServiceOptions(ws.booking_services);
  }, [ws.booking_services]);

  const annatSelected = services.includes("Annat") || services.some((s) => !serviceOptions.slice(0, -1).includes(s));

  const toggleService = (s, closeDropdown = true) => {
    setServices((prev) => prev.includes(s) ? [] : [s]);
    if (closeDropdown) setServiceDropdownOpen(false);
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { toast.error("Fyll i namn, e-post och telefonnummer."); return; }
    if (services.length === 0) { toast.error("Välj minst en tjänst."); return; }
    setSubmitting(true);
    try {
      await api.post("/bookings", { ...form, services });
      setDone(true);
      toast.success("Tack! Din bokningsförfrågan har skickats.");
      setForm(initialForm);
      setServices([]);
    } catch { toast.error("Något gick fel. Försök igen eller ring oss."); }
    finally { setSubmitting(false); }
  };

  return {
    form, services, submitting, done, setDone,
    serviceDropdownOpen, setServiceDropdownOpen,
    serviceOptions, quantityInfo, annatSelected,
    toggleService, update, submit,
  };
}

```

---

## frontend/src/pages/admin/BookingsPanel.jsx
```jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, FileSpreadsheet, FileText, Hash, Mail, MapPin, Maximize, Phone, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import BookingCalculator from "@/components/BookingCalculator";

const STATUS = {
  new: { label: "Ny", cls: "bg-blue-50 text-blue-700" },
  contacted: { label: "Kontaktad", cls: "bg-amber-50 text-amber-700" },
  done: { label: "Klar", cls: "bg-green-50 text-green-700" },
};

export function BookingsPanel({ selectedBooking: initialSelected, setSelectedBooking: setParentSelected }) {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBookingLocal] = React.useState(initialSelected || null);
  React.useEffect(() => { if(initialSelected) setSelectedBookingLocal(initialSelected); }, [initialSelected]);
  const setSelectedBooking = (id) => { setSelectedBookingLocal(id); if(setParentSelected) setParentSelected(id); };
  const [bookingsLastUpdated, setBookingsLastUpdated] = React.useState(null);
  const [loading, setLoading] = useState(true);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [expandedCalc, setExpandedCalc] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editBookingForm, setEditBookingForm] = useState({});
  const [editBookingSaving, setEditBookingSaving] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ name:"", email:"", phone:"", kvm:"", services:[], preferred_date:"", other_description:"", recurrence:"biweekly", occurrences:6 });
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", kvm: "", services: [], preferred_date: "", other_description: "" });
  const [saving, setSaving] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = (await api.get("/bookings")).data;
      setBookings(prev => {
        const prevStr = JSON.stringify(prev.map(b=>b.id+b.status));
        const newStr = JSON.stringify(data.map(b=>b.id+b.status));
        return prevStr === newStr ? prev : data;
      });
    } catch {
      if (!silent) toast.error("Kunde inte hämta bokningar.");
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { load(); const interval = setInterval(() => load(true), 1000); return () => clearInterval(interval); }, []);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      setBookings((b) => b.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch {
      toast.error("Kunde inte uppdatera status.");
    }
  };

  const [allServices, setAllServices] = useState(["Hemstädning","Flyttstädning","Kontorsstädning","Storstädning","Fönsterputs","Byggstädning","Annat"]);
  const SERVICE_OPTIONS = allServices;

  useEffect(() => {
    api.get("/settings/pricelist").then(r => {
      const active = r.data.items?.filter(p => p.is_active && !p.service.includes("(fast)")).map(p => p.service) || [];
      if (active.length > 0) setAllServices([...active, "Annat"].filter((s,i,a) => a.indexOf(s) === i));
    }).catch(() => {});
  }, []);

  const toggleRecurringService = (svc) => {
    setRecurringForm((f) => ({
      ...f,
      services: f.services.includes(svc) ? f.services.filter(s=>s!==svc) : [...f.services, svc]
    }));
  };

  const createRecurring = async (e) => {
    e.preventDefault();
    if (!recurringForm.name || !recurringForm.phone || !recurringForm.preferred_date) return;
    setRecurringSaving(true);
    try {
      const res = await api.post("/bookings/recurring", recurringForm);
      toast.success(`${res.data.created} återkommande bokningar skapade! ✅`);
      setRecurringOpen(false);
      setRecurringForm({ name:"", email:"", phone:"", kvm:"", services:[], preferred_date:"", other_description:"", recurrence:"biweekly", occurrences:6 });
      const updated = await api.get("/bookings");
      setBookings(updated.data);
    } catch {
      toast.error("Kunde inte skapa återkommande bokningar.");
    } finally {
      setRecurringSaving(false);
    }
  };

  const toggleService = (svc) => setForm((f) => ({
    ...f, services: f.services.includes(svc) ? f.services.filter((s) => s !== svc) : [...f.services, svc]
  }));

  const createBooking = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const payload = { ...form, email: form.email || "admin@purenorth.se" };
      const res = await api.post("/bookings", payload);
      setBookings((b) => [res.data, ...b]);
      toast.success("Bokning skapad!");
      setNewBookingOpen(false);
      setForm({ name: "", email: "", phone: "", kvm: "", services: [], preferred_date: "", other_description: "" });
    } catch {
      toast.error("Kunde inte skapa bokning.");
    } finally {
      setSaving(false);
    }
  };

  const createInvoiceFromBooking = async (booking, invoiceItems, totals) => {
    try {
      const payload = {
        customer_name: booking.name,
        customer_email: booking.email,
        customer_phone: booking.phone,
        customer_address: "",
        items: invoiceItems,
        subtotal: totals.subtotal,
        rut_deduction: totals.rut_deduction,
        vat_amount: totals.vat_amount,
        total_amount: totals.total_amount,
        customer_pays: totals.customer_pays,
        rut_eligible: totals.rut_eligible || false,
        due_days: 30,
        notes: `Bokning: ${booking.services?.join(", ")}`,
        status: "draft",
        booking_id: booking.id,
      };
      await api.post("/invoices", payload);
      toast.success("Faktura skapad! Gå till Fakturor för att se den.");
      setExpandedCalc(null);
    } catch {
      toast.error("Kunde inte skapa faktura.");
    }
  };
  const RUT_YES = ["Hemstädning","Storstädning","Flyttstädning","Fönsterputs","Ugnstvätt","Kyl/frys rengöring"];
  const openEditBooking = (b) => {
    setEditingBooking(b.id);
    const RUT_YES = ["Hemstädning","Storstädning","Flyttstädning","Fönsterputs","Ugnstvätt","Kyl/frys rengöring"];
    const svc0 = (b.services||[])[0]||"";
    setEditBookingForm({
      name: b.name || "",
      email: b.email || "",
      phone: b.phone || "",
      address: b.address || "",
      kvm: b.kvm || "",
      preferred_date: b.preferred_date || "",
      other_description: b.other_description || "",
      services: b.services || [],
      customer_type: b.customer_type || "private",
      rut_eligible: RUT_YES.includes(svc0),
      personnummer: b.personnummer || "",
    });
  };

  const saveEditBooking = async (e) => {
    e.preventDefault();
    setEditBookingSaving(true);
    try {
      await api.patch(`/bookings/${editingBooking}`, editBookingForm);
      setBookings(prev => prev.map(b => b.id === editingBooking ? {...b, ...editBookingForm} : b));
      


      toast.success("Bokning uppdaterad!");
      setEditingBooking(null);
    } catch {
      toast.error("Kunde inte uppdatera bokningen.");
    } finally {
      setEditBookingSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort denna bokning?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      setBookings((b) => b.filter((x) => x.id !== id));
      toast.success("Bokning borttagen.");
    } catch {
      toast.error("Kunde inte ta bort bokningen.");
    }
  };


  return (
    <>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-xl text-slate-900">Bokningar</h2>
          <button onClick={async ()=>{ await load(); setBookingsLastUpdated(new Date()); }} className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#141414] hover:text-[#141414] transition-colors">
            <RefreshCw size={14}/>
          </button>
          {bookingsLastUpdated && <span className="text-xs text-slate-400">Uppdaterad {bookingsLastUpdated.toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"})}</span>}
        </div>
        <div className="flex gap-2">

          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            window.open(`${base}/api/bookings/export-pdf?token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-2 sm:px-3 py-2 transition-all">
            <FileText size={14}/> <span className="hidden sm:inline">PDF</span><span className="sm:hidden">PDF</span>
          </button>
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/bookings/export-xlsx?token=${token}`;
            a.download = "bokningar.xlsx";
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={() => setRecurringOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:border-[#141414] rounded-full px-4 py-2 transition-colors">
            <RefreshCw size={14}/> Återkommande
          </button>
          <button onClick={() => setNewBookingOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black rounded-full px-3 sm:px-4 py-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span className="hidden sm:inline">Ny bokning</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Totalt", value: bookings.length },
          { label: "Nya", value: bookings.filter((b) => b.status === "new").length },
          { label: "Kontaktade", value: bookings.filter((b) => b.status === "contacted").length },
          { label: "Klara", value: bookings.filter((b) => b.status === "done").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-3xl font-display font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : bookings.length === 0 ? (
        <div data-testid="admin-empty" className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500">
          Inga bokningar ännu.
        </div>
      ) : (
        <div className="grid gap-4" data-testid="admin-bookings-list">
          {bookings.map((b) => (<React.Fragment key={b.id}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              id={`booking-${b.id}`}
              data-testid={`booking-row-${b.id}`}
              onClick={()=>setSelectedBooking(selectedBooking===b.id?null:b.id)}
              className={`rounded-2xl border p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 justify-between cursor-pointer transition-all ${selectedBooking===b.id?"bg-blue-50 border-blue-300 shadow-lg shadow-blue-100":"bg-white border-slate-100 hover:shadow-sm"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display font-semibold text-lg text-slate-900">{b.name}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS[b.status]?.cls}`}>
                    {STATUS[b.status]?.label || b.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                  <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#141414]"><Phone size={14} /> {b.phone}</a>
                  <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1.5 hover:text-[#141414]"><Mail size={14} /> {b.email}</a>
                  {b.kvm && <span className="inline-flex items-center gap-1.5">{b.services?.some(s=>["Fönsterputs","Ugnstvätt","Kyl/frys rengöring","Trappstädning"].includes(s)) ? <Hash size={14}/> : <Maximize size={14}/>} {b.kvm} {b.services?.some(s=>["Fönsterputs","Ugnstvätt","Kyl/frys rengöring","Trappstädning"].includes(s)) ? "st" : "kvm"}</span>}
                  {b.preferred_date && <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {b.preferred_date}</span>}
                  {b.address && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {b.address}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.services.map((s) => (
                    <span key={s} className="text-xs bg-[#141414]/8 text-[#141414] px-2.5 py-1 rounded-full font-medium">{s}</span>
                  ))}
                </div>
                {b.other_description && (
                  <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3"><strong>Anteckning:</strong> {b.other_description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <select
                  value={b.status}
                  onChange={(e) => setStatus(b.id, e.target.value)}
                  data-testid={`booking-status-${b.id}`}
                  className="rounded-full border border-slate-200 text-sm px-4 py-2 outline-none focus:border-[#141414]"
                >
                  <option value="new">Ny</option>
                  <option value="contacted">Kontaktad</option>
                  <option value="done">Klar</option>
                </select>
                <button onClick={() => setExpandedCalc(expandedCalc === b.id ? null : b.id)}
                  className="h-9 px-3 rounded-full flex items-center gap-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors text-xs font-semibold border border-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  Kalkyl
                </button>
                <button onClick={() => openEditBooking(b)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => remove(b.id)} data-testid={`booking-delete-${b.id}`} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

            </motion.div>
            {expandedCalc === b.id && (
              <div className="rounded-2xl bg-white border border-slate-100 p-5 -mt-2 overflow-x-auto">
                <BookingCalculator
                  booking={b}
                  onCreateInvoice={(items, totals) => createInvoiceFromBooking(b, items, totals)}
                />
              </div>
            )}
          </React.Fragment>
        ))}
        </div>
      )}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setEditingBooking(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-slate-900">Redigera bokning</h2>
              <button onClick={() => setEditingBooking(null)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <form onSubmit={saveEditBooking} className="space-y-3">
              <div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Namn *</label>
                  <input value={editBookingForm.name} onChange={e=>setEditBookingForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">E-post</label>
                  <input type="email" value={editBookingForm.email} onChange={e=>setEditBookingForm(f=>({...f,email:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telefon</label>
                  <input value={editBookingForm.phone} onChange={e=>setEditBookingForm(f=>({...f,phone:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Adress (städobjekt)</label>
                  <input value={editBookingForm.address || ""} onChange={(e) => setEditBookingForm((f) => ({...f, address: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Storgatan 1, Umeå" />
                </div>
              </div>

                <label className="text-xs font-medium text-slate-700">Datum</label>
                <input type="date" value={editBookingForm.preferred_date} onChange={e=>setEditBookingForm(f=>({...f,preferred_date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Anteckning</label>
                <textarea value={editBookingForm.other_description} onChange={e=>setEditBookingForm(f=>({...f,other_description:e.target.value}))} rows={2} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
              </div>

              {/* Yta/tim calculator */}
              {(() => {
                const SPEED = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35,"trappstädning":25,"fönsterputs":10};
                const svc = (editBookingForm.services||[])[0]?.toLowerCase()||"";
                const speedKey = Object.keys(SPEED).find(k=>svc.includes(k));
                const speed = speedKey ? SPEED[speedKey] : 30;
                const kvm = parseFloat(editBookingForm.kvm)||0;
                const tim = kvm ? Math.ceil((kvm/speed)*2)/2 : 0;
                const apris = 478;
                return (
                  <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Tjänster</label>
                      <div className="flex items-center gap-2 mt-1">
                        <select value={(editBookingForm.services||[])[0]||""} onChange={e=>{
                          const svc = e.target.value;
                          const RUT_YES = ["Hemstädning","Storstädning","Flyttstädning","Fönsterputs","Ugnstvätt","Kyl/frys rengöring"];
                          const isRut = RUT_YES.includes(svc);
                          setEditBookingForm(f=>({...f,services:[svc],rut_eligible:isRut&&(f.customer_type||"private")==="private"}));
                        }} className="flex-1 rounded-xl border border-slate-200 text-sm px-3 py-2.5 outline-none focus:border-[#141414]">
                          {SERVICE_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{apris} kr/tim</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500">Yta (kvm)</label>
                        <input type="number" value={editBookingForm.kvm||""} onChange={e=>setEditBookingForm(f=>({...f,kvm:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3 py-2.5 outline-none focus:border-[#141414]" placeholder="0"/>
                      </div>
                      <span className="text-slate-300 mt-5">→</span>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500">tim</label>
                        <input readOnly value={tim||""} className="w-full mt-1 rounded-xl border border-slate-100 bg-slate-50 text-sm px-3 py-2.5 outline-none text-slate-500"/>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500">À-Pris (kr)</label>
                        <input readOnly value={apris} className="w-full mt-1 rounded-xl border border-slate-100 bg-slate-50 text-sm px-3 py-2.5 outline-none text-slate-500"/>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* Typ + RUT section */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Typ av kund</label>
                  <div className="flex gap-2 mt-1.5">
                    {(() => {
                    const RUT_SERVICES = ["hemstädning","storstädning","flyttstädning","fönsterputs","trappstädning","byggstädning"];
                    const isRutService = (editBookingForm.services||[]).some(s => RUT_SERVICES.some(r => s.toLowerCase().includes(r)));
                    return (<>
                      <button type="button" onClick={()=>setEditBookingForm(f=>({...f,customer_type:"private",rut_eligible:isRutService}))} className={`flex-1 py-2 rounded-full text-xs font-semibold border transition-colors ${(editBookingForm.customer_type||"private")==="private"?"bg-[#141414] text-white border-[#141414]":"bg-white text-slate-600 border-slate-200"}`}>Privat</button>
                      <button type="button" onClick={()=>setEditBookingForm(f=>({...f,customer_type:"company",rut_eligible:false}))} className={`flex-1 py-2 rounded-full text-xs font-semibold border transition-colors ${editBookingForm.customer_type==="company"?"bg-[#141414] text-white border-[#141414]":"bg-white text-slate-600 border-slate-200"}`}>Företag</button>
                    </>);
                  })()}
                  </div>
                </div>
                {(editBookingForm.customer_type||"private")==="private" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editBookingForm.rut_eligible||false} onChange={e=>setEditBookingForm(f=>({...f,rut_eligible:e.target.checked}))} className="rounded"/>
                  <span className="text-sm font-medium text-slate-700">RUT-avdrag (50% av arbetskostnad)</span>
                </label>)}
                {editBookingForm.rut_eligible && (
                  <div>
                    <label className="text-xs font-medium text-slate-700">Personnummer</label>
                    <input value={editBookingForm.personnummer||""} onChange={e=>setEditBookingForm(f=>({...f,personnummer:e.target.value}))} placeholder="ÅÅMMDD-XXXX" className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                  </div>
                )}
              </div>
              {/* Price summary */}
              {(() => {
                const SPEED = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35,"trappstädning":25};
                const services = editBookingForm.services || [];
                const kvm = parseFloat(editBookingForm.kvm) || 0;
                if (!services.length || !kvm) return null;
                const svc = services[0]?.toLowerCase() || "";
                const speedKey = Object.keys(SPEED).find(k => svc.includes(k));
                const speed = speedKey ? SPEED[speedKey] : 30;
                const tim = Math.ceil((kvm / speed) * 2) / 2;
                const price = tim * 478;
                const moms = price * 0.25;
                const rut = editBookingForm.rut_eligible ? (price + moms) * 0.5 : 0;
                const attBetala = price + moms - rut;
                return (
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
                    <div className="flex justify-between text-slate-500"><span>Delsumma (exkl. moms)</span><span>{price.toFixed(2)} kr</span></div>
                    <div className="flex justify-between text-slate-500"><span>Moms (25%)</span><span>{moms.toFixed(2)} kr</span></div>
                    <div className="flex justify-between font-semibold text-slate-800"><span>Totalt inkl. moms</span><span>{(price+moms).toFixed(2)} kr</span></div>
                    {rut > 0 && <div className="flex justify-between text-green-600"><span>RUT-avdrag (50%)</span><span>-{rut.toFixed(2)} kr</span></div>}
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200"><span>ATT BETALA</span><span className="text-green-700">{attBetala.toFixed(2)} kr</span></div>
                  </div>
                );
              })()}
              <button type="submit" disabled={editBookingSaving} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                {editBookingSaving ? "Sparar..." : "Spara ändringar"}
              </button>
            </form>
          </div>
        </div>
      )}
      {recurringOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setRecurringOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-slate-900">🔁 Återkommande bokning</h2>
              <button onClick={() => setRecurringOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <form onSubmit={createRecurring} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Namn *</label>
                <input value={recurringForm.name} onChange={(e) => setRecurringForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Kundens namn" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telefon *</label>
                  <input value={recurringForm.phone} onChange={(e) => setRecurringForm(f=>({...f,phone:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="070-000 00 00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">E-post</label>
                  <input type="email" value={recurringForm.email} onChange={(e) => setRecurringForm(f=>({...f,email:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Första datum *</label>
                <input type="date" value={recurringForm.preferred_date} onChange={(e) => setRecurringForm(f=>({...f,preferred_date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Upprepning</label>
                  <select value={recurringForm.recurrence} onChange={(e) => setRecurringForm(f=>({...f,recurrence:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                    <option value="weekly">Varje vecka</option>
                    <option value="biweekly">Varannan vecka</option>
                    <option value="monthly">Varje månad</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Antal tillfällen</label>
                  <select value={recurringForm.occurrences} onChange={(e) => setRecurringForm(f=>({...f,occurrences:parseInt(e.target.value)}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                    {[4,6,8,10,12,16,20,26,52].map(n=><option key={n} value={n}>{n} tillfällen</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Tjänster</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {SERVICE_OPTIONS.map(svc=>(
                    <button key={svc} type="button" onClick={()=>toggleRecurringService(svc)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${recurringForm.services.includes(svc)?"bg-[#141414] text-white border-[#141414]":"bg-white text-slate-600 border-slate-200"}`}>
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
                💡 Skapar <strong>{recurringForm.occurrences} bokningar</strong> {recurringForm.recurrence==="weekly"?"varje vecka":recurringForm.recurrence==="biweekly"?"varannan vecka":"varje månad"} från det valda datumet.
              </div>
              <button type="submit" disabled={recurringSaving||!recurringForm.name||!recurringForm.phone||!recurringForm.preferred_date} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                {recurringSaving ? "Skapar..." : `Skapa ${recurringForm.occurrences} bokningar`}
              </button>
            </form>
          </div>
        </div>
      )}
      {newBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setNewBookingOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-slate-900">Ny bokning</h2>
              <button onClick={() => setNewBookingOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <form onSubmit={createBooking} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Namn *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({...f, name: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="För- och efternamn" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telefon *</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({...f, phone: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="070-000 00 00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">E-post</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({...f, email: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="@" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Datum</label>
                  <input type="date" value={form.preferred_date} onChange={(e) => setForm((f) => ({...f, preferred_date: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Kvm</label>
                  <input value={form.kvm} onChange={(e) => setForm((f) => ({...f, kvm: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="T.ex. 75" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Tjänster</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {SERVICE_OPTIONS.map((svc) => (
                    <button key={svc} type="button" onClick={() => toggleService(svc)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.services.includes(svc) ? "bg-[#141414] text-white border-[#141414]" : "bg-white text-slate-600 border-slate-200"}`}>
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Anteckning</label>
                <textarea value={form.other_description} onChange={(e) => setForm((f) => ({...f, other_description: e.target.value}))} rows={2} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" placeholder="Ev. önskemål..." />
              </div>
              <button type="submit" disabled={saving || !form.name || !form.phone} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                {saving ? "Sparar..." : "Skapa bokning"}
              </button>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
// Sun Jul  5 17:54:04 UTC 2026

```

---

## frontend/src/pages/admin/Dashboard.jsx
```jsx
import React, { useState, useEffect } from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { BookingsPanel } from "@/pages/admin/BookingsPanel";
import { ReviewsPanel } from "@/pages/admin/ReviewsPanel";
import AbsencePanel from "@/components/AbsencePanel";
import SchedulePanel from "@/components/SchedulePanel";
import ExpensePanel from "@/components/ExpensePanel";
import PayrollPanel from "@/components/PayrollPanel";
import InvoicePanel from "@/components/InvoicePanel";
import PriceListPanel from "@/components/PriceListPanel";
import EconomyPanel from "@/components/EconomyPanel";
import CustomerPanel from "@/components/CustomerPanel";
import CalendarPanel from "@/components/CalendarPanel";
import StatsPanel from "@/components/StatsPanel";
import UsersPanel from "@/components/UsersPanel";
import CostsPanel from "@/components/CostsPanel";
import IncidentsPanel from "@/components/IncidentsPanel";
import { Logo } from "@/components/Logo";
import { Banknote, BarChart2, Bell, Calendar, CalendarDays, CalendarRange, FileText, LayoutDashboard, LogOut, Receipt, Search, Settings, Star, Tag, Trash2, TrendingDown, TrendingUp, UserMinus, Users, X, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SettingsPanel from "@/components/SettingsPanel";
import DashboardPanel from "@/components/DashboardPanel";

export function Dashboard() {
  const ws = useWebsite();
  React.useEffect(() => { document.title = ws.admin_window_title || "PureNorth | Adminpanel"; }, [ws.admin_window_title]);
  const { logout, user } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem("pn_language") || "sv");
  const [notifs, setNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pn_notifs") || "[]"); } catch { return []; }
  });
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = React.useRef(null);
  React.useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 100);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [notifOpen]);
  const [readIds, setReadIds] = React.useState([]);





  const [knownIds, setKnownIds] = React.useState(null);
  React.useEffect(() => {
    localStorage.setItem("pn_notifs", JSON.stringify(notifs));
  }, [notifs]);

  const loadNotifs = React.useCallback(async () => {
    try {
      const res = await api.get("/bookings");
      const allBookings = res.data || [];
      const allIds = allBookings.map(b => b.id);
      setKnownIds(prev => {
        if (prev === null) {
          return allIds;
        }
        const newOnes = allBookings.filter(b => !prev.includes(b.id));
        if (newOnes.length > 0) {
          setNotifs(cur => {
            const existingIds = cur.map(n => n.id);
            const added = newOnes.filter(b => !existingIds.includes(b.id)).map(b => ({
              id: b.id,
              title: `Ny bokning: ${b.name}`,
              sub: `${b.services?.[0] || b.service || ""} · ${b.date || ""}`,
            }));
            if(added.length>0) setUnreadCount(c=>c+added.length);
            return [...cur, ...added];
          });
          return [...prev, ...newOnes.map(b => b.id)];
        }
        return prev;
      });
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 1000);
    return () => clearInterval(interval);
  }, [loadNotifs]);

  const deleteNotif = (id) => { setNotifs(prev => prev.filter(n => n.id !== id)); };

  const TRANS = {
    sv: { "tabs.dashboard": "Översikt", "tabs.bookings": "Bokningar", "tabs.invoices": "Fakturor", "tabs.customers": "Kunder", "tabs.schema": "Schema", "tabs.payroll": "Lön", "tabs.absences": "Frånvaro", "tabs.expenses": "Utlägg", "tabs.costs": "Kostnader", "tabs.incidents": "Skador", "tabs.economy": "Ekonomi", "tabs.pricelist": "Prislista", "tabs.calendar": "Kalender", "tabs.stats": "Statistik", "tabs.reviews": "Omdömen", "tabs.users": "Användare", "tabs.settings": "Inställningar" },
    en: { "tabs.dashboard": "Overview", "tabs.bookings": "Bookings", "tabs.invoices": "Invoices", "tabs.customers": "Customers", "tabs.schema": "Schedule", "tabs.payroll": "Payroll", "tabs.absences": "Absences", "tabs.expenses": "Expenses", "tabs.costs": "Costs", "tabs.incidents": "Incidents", "tabs.economy": "Economy", "tabs.pricelist": "Price List", "tabs.calendar": "Calendar", "tabs.stats": "Statistics", "tabs.reviews": "Reviews", "tabs.users": "Users", "tabs.settings": "Settings" },
  };
  const t = (key) => (TRANS[lang] || TRANS.sv)[key] || key;

  const toggleLang = () => {
    const newLang = lang === "sv" ? "en" : "sv";
    setLang(newLang);
    localStorage.setItem("pn_language", newLang);
  };
  const { tab: urlTab } = useParams();
  const navigate = useNavigate();
  const [tab, setTabState] = useState(urlTab || "dashboard");
  const [selectedBooking, setSelectedBooking] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({
    company_name: "", company_orgnr: "", company_address: "",
    company_phone: "", company_email: "", company_website: "",
    ob1_extra: 50, ob2_extra: 100, payment_terms_days: 30,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadSettings = async () => {
    try {
      const [inv, pay] = await Promise.all([
        api.get("/settings/invoice"),
        api.get("/settings/payroll"),
      ]);
      setSettingsData({
        company_name: inv.data.company_name || "",
        company_orgnr: inv.data.company_orgnr || "",
        company_address: inv.data.company_address || "",
        company_phone: inv.data.company_phone || "",
        company_email: inv.data.company_email || "",
        company_website: inv.data.company_website || "",
        ob1_extra: pay.data.ob1_extra || 50,
        ob2_extra: pay.data.ob2_extra || 100,
        payment_terms_days: inv.data.payment_terms_days || 30,
      });
    } catch {}
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await Promise.all([
        api.patch("/settings/invoice", {
          company_name: settingsData.company_name,
          company_orgnr: settingsData.company_orgnr,
          company_address: settingsData.company_address,
          company_phone: settingsData.company_phone,
          company_email: settingsData.company_email,
          company_website: settingsData.company_website,
          payment_terms_days: Number(settingsData.payment_terms_days),
        }),
        api.patch("/settings/payroll", {
          ob1_extra: Number(settingsData.ob1_extra),
          ob2_extra: Number(settingsData.ob2_extra),
        }),
      ]);
      toast.success("Inställningar sparade!");
      setSettingsOpen(false);
    } catch { toast.error("Kunde inte spara."); }
    finally { setSettingsSaving(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (settingsOpen) loadSettings(); }, [settingsOpen]);






  const setTab = (newTab) => {
    setTabState(newTab);
    navigate(`/admin/${newTab}`, { replace: true });
  };

  React.useEffect(() => {
    if (urlTab && urlTab !== tab) setTabState(urlTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const doSearch = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    setSearching(true);
    setSearchOpen(true);
    try {
      const res = await api.get("/search", { params: { q } });
      setSearchResults(res.data.results || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const TYPE_NAV = { booking: "bookings", customer: "customers", invoice: "invoices", employee: "schema" };
  const TYPE_ICON = {
    booking: <CalendarDays size={15} className="text-blue-600"/>,
    customer: <Users size={15} className="text-green-600"/>,
    invoice: <FileText size={15} className="text-amber-600"/>,
    employee: <Users size={15} className="text-purple-600"/>,
  };
  const TYPE_LABEL = { booking: "Bokning", customer: "Kund", invoice: "Faktura", employee: "Anställd" };

  useEffect(() => {
    if (!user) return;
    const staffOnly = ["schema", "absences"];
    const salesAllowed = ["dashboard","bookings","reviews","schema","absences","expenses","payroll","invoices","pricelist","customers","calendar"];
    if (user.role === "staff" && !staffOnly.includes(tab)) {
      setTab("schema");
    }
    if (user.role === "sales" && !salesAllowed.includes(tab)) {
      setTab("dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="border-b border-slate-100" style={{backgroundColor: ws.admin_header_bg||"#ffffff"}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <div>
              <span className="font-display font-bold text-base sm:text-lg block leading-tight" style={{color: ws.admin_header_text_color||"#0f172a"}}>{ws.admin_company_name || "PureNorth"}</span>
              <span className="text-xs hidden sm:block" style={{color: ws.admin_header_text_color ? ws.admin_header_text_color+"80" : "#64748b"}}>{ws.admin_panel_label||"Adminpanel"}</span>
            </div>
          </div>
          {/* Global Search */}
          <div className="relative flex-1 max-w-xs hidden sm:block">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                value={searchQ}
                onChange={e => doSearch(e.target.value)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                onFocus={() => searchQ.length >= 2 && setSearchOpen(true)}
                placeholder="Sök bokningar, kunder, fakturor..."
                className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 text-sm outline-none focus:border-[#141414] bg-slate-50"
              />
            </div>
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {searching ? (
                  <p className="p-4 text-sm text-slate-400">Söker...</p>
                ) : searchResults.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">Inga resultat för "{searchQ}"</p>
                ) : searchResults.map((r, i) => (
                  <button key={i} onMouseDown={() => { setTab(TYPE_NAV[r.type] || "dashboard"); setSearchOpen(false); setSearchQ(""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 text-left transition-colors">
                    <span className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">{TYPE_ICON[r.type]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                      <p className="text-xs text-slate-500 truncate">{r.sub}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 shrink-0">{TYPE_LABEL[r.type]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleLang} className="h-9 px-2.5 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-sm font-semibold" title="Byt språk">
              {lang === "sv" ? "🇸🇪" : "🇬🇧"}
            </button>
            <button onClick={()=>setTab("settings")} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
              <Settings size={16}/>
            </button>
            <div className="relative" ref={notifRef}>
              <button onClick={()=>setNotifOpen(o=>{if(o)setUnreadCount(0);return !o;})} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative">
                <Bell size={16}/>
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-sm text-slate-900">Nya bokningar</p>
                    <button onClick={()=>setNotifOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                  </div>
                  {notifs.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">Inga nya bokningar</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.map(n => (
                        <div key={n.id} className="flex items-center px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors">
                          <button onClick={()=>{ setTab("bookings"); setNotifOpen(false); setSelectedBooking(n.id); setTimeout(()=>{const el=document.getElementById(`booking-${n.id}`);if(el)el.scrollIntoView({behavior:"smooth",block:"center"});},400); }} className="flex items-center gap-3 flex-1 text-left min-w-0">
                            <div className="relative shrink-0">
                              <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center"><CalendarDays size={14} className="text-blue-600"/></span>
                              {!readIds.includes(n.id) && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500"/>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                              <p className="text-xs text-slate-500 truncate">{n.sub}</p>
                            </div>
                          </button>
                          <button onClick={e=>{e.stopPropagation();deleteNotif(n.id);}} className="h-7 w-7 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 shrink-0 transition-colors ml-1">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={logout} data-testid="admin-logout" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-[#141414] hover:text-[#141414] transition-colors">
              <LogOut size={15} /> Logga ut
            </button>
          </div>
        </div>
        <div className="border-b border-slate-200"><div className="max-w-7xl mx-auto px-2 sm:px-8 flex gap-0.5 overflow-x-auto scrollbar-hide" style={{WebkitOverflowScrolling:"touch"}}>

                    <button
            onClick={() => setTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "dashboard" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <LayoutDashboard size={14}/> {t("tabs.dashboard")}
          </button>
          <button
            onClick={() => { 
              setTab("bookings"); 
              setNotifOpen(false);
              localStorage.setItem("pn_bookings_last_visit", new Date().toISOString());
            }}
            data-testid="admin-tab-bookings"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "bookings" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <CalendarDays size={14}/> {t("tabs.bookings")}
            {unreadCount > 0 && <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">{unreadCount}</span>}
          </button>
          <button
            onClick={() => setTab("invoices")}
            data-testid="admin-tab-invoices"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "invoices" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <FileText size={14}/> {t("tabs.invoices")}
          </button>
          <button
            onClick={() => setTab("customers")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "customers" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Users size={14}/> {t("tabs.customers")}
          </button>
          <button
            onClick={() => setTab("schema")}
            data-testid="admin-tab-schema"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "schema" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <CalendarRange size={14}/> {t("tabs.schema")}
          </button>
          <button
            onClick={() => setTab("payroll")}
            data-testid="admin-tab-payroll"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "payroll" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Banknote size={14}/> {t("tabs.payroll")}
          </button>
          <button
            onClick={() => setTab("absences")}
            data-testid="admin-tab-absences"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "absences" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <UserMinus size={14}/> {t("tabs.absences")}
          </button>
          <button
            onClick={() => setTab("expenses")}
            data-testid="admin-tab-expenses"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "expenses" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Receipt size={14}/> {t("tabs.expenses")}
          </button>
          <button
            onClick={() => setTab("costs")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "costs" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <TrendingDown size={14}/> {t("tabs.costs")}
          </button>
          <button
            onClick={() => setTab("incidents")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "incidents" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <AlertTriangle size={14}/> {t("tabs.incidents")}
          </button>
          <button
            onClick={() => setTab("economy")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "economy" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <TrendingUp size={14}/> {t("tabs.economy")}
          </button>
          <button
            onClick={() => setTab("pricelist")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "pricelist" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Tag size={14}/> {t("tabs.pricelist")}
          </button>
          <button
            onClick={() => setTab("calendar")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "calendar" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Calendar size={14}/> {t("tabs.calendar")}
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "stats" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <BarChart2 size={14}/> {t("tabs.stats")}
          </button>
          <button
            onClick={() => setTab("reviews")}
            data-testid="admin-tab-reviews"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "reviews" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Star size={14}/> {t("tabs.reviews")}
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "users" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Users size={14}/> {t("tabs.users")}
          </button>
</div></div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-8 py-5 sm:py-10 w-full overflow-x-hidden">
        {user?.role === "staff" ? (
          tab === "absences" ? <AbsencePanel /> : <SchedulePanel />
        ) : user?.role === "sales" ? (
          tab === "bookings" ? <BookingsPanel selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking}/> : tab === "reviews" ? <ReviewsPanel /> :
          tab === "schema" ? <SchedulePanel /> : tab === "absences" ? <AbsencePanel /> :
          tab === "expenses" ? <ExpensePanel /> : tab === "payroll" ? <PayrollPanel /> :
          tab === "invoices" ? <InvoicePanel /> : tab === "pricelist" ? <PriceListPanel /> :
          tab === "customers" ? <CustomerPanel /> : tab === "calendar" ? <CalendarPanel /> :
          <DashboardPanel onNavigate={setTab} />
        ) : (
          tab === "dashboard" ? <DashboardPanel onNavigate={setTab} /> : tab === "bookings" ? <BookingsPanel selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking}/> : tab === "reviews" ? <ReviewsPanel /> : tab === "schema" ? <SchedulePanel /> : tab === "absences" ? <AbsencePanel /> : tab === "expenses" ? <ExpensePanel /> : tab === "payroll" ? <PayrollPanel /> : tab === "invoices" ? <InvoicePanel /> : tab === "pricelist" ? <PriceListPanel /> : tab === "economy" ? <EconomyPanel /> : tab === "customers" ? <CustomerPanel /> : tab === "calendar" ? <CalendarPanel /> : tab === "stats" ? <StatsPanel /> : tab === "users" ? <UsersPanel /> : tab === "costs" ? <CostsPanel /> : tab === "incidents" ? <IncidentsPanel /> : tab === "settings" ? <SettingsPanel /> : <DashboardPanel onNavigate={setTab} />
        )}
      {/* ── Settings Modal ─────────────────────────────────────────────── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-slate-700"/>
                <h2 className="font-display font-bold text-xl text-slate-900">Inställningar</h2>
              </div>
              <button onClick={()=>setSettingsOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X size={16}/>
              </button>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Företagsuppgifter</h3>
              <div className="space-y-3">
                {[
                  {label:"Företagsnamn", key:"company_name", placeholder:"PureNorth Städ"},
                  {label:"Organisationsnummer", key:"company_orgnr", placeholder:"556123-4567"},
                  {label:"Adress", key:"company_address", placeholder:"Storgatan 1, 903 25 Umeå"},
                  {label:"Telefon", key:"company_phone", placeholder:"070-000 00 00"},
                  {label:"E-post", key:"company_email", placeholder:"info@purenorth.se"},
                  {label:"Webbplats", key:"company_website", placeholder:"www.purenorth.se"},
                ].map(({label, key, placeholder}) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600">{label}</label>
                    <input value={settingsData[key]} onChange={e=>setSettingsData(d=>({...d,[key]:e.target.value}))} placeholder={placeholder} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Fakturainställningar</h3>
              <div>
                <label className="text-xs font-medium text-slate-600">Betalningsvillkor (dagar)</label>
                <input type="number" value={settingsData.payment_terms_days} onChange={e=>setSettingsData(d=>({...d,payment_terms_days:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">OB-tillägg (kr/tim)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">OB1 (kväll)</label>
                  <input type="number" value={settingsData.ob1_extra} onChange={e=>setSettingsData(d=>({...d,ob1_extra:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">OB2 (natt/helg)</label>
                  <input type="number" value={settingsData.ob2_extra} onChange={e=>setSettingsData(d=>({...d,ob2_extra:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                </div>
              </div>
            </div>
            <button onClick={saveSettings} disabled={settingsSaving} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
              {settingsSaving ? "Sparar..." : "Spara inställningar"}
            </button>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
// Sun Jul  5 18:10:50 UTC 2026
// Sun Jul  5 19:50:10 UTC 2026
// force Sun Jul  5 19:59:28 UTC 2026

```

---

## frontend/src/pages/admin/LoginScreen.jsx
```jsx
import React, { useState } from "react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const sendForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // always show success
    } finally {
      setForgotLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || "Inloggning misslyckades");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-5">
      {!forgotMode && <form onSubmit={submit} data-testid="admin-login-form" className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-7">
          <Logo className="h-10 w-10" />
          <span className="font-display font-bold text-xl text-slate-900">PureNorth Städ</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Admin-inloggning</h1>
        <p className="text-sm text-slate-500 mb-6">Logga in för att hantera bokningar och omdömen.</p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="a-email">E-post</Label>
            <Input id="a-email" type="email" data-testid="admin-email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="a-pass">Lösenord</Label>
            <Input id="a-pass" type="password" data-testid="admin-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          {error && <p data-testid="admin-login-error" className="text-sm text-red-600">{error}</p>}
          {!forgotMode && (
            <button type="button" onClick={()=>setForgotMode(true)} className="w-full text-sm text-slate-400 hover:text-[#141414] transition-colors mt-1 text-center">
              Glömt lösenordet?
            </button>
          )}
          <button type="submit" disabled={loading} data-testid="admin-login-submit" className="w-full rounded-full bg-[#141414] hover:bg-[#000000] disabled:opacity-60 text-white py-3 font-semibold transition-colors">
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </div>
      </form>}
      {forgotMode && (
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          {forgotSent ? (
            <div className="text-center py-4">
              <p className="text-green-700 font-semibold mb-2">✅ Kontrollera din e-post!</p>
              <p className="text-sm text-slate-500 mb-4">Om e-postadressen finns skickas en återställningslänk.</p>
              <button onClick={()=>{setForgotMode(false);setForgotSent(false);}} className="text-sm text-slate-500 hover:text-[#141414] underline">Tillbaka till inloggning</button>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Glömt lösenord?</h1>
              <p className="text-sm text-slate-500 mb-6">Ange din e-post så skickar vi en återställningslänk.</p>
              <form onSubmit={sendForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-postadress</label>
                  <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required placeholder="din@email.se"
                    className="w-full rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                </div>
                <button type="submit" disabled={forgotLoading} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                  {forgotLoading ? "Skickar..." : "Skicka återställningslänk"}
                </button>
                <button type="button" onClick={()=>setForgotMode(false)} className="w-full text-sm text-slate-400 hover:text-slate-600 py-1">
                  ← Tillbaka till inloggning
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

```

---

## frontend/src/pages/admin/ReviewsPanel.jsx
```jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Star, X, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { StarRating } from "@/components/StarRating";

export function ReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setReviews((await api.get("/reviews")).data);
    } catch {
      toast.error("Kunde inte hämta omdömen.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const setApproved = async (id, approved) => {
    try {
      await api.patch(`/reviews/${id}/approve`, { approved });
      setReviews((r) => r.map((x) => (x.id === id ? { ...x, approved } : x)));
      toast.success(approved ? "Omdöme publicerat." : "Omdöme avpublicerat.");
    } catch {
      toast.error("Kunde inte uppdatera omdömet.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort detta omdöme?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews((r) => r.filter((x) => x.id !== id));
      toast.success("Omdöme borttaget.");
    } catch {
      toast.error("Kunde inte ta bort omdömet.");
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Totalt", value: reviews.length },
          { label: "Väntar", value: reviews.filter((r) => !r.approved).length },
          { label: "Publicerade", value: reviews.filter((r) => r.approved).length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-3xl font-display font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : reviews.length === 0 ? (
        <div data-testid="admin-reviews-empty" className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500">
          Inga omdömen ännu.
        </div>
      ) : (
        <div className="grid gap-4" data-testid="admin-reviews-list">
          {reviews.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid={`review-row-${r.id}`}
              className="rounded-2xl border border-slate-100 bg-white p-6 flex flex-col lg:flex-row lg:items-center gap-5 justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display font-semibold text-lg text-slate-900">{r.name}</h3>
                  {r.approved ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">Publicerad</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"><Clock size={12} /> Väntar</span>
                  )}
                </div>
                <StarRating value={r.rating} className="mb-2" />
                <p className="text-sm text-slate-600">"{r.text}"</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.approved ? (
                  <button onClick={() => setApproved(r.id, false)} data-testid={`review-unpublish-${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-amber-400 hover:text-amber-600 transition-colors">
                    <X size={15} /> Avpublicera
                  </button>
                ) : (
                  <button onClick={() => setApproved(r.id, true)} data-testid={`review-approve-${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#166534] rounded-full px-4 py-2 hover:bg-[#14532d] transition-colors">
                    <Check size={15} /> Godkänn
                  </button>
                )}
                <button onClick={() => remove(r.id)} data-testid={`review-delete-${r.id}`} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {/* ── Settings Modal ─────────────────────────────────────────────── */}
    </>
  );
}
// Sun Jul  5 17:03:25 UTC 2026
// force Sun Jul  5 17:26:39 UTC 2026

```

---

## frontend/src/features/settings/sections/AboutSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function AboutSection({ data, set, inp, lbl, aboutImgRef, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Om oss</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_about_in_navbar", data.show_about_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_about_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Etikett (liten grön text)</label>
              <button type="button" onClick={()=>set("show_about_label", data.show_about_label === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Etikett färg</label>
              <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Färg<CircleColor value={data.about_label_color||"#166534"} onChange={e=>set("about_label_color",e.target.value)}/></label>
            </div>
            <input value={data.about_label||""} onChange={e=>set("about_label",e.target.value)} placeholder="Om oss" className={inp}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Rubrik</label>
              <button type="button" onClick={()=>set("show_about_title", data.show_about_title === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <input value={data.about_title||""} onChange={e=>set("about_title",e.target.value)} placeholder="Städning med hjärta & precision" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="about_title_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Beskrivningstext</label>
              <button type="button" onClick={()=>set("show_about_text", data.show_about_text === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_text !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_text !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <textarea value={data.about_text||""} onChange={e => set("about_text", e.target.value)} rows={6} placeholder="Berätta om ditt företag..." className={inp + " resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="about_text_color" data={data} set={set}/>
          </div>
          <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Statistik (3 siffror)</label>
              <button type="button" onClick={()=>set("show_about_stats", data.show_about_stats === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_stats !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_stats !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
          <h4 className="font-medium text-slate-700 mt-2">Statistik (3 siffror)</h4>
          <TextColorPicker label="Siffror färg" colorKey="about_stat_color" data={data} set={set}/>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Siffra 1</label>
              <input value={data.about_stat1_number||""} onChange={e=>set("about_stat1_number",e.target.value)} placeholder="100+" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 1</label>
              <input value={data.about_stat1_label||""} onChange={e=>set("about_stat1_label",e.target.value)} placeholder="Nöjda kunder" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Siffra 2</label>
              <input value={data.about_stat2_number||""} onChange={e=>set("about_stat2_number",e.target.value)} placeholder="5 (stjärna läggs till automatiskt)" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 2</label>
              <input value={data.about_stat2_label||""} onChange={e=>set("about_stat2_label",e.target.value)} placeholder="Betyg" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Siffra 3</label>
              <input value={data.about_stat3_number||""} onChange={e=>set("about_stat3_number",e.target.value)} placeholder="3 år" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 3</label>
              <input value={data.about_stat3_label||""} onChange={e=>set("about_stat3_label",e.target.value)} placeholder="Erfarenhet" className={inp}/>
            </div>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Punkter (3 fördelar)</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 1</label>
              <button type="button" onClick={()=>set("show_about_point1", data.show_about_point1 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point1 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point1 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 1 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point1_color||"#374151"} onChange={e=>set("about_point1_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point1_icon_color||"#166534"} onChange={e=>set("about_point1_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point1_icon||"ShieldCheck"} onChange={e=>set("about_point1_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point1||""} onChange={e=>set("about_point1",e.target.value)} placeholder="SRY-certifierad personal" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 2</label>
              <button type="button" onClick={()=>set("show_about_point2", data.show_about_point2 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point2 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point2 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 2 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point2_color||"#374151"} onChange={e=>set("about_point2_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point2_icon_color||"#166534"} onChange={e=>set("about_point2_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point2_icon||"Leaf"} onChange={e=>set("about_point2_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point2||""} onChange={e=>set("about_point2",e.target.value)} placeholder="Svanenmärkta Pur-Eco produkter" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 3</label>
              <button type="button" onClick={()=>set("show_about_point3", data.show_about_point3 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point3 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point3 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 3 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point3_color||"#374151"} onChange={e=>set("about_point3_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point3_icon_color||"#166534"} onChange={e=>set("about_point3_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point3_icon||"Star"} onChange={e=>set("about_point3_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point3||""} onChange={e=>set("about_point3",e.target.value)} placeholder="50% RUT-avdrag på arbetskostnaden" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Knapp (Boka städning)</label>
              <button type="button" onClick={()=>set("show_about_btn", data.show_about_btn === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Knapp färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_btn_color||"#ffffff"} onChange={e=>set("about_btn_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">BG<CircleColor value={data.about_btn_bg||"#141414"} onChange={e=>set("about_btn_bg",e.target.value)}/></label>
              </div>
            </div>
            <input value={data.about_btn_text||""} onChange={e=>set("about_btn_text",e.target.value)} placeholder="Boka städning" className={inp}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Bild</label>
              <button type="button" onClick={()=>set("show_about_image", data.show_about_image === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_image !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_image !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <label className={lbl}>Bild på Om oss-sidan</label>
            {data.about_image && (
              <div className="relative mb-3">
                <img src={data.about_image} alt="Om oss" className="w-full h-48 object-cover rounded-xl border border-slate-100"/>
                <button onClick={()=>set("about_image","")} className="absolute top-2 right-2 bg-red-500 text-white rounded-full h-7 w-7 flex items-center justify-center text-xs hover:bg-red-600">✕</button>
              </div>
            )}
            <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "about_image")}/>
            <button onClick={() => aboutImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> {data.about_image ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 1200×800px</p>
          </div>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/AdminSection.jsx
```jsx
import React from "react";
import { Upload } from "lucide-react";
import { Toggle, CircleColor } from "@/shared/ui";

export function AdminSection({ data, set, inp, lbl, logoRef, uploadImage }) {
  return (
    <>
      <h3 className="font-semibold text-slate-800">Admin-panel</h3>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Fönster-titel (webbläsaren)</h4>
      <input value={data.admin_window_title||""} onChange={e=>set("admin_window_title",e.target.value)} placeholder="PureNorth | Adminpanel" className={inp}/>
      <p className="text-xs text-slate-400 mt-1">Visas i webbläsarens flik</p>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Logotyp</h4>
      <div className="flex items-center justify-between mb-1">
        <label className={lbl}>Visa logotyp</label>
        <Toggle value={data.show_logo} onChange={v => set("show_logo", v)}/>
      </div>
      {data.logo_url && <div className="relative mb-2"><img src={data.logo_url} alt="Logo" className="h-16 rounded-xl border border-slate-100 p-2"/><button onClick={()=>set("logo_url","")} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "logo_url")}/>
      <button onClick={() => logoRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
        <Upload size={14}/> Ladda upp logotyp
      </button>
      <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 200×200px · PNG med transparent bakgrund</p>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Företagsnamn (i Admin header)</h4>
      <input value={data.admin_company_name||""} onChange={e=>set("admin_company_name",e.target.value)} placeholder="PureNorth" className={inp}/>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Header färger</h4>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span className="text-xs text-slate-500">BG</span>
        <CircleColor value={data.admin_header_bg||"#ffffff"} onChange={e=>set("admin_header_bg",e.target.value)}/>
        <span className="text-xs text-slate-500">Text</span>
        <CircleColor value={data.admin_header_text_color||"#0f172a"} onChange={e=>set("admin_header_text_color",e.target.value)}/>
      </div>
    </>
  );
}

```

---

## frontend/src/features/settings/sections/BookingSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function BookingSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Bokningsformulär</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa bokningsformulär</label>
            <button type="button" onClick={()=>set("show_booking", data.show_booking === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">BG färg</span>
            <CircleColor value={data.booking_bg||"#141414"} onChange={e=>set("booking_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Vänster sida</h4>
          <div>
            <label className={lbl}>Etikett (liten text)</label>
            <input value={data.booking_left_label||""} onChange={e=>set("booking_left_label",e.target.value)} placeholder="Boka tid" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_label_color||"#808080"} onChange={e=>set("booking_left_label_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_left_title||""} onChange={e=>set("booking_left_title",e.target.value)} placeholder="Boka online eller ring oss" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_title_color||"#ffffff"} onChange={e=>set("booking_left_title_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.booking_left_subtitle||""} onChange={e=>set("booking_left_subtitle",e.target.value)} rows={2} placeholder="Fyll i formuläret..." className={inp+" resize-none"}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_subtitle_color||"#b3b3b3"} onChange={e=>set("booking_left_subtitle_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Ring oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa knapp</label>
            <button type="button" onClick={()=>set("show_booking_phone_btn", data.show_booking_phone_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking_phone_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking_phone_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Label text</label>
            <input value={data.booking_phone_btn_label||""} onChange={e=>set("booking_phone_btn_label",e.target.value)} placeholder="Ring oss" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.booking_phone_btn_icon||"Phone"} onChange={e=>set("booking_phone_btn_icon",e.target.value)} className={inp}>
              <option value="Phone">📞 Phone</option>
              <option value="Smartphone">📱 Smartphone</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Ikon BG</span><CircleColor value={data.booking_phone_btn_icon_bg||"#ffffff"} onChange={e=>set("booking_phone_btn_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span><CircleColor value={data.booking_phone_btn_icon_color||"#141414"} onChange={e=>set("booking_phone_btn_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span><CircleColor value={data.booking_phone_btn_label_color||"#808080"} onChange={e=>set("booking_phone_btn_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Nummer</span><CircleColor value={data.booking_phone_btn_number_color||"#ffffff"} onChange={e=>set("booking_phone_btn_number_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_phone_btn_bg||"#1f1f1f"} onChange={e=>set("booking_phone_btn_bg",e.target.value)}/>
          </div>

          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Höger sida (formulär)</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Form BG</span>
            <CircleColor value={data.booking_form_bg||"#1a1a1a"} onChange={e=>set("booking_form_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span>
            <CircleColor value={data.booking_form_label_color||"#b3b3b3"} onChange={e=>set("booking_form_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Input BG</span>
            <CircleColor value={data.booking_form_input_bg||"#1f1f1f"} onChange={e=>set("booking_form_input_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Input text</span>
            <CircleColor value={data.booking_form_input_text||"#ffffff"} onChange={e=>set("booking_form_input_text",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Skicka-knapp</h4>
          <div>
            <label className={lbl}>Knapp text</label>
            <input value={data.booking_submit_text||""} onChange={e=>set("booking_submit_text",e.target.value)} placeholder="Skicka bokningsförfrågan" className={inp}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Text</span><CircleColor value={data.booking_submit_color||"#141414"} onChange={e=>set("booking_submit_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_submit_bg||"#ffffff"} onChange={e=>set("booking_submit_bg",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Success meddelande</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_success_title||""} onChange={e=>set("booking_success_title",e.target.value)} placeholder="Tack för din förfrågan!" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.booking_success_text||""} onChange={e=>set("booking_success_text",e.target.value)} placeholder="Vi återkommer inom 24 timmar." className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_success_color||"#ffffff"} onChange={e=>set("booking_success_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänster</h4>
          {(data.booking_services||[]).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s||""} onChange={e=>{const arr=[...data.booking_services];arr[idx]=e.target.value;set("booking_services",arr);}} placeholder="Hemstädning" className={inp}/>
              <button onClick={()=>set("booking_services",data.booking_services.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("booking_services",[...(data.booking_services||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/ContactSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker } from "@/shared/ui";

export function ContactSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Kontaktuppgifter</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontaktuppgifter</label>
            <button type="button" onClick={()=>set("show_kontaktuppgifter", data.show_kontaktuppgifter === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontaktuppgifter !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontaktuppgifter !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Telefonnummer</label>
            <button type="button" onClick={()=>set("show_phone", data.show_phone === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_phone !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_phone !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="070-624 04 03" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="phone_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.phone_icon_color||"#166534"} onChange={e=>set("phone_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>E-post</label>
            <button type="button" onClick={()=>set("show_email", data.show_email === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_email !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_email !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.email} onChange={e => set("email", e.target.value)} placeholder="info@purenorth.se" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="email_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.email_icon_color||"#166534"} onChange={e=>set("email_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Adress</label>
            <button type="button" onClick={()=>set("show_address", data.show_address === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_address !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_address !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.address} onChange={e => set("address", e.target.value)} placeholder="Storgatan 1, Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="address_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.address_icon_color||"#166534"} onChange={e=>set("address_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Öppettider</label>
            <button type="button" onClick={()=>set("show_opening_hours", data.show_opening_hours === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_opening_hours !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_opening_hours !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.opening_hours} onChange={e => set("opening_hours", e.target.value)} placeholder="Mån–Fre: 08:00–18:00" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="opening_hours_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.hours_icon_color||"#166534"} onChange={e=>set("hours_icon_color",e.target.value)}/>
            </div>
          </div>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/FooterFaqSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterFaqSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">FAQ</span>
          </div>
          <h3 className="font-semibold text-slate-800">FAQ – Vanliga frågor</h3>

          <div>
            <label className={lbl}>Sida BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.faq_bg||"#ffffff"} onChange={e=>set("faq_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.faq_label||""} onChange={e=>set("faq_label",e.target.value)} placeholder="Vanliga frågor & svar" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_label_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.faq_title||""} onChange={e=>set("faq_title",e.target.value)} placeholder="Vi har svaren" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.faq_subtitle||""} onChange={e=>set("faq_subtitle",e.target.value)} rows={2} placeholder="Hittar du inte svaret du söker?..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="faq_subtitle_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Frågor & svar färger</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Fråga</span>
            <CircleColor value={data.faq_question_color||"#141414"} onChange={e=>set("faq_question_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Svar</span>
            <CircleColor value={data.faq_answer_color||"#475569"} onChange={e=>set("faq_answer_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Kontaktruta (svart box)</label>
            <button type="button" onClick={()=>set("show_faq_contact_box", data.show_faq_contact_box === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_contact_box !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_contact_box !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Box BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.faq_box_bg||"#141414"} onChange={e=>set("faq_box_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.faq_box_title||""} onChange={e=>set("faq_box_title",e.target.value)} placeholder="Fortfarande frågor?" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_box_title_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <input value={data.faq_box_text||""} onChange={e=>set("faq_box_text",e.target.value)} placeholder="Vi hjälper dig gärna med din städning." className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_box_text_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Ring oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Ring oss</label>
            <button type="button" onClick={()=>set("show_faq_ring_btn", data.show_faq_ring_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_ring_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_ring_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <input value={data.faq_ring_text||""} onChange={e=>set("faq_ring_text",e.target.value)} placeholder="Ring oss" className={inp}/>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.faq_ring_color||"#141414"} onChange={e=>set("faq_ring_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.faq_ring_bg||"#ffffff"} onChange={e=>set("faq_ring_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.faq_ring_icon_color||"#141414"} onChange={e=>set("faq_ring_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.faq_ring_icon||"Phone"} onChange={e=>set("faq_ring_icon",e.target.value)} className={inp}>
              <option value="Phone">📞 Phone</option>
              <option value="Smartphone">📱 Smartphone</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Mejla oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Mejla oss</label>
            <button type="button" onClick={()=>set("show_faq_mail_btn", data.show_faq_mail_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_mail_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_mail_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <input value={data.faq_mail_text||""} onChange={e=>set("faq_mail_text",e.target.value)} placeholder="Mejla oss" className={inp}/>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.faq_mail_color||"#ffffff"} onChange={e=>set("faq_mail_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.faq_mail_bg||"transparent"} onChange={e=>set("faq_mail_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.faq_mail_icon_color||"#ffffff"} onChange={e=>set("faq_mail_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.faq_mail_icon||"Mail"} onChange={e=>set("faq_mail_icon",e.target.value)} className={inp}>
              <option value="Mail">✉️ Mail</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="Send">📤 Send</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <h4 className="font-medium text-slate-700 mb-2">Frågor (FAQ items)</h4>
          {(data.faq_items||[]).map((item, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("faq_items", data.faq_items.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Fråga</label>
                <input value={item.q||""} onChange={e=>{const s=[...data.faq_items];s[idx]={...s[idx],q:e.target.value};set("faq_items",s);}} placeholder="Hur gör jag en bokning?" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Svar</label>
                <textarea value={item.a||""} onChange={e=>{const s=[...data.faq_items];s[idx]={...s[idx],a:e.target.value};set("faq_items",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("faq_items",[...(data.faq_items||[]),{q:"",a:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till fråga
          </button>
          <hr className="border-slate-100"/>

        </>
  );
}

```

---

## frontend/src/features/settings/sections/FooterIntegritetSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterIntegritetSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Integritetspolicy</span>
          </div>
          <h3 className="font-semibold text-slate-800">Integritetspolicy</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.integritet_bg||"#ffffff"} onChange={e=>set("integritet_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.integritet_eyebrow||""} onChange={e=>set("integritet_eyebrow",e.target.value)} placeholder="GDPR – Integritetspolicy" className={inp}/>
            <TextColorPicker label="Färg" colorKey="integritet_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.integritet_title||""} onChange={e=>set("integritet_title",e.target.value)} placeholder="Integritetspolicy GDPR" className={inp}/>
            <TextColorPicker label="Färg" colorKey="integritet_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.integritet_intro||""} onChange={e=>set("integritet_intro",e.target.value)} rows={2} placeholder="Vi på PureNorth Städ värnar om din personliga integritet..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="integritet_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Sektioner färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.integritet_heading_color||"#141414"} onChange={e=>set("integritet_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.integritet_text_color||"#475569"} onChange={e=>set("integritet_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Bullet</span>
            <CircleColor value={data.integritet_bullet_color||"#141414"} onChange={e=>set("integritet_bullet_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sektioner</h4>
          {(data.integritet_sections||[]).map((sec, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("integritet_sections", data.integritet_sections.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={sec.heading||""} onChange={e=>{const s=[...data.integritet_sections];s[idx]={...s[idx],heading:e.target.value};set("integritet_sections",s);}} placeholder="1. Allmänt" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Text</label>
                <textarea value={sec.text||""} onChange={e=>{const s=[...data.integritet_sections];s[idx]={...s[idx],text:e.target.value};set("integritet_sections",s);}} rows={3} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("integritet_sections",[...(data.integritet_sections||[]),{heading:"",text:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till sektion
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/FooterKundavtalSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterKundavtalSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Kundavtal</span>
          </div>
          <h3 className="font-semibold text-slate-800">Kundavtal</h3>
          <div>
            <label className={lbl}>Sida BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.kundavtal_bg||"#ffffff"} onChange={e=>set("kundavtal_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.kundavtal_eyebrow||""} onChange={e=>set("kundavtal_eyebrow",e.target.value)} placeholder="Kundavtal" className={inp}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.kundavtal_title||""} onChange={e=>set("kundavtal_title",e.target.value)} placeholder="Bokningsvillkor" className={inp}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro text</label>
            <textarea value={data.kundavtal_intro||""} onChange={e=>set("kundavtal_intro",e.target.value)} rows={2} placeholder="Här hittar du våra boknings-, betalnings- och avbokningsvillkor." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Sektioner färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.kundavtal_heading_color||"#141414"} onChange={e=>set("kundavtal_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.kundavtal_text_color||"#475569"} onChange={e=>set("kundavtal_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Bullet</span>
            <CircleColor value={data.kundavtal_bullet_color||"#141414"} onChange={e=>set("kundavtal_bullet_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sektioner</h4>
          {(data.kundavtal_sections||[]).map((sec, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("kundavtal_sections", data.kundavtal_sections.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={sec.heading||""} onChange={e=>{const s=[...data.kundavtal_sections];s[idx]={...s[idx],heading:e.target.value};set("kundavtal_sections",s);}} placeholder="Bokningsvillkor" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Punkter (en per rad)</label>
                <textarea value={(sec.items||[]).join("\n")} onChange={e=>{const s=[...data.kundavtal_sections];s[idx]={...s[idx],items:e.target.value.split("\n")};set("kundavtal_sections",s);}} rows={4} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("kundavtal_sections",[...(data.kundavtal_sections||[]),{heading:"",items:[""]}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till sektion
          </button>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kontakttext (längst ner)</h4>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.kundavtal_footer_text||""} onChange={e=>set("kundavtal_footer_text",e.target.value)} placeholder="Har du fler frågor så är du välkommen att kontakta vår kundtjänst på" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Text färg</span>
              <CircleColor value={data.kundavtal_footer_color||"#475569"} onChange={e=>set("kundavtal_footer_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>E-post länk</label>
            <input value={data.kundavtal_footer_email||""} onChange={e=>set("kundavtal_footer_email",e.target.value)} placeholder="kundtjanst@purenorthstad.se" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Länk färg</span>
              <CircleColor value={data.kundavtal_footer_link_color||"#141414"} onChange={e=>set("kundavtal_footer_link_color",e.target.value)}/>
            </div>
          </div>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/FooterMalsattningSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterMalsattningSection({ data, set, inp, lbl, mal1ImgRef, mal2ImgRef, uploadImage, setSection }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Målsättning</span>
          </div>
          <h3 className="font-semibold text-slate-800">Målsättning</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.mal_bg||"#ffffff"} onChange={e=>set("mal_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.mal_eyebrow||""} onChange={e=>set("mal_eyebrow",e.target.value)} placeholder="Målsättning" className={inp}/>
            <TextColorPicker label="Färg" colorKey="mal_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.mal_title||""} onChange={e=>set("mal_title",e.target.value)} placeholder="Vår målsättning" className={inp}/>
            <TextColorPicker label="Färg" colorKey="mal_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro text</label>
            <textarea value={data.mal_intro||""} onChange={e=>set("mal_intro",e.target.value)} rows={3} placeholder="PureNorth Städ drivs med ambition..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="mal_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort 1 (Svanenmärkt)</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.mal_card_bg||"#ffffff"} onChange={e=>set("mal_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_card_title_color||"#141414"} onChange={e=>set("mal_card_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_card_text_color||"#475569"} onChange={e=>set("mal_card_text_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 titel</label>
            <input value={data.mal_card1_title||""} onChange={e=>set("mal_card1_title",e.target.value)} placeholder="Miljövänliga val är viktiga för oss" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 text</label>
            <textarea value={data.mal_card1_text||""} onChange={e=>set("mal_card1_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 bild</label>
            {data.mal_card1_img && <div className="relative mb-2"><img src={data.mal_card1_img} alt="" className="w-full h-24 object-contain rounded-lg border"/><button onClick={()=>set("mal_card1_img","")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
            <input ref={mal1ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "mal_card1_img")}/>
            <button onClick={() => mal1ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
              <Upload size={12}/> {data.mal_card1_img ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 400×400px</p>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort 2 (Trygg arbetsplats)</h4>
          <div>
            <label className={lbl}>Kort 2 titel</label>
            <input value={data.mal_card2_title||""} onChange={e=>set("mal_card2_title",e.target.value)} placeholder="En trygg arbetsplats" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Kort 2 text</label>
            <textarea value={data.mal_card2_text||""} onChange={e=>set("mal_card2_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Kort 2 bild</label>
            {data.mal_card2_img && <div className="relative mb-2"><img src={data.mal_card2_img} alt="" className="w-full h-24 object-cover rounded-lg"/><button onClick={()=>set("mal_card2_img","")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
            <input ref={mal2ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "mal_card2_img")}/>
            <button onClick={() => mal2ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
              <Upload size={12}/> {data.mal_card2_img ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 900×600px</p>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Check-kort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.mal_check_card_bg||"#ffffff"} onChange={e=>set("mal_check_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.mal_check_icon_bg||"#141414"} onChange={e=>set("mal_check_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.mal_check_icon_color||"#ffffff"} onChange={e=>set("mal_check_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_check_title_color||"#141414"} onChange={e=>set("mal_check_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_check_text_color||"#475569"} onChange={e=>set("mal_check_text_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Check 1 ikon</label>
            <select value={data.mal_check1_icon||"Check"} onChange={e=>set("mal_check1_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Check 1 titel</label>
            <input value={data.mal_check1_title||""} onChange={e=>set("mal_check1_title",e.target.value)} placeholder="Hög kvalité" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Check 1 text</label>
            <textarea value={data.mal_check1_text||""} onChange={e=>set("mal_check1_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Check 2 ikon</label>
            <select value={data.mal_check2_icon||"Clock"} onChange={e=>set("mal_check2_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Check 2 titel</label>
            <input value={data.mal_check2_title||""} onChange={e=>set("mal_check2_title",e.target.value)} placeholder="Klart inom 24 timmar" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Check 2 text</label>
            <textarea value={data.mal_check2_text||""} onChange={e=>set("mal_check2_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">SRY-sektion</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.mal_sry_bg||"#141414"} onChange={e=>set("mal_sry_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_sry_title_color||"#ffffff"} onChange={e=>set("mal_sry_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_sry_text_color||"#ffffff"} onChange={e=>set("mal_sry_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.mal_sry_icon_bg||"#ffffff"} onChange={e=>set("mal_sry_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.mal_sry_icon_color||"#141414"} onChange={e=>set("mal_sry_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>SRY ikon</label>
            <select value={data.mal_sry_icon||"Award"} onChange={e=>set("mal_sry_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>SRY rubrik</label>
            <input value={data.mal_sry_title||""} onChange={e=>set("mal_sry_title",e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
          </div>
          <div>
            <label className={lbl}>SRY text 1</label>
            <textarea value={data.mal_sry_text1||""} onChange={e=>set("mal_sry_text1",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>SRY text 2</label>
            <textarea value={data.mal_sry_text2||""} onChange={e=>set("mal_sry_text2",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/FooterNojdSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterNojdSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Nöjd kundgaranti</span>
          </div>
          <h3 className="font-semibold text-slate-800">Nöjd kundgaranti</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.nojd_bg||"#ffffff"} onChange={e=>set("nojd_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.nojd_eyebrow||""} onChange={e=>set("nojd_eyebrow",e.target.value)} placeholder="Nöjd kundgaranti" className={inp}/>
            <TextColorPicker label="Färg" colorKey="nojd_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.nojd_title||""} onChange={e=>set("nojd_title",e.target.value)} placeholder="Nöjd kundgaranti för din trygghet" className={inp}/>
            <TextColorPicker label="Färg" colorKey="nojd_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.nojd_intro||""} onChange={e=>set("nojd_intro",e.target.value)} rows={2} placeholder="Vår garanti gäller för dig som..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="nojd_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Garantikort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.nojd_card_bg||"#ffffff"} onChange={e=>set("nojd_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_card_text_color||"#1e293b"} onChange={e=>set("nojd_card_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.nojd_card_icon_bg||"#141414"} onChange={e=>set("nojd_card_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.nojd_card_icon_color||"#ffffff"} onChange={e=>set("nojd_card_icon_color",e.target.value)}/>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Garantipunkter</h4>
          {(data.nojd_guarantees||[]).map((g, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={g||""} onChange={e=>{const s=[...data.nojd_guarantees];s[idx]=e.target.value;set("nojd_guarantees",s);}} placeholder="92% av kunder ger oss topp betyg" className={inp}/>
              <button onClick={()=>set("nojd_guarantees",data.nojd_guarantees.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nojd_guarantees",[...(data.nojd_guarantees||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till punkt
          </button>
          <hr className="border-slate-100"/>
          <div>
            <label className={lbl}>Sektion 1 rubrik</label>
            <input value={data.nojd_section1_heading||""} onChange={e=>set("nojd_section1_heading",e.target.value)} placeholder="Vad är Nöjd Kundgaranti?" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Sektion 1 text</label>
            <textarea value={data.nojd_section1_text||""} onChange={e=>set("nojd_section1_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Sektion 2 rubrik</label>
            <input value={data.nojd_section2_heading||""} onChange={e=>set("nojd_section2_heading",e.target.value)} placeholder="Så går det till" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Sektion 2 text</label>
            <textarea value={data.nojd_section2_text||""} onChange={e=>set("nojd_section2_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.nojd_heading_color||"#141414"} onChange={e=>set("nojd_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_text_color||"#475569"} onChange={e=>set("nojd_text_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Steg färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Steg BG</span>
            <CircleColor value={data.nojd_step_bg||"#fafafa"} onChange={e=>set("nojd_step_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_step_text_color||"#334155"} onChange={e=>set("nojd_step_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Num BG</span>
            <CircleColor value={data.nojd_step_num_bg||"#141414"} onChange={e=>set("nojd_step_num_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Num</span>
            <CircleColor value={data.nojd_step_num_color||"#ffffff"} onChange={e=>set("nojd_step_num_color",e.target.value)}/>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Steg</h4>
          {(data.nojd_steps||[]).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s||""} onChange={e=>{const arr=[...data.nojd_steps];arr[idx]=e.target.value;set("nojd_steps",arr);}} placeholder="Kontakta oss snarast..." className={inp}/>
              <button onClick={()=>set("nojd_steps",data.nojd_steps.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nojd_steps",[...(data.nojd_steps||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till steg
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/FooterSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Footer</h3>
          <div>
            <label className={lbl}>Footer BG färg</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.footer_bg||"#ffffff"} onChange={e=>set("footer_bg",e.target.value)}/>
              <span className="text-xs text-slate-400">Bakgrundsfärg</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Copyright text</label>
            <input value={data.footer_copyright||""} onChange={e=>set("footer_copyright",e.target.value)} placeholder="© 2026 PureNorth Städ · Umeå" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Färg</span>
              <CircleColor value={data.footer_copyright_color||"#64748b"} onChange={e=>set("footer_copyright_color",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sidinnehåll</h4>
          {[
            {key:"faq", label:"FAQ"},
            {key:"kundavtal", label:"Kundavtal"},
            {key:"nojd", label:"Nöjd kundgaranti"},
            {key:"varderingar", label:"Värderingar"},
            {key:"malsattning", label:"Målsättning"},
            {key:"integritet", label:"Integritetspolicy"},
          ].map(({key, label}) => (
            <div key={key} className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 transition-colors cursor-pointer" onClick={()=>setSection(`footer_${key}`)}>
              <div className="flex items-center gap-3">
                <button type="button" onClick={e=>{e.stopPropagation();set(`show_footer_${key}`, data[`show_footer_${key}`] === false ? true : false)}}
                  className={`w-10 h-5 rounded-full transition-colors shrink-0 ${data[`show_footer_${key}`] !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data[`show_footer_${key}`] !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <div onClick={e=>e.stopPropagation()}>
                  <CircleColor value={data[`footer_${key}_color`]||"#475569"} onChange={e=>set(`footer_${key}_color`,e.target.value)}/>
                </div>
              </div>
            </div>
          ))}
        </>
  );
}
// Sun Jul  5 13:33:30 UTC 2026
// Sun Jul  5 16:35:23 UTC 2026

```

---

## frontend/src/features/settings/sections/FooterVarderigarSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterVarderigarSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Värderingar</span>
          </div>
          <h3 className="font-semibold text-slate-800">Värderingar</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.varderingar_bg||"#ffffff"} onChange={e=>set("varderingar_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.varderingar_eyebrow||""} onChange={e=>set("varderingar_eyebrow",e.target.value)} placeholder="Värderingar" className={inp}/>
            <TextColorPicker label="Färg" colorKey="varderingar_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.varderingar_title||""} onChange={e=>set("varderingar_title",e.target.value)} placeholder="Hur vi tänker" className={inp}/>
            <TextColorPicker label="Färg" colorKey="varderingar_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.varderingar_intro||""} onChange={e=>set("varderingar_intro",e.target.value)} rows={2} placeholder="Hur vi värderar våra tjänster..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="varderingar_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.varderingar_card_bg||"#ffffff"} onChange={e=>set("varderingar_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.varderingar_card_title_color||"#141414"} onChange={e=>set("varderingar_card_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.varderingar_card_text_color||"#475569"} onChange={e=>set("varderingar_card_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.varderingar_icon_bg||"#141414"} onChange={e=>set("varderingar_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.varderingar_icon_color||"#ffffff"} onChange={e=>set("varderingar_icon_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Värdekort</h4>
          {(data.varderingar_values||[]).map((v, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("varderingar_values",data.varderingar_values.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Titel</label>
                <input value={v.title||""} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],title:e.target.value};set("varderingar_values",s);}} placeholder="Priser" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Text</label>
                <textarea value={v.text||""} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],text:e.target.value};set("varderingar_values",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
              <div>
                <label className={lbl}>Ikon</label>
                <select value={v.icon||"Tag"} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],icon:e.target.value};set("varderingar_values",s);}} className={inp}>
                  <option value="none">— Ingen ikon</option>
                  <option value="Tag">🏷️ Tag</option>
                  <option value="HeartHandshake">🤝 HeartHandshake</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Ear">👂 Ear</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Award">🏆 Award</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                </select>
              </div>
            </div>
          ))}
          <button onClick={()=>set("varderingar_values",[...(data.varderingar_values||[]),{title:"",text:"",icon:"Tag"}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till värdering
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/HeroSection.jsx
```jsx
import React from "react";
import { Upload } from "lucide-react";
import { CircleColor, TextColorPicker, ColorPicker } from "@/shared/ui";

export function HeroSection({ data, set, inp, lbl, heroImgRef, badgeImgRef, badge1ImgRef, badge2ImgRef, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Hero-sektion</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Hero</label>
            <button type="button" onClick={()=>set("show_hero_section", data.show_hero_section === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_section !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_section !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Badge-text (grön etikett)</label>
            <button type="button" onClick={()=>set("show_hero_badge", !data.show_hero_badge)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.hero_badge} onChange={e => set("hero_badge", e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
            <ColorPicker label="Färger" colorKey="hero_badge_color" bgKey="hero_badge_bg" defaultColor="#166534" defaultBg="#dcfce7" data={data} set={set}/>
            <label className={lbl + " mt-2"}>Badge-ikon</label>
            <select value={data.hero_badge_icon||"Leaf"} onChange={e=>set("hero_badge_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Leaf">🌿 Leaf (löv)</option>
              <option value="ShieldCheck">🛡️ ShieldCheck (sköld)</option>
              <option value="Star">⭐ Star (stjärna)</option>
              <option value="Heart">❤️ Heart (hjärta)</option>
              <option value="Zap">⚡ Zap (blixt)</option>
              <option value="Award">🏆 Award (utmärkelse)</option>
              <option value="CheckCircle">✅ CheckCircle (bock)</option>
              <option value="Sparkles">✨ Sparkles (gnistor)</option>
            </select>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.hero_badge_icon_color || "#166534"} onChange={e => set("hero_badge_icon_color", e.target.value)}/>
              {data.hero_badge_icon_color && <button onClick={()=>set("hero_badge_icon_color","")} className="text-xs text-red-400">↺</button>}
            </div>
            <label className={lbl + " mt-2"}>Badge-logotyp (valfritt - ersätter ikon)</label>
            {data.hero_badge_image && (
              <div className="flex items-center gap-2 mb-2">
                <img src={data.hero_badge_image} alt="Badge" className="h-6 w-6 object-contain"/>
                <button onClick={()=>set("hero_badge_image","")} className="text-red-500 text-xs hover:underline">Ta bort</button>
              </div>
            )}
            <input ref={badgeImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "hero_badge_image")}/>
            <button onClick={() => badgeImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> {data.hero_badge_image ? "Byt logotyp" : "Ladda upp logotyp"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Stor rubrik (H1)</label>
            <button type="button" onClick={()=>set("show_hero_title", !data.show_hero_title)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.hero_title} onChange={e => set("hero_title", e.target.value)} rows={3} placeholder="Renhet med norrländsk precision i Umeå." className={inp + " resize-none"}/>
            <ColorPicker label="Färger" colorKey="hero_title_color" bgKey="hero_title_bg" defaultColor="#141414" defaultBg="transparent" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Undertext</label>
            <button type="button" onClick={()=>set("show_hero_subtitle", !data.show_hero_subtitle)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_subtitle !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_subtitle !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.hero_subtitle} onChange={e => set("hero_subtitle", e.target.value)} rows={3} placeholder="Vi definierar premiumstädning..." className={inp + " resize-none"}/>
            <ColorPicker label="Färger" colorKey="hero_subtitle_color" bgKey="hero_subtitle_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Knapptext (Boka-knapp)</label>
            <button type="button" onClick={()=>set("show_hero_cta", !data.show_hero_cta)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_cta !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_cta !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.cta_text} onChange={e => set("cta_text", e.target.value)} placeholder="Boka tid online" className={inp}/>
            <ColorPicker label="Färger" colorKey="hero_cta_color" bgKey="hero_cta_bg" defaultColor="#ffffff" defaultBg="#141414" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Telefonnummer (knapp)</label>
              <button type="button" onClick={()=>set("show_hero_phone", data.show_hero_phone === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_phone !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_phone !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.hero_phone_color||"#374151"} onChange={e=>set("hero_phone_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Ikon</span>
              <CircleColor value={data.hero_phone_icon_color||"#374151"} onChange={e=>set("hero_phone_icon_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span>
              <CircleColor value={data.hero_phone_bg||"transparent"} onChange={e=>set("hero_phone_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>RUT-avdrag badge</label>
              <button type="button" onClick={()=>set("show_hero_rut", data.show_hero_rut === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_rut !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_rut !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Procent text</label>
                <input value={data.hero_rut_percent||""} onChange={e=>set("hero_rut_percent",e.target.value)} placeholder="50%" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={data.hero_rut_title||""} onChange={e=>set("hero_rut_title",e.target.value)} placeholder="RUT-avdrag" className={inp}/>
              </div>
            </div>
            <div>
              <label className={lbl}>Undertext</label>
              <input value={data.hero_rut_text||""} onChange={e=>set("hero_rut_text",e.target.value)} placeholder="Dras direkt på fakturan" className={inp}/>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">BG</span>
              <CircleColor value={data.hero_rut_bg||"#ffffff"} onChange={e=>set("hero_rut_bg",e.target.value)}/>
              <span className="text-xs text-slate-500">Cirkel BG</span>
              <CircleColor value={data.hero_rut_circle_bg||"#166534"} onChange={e=>set("hero_rut_circle_bg",e.target.value)}/>
              <span className="text-xs text-slate-500">Cirkel text</span>
              <CircleColor value={data.hero_rut_circle_color||"#166534"} onChange={e=>set("hero_rut_circle_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Titel</span>
              <CircleColor value={data.hero_rut_title_color||"#0f172a"} onChange={e=>set("hero_rut_title_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.hero_rut_text_color||"#64748b"} onChange={e=>set("hero_rut_text_color",e.target.value)}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Badge 1 (under knapparna)</label>
                <button type="button" onClick={()=>set("show_hero_badge1", data.show_hero_badge1 === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge1 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge1 !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <input value={data.badge1} onChange={e => set("badge1", e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
              <ColorPicker label="Färger" colorKey="hero_badge1_color" bgKey="hero_badge1_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
              <label className={lbl + " mt-2"}>Badge 1 ikon</label>
              <select value={data.badge1_icon||"ShieldCheck"} onChange={e=>set("badge1_icon",e.target.value)} className={inp}>
                <option value="none">— Ingen ikon</option>
                <option value="ShieldCheck">🛡️ ShieldCheck</option>
                <option value="Leaf">🌿 Leaf</option>
                <option value="Star">⭐ Star</option>
                <option value="Heart">❤️ Heart</option>
                <option value="Zap">⚡ Zap</option>
                <option value="Award">🏆 Award</option>
                <option value="CheckCircle">✅ CheckCircle</option>
              </select>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">Ikon färg</span>
                <CircleColor value={data.hero_badge1_icon_color || "#166534"} onChange={e => set("hero_badge1_icon_color", e.target.value)}/>
                {data.hero_badge1_icon_color && <button onClick={()=>set("hero_badge1_icon_color","")} className="text-xs text-red-400">↺</button>}
              </div>
              <label className={lbl + " mt-2"}>Badge 1 logotyp (ersätter ikon)</label>
              {data.badge1_image && <div className="flex items-center gap-2 mb-2"><img src={data.badge1_image} alt="" className="h-5 w-5 object-contain"/><button onClick={()=>set("badge1_image","")} className="text-red-500 text-xs">Ta bort</button></div>}
              <input ref={badge1ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "badge1_image")}/>
              <button onClick={() => badge1ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400 transition-colors mt-1">
                <Upload size={12}/> {data.badge1_image ? "Byt" : "Ladda upp"}
              </button>
              <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Badge 2</label>
                <button type="button" onClick={()=>set("show_hero_badge2", data.show_hero_badge2 === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge2 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge2 !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <input value={data.badge2} onChange={e => set("badge2", e.target.value)} placeholder="Pur-Eco produkter" className={inp}/>
              <ColorPicker label="Färger" colorKey="hero_badge2_color" bgKey="hero_badge2_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
              <label className={lbl + " mt-2"}>Badge 2 ikon</label>
              <select value={data.badge2_icon||"Leaf"} onChange={e=>set("badge2_icon",e.target.value)} className={inp}>
                <option value="none">— Ingen ikon</option>
                <option value="Leaf">🌿 Leaf</option>
                <option value="ShieldCheck">🛡️ ShieldCheck</option>
                <option value="Star">⭐ Star</option>
                <option value="Heart">❤️ Heart</option>
                <option value="Zap">⚡ Zap</option>
                <option value="Award">🏆 Award</option>
                <option value="CheckCircle">✅ CheckCircle</option>
              </select>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">Ikon färg</span>
                <CircleColor value={data.hero_badge2_icon_color || "#166534"} onChange={e => set("hero_badge2_icon_color", e.target.value)}/>
                {data.hero_badge2_icon_color && <button onClick={()=>set("hero_badge2_icon_color","")} className="text-xs text-red-400">↺</button>}
              </div>
              <label className={lbl + " mt-2"}>Badge 2 logotyp (ersätter ikon)</label>
              {data.badge2_image && <div className="flex items-center gap-2 mb-2"><img src={data.badge2_image} alt="" className="h-5 w-5 object-contain"/><button onClick={()=>set("badge2_image","")} className="text-red-500 text-xs">Ta bort</button></div>}
              <input ref={badge2ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "badge2_image")}/>
              <button onClick={() => badge2ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400 transition-colors mt-1">
                <Upload size={12}/> {data.badge2_image ? "Byt" : "Ladda upp"}
              </button>
              <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
            </div>
          </div>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/KontaktSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle, ColorPicker } from "@/shared/ui";

export function KontaktSection({ data, set, inp, lbl }) {
  return (
    <>
      <h3 className="font-semibold text-slate-800">Kontaktsektion</h3>
<h3 className="font-semibold text-slate-800">Kontaktsektion</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontakt i Navbar</label>
            <button type="button" onClick={()=>set("show_kontakt_in_navbar", data.show_kontakt_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontakt_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontakt_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett (liten text ovan rubrik)</label>
            <button type="button" onClick={()=>set("show_contact_title", data.show_contact_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_title||""} onChange={e=>set("contact_title",e.target.value)} placeholder="Kontakt" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_title_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_contact_subtitle", data.show_contact_subtitle === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_subtitle !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_subtitle !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_subtitle||""} onChange={e=>set("contact_subtitle",e.target.value)} placeholder="Vi finns i Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_subtitle_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Undertext</label>
            <button type="button" onClick={()=>set("show_contact_description", data.show_contact_description === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_description !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_description !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.contact_description||""} onChange={e=>set("contact_description",e.target.value)} rows={3} placeholder="Har du frågor eller vill boka en städning?" className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="contact_description_color" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Svart box (höger)</h4>
          <div>
            <div className="flex items-center justify-between mb-1"><label className={lbl}>Svart box (visa/göm)</label><button type="button" onClick={()=>set("show_contact_box", data.show_contact_box === false ? true : false)} className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_box !== false ? "bg-blue-500" : "bg-slate-200"}`}><span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_box !== false ? "translate-x-5" : "translate-x-0"}`}/></button></div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.contact_box_title||""} onChange={e=>set("contact_box_title",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_box_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <textarea value={data.contact_box_text||""} onChange={e=>set("contact_box_text",e.target.value)} rows={3} placeholder="Miljövänlig städning med SRY-utbildad personal..." className={inp+" resize-none"}/>
            <ColorPicker label="Box BG" colorKey="contact_box_text_color" bgKey="contact_box_bg" defaultColor="rgba(255,255,255,0.75)" defaultBg="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box knapp text</label>
            <input value={data.contact_box_btn||""} onChange={e=>set("contact_box_btn",e.target.value)} placeholder="Boka tid nu" className={inp}/>
            <ColorPicker label="Knapp färger" colorKey="contact_box_btn_color" bgKey="contact_box_btn_bg" defaultColor="#141414" defaultBg="#ffffff" data={data} set={set}/>
          </div>
      <hr className="border-slate-100"/>
      <h3 className="font-semibold text-slate-800">Kontaktuppgifter</h3>
<h3 className="font-semibold text-slate-800">Kontaktuppgifter</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontaktuppgifter</label>
            <button type="button" onClick={()=>set("show_kontaktuppgifter", data.show_kontaktuppgifter === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontaktuppgifter !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontaktuppgifter !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Telefonnummer</label>
            <button type="button" onClick={()=>set("show_phone", data.show_phone === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_phone !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_phone !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="070-624 04 03" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="phone_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.phone_icon_color||"#166534"} onChange={e=>set("phone_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>E-post</label>
            <button type="button" onClick={()=>set("show_email", data.show_email === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_email !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_email !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.email} onChange={e => set("email", e.target.value)} placeholder="info@purenorth.se" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="email_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.email_icon_color||"#166534"} onChange={e=>set("email_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Adress</label>
            <button type="button" onClick={()=>set("show_address", data.show_address === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_address !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_address !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.address} onChange={e => set("address", e.target.value)} placeholder="Storgatan 1, Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="address_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.address_icon_color||"#166534"} onChange={e=>set("address_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Öppettider</label>
            <button type="button" onClick={()=>set("show_opening_hours", data.show_opening_hours === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_opening_hours !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_opening_hours !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.opening_hours} onChange={e => set("opening_hours", e.target.value)} placeholder="Mån–Fre: 08:00–18:00" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="opening_hours_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.hours_icon_color||"#166534"} onChange={e=>set("hours_icon_color",e.target.value)}/>
            </div>
          </div>
    </>
  );
}

```

---

## frontend/src/features/settings/sections/KontaktsektionSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function KontaktsektionSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Kontaktsektion</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontakt i Navbar</label>
            <button type="button" onClick={()=>set("show_kontakt_in_navbar", data.show_kontakt_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontakt_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontakt_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett (liten text ovan rubrik)</label>
            <button type="button" onClick={()=>set("show_contact_title", data.show_contact_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_title||""} onChange={e=>set("contact_title",e.target.value)} placeholder="Kontakt" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_title_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_contact_subtitle", data.show_contact_subtitle === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_subtitle !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_subtitle !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_subtitle||""} onChange={e=>set("contact_subtitle",e.target.value)} placeholder="Vi finns i Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_subtitle_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Undertext</label>
            <button type="button" onClick={()=>set("show_contact_description", data.show_contact_description === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_description !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_description !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.contact_description||""} onChange={e=>set("contact_description",e.target.value)} rows={3} placeholder="Har du frågor eller vill boka en städning?" className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="contact_description_color" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Svart box (höger)</h4>
          <div>
            <div className="flex items-center justify-between mb-1"><label className={lbl}>Svart box (visa/göm)</label><button type="button" onClick={()=>set("show_contact_box", data.show_contact_box === false ? true : false)} className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_box !== false ? "bg-blue-500" : "bg-slate-200"}`}><span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_box !== false ? "translate-x-5" : "translate-x-0"}`}/></button></div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.contact_box_title||""} onChange={e=>set("contact_box_title",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_box_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <textarea value={data.contact_box_text||""} onChange={e=>set("contact_box_text",e.target.value)} rows={3} placeholder="Miljövänlig städning med SRY-utbildad personal..." className={inp+" resize-none"}/>
            <ColorPicker label="Box BG" colorKey="contact_box_text_color" bgKey="contact_box_bg" defaultColor="rgba(255,255,255,0.75)" defaultBg="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box knapp text</label>
            <input value={data.contact_box_btn||""} onChange={e=>set("contact_box_btn",e.target.value)} placeholder="Boka tid nu" className={inp}/>
            <ColorPicker label="Knapp färger" colorKey="contact_box_btn_color" bgKey="contact_box_btn_bg" defaultColor="#141414" defaultBg="#ffffff" data={data} set={set}/>
          </div>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/MediaSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function MediaSection({ data, set, inp, lbl, logoRef, heroImgRef, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Bilder & Logotyp</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Logotyp</label>
            <button type="button" onClick={()=>set("show_logo", data.show_logo === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_logo !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_logo !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Logotyp</label>
            {data.logo_url && <img src={data.logo_url} alt="Logo" className="h-16 mb-3 rounded-xl border border-slate-100 p-2"/>}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "logo_url")}/>
            <button onClick={() => logoRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> Ladda upp logotyp
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 200×200px · PNG med transparent bakgrund</p>

          </div>

          <div>
            <label className={lbl}>Företagsnamn (Navbar, Footer & Kontakt-box)</label>
            <input value={data.company_name||""} onChange={e=>set("company_name",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Hero-bild (stor bild på startsidan)</label>
            <button type="button" onClick={()=>set("show_hero_image", !data.show_hero_image)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_image !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_image !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            {data.hero_image && <img src={data.hero_image} alt="Hero" className="w-full h-32 object-cover rounded-xl mb-3"/>}
            <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "hero_image")}/>
            <button onClick={() => heroImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> Ladda upp hero-bild
            </button>
            <p className="text-xs text-slate-400 mt-2">Rekommenderad storlek: 1200×600px</p>
          </div>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/NavbarSection.jsx
```jsx
import React from "react";
import { Trash2, Plus } from "lucide-react";
import { CircleColor } from "@/shared/ui";

export function NavbarSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Navbar</h3>
          <div>
            <label className={lbl}>Navbar BG färg</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.navbar_bg||"#ffffff"} onChange={e=>set("navbar_bg",e.target.value)}/>
              <span className="text-xs text-slate-400">Bakgrundsfärg</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">

            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Boka-knapp</label>
            <button type="button" onClick={()=>set("show_navbar_btn", data.show_navbar_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.nav_boka_text||""} onChange={e=>set("nav_boka_text",e.target.value)} placeholder="Boka tid" className={inp}/>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500">Text</span>
                <CircleColor value={data.navbar_btn_color||"#ffffff"} onChange={e=>set("navbar_btn_color",e.target.value)}/>
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.navbar_btn_bg||"#141414"} onChange={e=>set("navbar_btn_bg",e.target.value)}/>
              </div>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Menylänkar</label>
            <button type="button" onClick={()=>set("show_navbar_links", data.show_navbar_links === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_links !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_links !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">Länk färg</span>
            <CircleColor value={data.navbar_link_color||"#475569"} onChange={e=>set("navbar_link_color",e.target.value)}/>
          </div>
          {(data.nav_links||[]).map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={link.label||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],label:e.target.value};set("nav_links",l);}}
                placeholder="Länktext" className={inp}/>
              <select value={link.href||""} onChange={e=>{
                const l=[...data.nav_links];
                l[idx]={...l[idx],href:e.target.value==="custom" ? "" : e.target.value};
                set("nav_links",l);
              }} className={inp}>
                <optgroup label="— Samma sida —">
                  <option value="/#tjanster">Tjänster (/#tjanster)</option>
                  <option value="/#kontakt">Kontakt (/#kontakt)</option>
                  <option value="/#boka">Boka (/#boka)</option>
                  <option value="/#vart-arbete">Vårt arbete (/#vart-arbete)</option>
                  <option value="/#omdomen">Omdömen (/#omdomen)</option>
                  <option value="/#varfor-oss">Varför oss (/#varfor-oss)</option>
                </optgroup>
                <optgroup label="— Annan sida —">
                  <option value="/om-oss">Om oss (/om-oss)</option>
                  <option value="/faq">FAQ (/faq)</option>
                  <option value="/kundavtal">Kundavtal</option>
                  <option value="custom">✏️ Anpassad länk...</option>
                </optgroup>
              </select>
              {(!link.href || !["/#tjanster","/#kontakt","/#boka","/#vart-arbete","/#omdomen","/#varfor-oss","/om-oss","/faq","/kundavtal"].includes(link.href)) && (
                <input value={link.href||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],href:e.target.value};set("nav_links",l);}}
                  placeholder="https://..." className={inp}/>
              )}
              <button onClick={()=>set("nav_links",data.nav_links.filter((_,i)=>i!==idx))}
                className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nav_links",[...(data.nav_links||[]),{label:"",href:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till länk
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/SeoSection.jsx
```jsx
import React from "react";

export function SeoSection({ data, set, inp, lbl }) {
  return (
    <>
      <h3 className="font-semibold text-slate-800">SEO — Sökmotoroptimering</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-2">
        💡 SEO-inställningar hjälper Google att hitta och visa din webbplats korrekt.
      </div>
      <div>
        <label className={lbl}>Meta Title (sidrubrik i Google)</label>
        <input value={data.seo_title||""} onChange={e=>set("seo_title",e.target.value)}
          placeholder="PureNorth Städ – Professionell städning i Umeå"
          className={inp}/>
        <p className="text-xs text-slate-400 mt-1">Rekommenderat: 50–60 tecken ({(data.seo_title||"").length}/60)</p>
      </div>
      <div>
        <label className={lbl}>Meta Description (beskrivning i Google)</label>
        <textarea value={data.seo_description||""} onChange={e=>set("seo_description",e.target.value)}
          rows={3} placeholder="Vi erbjuder professionell hemstädning, flyttstädning och kontorsstädning i Umeå. SRY-utbildad personal och miljövänliga produkter."
          className={inp+" resize-none"}/>
        <p className="text-xs text-slate-400 mt-1">Rekommenderat: 150–160 tecken ({(data.seo_description||"").length}/160)</p>
      </div>
      <div>
        <label className={lbl}>Keywords (sökord, kommaseparerade)</label>
        <input value={data.seo_keywords||""} onChange={e=>set("seo_keywords",e.target.value)}
          placeholder="städning Umeå, hemstädning, flyttstädning, SRY"
          className={inp}/>
      </div>
      <div>
        <label className={lbl}>OG Image URL (bild som visas vid delning)</label>
        <input value={data.seo_og_image||""} onChange={e=>set("seo_og_image",e.target.value)}
          placeholder="https://..." className={inp}/>
        <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 1200×630px</p>
      </div>
      {data.seo_title && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-2 font-medium">Förhandsgranskning i Google:</p>
          <p className="text-blue-600 text-sm font-medium">{data.seo_title}</p>
          <p className="text-green-700 text-xs">purenorth-stad.vercel.app</p>
          <p className="text-slate-600 text-xs mt-1">{data.seo_description}</p>
        </div>
      )}
    </>
  );
}

```

---

## frontend/src/features/settings/sections/ServicesSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function ServicesSection({ data, set, inp, lbl, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Tjänster</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_tjanster_in_navbar", data.show_tjanster_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_tjanster_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_tjanster_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett</label>
            <button type="button" onClick={()=>set("show_services_label", data.show_services_label === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_services_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_services_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.services_label||""} onChange={e=>set("services_label",e.target.value)} placeholder="Våra tjänster" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="services_label_color" data={data} set={set}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_services_title", data.show_services_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_services_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_services_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.services_title||""} onChange={e=>set("services_title",e.target.value)} placeholder="Städtjänster för hem och företag" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="services_title_color" data={data} set={set}/>
            </div>
          </div>

          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänstekort</h4>
          {(data.services||[]).map((svc, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Kort {idx+1}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={()=>{const s=[...data.services];s[idx]={...s[idx],show:s[idx].show===false?true:false};set("services",s);}}
                    className={`w-10 h-5 rounded-full transition-colors ${svc.show!==false?"bg-blue-500":"bg-slate-200"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${svc.show!==false?"translate-x-5":"translate-x-0"}`}/>
                  </button>
                  <button onClick={()=>set("services", data.services.filter((_,i)=>i!==idx))}
                    className="text-slate-400 hover:text-red-500">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              <div>
                <label className={lbl}>Namn</label>
                <input value={svc.title||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],title:e.target.value};set("services",s);}} placeholder="Hemstädning" className={inp}/>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Färg</span>
                  <CircleColor value={svc.title_color||"#0f172a"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],title_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Beskrivning</label>
                <textarea value={svc.desc||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],desc:e.target.value};set("services",s);}} rows={2} className={inp+" resize-none"}/>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Färg</span>
                  <CircleColor value={svc.desc_color||"#475569"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],desc_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Ikon</label>
                <select value={svc.icon_name||"Home"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],icon_name:e.target.value};set("services",s);}} className={inp}>
                  <option value="Home">🏠 Home</option>
                  <option value="Truck">🚚 Truck</option>
                  <option value="Building2">🏢 Building2</option>
                  <option value="Sparkles">✨ Sparkles</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Award">🏆 Award</option>
                </select>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Ikon färg</span>
                  <CircleColor value={svc.icon_color||"#166534"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],icon_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Bild</label>
                {svc.img && <div className="relative mb-2"><img src={svc.img} alt="" className="w-full h-24 object-cover rounded-lg"/><button onClick={()=>{const s=[...data.services];s[idx]={...s[idx],img:""};set("services",s);}} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
                <input type="file" accept="image/*" className="hidden" id={`svc-img-${idx}`} onChange={async e=>{
                  if(!e.target.files[0]) return;
                  const url = await uploadImage(e.target.files[0], `service${idx}_img`);
                  const s=[...data.services];s[idx]={...s[idx],img:url};set("services",s);
                }}/>
                <button onClick={()=>document.getElementById(`svc-img-${idx}`).click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
                  <Upload size={12}/> {svc.img ? "Byt bild" : "Ladda upp bild"}
                </button>
                <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 940×650px</p>
              </div>
            </div>
          ))}
          <button onClick={()=>set("services",[...(data.services||[]),{title:"",desc:"",img:"",show:true,icon_name:"Home",icon_color:"#166534"}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/SocialSection.jsx
```jsx
import React from "react";

export function SocialSection({ data, set, inp, lbl }) {
  return (
    <>
      <h3 className="font-semibold text-slate-800">Sociala medier</h3>
      <div>
        <label className={lbl}>Facebook URL</label>
        <input value={data.facebook_url || ""} onChange={e => set("facebook_url", e.target.value)} placeholder="https://facebook.com/purenorth" className={inp}/>
      </div>
      <div>
        <label className={lbl}>Instagram URL</label>
        <input value={data.instagram_url || ""} onChange={e => set("instagram_url", e.target.value)} placeholder="https://instagram.com/purenorth" className={inp}/>
      </div>
    </>
  );
}

```

---

## frontend/src/features/settings/sections/TestimonialsSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker } from "@/shared/ui";

export function TestimonialsSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Omdömen</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Omdömen</label>
            <button type="button" onClick={()=>set("show_omdomen", data.show_omdomen === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_omdomen !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_omdomen !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Etikett</label>
              <button type="button" onClick={()=>set("show_testimonials_label", data.show_testimonials_label === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_testimonials_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_testimonials_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
              <input value={data.testimonials_label||""} onChange={e=>set("testimonials_label",e.target.value)} placeholder="Omdömen" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="testimonials_label_color" defaultColor="#141414" data={data} set={set}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Rubrik</label>
              <button type="button" onClick={()=>set("show_testimonials_title", data.show_testimonials_title === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_testimonials_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_testimonials_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
              <input value={data.testimonials_title||""} onChange={e=>set("testimonials_title",e.target.value)} placeholder="Vad våra kunder säger" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="testimonials_title_color" defaultColor="#141414" data={data} set={set}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Kort färger</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Kort BG</span>
              <CircleColor value={data.testimonials_card_bg||"#ffffff"} onChange={e=>set("testimonials_card_bg",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Ikon</span>
              <CircleColor value={data.testimonials_icon_color||"#141414"} onChange={e=>set("testimonials_icon_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.testimonials_text_color||"#334155"} onChange={e=>set("testimonials_text_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Namn</span>
              <CircleColor value={data.testimonials_name_color||"#0f172a"} onChange={e=>set("testimonials_name_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Roll</span>
              <CircleColor value={data.testimonials_role_color||"#64748b"} onChange={e=>set("testimonials_role_color",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Featured omdömen</h4>
          <p className="text-xs text-slate-500 mb-3">Dessa visas alltid högst upp. Lämna tomt för att använda standardomdömena.</p>
          {(data.featured_reviews||[]).map((r, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 relative">
              <button onClick={()=>set("featured_reviews", data.featured_reviews.filter((_,i)=>i!==idx))}
                className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                <Trash2 size={14}/>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Namn</label>
                  <input value={r.name||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],name:e.target.value};set("featured_reviews",s);}} placeholder="Anna Andersson" className={inp}/>
                </div>
                <div>
                  <label className={lbl}>Roll</label>
                  <input value={r.role||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],role:e.target.value};set("featured_reviews",s);}} placeholder="Privatkund, Umeå" className={inp}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Betyg (1-5)</label>
                <input type="number" min="1" max="5" step="0.5" value={r.rating||5} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],rating:Number(e.target.value)};set("featured_reviews",s);}} className={inp}/>
              </div>
              <div>
                <label className={lbl}>Omdöme</label>
                <textarea value={r.text||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],text:e.target.value};set("featured_reviews",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("featured_reviews",[...(data.featured_reviews||[]),{name:"",role:"",rating:5,text:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till omdöme
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/VartArbeteSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker } from "@/shared/ui";

export function VartArbeteSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Vårt arbete – Före & efter</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_vart_in_navbar", data.show_vart_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_vart_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_vart_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa sektion</label>
            <button type="button" onClick={()=>set("show_vart", data.show_vart === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_vart !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_vart !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.vart_bg||"#141414"} onChange={e=>set("vart_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.vart_label||""} onChange={e=>set("vart_label",e.target.value)} placeholder="Vårt arbete" className={inp}/>
            <TextColorPicker label="Färg" colorKey="vart_label_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.vart_title||""} onChange={e=>set("vart_title",e.target.value)} placeholder="Före & efter" className={inp}/>
            <TextColorPicker label="Färg" colorKey="vart_title_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.vart_subtitle||""} onChange={e=>set("vart_subtitle",e.target.value)} rows={2} placeholder="Dra i reglaget för att se skillnaden..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="vart_subtitle_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Labels & färger</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Före label text</label>
              <input value={data.vart_fore_label||""} onChange={e=>set("vart_fore_label",e.target.value)} placeholder="Före" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.vart_fore_label_bg||"#141414"} onChange={e=>set("vart_fore_label_bg",e.target.value)}/>
              </div>
            </div>
            <div>
              <label className={lbl}>Efter label text</label>
              <input value={data.vart_efter_label||""} onChange={e=>set("vart_efter_label",e.target.value)} placeholder="Efter" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.vart_efter_label_bg||"#166534"} onChange={e=>set("vart_efter_label_bg",e.target.value)}/>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Handle färg</span>
            <CircleColor value={data.vart_handle_color||"#141414"} onChange={e=>set("vart_handle_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Bilder (Före & Efter)</h4>
          {(data.vart_slides||[]).map((slide, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("vart_slides",data.vart_slides.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-slate-600">Bild {idx+1}: {slide.alt||""}</p>
                <button type="button" onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],show:s[idx].show===false?true:false};set("vart_slides",s);}}
                  className={`w-10 h-5 rounded-full transition-colors ${slide.show!==false?"bg-blue-500":"bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${slide.show!==false?"translate-x-5":"translate-x-0"}`}/>
                </button>
              </div>
              <input value={slide.alt||""} onChange={e=>{const s=[...data.vart_slides];s[idx]={...s[idx],alt:e.target.value};set("vart_slides",s);}} placeholder="Alt text (t.ex. Sovrum)" className={inp}/>
              <div>
                <label className={lbl}>Visningsläge</label>
                <select value={slide.mode||"slider"} onChange={e=>{const s=[...data.vart_slides];s[idx]={...s[idx],mode:e.target.value};set("vart_slides",s);}} className={inp}>
                  <option value="slider">↔️ Före & efter slider</option>
                  <option value="before">📷 Bara Före-bild</option>
                  <option value="after">📷 Bara Efter-bild</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Före bild</label>
                  {slide.before && <div className="relative mb-1"><img src={slide.before} alt="" className="w-full h-16 object-cover rounded"/><button onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],before:""};set("vart_slides",s);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-4 w-4 text-xs">✕</button></div>}
                  <input id={`vart-before-${idx}`} type="file" accept="image/*" className="hidden" onChange={async e=>{if(!e.target.files[0])return;const url=await uploadImage(e.target.files[0],`vart_before_${idx}`);const s=[...data.vart_slides];s[idx]={...s[idx],before:url};set("vart_slides",s);}}/>
                  <button onClick={()=>document.getElementById(`vart-before-${idx}`).click()} className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs hover:border-slate-400"><Upload size={10}/> {slide.before?"Byt":"Ladda upp"}</button>
                </div>
                <div>
                  <label className={lbl}>Efter bild</label>
                  {slide.after && <div className="relative mb-1"><img src={slide.after} alt="" className="w-full h-16 object-cover rounded"/><button onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],after:""};set("vart_slides",s);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-4 w-4 text-xs">✕</button></div>}
                  <input id={`vart-after-${idx}`} type="file" accept="image/*" className="hidden" onChange={async e=>{if(!e.target.files[0])return;const url=await uploadImage(e.target.files[0],`vart_after_${idx}`);const s=[...data.vart_slides];s[idx]={...s[idx],after:url};set("vart_slides",s);}}/>
                  <button onClick={()=>document.getElementById(`vart-after-${idx}`).click()} className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs hover:border-slate-400"><Upload size={10}/> {slide.after?"Byt":"Ladda upp"}</button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={()=>set("vart_slides",[...(data.vart_slides||[]),{before:"",after:"",alt:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till bild
          </button>
        </>
  );
}

```

---

## frontend/src/features/settings/sections/WhyUsSection.jsx
```jsx
import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function WhyUsSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Varför välja oss?</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar & sidan</label>
            <button type="button" onClick={()=>set("show_whyus_in_navbar", data.show_whyus_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett</label>
            <button type="button" onClick={()=>set("show_whyus_label", data.show_whyus_label === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.whyus_label||""} onChange={e=>set("whyus_label",e.target.value)} placeholder="Varför välja oss?" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="whyus_label_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_whyus_title", data.show_whyus_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.whyus_title||""} onChange={e=>set("whyus_title",e.target.value)} rows={2} placeholder="Kvalitet du känner och naturen tackar för" className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="whyus_title_color" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🏆 Stort svart kort (SRY)</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa SRY-kort</label>
            <button type="button" onClick={()=>set("show_sry_card", data.show_sry_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_sry_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_sry_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.sry_title||""} onChange={e=>set("sry_title",e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="sry_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.sry_text||""} onChange={e=>set("sry_text",e.target.value)} rows={3} placeholder="Med kvalifikation från Servicebranschens..." className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="sry_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Taggar (kommaseparerade)</label>
            <input value={data.sry_tags||""} onChange={e=>set("sry_tags",e.target.value)} placeholder="SRY-utbildad personal, Hög standard, Trygg & försäkrad" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.sry_icon||"Award"} onChange={e=>set("sry_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.sry_icon_color||"#ffffff"} onChange={e=>set("sry_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.sry_bg||"#141414"} onChange={e=>set("sry_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🌿 Eco-kort</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Eco-kort</label>
            <button type="button" onClick={()=>set("show_eco_card", data.show_eco_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_eco_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_eco_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.eco_title||""} onChange={e=>set("eco_title",e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="eco_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.eco_text||""} onChange={e=>set("eco_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="eco_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.eco_icon||"Leaf"} onChange={e=>set("eco_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.eco_icon_color||"#166534"} onChange={e=>set("eco_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.eco_card_bg||"#ffffff"} onChange={e=>set("eco_card_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">💰 RUT-kort</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa RUT-kort</label>
            <button type="button" onClick={()=>set("show_rut_card", data.show_rut_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_rut_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_rut_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.rut_title||""} onChange={e=>set("rut_title",e.target.value)} placeholder="50% RUT-avdrag" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="rut_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.rut_text||""} onChange={e=>set("rut_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="rut_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.rut_icon||"Percent"} onChange={e=>set("rut_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.rut_icon_color||"#166534"} onChange={e=>set("rut_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.rut_card_bg||"#ffffff"} onChange={e=>set("rut_card_bg",e.target.value)}/>
          </div>
        </>
  );
}

```

---

