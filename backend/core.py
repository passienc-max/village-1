import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from html import escape

import bcrypt
import jwt
from fastapi import Request, HTTPException, Depends, Response
from motor.motor_asyncio import AsyncIOMotorClient

from email_service import send_email, EMAIL_FROM_NAME

logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
APP_URL = os.environ["APP_URL"].rstrip("/")

CATEGORIES = ["ride", "laundry", "groceries", "school", "childcare", "meals", "other"]
NEIGHBORHOODS = ["Klamath Falls", "Altamont", "Henley", "Merrill", "Malin", "Chiloquin",
                 "Bonanza", "Keno", "Midland", "Beatty", "Sprague River", "Other"]
ROLES = ["parent", "volunteer", "both"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: str):
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    return payload if payload.get("type") == expected_type else None


def set_auth_cookies(response: Response, user_id: str, email: str):
    opts = dict(httponly=True, secure=True, samesite="none", path="/")
    response.set_cookie("access_token", create_access_token(user_id, email), max_age=900, **opts)
    response.set_cookie("refresh_token", create_refresh_token(user_id), max_age=604800, **opts)


def as_aware(value) -> datetime:
    dt = datetime.fromisoformat(value) if isinstance(value, str) else value
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _user_id_from_request(request: Request):
    auth = request.headers.get("Authorization", "")
    bearer = auth[7:] if auth.startswith("Bearer ") else None
    for token in (request.cookies.get("access_token"), bearer):
        if token:
            payload = decode_token(token, "access")
            if payload:
                return payload["sub"]
    for token in (request.cookies.get("session_token"), bearer):
        if token:
            sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
            if sess and as_aware(sess["expires_at"]) > datetime.now(timezone.utc):
                return sess["user_id"]
    return None


async def get_current_user(request: Request) -> dict:
    user_id = await _user_id_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact the Village team.")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def is_volunteer(user: dict) -> bool:
    return user.get("role") in ("volunteer", "both", "admin")


def is_parent(user: dict) -> bool:
    return user.get("role") in ("parent", "both", "admin")


def public_user(u: dict) -> dict:
    keys = ["user_id", "name", "role", "neighborhood", "bio", "picture", "created_at"]
    return {k: u.get(k) for k in keys}


def _email_html(name: str, body: str, link: str) -> str:
    url = f"{APP_URL}{link}"
    brand = escape(EMAIL_FROM_NAME)
    return (
        '<table role="presentation" width="100%" style="background:#FAFAF7"><tr>'
        '<td style="padding:28px;font-family:Arial,sans-serif;color:#1C1917">'
        f'<p style="font-size:18px;font-weight:bold;color:#1E3D2F">{brand}</p>'
        f'<p>Hi {escape(name or "neighbor")},</p>'
        f'<p>{escape(body)}</p>'
        f'<p><a href="{escape(url)}" style="display:inline-block;background:#1E3D2F;color:#ffffff;'
        'padding:10px 18px;border-radius:8px;text-decoration:none">Open in the Village</a></p>'
        f'<p style="font-size:12px;color:#888">Sent by {brand} for Klamath County families. '
        'We never ask for your password or payment details by email. '
        'You can turn off email alerts in your profile.</p></td></tr></table>'
    )


async def _send_notification_email(user: dict, title: str, body: str, link: str):
    try:
        await send_email(to=user["email"], subject=f"{title} | {EMAIL_FROM_NAME}",
                         html=_email_html(user.get("name"), body, link))
    except Exception as e:
        logger.error(f"Notification email failed: {e}")


async def notify(user_id: str, ntype: str, title: str, body: str, link: str, email: bool = False):
    await db.notifications.insert_one({
        "notification_id": new_id("ntf"), "user_id": user_id, "type": ntype,
        "title": title, "body": body, "link": link, "read": False, "created_at": now_iso(),
    })
    if not email:
        return
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "name": 1, "email_notifications": 1})
    if u and u.get("email_notifications", True):
        asyncio.create_task(_send_notification_email(u, title, body, link))


async def notify_admins(ntype: str, title: str, body: str, link: str):
    async for a in db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}):
        await notify(a["user_id"], ntype, title, body, link)
