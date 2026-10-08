from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from core import (db, new_id, now_iso, get_current_user, notify, notify_admins, public_user,
                  is_parent, is_volunteer, CATEGORIES, NEIGHBORHOODS, ROLES)

router = APIRouter(prefix="/api")

CATEGORY_LABELS = {"ride": "Ride", "laundry": "Laundry help", "groceries": "Groceries",
                   "school": "School activities", "childcare": "Childcare", "meals": "Meals", "other": "Other"}


# ---------- Profiles ----------
class ProfileIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    bio: Optional[str] = Field(default=None, max_length=600)
    neighborhood: Optional[str] = None
    role: Optional[str] = None
    email_notifications: Optional[bool] = None


@router.put("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    updates = body.model_dump(exclude_none=True)
    if "role" in updates:
        if user.get("role") == "admin":
            updates.pop("role")
        elif updates["role"] not in ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")
    if updates.get("neighborhood") and updates["neighborhood"] not in NEIGHBORHOODS:
        raise HTTPException(status_code=400, detail="Unknown community")
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})


@router.get("/users/{user_id}")
async def get_user_profile(user_id: str, _: dict = Depends(get_current_user)):
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Neighbor not found")
    out = public_user(u)
    out["helped_count"] = await db.requests.count_documents({"volunteer_id": user_id, "status": "completed"})
    out["requests_count"] = await db.requests.count_documents({"parent_id": user_id})
    return out


# ---------- Requests ----------
class RequestIn(BaseModel):
    category: str
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=3, max_length=2000)
    neighborhood: str
    location_note: Optional[str] = Field(default="", max_length=200)
    needed_date: str
    needed_time: Optional[str] = ""
    urgency: str = "normal"
    kids_count: Optional[int] = Field(default=None, ge=0, le=20)


class StatusIn(BaseModel):
    action: str


async def _get_request(request_id: str) -> dict:
    r = await db.requests.find_one({"request_id": request_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return r


def _is_participant(r: dict, user: dict) -> bool:
    return user["user_id"] in (r.get("parent_id"), r.get("volunteer_id")) or user.get("role") == "admin"


@router.post("/requests")
async def create_request(body: RequestIn, user: dict = Depends(get_current_user)):
    if not is_parent(user):
        raise HTTPException(status_code=403, detail="Only parents can create requests. Update your role in your profile.")
    if body.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Unknown category")
    if body.neighborhood not in NEIGHBORHOODS:
        raise HTTPException(status_code=400, detail="Unknown community")
    if body.urgency not in ("normal", "urgent"):
        raise HTTPException(status_code=400, detail="Invalid urgency")
    doc = {**body.model_dump(), "request_id": new_id("req"), "parent_id": user["user_id"],
           "parent_name": user["name"], "status": "open", "volunteer_id": None,
           "volunteer_name": None, "created_at": now_iso(), "accepted_at": None}
    await db.requests.insert_one(dict(doc))
    return doc


@router.get("/requests/mine")
async def my_requests(user: dict = Depends(get_current_user)):
    return await db.requests.find({"parent_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.get("/requests/helping")
async def helping_requests(user: dict = Depends(get_current_user)):
    return await db.requests.find({"volunteer_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.get("/requests/open")
async def open_requests(category: Optional[str] = None, neighborhood: Optional[str] = None,
                        urgency: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not is_volunteer(user):
        raise HTTPException(status_code=403, detail="Only volunteers can view the request board")
    q = {"status": "open", "parent_id": {"$ne": user["user_id"]}}
    if category:
        q["category"] = category
    if neighborhood:
        q["neighborhood"] = neighborhood
    if urgency:
        q["urgency"] = urgency
    return await db.requests.find(q, {"_id": 0}).sort([("urgency", -1), ("created_at", -1)]).to_list(300)


@router.get("/requests/{request_id}")
async def get_request(request_id: str, user: dict = Depends(get_current_user)):
    r = await _get_request(request_id)
    if not _is_participant(r, user) and not (r["status"] == "open" and is_volunteer(user)):
        raise HTTPException(status_code=403, detail="You don't have access to this request")
    return r


@router.post("/requests/{request_id}/accept")
async def accept_request(request_id: str, user: dict = Depends(get_current_user)):
    if not is_volunteer(user):
        raise HTTPException(status_code=403, detail="Only volunteers can accept requests")
    r = await _get_request(request_id)
    if r["parent_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="You can't accept your own request")
    res = await db.requests.update_one(
        {"request_id": request_id, "status": "open"},
        {"$set": {"status": "accepted", "volunteer_id": user["user_id"],
                  "volunteer_name": user["name"], "accepted_at": now_iso()}},
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=409, detail="This request has already been accepted")
    await notify(r["parent_id"], "accepted", "Your request was accepted",
                 f'{user["name"]} accepted "{r["title"]}". Say hello in the chat to coordinate.',
                 f"/requests/{request_id}", email=True)
    return await _get_request(request_id)


@router.post("/requests/{request_id}/status")
async def update_status(request_id: str, body: StatusIn, user: dict = Depends(get_current_user)):
    r = await _get_request(request_id)
    uid = user["user_id"]
    is_owner = uid == r["parent_id"] or user.get("role") == "admin"
    is_vol = uid == r.get("volunteer_id")
    a, s = body.action, r["status"]
    if a == "in_progress" and (is_owner or is_vol) and s == "accepted":
        updates = {"status": "in_progress"}
    elif a == "completed" and (is_owner or is_vol) and s in ("accepted", "in_progress"):
        updates = {"status": "completed", "completed_at": now_iso()}
    elif a == "cancelled" and is_owner and s in ("open", "accepted", "in_progress"):
        updates = {"status": "cancelled"}
    elif a == "withdraw" and is_vol and s in ("accepted", "in_progress"):
        updates = {"status": "open", "volunteer_id": None, "volunteer_name": None, "accepted_at": None}
    else:
        raise HTTPException(status_code=400, detail="That action isn't available right now")
    await db.requests.update_one({"request_id": request_id}, {"$set": updates})
    labels = {"in_progress": "is now in progress", "completed": "was marked complete",
              "cancelled": "was cancelled", "withdraw": "is open again — the volunteer had to step back"}
    other = r.get("volunteer_id") if uid == r["parent_id"] else r["parent_id"]
    if other and other != uid:
        await notify(other, "status", "Request update", f'"{r["title"]}" {labels[a]}.',
                     f"/requests/{request_id}", email=a in ("completed", "cancelled", "withdraw"))
    return await _get_request(request_id)


# ---------- Messages ----------
class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@router.get("/requests/{request_id}/messages")
async def list_messages(request_id: str, user: dict = Depends(get_current_user)):
    r = await _get_request(request_id)
    if not _is_participant(r, user):
        raise HTTPException(status_code=403, detail="Only the parent and matched volunteer can view this chat")
    return await db.messages.find({"request_id": request_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@router.post("/requests/{request_id}/messages")
async def send_message(request_id: str, body: MessageIn, user: dict = Depends(get_current_user)):
    r = await _get_request(request_id)
    uid = user["user_id"]
    if uid not in (r["parent_id"], r.get("volunteer_id")):
        raise HTTPException(status_code=403, detail="Only the parent and matched volunteer can chat")
    if not r.get("volunteer_id"):
        raise HTTPException(status_code=400, detail="Chat opens once a volunteer accepts")
    msg = {"message_id": new_id("msg"), "request_id": request_id, "sender_id": uid,
           "sender_name": user["name"], "text": body.text.strip(), "created_at": now_iso()}
    await db.messages.insert_one(dict(msg))
    other = r["volunteer_id"] if uid == r["parent_id"] else r["parent_id"]
    link = f"/requests/{request_id}"
    has_unread = await db.notifications.find_one({"user_id": other, "type": "message", "link": link, "read": False})
    await notify(other, "message", f'New message from {user["name"]}', body.text[:140], link, email=not has_unread)
    return msg


# ---------- Notifications ----------
@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"items": items, "unread": unread}


@router.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/{notification_id}/read")
async def read_one(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"notification_id": notification_id, "user_id": user["user_id"]},
                                      {"$set": {"read": True}})
    return {"ok": True}


# ---------- Reports ----------
class ReportIn(BaseModel):
    target_type: str
    target_id: Optional[str] = None
    reason: str = Field(min_length=2, max_length=80)
    details: str = Field(default="", max_length=2000)


@router.post("/reports")
async def create_report(body: ReportIn, user: dict = Depends(get_current_user)):
    label = "General safety concern"
    if body.target_type == "user":
        t = await db.users.find_one({"user_id": body.target_id}, {"_id": 0, "name": 1})
        if not t:
            raise HTTPException(status_code=404, detail="User not found")
        label = f'User: {t["name"]}'
    elif body.target_type == "request":
        t = await db.requests.find_one({"request_id": body.target_id}, {"_id": 0, "title": 1})
        if not t:
            raise HTTPException(status_code=404, detail="Request not found")
        label = f'Request: {t["title"]}'
    elif body.target_type != "general":
        raise HTTPException(status_code=400, detail="Invalid report type")
    doc = {"report_id": new_id("rpt"), "reporter_id": user["user_id"], "reporter_name": user["name"],
           "target_type": body.target_type, "target_id": body.target_id, "target_label": label,
           "reason": body.reason, "details": body.details, "status": "open", "admin_note": "",
           "created_at": now_iso()}
    await db.reports.insert_one(dict(doc))
    await notify_admins("report", "New safety report", f"{body.reason} — {label}", "/admin")
    return doc
