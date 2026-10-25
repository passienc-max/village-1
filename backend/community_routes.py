import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field

from core import db, new_id, now_iso, get_current_user, notify, queue_email, as_aware

router = APIRouter(prefix="/api")

MAX_REFERENCES = 5


# ---------- Reviews ----------
class ReviewIn(BaseModel):
    request_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)


def _pair_query(a: str, b: str) -> dict:
    return {"status": "completed", "$or": [{"parent_id": a, "volunteer_id": b}, {"parent_id": b, "volunteer_id": a}]}


@router.post("/users/{user_id}/reviews")
async def add_review(user_id: str, body: ReviewIn, user: dict = Depends(get_current_user)):
    me = user["user_id"]
    if me == user_id:
        raise HTTPException(status_code=400, detail="You can't review yourself")
    r = await db.requests.find_one({"request_id": body.request_id, **_pair_query(me, user_id)}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=403, detail="You can only review someone after completing a request together")
    if await db.reviews.find_one({"request_id": body.request_id, "reviewer_id": me}):
        raise HTTPException(status_code=409, detail="You already reviewed this request")
    doc = {"review_id": new_id("rev"), "target_id": user_id, "reviewer_id": me, "reviewer_name": user["name"],
           "request_id": body.request_id, "request_category": r["category"], "rating": body.rating,
           "comment": body.comment.strip(), "created_at": now_iso()}
    await db.reviews.insert_one(dict(doc))
    await notify(user_id, "review", "You got a new review", f'{user["name"]} left you {body.rating} stars.', f"/users/{user_id}")
    return doc


@router.get("/users/{user_id}/reviews")
async def list_reviews(user_id: str, _: dict = Depends(get_current_user)):
    items = await db.reviews.find({"target_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    avg = round(sum(i["rating"] for i in items) / len(items), 1) if items else None
    return {"items": items, "average": avg, "count": len(items)}


@router.get("/users/{user_id}/reviewable")
async def reviewable(user_id: str, user: dict = Depends(get_current_user)):
    me = user["user_id"]
    if me == user_id:
        return []
    done = await db.requests.find(_pair_query(me, user_id), {"_id": 0, "request_id": 1, "title": 1, "category": 1}).to_list(100)
    reviewed = {r["request_id"] async for r in db.reviews.find({"reviewer_id": me, "target_id": user_id}, {"request_id": 1})}
    return [d for d in done if d["request_id"] not in reviewed]


# ---------- References ----------
class ReferenceIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    relationship: str = Field(min_length=2, max_length=80)


class ReferenceAnswer(BaseModel):
    known_for: str = Field(min_length=1, max_length=60)
    rating: int = Field(ge=1, le=5)
    trust_with_kids: bool
    recommendation: str = Field(min_length=10, max_length=2000)


def _send_reference_email(ref: dict, volunteer_name: str):
    queue_email(ref["email"], ref["name"], f"{volunteer_name} listed you as a reference",
                f"{volunteer_name} is volunteering to help local families through Parent Link in Klamath County "
                f"and listed you as a reference ({ref['relationship']}). Would you share a short note about them? "
                "It takes about two minutes and no account is needed.",
                f"/reference/{ref['token']}")


@router.post("/references")
async def add_reference(body: ReferenceIn, user: dict = Depends(get_current_user)):
    if body.email.lower() == user["email"]:
        raise HTTPException(status_code=400, detail="You can't be your own reference")
    count = await db.references.count_documents({"user_id": user["user_id"], "status": {"$ne": "removed"}})
    if count >= MAX_REFERENCES:
        raise HTTPException(status_code=400, detail=f"You can list up to {MAX_REFERENCES} references")
    ref = {"reference_id": new_id("ref"), "user_id": user["user_id"], "name": body.name.strip(),
           "email": body.email.lower(), "relationship": body.relationship.strip(), "token": secrets.token_urlsafe(20),
           "status": "requested", "response": None, "created_at": now_iso(), "last_sent_at": now_iso()}
    await db.references.insert_one(dict(ref))
    _send_reference_email(ref, user["name"])
    ref.pop("token")
    return ref


@router.get("/references/mine")
async def my_references(user: dict = Depends(get_current_user)):
    return await db.references.find({"user_id": user["user_id"], "status": {"$ne": "removed"}},
                                    {"_id": 0, "token": 0}).sort("created_at", -1).to_list(20)


@router.delete("/references/{reference_id}")
async def remove_reference(reference_id: str, user: dict = Depends(get_current_user)):
    await db.references.update_one({"reference_id": reference_id, "user_id": user["user_id"]},
                                   {"$set": {"status": "removed"}})
    return {"ok": True}


@router.post("/references/{reference_id}/resend")
async def resend_reference(reference_id: str, user: dict = Depends(get_current_user)):
    ref = await db.references.find_one({"reference_id": reference_id, "user_id": user["user_id"], "status": "requested"}, {"_id": 0})
    if not ref:
        raise HTTPException(status_code=404, detail="Reference not found or already answered")
    if as_aware(ref["last_sent_at"]) > datetime.now(timezone.utc) - timedelta(hours=24):
        raise HTTPException(status_code=429, detail="You can resend a reminder once every 24 hours")
    await db.references.update_one({"reference_id": reference_id}, {"$set": {"last_sent_at": now_iso()}})
    _send_reference_email(ref, user["name"])
    return {"ok": True}


async def _ref_by_token(token: str) -> dict:
    ref = await db.references.find_one({"token": token, "status": {"$ne": "removed"}}, {"_id": 0})
    if not ref:
        raise HTTPException(status_code=404, detail="This reference link is no longer valid")
    return ref


@router.get("/reference-form/{token}")
async def reference_form(token: str):
    ref = await _ref_by_token(token)
    vol = await db.users.find_one({"user_id": ref["user_id"]}, {"_id": 0, "name": 1})
    return {"volunteer_name": vol["name"] if vol else "A volunteer", "reference_name": ref["name"],
            "relationship": ref["relationship"], "status": ref["status"]}


@router.post("/reference-form/{token}")
async def submit_reference(token: str, body: ReferenceAnswer):
    ref = await _ref_by_token(token)
    if ref["status"] != "requested":
        raise HTTPException(status_code=400, detail="This reference was already submitted. Thank you!")
    await db.references.update_one({"token": token}, {"$set": {"status": "submitted", "response": body.model_dump(),
                                                                "submitted_at": now_iso()}})
    await notify(ref["user_id"], "reference", "A reference came in", f'{ref["name"]} submitted a reference for you.', "/profile")
    return {"ok": True}


@router.get("/users/{user_id}/references")
async def user_references(user_id: str, _: dict = Depends(get_current_user)):
    return await db.references.find({"user_id": user_id, "status": "submitted"},
                                    {"_id": 0, "name": 1, "relationship": 1, "response": 1, "submitted_at": 1,
                                     "reference_id": 1}).sort("submitted_at", -1).to_list(20)


@router.post("/users/{user_id}/request-references")
async def request_references(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="That's you!")
    key = {"requester_id": user["user_id"], "target_id": user_id}
    if await db.reference_requests.find_one(key):
        return {"ok": True, "already": True}
    await db.reference_requests.insert_one({**key, "created_at": now_iso()})
    await notify(user_id, "reference", "A neighbor asked for your references",
                 f'{user["name"]} would like to see references on your profile. Add a few from your profile page.', "/profile")
    return {"ok": True}
