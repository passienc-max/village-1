import os
import json
import re
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from core import db, new_id, now_iso, get_current_user, CATEGORIES, NEIGHBORHOODS

router = APIRouter(prefix="/api/ai")

MODEL = ("openai", "gpt-6-sol")
DAILY_LIMIT = 40


async def _check_quota(user_id: str):
    since = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    used = await db.ai_usage.count_documents({"user_id": user_id, "created_at": {"$gte": since}})
    if used >= DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="You've reached today's AI limit. Please try again tomorrow.")
    await db.ai_usage.insert_one({"user_id": user_id, "created_at": now_iso()})


def _chat(session_id: str, system: str) -> LlmChat:
    return LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=session_id, system_message=system).with_model(*MODEL)


# ---------- Request writer ----------
class DraftIn(BaseModel):
    text: str = Field(min_length=5, max_length=1500)


DRAFT_SYSTEM = (
    "You help parents in Klamath County, Oregon write clear help requests for volunteer neighbors. "
    f"Return ONLY a JSON object with keys: category (one of {CATEGORIES}), title (max 80 chars), "
    "description (2-4 friendly sentences with useful details like number of kids, car seats, items; "
    "never include exact street addresses, phone numbers or children's full names), "
    f"neighborhood (one of {NEIGHBORHOODS} or null), needed_date (YYYY-MM-DD or null), "
    "needed_time (HH:MM 24h or null), urgency ('normal' or 'urgent')."
)


@router.post("/draft-request")
async def draft_request(body: DraftIn, user: dict = Depends(get_current_user)):
    await _check_quota(user["user_id"])
    today = datetime.now(timezone.utc).strftime("%A %Y-%m-%d")
    chat = _chat(new_id("draft"), DRAFT_SYSTEM + f" Today is {today}.")
    raw = await chat.send_message(UserMessage(text=body.text))
    match = re.search(r"\{.*\}", raw or "", re.S)
    try:
        data = json.loads(match.group(0)) if match else {}
    except json.JSONDecodeError:
        data = {}
    if not data.get("title"):
        raise HTTPException(status_code=502, detail="The AI couldn't draft that. Try adding a bit more detail.")
    if data.get("category") not in CATEGORIES:
        data["category"] = "other"
    if data.get("neighborhood") not in NEIGHBORHOODS:
        data["neighborhood"] = None
    if data.get("urgency") not in ("normal", "urgent"):
        data["urgency"] = "normal"
    return {k: data.get(k) for k in ("category", "title", "description", "neighborhood", "needed_date", "needed_time", "urgency")}


# ---------- Village Helper chat ----------
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


async def _helper_system(user: dict) -> str:
    listings = await db.listings.find({"status": "approved"}, {"_id": 0, "name": 1, "type": 1, "category": 1,
                                                               "description": 1, "phone": 1, "website": 1, "town": 1}).to_list(200)
    lines = "\n".join(f"- [{l['type']}/{l['category']}] {l['name']}: {l.get('description', '')} "
                      f"{l.get('phone', '')} {l.get('website', '')} {l.get('town', '')}".strip() for l in listings)
    return (
        "You are the Village Helper for Parent Link — The Village, a community app where parents in Klamath County, "
        "Southern Oregon get help (rides, laundry, groceries, school activities, childcare, meals) from local volunteers. "
        "Be warm, brief and practical. Reply in plain text only (no markdown, no asterisks); use simple dashes for lists. App facts: parents post requests from the Dashboard; volunteers accept them on the "
        "Volunteer Board; rides can only be given by drivers verified with license, insurance and selfie; a private chat "
        "and live location sharing open after a request is accepted; profiles show ratings and references; anyone can "
        "report safety concerns on the Safety page. Only recommend organizations from this directory, and say so if "
        "nothing fits (suggest dialing 211):\n" + (lines or "(directory is empty)") +
        "\nFor emergencies tell them to call 911; for crisis support, call or text 988. Never give medical or legal advice "
        f"beyond pointing to resources. The user's name is {user['name'].split(' ')[0]} and their community is "
        f"{user.get('neighborhood') or 'Klamath County'}."
    )


@router.get("/chat/history")
async def chat_history(user: dict = Depends(get_current_user)):
    return await db.ai_messages.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(200)


@router.delete("/chat/history")
async def clear_history(user: dict = Depends(get_current_user)):
    await db.ai_messages.delete_many({"user_id": user["user_id"]})
    return {"ok": True}


@router.post("/chat/stream")
async def chat_stream(body: ChatIn, user: dict = Depends(get_current_user)):
    await _check_quota(user["user_id"])
    uid = user["user_id"]
    history = await db.ai_messages.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(12)
    convo = "\n".join(f"{m['role']}: {m['text']}" for m in reversed(history))
    system = await _helper_system(user) + (f"\n\nConversation so far:\n{convo}" if convo else "")
    await db.ai_messages.insert_one({"message_id": new_id("aim"), "user_id": uid, "role": "user",
                                     "text": body.message, "created_at": now_iso()})
    chat = _chat(f"helper_{uid}_{new_id('s')}", system)

    async def events():
        parts = []
        try:
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    parts.append(ev.content)
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception:
            yield f"data: {json.dumps({'error': 'The helper is unavailable right now. Please try again.'})}\n\n"
        if parts:
            await db.ai_messages.insert_one({"message_id": new_id("aim"), "user_id": uid, "role": "assistant",
                                             "text": "".join(parts), "created_at": now_iso()})
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
