from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr, Field

from core import (db, new_id, now_iso, hash_password, verify_password, set_auth_cookies,
                  decode_token, create_access_token, get_current_user, ROLES, NEIGHBORHOODS)

router = APIRouter(prefix="/api/auth")

MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
COOKIE_OPTS = dict(httponly=True, secure=True, samesite="none", path="/")


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str
    neighborhood: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionIn(BaseModel):
    session_id: str


def _clean(user: dict) -> dict:
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Please choose parent, volunteer, or both")
    if body.neighborhood and body.neighborhood not in NEIGHBORHOODS:
        raise HTTPException(status_code=400, detail="Unknown community")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {
        "user_id": new_id("user"), "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password), "role": body.role,
        "neighborhood": body.neighborhood, "bio": "", "picture": None,
        "email_notifications": True, "suspended": False, "auth_provider": "email",
        "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    set_auth_cookies(response, user["user_id"], email)
    return _clean(user)


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS:
        locked_at = datetime.fromisoformat(attempt["last_attempt"])
        if datetime.now(timezone.utc) - locked_at < timedelta(minutes=LOCKOUT_MINUTES):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": identifier})
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact the Village team.")
    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookies(response, user["user_id"], email)
    return _clean(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    for name in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(name, **COOKIE_OPTS)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    payload = decode_token(token, "refresh") if token else None
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "email": 1, "user_id": 1})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]), max_age=900, **COOKIE_OPTS)
    return {"ok": True}


@router.post("/google/session")
async def google_session(body: GoogleSessionIn, response: Response):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in failed")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        if user.get("suspended"):
            raise HTTPException(status_code=403, detail="Your account has been suspended. Contact the Village team.")
        updates = {"picture": user.get("picture") or data.get("picture")}
        if not user.get("name"):
            updates["name"] = data.get("name")
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
        user_id = user["user_id"]
    else:
        user_id = new_id("user")
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data.get("name") or email.split("@")[0],
            "role": None, "neighborhood": None, "bio": "", "picture": data.get("picture"),
            "email_notifications": True, "suspended": False, "auth_provider": "google",
            "created_at": now_iso(),
        })
    session_token = data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token, "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })
    response.set_cookie("session_token", session_token, max_age=604800, **COOKIE_OPTS)
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
