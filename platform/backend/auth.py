"""
Email + password JWT auth for PureNorth Platform.
Bearer-token model (Authorization: Bearer <jwt>) — works with existing wildcard CORS.
"""
from __future__ import annotations
import os, uuid, secrets, logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, ConfigDict

logger = logging.getLogger("purenorth.auth")

JWT_ALG = "HS256"
ACCESS_MIN = 60 * 24 * 30  # 30 days
RESET_MIN = 60


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, company_id: str = "") -> str:
    payload = {
        "sub": user_id,
        "company_id": company_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALG)


# ---------- Models ----------
class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "user"
    created_at: str


def _user_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["id"],
        email=doc["email"],
        name=doc.get("name", ""),
        role=doc.get("role", "user"),
        created_at=doc.get("created_at", ""),
    )


# ---------- Dependency ----------
_bearer = HTTPBearer(auto_error=False)


async def _get_user_from_token(request: Request, creds: Optional[HTTPAuthorizationCredentials]) -> dict:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, _secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        db = request.app.state.db
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def current_user(request: Request, creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    return await _get_user_from_token(request, creds)


# ---------- Router factory ----------
def build_auth_router(db, send_email, wrap_email, frontend_url: str) -> APIRouter:
    router = APIRouter(prefix="/auth")

    async def _ensure_indexes():
        await db.users.create_index("email", unique=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

    async def _create_user(email: str, name: str, password_hash: str, role: str = "user") -> dict:
        company_id = str(uuid.uuid4())
        doc = {
            "id": str(uuid.uuid4()),
            "email": email.lower().strip(),
            "name": name.strip(),
            "password_hash": password_hash,
            "role": role,
            "company_id": company_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        return doc

    @router.post("/register", response_model=UserOut)
    async def register(payload: RegisterIn):
        await _ensure_indexes()
        email = payload.email.lower().strip()
        if await db.users.find_one({"email": email}):
            raise HTTPException(409, "En användare med den här e-postadressen finns redan.")
        doc = await _create_user(email, payload.name, hash_password(payload.password))
        token = create_access_token(doc["id"], doc["email"], doc.get("company_id",""))
        return {**_user_out(doc).model_dump(), "access_token": token, "token_type": "bearer"}

    @router.post("/login")
    async def login(payload: LoginIn):
        email = payload.email.lower().strip()
        user = await db.users.find_one({"email": email})
        if not user or not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(401, "Fel e-post eller lösenord.")
        token = create_access_token(user["id"], user["email"], user.get("company_id",""))
        return {**_user_out(user).model_dump(), "access_token": token, "token_type": "bearer"}

    @router.get("/me", response_model=UserOut)
    async def me(user: dict = Depends(current_user)):
        return _user_out(user)

    @router.post("/forgot-password")
    async def forgot(payload: ForgotIn):
        email = payload.email.lower().strip()
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user:
            token = secrets.token_urlsafe(32)
            await db.password_reset_tokens.insert_one({
                "token": token,
                "user_id": user["id"],
                "email": email,
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=RESET_MIN),
                "used": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            link = f"{frontend_url.rstrip('/')}/reset-password?token={token}"
            title = "Återställ ditt lösenord"
            body = f"""
              <p>Hej {user.get('name', '')},</p>
              <p>Klicka på länken nedan för att välja ett nytt lösenord. Länken är giltig i 60 minuter.</p>
              <p><a href="{link}" style="display:inline-block;background:#09090b;color:#fff;padding:12px 20px;border-radius:9999px;text-decoration:none;font-weight:600;">Välj nytt lösenord</a></p>
              <p style="color:#71717a;font-size:12px;margin-top:24px;">Om du inte begärde detta kan du ignorera mejlet.</p>
            """
            await send_email(to=email, subject=title, html=wrap_email(title, body, "sv"))
        # Uniform response to prevent user enumeration
        return {"ok": True}

    @router.post("/reset-password")
    async def reset(payload: ResetIn):
        rec = await db.password_reset_tokens.find_one({"token": payload.token})
        if not rec or rec.get("used"):
            raise HTTPException(400, "Ogiltig eller använd återställningslänk.")
        expires_at = rec.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < datetime.now(timezone.utc):
            raise HTTPException(400, "Länken har gått ut.")
        await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}})
        await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
        return {"ok": True}

    return router


# ---------- Bootstrap helpers ----------
async def seed_admin(db):
    email = os.environ.get("ADMIN_EMAIL", "admin@purenorth.se").lower().strip()
    pw = os.environ.get("ADMIN_PASSWORD", "PureNorth2026!")
    existing = await db.users.find_one({"email": email})
    now = datetime.now(timezone.utc).isoformat()
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": "Admin",
            "password_hash": hash_password(pw),
            "role": "admin",
            "created_at": now,
        })
        logger.info("Seeded admin user: %s", email)
    elif not verify_password(pw, existing.get("password_hash", "")):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})
        logger.info("Updated admin password: %s", email)


async def ensure_user_from_email(db, email: str, name: Optional[str] = None) -> dict:
    """Create a user for a paying Stripe customer if they don't have one yet.
    Returns the user document. Also issues a password-reset token so the user can set their password.
    """
    email = email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        return existing
    tmp_pw = secrets.token_urlsafe(16)
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": name or email.split("@")[0].title(),
        "password_hash": hash_password(tmp_pw),
        "role": "user",
        "source": "stripe_checkout",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return doc
