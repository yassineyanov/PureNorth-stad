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
import bcrypt
import jwt
from openpyxl import Workbook

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


class Employee(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    phone: Optional[str] = None
    color: str = "#166534"
    hourly_rate: float = 0
    personnummer: Optional[str] = None
    created_at: str


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None
    hourly_rate: Optional[float] = None
    personnummer: Optional[str] = None


# ---- Shifts (Schema) ----
class ShiftCreate(BaseModel):
    employee_id: str
    date: str  # "YYYY-MM-DD"
    start_time: str  # "HH:MM"
    end_time: str  # "HH:MM"
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
    weekday = DateClass(y, m, d).weekday()  # 0=Mon ... 6=Sun

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

    summary = {}
    for emp in employees:
        eid = str(emp["_id"])
        summary[eid] = {
            "name": emp["name"],
            "personnummer": emp.get("personnummer") or "",
            "hourly_rate": emp.get("hourly_rate", 0) or 0,
            "normal_h": 0.0,
            "ob1_h": 0.0,
            "ob2_h": 0.0,
            "expense_total": 0.0,
            "absence_days": 0,
        }

    for s in shifts:
        eid = s["employee_id"]
        if eid not in summary:
            continue
        n, o1, o2 = split_shift_hours(s["date"], s["start_time"], s["end_time"], settings)
        summary[eid]["normal_h"] += n
        summary[eid]["ob1_h"] += o1
        summary[eid]["ob2_h"] += o2

    for e in expenses:
        eid = e["employee_id"]
        if eid in summary:
            summary[eid]["expense_total"] += e["amount"]

    range_start = DateClass(*map(int, start.split("-")))
    range_end = DateClass(*map(int, end.split("-")))
    for a in absences:
        eid = a["employee_id"]
        if eid in summary:
            sd = DateClass(*map(int, a["start_date"].split("-")))
            ed = DateClass(*map(int, a["end_date"].split("-")))
            clip_s = max(sd, range_start)
            clip_e = min(ed, range_end)
            if clip_e >= clip_s:
                summary[eid]["absence_days"] += (clip_e - clip_s).days + 1

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
        "Anställd", "Personnummer", "Normaltid (h)", "OB1 (h)", "OB2 (h)",
        "Grundlön (kr)", "OB1-tillägg (kr)", "OB2-tillägg (kr)",
        "Utlägg (kr)", "Frånvarodagar", "Summa (kr)",
    ]
    ws.append(headers)
    for row in summary.values():
        ws.append([
            row["name"], row["personnummer"],
            round(row["normal_h"], 2), round(row["ob1_h"], 2), round(row["ob2_h"], 2),
            round(row["base_pay"], 2), round(row["ob1_pay"], 2), round(row["ob2_pay"], 2),
            round(row["expense_total"], 2), row["absence_days"], round(row["total_pay"], 2),
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
