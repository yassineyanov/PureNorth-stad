from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
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


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
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


class Employee(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    phone: Optional[str] = None
    color: str = "#166534"
    hourly_rate: float = 0
    personnummer: Optional[str] = None
    employment_type: str = "fastanstalld"
    created_at: str


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None
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
    category: str = "Övrigt"
    description: Optional[str] = None


class ExpenseUpdate(BaseModel):
    employee_id: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


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


# ---- Payroll settings (OB-tillägg + salary codes for PAXML) ----
class PayrollSettings(BaseModel):
    ob1_label: str = "Kväll/Lördag"
    ob1_extra: float = 0
    ob1_days: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5])
    ob1_start: str = "18:00"
    ob1_end: str = "24:00"
    ob2_label: str = "Söndag/Helg"
    ob2_extra: float = 0
    ob2_days: List[int] = Field(default_factory=lambda: [6])
    ob2_start: str = "00:00"
    ob2_end: str = "24:00"
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
    description: str = Field(..., min_length=1)
    quantity: float = 1
    unit_price: float = 0
    is_material: bool = False


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
    labor_total: float
    material_total: float
    subtotal: float
    vat_amount: float
    total_amount: float
    rut_deduction: float
    customer_pays: float
    created_at: str
    paid_at: Optional[str] = None


def calc_invoice_amounts(items: list, rut_eligible: bool, customer_type: str, vat_rate: float):
    labor_total = sum(i["quantity"] * i["unit_price"] for i in items if not i.get("is_material"))
    material_total = sum(i["quantity"] * i["unit_price"] for i in items if i.get("is_material"))
    subtotal = labor_total + material_total
    vat_amount = subtotal * vat_rate / 100.0
    total_amount = subtotal + vat_amount
    rut_deduction = 0.0
    if rut_eligible and customer_type == "private":
        rut_deduction = round(labor_total * 0.5, 2)
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
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    elements = []

    # Logo + company name side by side
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=20, leading=24)
    inv_num_style = ParagraphStyle("invnum", parent=styles["Normal"], fontSize=11, textColor=colors.HexColor("#555555"))
    if settings.company_logo:
        try:
            from reportlab.platypus import Image as RLImage
            from reportlab.lib.utils import ImageReader
            logo_data = base64.b64decode(settings.company_logo.split(",")[-1])
            logo_buf = BytesIO(logo_data)
            ir = ImageReader(logo_buf)
            iw, ih = ir.getSize()
            max_h = 18 * mm
            ratio = max_h / ih
            logo_buf.seek(0)
            logo_img = RLImage(logo_buf, width=iw * ratio, height=max_h)
            header_data = [[logo_img, Paragraph(f'<b>{settings.company_name or "Faktura"}</b>', title_style)]]
            header_table = Table(header_data, colWidths=[iw * ratio + 6 * mm, None])
            header_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            elements.append(header_table)
        except Exception:
            elements.append(Paragraph(settings.company_name or "Faktura", title_style))
    else:
        elements.append(Paragraph(settings.company_name or "Faktura", title_style))
    elements.append(Paragraph(f"Faktura #{inv['invoice_number']}", inv_num_style))
    elements.append(Spacer(1, 6 * mm))

    company_lines = []
    if settings.company_orgnr:
        company_lines.append(f"Org.nr: {settings.company_orgnr}")
    if settings.company_address:
        company_lines.append(settings.company_address)
    if settings.company_email:
        company_lines.append(settings.company_email)
    if settings.company_phone:
        company_lines.append(settings.company_phone)
    for line in company_lines:
        elements.append(Paragraph(line, styles["Normal"]))

    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph("Kund", styles["Heading3"]))
    elements.append(Paragraph(inv["customer_name"], styles["Normal"]))
    if inv.get("customer_address"):
        elements.append(Paragraph(inv["customer_address"], styles["Normal"]))
    if inv.get("customer_email"):
        elements.append(Paragraph(inv["customer_email"], styles["Normal"]))
    if inv.get("rut_eligible") and inv.get("customer_personnummer"):
        elements.append(Paragraph(f"Personnummer: {inv['customer_personnummer']}", styles["Normal"]))

    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(f"Fakturadatum: {inv['created_at'][:10]}", styles["Normal"]))
    elements.append(Paragraph(f"Förfallodatum: {inv['due_date']}", styles["Normal"]))

    elements.append(Spacer(1, 8 * mm))
    all_hem = all(i["description"].strip().lower() in ("hemstädning", "hemstadning") for i in inv["items"])
    qty_header = "Timmar" if all_hem else "Antal"
    data = [["Beskrivning", qty_header, "À-pris (kr)", "Summa (kr)"]]
    for item in inv["items"]:
        line_total = item["quantity"] * item["unit_price"]
        is_hem = item["description"].strip().lower() in ("hemstädning", "hemstadning")
        unit_label = f'{item["quantity"]:g}' if all_hem else (f'{item["quantity"]:g} tim' if is_hem else f'{item["quantity"]:g}')
        data.append([item["description"], unit_label, f'{item["unit_price"]:.2f}', f'{line_total:.2f}'])
    table = Table(data, colWidths=[80 * mm, 25 * mm, 30 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#141414")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
    ]))
    elements.append(table)

    elements.append(Spacer(1, 6 * mm))
    totals_data = [
        ["Delsumma (exkl. moms)", f"{inv['subtotal']:.2f} kr"],
        [f"Moms ({settings.vat_rate:g}%)", f"{inv['vat_amount']:.2f} kr"],
        ["Totalt", f"{inv['total_amount']:.2f} kr"],
    ]
    if inv.get("rut_eligible") and inv.get("rut_deduction", 0) > 0:
        totals_data.append(["RUT-avdrag (50% av arbetskostnad)", f"-{inv['rut_deduction']:.2f} kr"])
        totals_data.append(["Att betala", f"{inv['customer_pays']:.2f} kr"])
    totals_table = Table(totals_data, colWidths=[100 * mm, 35 * mm])
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#141414")),
    ]))
    elements.append(totals_table)

    elements.append(Spacer(1, 10 * mm))
    pay_lines = []
    if settings.bankgiro:
        pay_lines.append(f"Bankgiro: {settings.bankgiro}")
    if settings.plusgiro:
        pay_lines.append(f"Plusgiro: {settings.plusgiro}")
    if settings.iban:
        pay_lines.append(f"IBAN: {settings.iban}")
    if pay_lines:
        elements.append(Paragraph("Betalningsinformation", styles["Heading3"]))
        for line in pay_lines:
            elements.append(Paragraph(line, styles["Normal"]))

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

    for eid, row in summary.items():
        rate = row["hourly_rate"]
        base_pay = row["normal_h"] * rate
        ob1_pay = row["ob1_h"] * settings.ob1_extra
        ob2_pay = row["ob2_h"] * settings.ob2_extra
        row["base_pay"] = base_pay
        row["ob1_pay"] = ob1_pay
        row["ob2_pay"] = ob2_pay
        row["total_pay"] = base_pay + ob1_pay + ob2_pay + row["expense_total"]

    return summary, settings


def build_xlsx_bytes(summary: dict) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Löneunderlag"
    headers = [
        "Anställd", "Typ", "Personnummer", "Normaltid (h)", "OB1 (h)", "OB2 (h)",
        "Grundlön (kr)", "OB1-tillägg (kr)", "OB2-tillägg (kr)",
        "Utlägg (kr)", "Frånvarodagar (totalt)", "Frånvarodagar (bokade pass)",
        "Förlorad lön vid frånvaro (kr)", "Summa (kr)",
    ]
    ws.append(headers)
    for row in summary.values():
        type_label = "Vikarie" if row.get("employment_type") == "vikarie" else "Fast anställd"
        ws.append([
            row["name"], type_label, row["personnummer"],
            round(row["normal_h"], 2), round(row["ob1_h"], 2), round(row["ob2_h"], 2),
            round(row["base_pay"], 2), round(row["ob1_pay"], 2), round(row["ob2_pay"], 2),
            round(row["expense_total"], 2), row["absence_days"], row["absence_scheduled_days"],
            round(row["absence_lost_amount"], 2), round(row["total_pay"], 2),
        ])
    for col in ws.columns:
        max_len = max(len(str(c.value)) if c.value is not None else 0 for c in col)
        ws.column_dimensions[col[0].column_letter].width = max(12, max_len + 2)
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


# ---------------------------------------------------------------------------
# App / Router
# ---------------------------------------------------------------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "PureNorth Städ API"}


# ---- Auth ----
@api_router.post("/auth/login")
async def login(payload: LoginRequest):
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
async def create_booking(payload: BookingCreate):
    doc = payload.model_dump()
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
    return {"success": True}


@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current=Depends(get_current_user)):
    result = await db.bookings.delete_one({"_id": to_object_id(booking_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bokning hittades inte")
    return {"success": True}


# ---- Reviews ----
@api_router.post("/reviews", response_model=Review, response_model_by_alias=False)
async def create_review(payload: ReviewCreate):
    doc = payload.model_dump()
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
    amounts = calc_invoice_amounts(items, payload.rut_eligible, payload.customer_type, inv_settings.vat_rate)
    number = await get_next_invoice_number()
    due_date = payload.due_date or (DateClass.today() + timedelta(days=inv_settings.payment_terms_days)).isoformat()

    doc = payload.model_dump()
    doc["items"] = items
    doc["invoice_number"] = number
    doc["due_date"] = due_date
    doc["status"] = "draft"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["paid_at"] = None
    doc.update(amounts)

    result = await db.invoices.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return Invoice(**doc)


@api_router.get("/invoices", response_model=List[Invoice], response_model_by_alias=False)
async def list_invoices(current=Depends(get_current_user)):
    docs = await db.invoices.find().sort("invoice_number", -1).to_list(2000)
    return [Invoice(**{**d, "_id": str(d["_id"])}) for d in docs]


@api_router.patch("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, payload: InvoiceStatusUpdate, current=Depends(get_current_user)):
    updates = {"status": payload.status}
    if payload.status == "paid":
        updates["paid_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.invoices.update_one({"_id": to_object_id(invoice_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")
    return {"success": True}


@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current=Depends(get_current_user)):
    result = await db.invoices.delete_one({"_id": to_object_id(invoice_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")
    return {"success": True}


@api_router.put("/invoices/{invoice_id}", response_model=Invoice, response_model_by_alias=False)
async def update_invoice(invoice_id: str, payload: InvoiceCreate, current=Depends(get_current_user)):
    existing = await db.invoices.find_one({"_id": to_object_id(invoice_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Faktura hittades inte")
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
        headers={"Content-Disposition": f'attachment; filename="faktura_{doc["invoice_number"]}.pdf"'},
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
        topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
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

    # Pay details table
    rate = row["hourly_rate"]
    pay_data = [
        ["Post", "Timmar", "À-pris (kr)", "Belopp (kr)"],
        ["Normaltid", f'{row["normal_h"]:.2f}', f'{rate:.2f}', f'{row["base_pay"]:.2f}'],
    ]
    if row["ob1_h"] > 0:
        pay_data.append([f'OB1-tillägg ({settings.ob1_label})', f'{row["ob1_h"]:.2f}', f'{settings.ob1_extra:.2f}', f'{row["ob1_pay"]:.2f}'])
    if row["ob2_h"] > 0:
        pay_data.append([f'OB2-tillägg ({settings.ob2_label})', f'{row["ob2_h"]:.2f}', f'{settings.ob2_extra:.2f}', f'{row["ob2_pay"]:.2f}'])
    if row["expense_total"] > 0:
        pay_data.append(["Utlägg", "-", "-", f'{row["expense_total"]:.2f}'])

    pay_table = Table(pay_data, colWidths=[75*mm, 30*mm, 35*mm, 30*mm])
    pay_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#141414")),
        ("TEXTCOLOR", (0,0),(-1,0), colors.white),
        ("FONTSIZE", (0,0),(-1,-1), 10),
        ("ALIGN", (1,0),(-1,-1), "RIGHT"),
        ("GRID", (0,0),(-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOTTOMPADDING", (0,0),(-1,0), 8),
        ("TOPPADDING", (0,0),(-1,0), 8),
    ]))
    elements.append(pay_table)
    elements.append(Spacer(1, 4*mm))

    # Total
    total_data = [["Totalt att betala:", f'{row["total_pay"]:.2f} kr']]
    if row.get("absence_days", 0) > 0:
        total_data.append(["Frånvarodagar:", str(row["absence_days"])])
    if row.get("absence_lost_amount", 0) > 0 and row.get("employment_type") == "fastanstalld":
        total_data.append(["Förlorad lön vid frånvaro:", f'-{row["absence_lost_amount"]:.2f} kr'])
    total_table = Table(total_data, colWidths=[100*mm, 40*mm])
    total_table.setStyle(TableStyle([
        ("FONTSIZE", (0,0),(-1,-1), 11),
        ("FONTNAME", (0,0),(-1,-1), "Helvetica-Bold"),
        ("ALIGN", (1,0),(-1,-1), "RIGHT"),
        ("LINEABOVE", (0,0),(-1,0), 1, colors.HexColor("#141414")),
        ("TOPPADDING", (0,0),(-1,-1), 6),
    ]))
    elements.append(total_table)

    doc.build(elements)
    fname = f"lonebesked_{row['name'].replace(' ','_')}_{start}_{end}.pdf"
    return Response(content=buf.getvalue(), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'})

app.include_router(api_router)

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
