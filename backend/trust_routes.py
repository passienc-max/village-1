import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from pydantic import BaseModel, Field

from core import (db, new_id, now_iso, get_current_user, require_admin, notify, notify_admins,
                  is_volunteer, as_aware, APP_URL)
from storage import put_object, get_object, APP_NAME

router = APIRouter(prefix="/api")

IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif"}
MAX_BYTES = 10 * 1024 * 1024
ACTIVE = ("accepted", "in_progress")


# ---------- Driver verification ----------
async def _save_image(user_id: str, f: UploadFile, kind: str) -> str:
    if f.content_type not in IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"{kind.title()} must be a JPG, PNG, WEBP or HEIC photo")
    data = await f.read()
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"{kind.title()} photo must be under 10 MB")
    path = f"{APP_NAME}/verification/{user_id}/{uuid.uuid4()}.{IMAGE_TYPES[f.content_type]}"
    res = await put_object(path, data, f.content_type)
    file_id = new_id("file")
    await db.files.insert_one({"file_id": file_id, "owner_id": user_id, "kind": kind, "storage_path": res["path"],
                               "content_type": f.content_type, "size": len(data), "is_deleted": False,
                               "created_at": now_iso()})
    return file_id


@router.post("/driver/verification")
async def submit_verification(license: UploadFile = File(...), insurance: UploadFile = File(...),
                              selfie: UploadFile = File(...), vehicle: str = Form(""),
                              license_state: str = Form("OR"), user: dict = Depends(get_current_user)):
    if not is_volunteer(user):
        raise HTTPException(status_code=403, detail="Switch your role to volunteer to offer rides")
    if user.get("driver_status") in ("pending", "approved"):
        raise HTTPException(status_code=400, detail="Your verification is already pending or approved")
    files = {}
    for kind, f in (("license", license), ("insurance", insurance), ("selfie", selfie)):
        files[kind] = await _save_image(user["user_id"], f, kind)
    doc = {"verification_id": new_id("ver"), "user_id": user["user_id"], "user_name": user["name"],
           "user_email": user["email"], "files": files, "vehicle": vehicle[:120], "license_state": license_state[:30],
           "status": "pending", "admin_note": "", "submitted_at": now_iso()}
    await db.driver_verifications.insert_one(dict(doc))
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"driver_status": "pending", "offers_rides": True}})
    await notify_admins("verification", "New driver verification", f'{user["name"]} submitted driver documents', "/admin")
    return doc


@router.get("/driver/verification/me")
async def my_verification(user: dict = Depends(get_current_user)):
    doc = await db.driver_verifications.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("submitted_at", -1)])
    return {"driver_status": user.get("driver_status") or "none", "verification": doc}


@router.get("/files/{file_id}")
async def download_file(file_id: str, user: dict = Depends(get_current_user)):
    rec = await db.files.find_one({"file_id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    if rec["owner_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    data, _ = await get_object(rec["storage_path"])
    return Response(content=data, media_type=rec["content_type"], headers={"Cache-Control": "private, no-store"})


@router.get("/admin/driver-verifications")
async def admin_verifications(_: dict = Depends(require_admin)):
    return await db.driver_verifications.find({}, {"_id": 0}).sort([("status", -1), ("submitted_at", -1)]).to_list(500)


class DecisionIn(BaseModel):
    admin_note: str = Field(default="", max_length=500)


@router.post("/admin/driver-verifications/{verification_id}/{decision}")
async def admin_decide_verification(verification_id: str, decision: str, body: DecisionIn,
                                    _: dict = Depends(require_admin)):
    if decision not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Invalid decision")
    v = await db.driver_verifications.find_one({"verification_id": verification_id}, {"_id": 0})
    if not v:
        raise HTTPException(status_code=404, detail="Verification not found")
    status = "approved" if decision == "approve" else "rejected"
    await db.driver_verifications.update_one({"verification_id": verification_id},
                                             {"$set": {"status": status, "admin_note": body.admin_note, "decided_at": now_iso()}})
    await db.users.update_one({"user_id": v["user_id"]}, {"$set": {"driver_status": status}})
    msg = ("You're a verified driver! You can now accept ride requests." if status == "approved"
           else f"Your driver verification needs another look. {body.admin_note}".strip())
    await notify(v["user_id"], "verification", f"Driver verification {status}", msg, "/driver-verification", email=True)
    return {"ok": True, "status": status}


# ---------- Live location sharing ----------
class LocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy: Optional[float] = None


async def _participant_request(request_id: str, user: dict, allow_admin: bool = False) -> dict:
    r = await db.requests.find_one({"request_id": request_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if user["user_id"] not in (r["parent_id"], r.get("volunteer_id")) and not (allow_admin and user.get("role") == "admin"):
        raise HTTPException(status_code=403, detail="Only the parent and matched volunteer can do this")
    return r


@router.post("/requests/{request_id}/location")
async def update_location(request_id: str, body: LocationIn, user: dict = Depends(get_current_user)):
    r = await _participant_request(request_id, user)
    if r["status"] not in ACTIVE:
        raise HTTPException(status_code=400, detail="Location sharing is only available during an active request")
    await db.ride_locations.update_one(
        {"request_id": request_id, "user_id": user["user_id"]},
        {"$set": {"name": user["name"], "role": "parent" if user["user_id"] == r["parent_id"] else "volunteer",
                  "lat": body.lat, "lng": body.lng, "accuracy": body.accuracy, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@router.delete("/requests/{request_id}/location")
async def stop_location(request_id: str, user: dict = Depends(get_current_user)):
    await db.ride_locations.delete_one({"request_id": request_id, "user_id": user["user_id"]})
    return {"ok": True}


@router.get("/requests/{request_id}/locations")
async def get_locations(request_id: str, user: dict = Depends(get_current_user)):
    await _participant_request(request_id, user, allow_admin=True)
    return await db.ride_locations.find({"request_id": request_id}, {"_id": 0}).to_list(10)


@router.post("/requests/{request_id}/share-links")
async def create_share_link(request_id: str, user: dict = Depends(get_current_user)):
    r = await _participant_request(request_id, user)
    if r["status"] not in ACTIVE:
        raise HTTPException(status_code=400, detail="Share links are only available during an active request")
    token = secrets.token_urlsafe(16)
    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    await db.share_links.insert_one({"token": token, "request_id": request_id, "created_by": user["user_id"],
                                     "active": True, "expires_at": expires, "created_at": now_iso()})
    return {"token": token, "url": f"{APP_URL}/track/{token}", "expires_at": expires}


@router.get("/requests/{request_id}/share-links")
async def list_share_links(request_id: str, user: dict = Depends(get_current_user)):
    await _participant_request(request_id, user)
    items = await db.share_links.find({"request_id": request_id, "created_by": user["user_id"], "active": True},
                                      {"_id": 0}).to_list(20)
    return [{**i, "url": f"{APP_URL}/track/{i['token']}"} for i in items]


@router.post("/share-links/{token}/revoke")
async def revoke_share_link(token: str, user: dict = Depends(get_current_user)):
    await db.share_links.update_one({"token": token, "created_by": user["user_id"]}, {"$set": {"active": False}})
    return {"ok": True}


@router.get("/track/{token}")
async def track(token: str):
    link = await db.share_links.find_one({"token": token}, {"_id": 0})
    if not link or not link["active"] or as_aware(link["expires_at"]) < datetime.now(timezone.utc):
        return {"active": False, "reason": "This tracking link has expired or was turned off."}
    r = await db.requests.find_one({"request_id": link["request_id"]}, {"_id": 0})
    if not r or r["status"] not in ACTIVE:
        return {"active": False, "reason": "This ride has ended."}
    locs = await db.ride_locations.find({"request_id": r["request_id"]}, {"_id": 0}).to_list(10)
    first = lambda n: (n or "").split(" ")[0]
    sharer = await db.users.find_one({"user_id": link["created_by"]}, {"_id": 0, "name": 1})
    return {
        "active": True, "category": r["category"], "status": r["status"], "neighborhood": r["neighborhood"],
        "needed_date": r["needed_date"], "needed_time": r.get("needed_time"),
        "parent_name": first(r["parent_name"]), "volunteer_name": first(r.get("volunteer_name")),
        "shared_by": first(sharer["name"] if sharer else ""), "expires_at": link["expires_at"],
        "locations": [{"name": first(l["name"]), "role": l["role"], "lat": l["lat"], "lng": l["lng"],
                       "updated_at": l["updated_at"]} for l in locs],
    }
