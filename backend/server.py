from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from core import client
from auth_routes import router as auth_router
from routes import router as main_router
from admin_routes import router as admin_router
from seed import seed_admin, seed_listings, create_indexes

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="Parent Link - The Village")
ALLOWED_ORIGINS = [o.strip() for o in os.environ["CORS_ORIGINS"].split(",") if o.strip()]


@app.middleware("http")
async def origin_guard(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and origin and "*" not in ALLOWED_ORIGINS \
            and origin not in ALLOWED_ORIGINS:
        return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
    return await call_next(request)


@app.get("/api/")
async def root():
    return {"message": "Parent Link - The Village API"}


app.include_router(auth_router)
app.include_router(main_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await create_indexes()
    await seed_admin()
    await seed_listings()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
