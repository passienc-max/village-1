import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from core import db, new_id, now_iso, get_current_user, require_admin, notify, notify_admins

router = APIRouter(prefix="/api")

RESOURCE_CATEGORIES = ["Food", "Housing & Utilities", "Youth & Family", "Health", "Crisis & Safety", "Education", "Other"]
BUSINESS_CATEGORIES = ["Childcare", "Laundromat", "Grocery & Market", "Health & Clinic", "Family Activities", "Services", "Other"]


class ListingIn(BaseModel):
    type: str
    name: str = Field(min_length=2, max_length=120)
    category: str
    description: str = Field(default="", max_length=1000)
    address: str = Field(default="", max_length=200)
    town: str = Field(default="", max_length=60)
    phone: str = Field(default="", max_length=40)
    website: str = Field(default="", max_length=200)
    hours: str = Field(default="", max_length=120)


def _validate_listing(body: ListingIn):
    cats = RESOURCE_CATEGORIES if body.type == "resource" else BUSINESS_CATEGORIES if body.type == "business" else None
    if cats is None:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    if body.category not in cats:
        raise HTTPException(status_code=400, detail="Invalid category")
    if body.website and not body.website.startswith(("http://", "https://")):
        body.website = "https://" + body.website


def _listing_doc(body: ListingIn, status: str, user: dict) -> dict:
    return {**body.model_dump(), "listing_id": new_id("lst"), "status": status,
            "submitted_by": user["user_id"], "submitted_by_name": user["name"], "created_at": now_iso()}


@router.get("/listings/categories")
async def listing_categories():
    return {"resource": RESOURCE_CATEGORIES, "business": BUSINESS_CATEGORIES}


@router.get("/listings")
async def list_listings(type: str, category: Optional[str] = None, q: Optional[str] = None):
    query = {"type": type, "status": "approved"}
    if category:
        query["category"] = category
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"description": rx}, {"town": rx}]
    return await db.listings.find(query, {"_id": 0}).sort("name", 1).to_list(500)


@router.post("/listings/suggest")
async def suggest_listing(body: ListingIn, user: dict = Depends(get_current_user)):
    _validate_listing(body)
    doc = _listing_doc(body, "pending", user)
    await db.listings.insert_one(dict(doc))
    await notify_admins("suggestion", "New listing suggestion", f'{body.name} ({body.type})', "/admin")
    return doc


# ---------- Admin ----------
@router.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "open_requests": await db.requests.count_documents({"status": "open"}),
        "active_requests": await db.requests.count_documents({"status": {"$in": ["accepted", "in_progress"]}}),
        "completed_requests": await db.requests.count_documents({"status": "completed"}),
        "open_reports": await db.reports.count_documents({"status": "open"}),
        "pending_listings": await db.listings.count_documents({"status": "pending"}),
    }


@router.get("/admin/listings")
async def admin_listings(status: Optional[str] = None, _: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.listings.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.post("/admin/listings")
async def admin_create_listing(body: ListingIn, admin: dict = Depends(require_admin)):
    _validate_listing(body)
    doc = _listing_doc(body, "approved", admin)
    await db.listings.insert_one(dict(doc))
    return doc


@router.post("/admin/listings/{listing_id}/{decision}")
async def admin_decide_listing(listing_id: str, decision: str, _: dict = Depends(require_admin)):
    if decision not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Invalid decision")
    lst = await db.listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not lst:
        raise HTTPException(status_code=404, detail="Listing not found")
    status = "approved" if decision == "approve" else "rejected"
    await db.listings.update_one({"listing_id": listing_id}, {"$set": {"status": status}})
    if lst.get("submitted_by"):
        page = "/resources" if lst["type"] == "resource" else "/businesses"
        await notify(lst["submitted_by"], "suggestion", f"Suggestion {status}",
                     f'Your suggestion "{lst["name"]}" was {status}. Thank you for helping the Village.', page)
    return {"ok": True, "status": status}


@router.delete("/admin/listings/{listing_id}")
async def admin_delete_listing(listing_id: str, _: dict = Depends(require_admin)):
    await db.listings.delete_one({"listing_id": listing_id})
    return {"ok": True}


@router.get("/admin/reports")
async def admin_reports(_: dict = Depends(require_admin)):
    return await db.reports.find({}, {"_id": 0}).sort([("status", -1), ("created_at", -1)]).to_list(500)


class ResolveIn(BaseModel):
    admin_note: str = Field(default="", max_length=1000)


@router.post("/admin/reports/{report_id}/resolve")
async def admin_resolve_report(report_id: str, body: ResolveIn, _: dict = Depends(require_admin)):
    res = await db.reports.update_one({"report_id": report_id},
                                      {"$set": {"status": "resolved", "admin_note": body.admin_note,
                                                "resolved_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"ok": True}


@router.get("/admin/users")
async def admin_users(_: dict = Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)


@router.post("/admin/users/{user_id}/suspend")
async def admin_toggle_suspend(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="You can't suspend yourself")
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "suspended": 1})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    new_val = not u.get("suspended", False)
    await db.users.update_one({"user_id": user_id}, {"$set": {"suspended": new_val}})
    if new_val:
        await db.user_sessions.delete_many({"user_id": user_id})
    return {"ok": True, "suspended": new_val}


@router.get("/admin/requests")
async def admin_requests(_: dict = Depends(require_admin)):
    return await db.requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
