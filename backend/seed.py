import os
from core import db, new_id, now_iso, hash_password, verify_password

SEED_RESOURCES = [
    {"name": "211info", "category": "Crisis & Safety", "phone": "211",
     "description": "Free, confidential help finding local food, housing, utility, childcare and health resources. Dial 211 or text your ZIP code to 898211.",
     "website": "https://www.211info.org"},
    {"name": "988 Suicide & Crisis Lifeline", "category": "Crisis & Safety", "phone": "988",
     "description": "24/7 free and confidential support for anyone in emotional distress or crisis. Call or text 988.",
     "website": "https://988lifeline.org"},
    {"name": "Klamath & Lake Community Action Services (KLCAS)", "category": "Housing & Utilities", "town": "Klamath Falls",
     "description": "Community action agency serving Klamath and Lake counties with energy, housing and family support programs.",
     "website": "https://www.klcas.org"},
    {"name": "Klamath County Library", "category": "Education", "town": "Klamath Falls",
     "description": "Library branches across the county offering story times, family programs and free internet access.",
     "website": "https://www.klamathlibrary.org"},
    {"name": "Oregon Department of Human Services (ODHS)", "category": "Food",
     "description": "Apply for SNAP food benefits, cash assistance (TANF) and other family support programs.",
     "website": "https://www.oregon.gov/odhs"},
    {"name": "Find Child Care Oregon", "category": "Youth & Family",
     "description": "Statewide search tool for licensed child care providers, plus help paying for care.",
     "website": "https://findchildcareoregon.org"},
]


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing is None:
        await db.users.insert_one({
            "user_id": new_id("user"), "email": email, "name": "Village Admin",
            "password_hash": hash_password(password), "role": "admin", "neighborhood": "Klamath Falls",
            "bio": "", "picture": None, "email_notifications": True, "suspended": False,
            "auth_provider": "email", "created_at": now_iso(),
        })
        return
    updates = {"role": "admin", "suspended": False}
    if not existing.get("password_hash") or not verify_password(password, existing["password_hash"]):
        updates["password_hash"] = hash_password(password)
    await db.users.update_one({"email": email}, {"$set": updates})


async def seed_listings():
    if await db.listings.count_documents({"type": "resource"}) > 0:
        return
    for r in SEED_RESOURCES:
        await db.listings.insert_one({
            "listing_id": new_id("lst"), "type": "resource", "status": "approved",
            "address": "", "town": r.get("town", ""), "phone": r.get("phone", ""), "hours": "",
            "submitted_by": None, "submitted_by_name": "Village team", "created_at": now_iso(),
            **{k: r[k] for k in ("name", "category", "description", "website")},
        })


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.user_sessions.create_index("session_token")
    await db.requests.create_index("request_id", unique=True)
    await db.requests.create_index([("status", 1), ("created_at", -1)])
    await db.messages.create_index([("request_id", 1), ("created_at", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.listings.create_index([("type", 1), ("status", 1)])
