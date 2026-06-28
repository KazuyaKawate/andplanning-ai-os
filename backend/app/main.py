"""
AI OS Backend — FastAPI entry point.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.seed import seed_if_empty
from app.routers import chat, dashboard, factories, workflows, runs, activity, memory
from app.routers import settings as settings_router
from app.routers import models_api


# ---------------------------------------------------------------------------
# Lifespan: create tables + seed
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed_if_empty(db)
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI OS Backend",
    description="Runtime backend for andplanning AI OS.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

PREFIX = "/api"

app.include_router(chat.router,             prefix=PREFIX)
app.include_router(dashboard.router,        prefix=PREFIX)
app.include_router(factories.router,        prefix=PREFIX)
app.include_router(workflows.router,        prefix=PREFIX)
app.include_router(runs.router,             prefix=PREFIX)
app.include_router(activity.router,         prefix=PREFIX)
app.include_router(memory.router,           prefix=PREFIX)
app.include_router(settings_router.router,  prefix=PREFIX)
app.include_router(models_api.router,       prefix=PREFIX)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
