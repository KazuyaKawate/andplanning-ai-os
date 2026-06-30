"""
AI OS Backend — FastAPI entry point.
"""
from __future__ import annotations

import logging
import warnings
from contextlib import asynccontextmanager

# Suppress passlib/bcrypt version-detection warning (harmless; bcrypt 4.x lacks __about__)
warnings.filterwarnings("ignore", message=".*bcrypt.*", category=UserWarning)
logging.getLogger("passlib").setLevel(logging.ERROR)

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.migrations import run_migrations
from app.seed import seed_if_empty
from app.biz_seed import seed_biz_if_empty
from app.routers import chat, dashboard, factories, workflows, runs, activity, memory
from app.routers import settings as settings_router
from app.routers import models_api
from app.routers import chat_history
from app.routers import agents
from app.routers import dev
from app.routers import debug
from app.routers import team
from app.routers import auth as auth_router
from app.routers import notifications as notifications_router
from app.routers import health as health_router
from app.routers import evolution as evolution_router
from app.routers import knowledge as knowledge_router
# Business Knowledge Base routers
from app.routers import biz_licenses, biz_marketplace, biz_assets
from app.routers import biz_library, biz_pricing, biz_revenue, biz_knowledge
# Business Engine Phase 1
from app.routers import orgs as orgs_router
from app.routers import business as business_router
# AIOS Executor Phase 1
from app.routers import executor as executor_router


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("aios")


# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ---------------------------------------------------------------------------
# Lifespan: create tables + indexes + seed
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting AI OS Backend …")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await run_migrations(engine)
    async with AsyncSessionLocal() as db:
        await seed_if_empty(db)
        await seed_biz_if_empty(db)
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    logger.info("AI OS Backend ready")
    yield
    logger.info("AI OS Backend shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI OS Backend",
    description="Runtime backend for andplanning AI OS.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    if request.url.path != "/health":
        logger.info("%s %s → %d", request.method, request.url.path, response.status_code)
    return response


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

PREFIX = "/api"

app.include_router(auth_router.router,         prefix=PREFIX)
app.include_router(notifications_router.router, prefix=PREFIX)
app.include_router(health_router.router,        prefix=PREFIX)
app.include_router(evolution_router.router,     prefix=PREFIX)
app.include_router(knowledge_router.router,    prefix=PREFIX)
app.include_router(chat.router,                prefix=PREFIX)
app.include_router(dashboard.router,           prefix=PREFIX)
app.include_router(factories.router,           prefix=PREFIX)
app.include_router(workflows.router,           prefix=PREFIX)
app.include_router(runs.router,                prefix=PREFIX)
app.include_router(activity.router,            prefix=PREFIX)
app.include_router(memory.router,              prefix=PREFIX)
app.include_router(settings_router.router,     prefix=PREFIX)
app.include_router(models_api.router,          prefix=PREFIX)
app.include_router(chat_history.router,        prefix=PREFIX)
app.include_router(agents.router,              prefix=PREFIX)
app.include_router(dev.router,                 prefix=PREFIX)
app.include_router(debug.router,               prefix=PREFIX)
app.include_router(team.router,                prefix=PREFIX)
# Business Knowledge Base
app.include_router(biz_licenses.router,        prefix=PREFIX)
app.include_router(biz_marketplace.router,     prefix=PREFIX)
app.include_router(biz_assets.router,          prefix=PREFIX)
app.include_router(biz_library.router,         prefix=PREFIX)
app.include_router(biz_pricing.router,         prefix=PREFIX)
app.include_router(biz_revenue.router,         prefix=PREFIX)
app.include_router(biz_knowledge.router,       prefix=PREFIX)
# Business Engine Phase 1
app.include_router(orgs_router.router,         prefix=PREFIX)
app.include_router(business_router.router, prefix=PREFIX)
# AIOS Executor Phase 1
app.include_router(executor_router.router,     prefix=PREFIX)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

_upload_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(_upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_upload_dir), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
