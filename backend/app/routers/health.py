"""
Provider health check endpoint.

GET /api/health/providers — pings each AI provider with a minimal test request.
Public endpoint (no auth required) so dashboards can poll without a token.
"""
from __future__ import annotations

import asyncio
import os
import time
from typing import Any

import httpx
from fastapi import APIRouter

router = APIRouter(tags=["health"])


async def _check_anthropic(api_key: str) -> dict[str, Any]:
    if not api_key:
        return {"ok": False, "latency_ms": None, "error": "API key not configured"}
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         api_key,
                    "anthropic-version":  "2023-06-01",
                    "content-type":       "application/json",
                },
                json={
                    "model":      "claude-haiku-4-5-20251001",
                    "max_tokens": 10,
                    "messages":   [{"role": "user", "content": "ping"}],
                },
            )
        ms = round((time.monotonic() - start) * 1000)
        if r.status_code == 200:
            return {"ok": True, "latency_ms": ms, "error": None}
        return {"ok": False, "latency_ms": ms, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "latency_ms": None, "error": str(e)[:120]}


async def _check_openai(api_key: str) -> dict[str, Any]:
    if not api_key:
        return {"ok": False, "latency_ms": None, "error": "API key not configured"}
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model":      "gpt-4o-mini",
                    "max_tokens": 5,
                    "messages":   [{"role": "user", "content": "ping"}],
                },
            )
        ms = round((time.monotonic() - start) * 1000)
        if r.status_code == 200:
            return {"ok": True, "latency_ms": ms, "error": None}
        return {"ok": False, "latency_ms": ms, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "latency_ms": None, "error": str(e)[:120]}


async def _check_google(api_key: str) -> dict[str, Any]:
    if not api_key:
        return {"ok": False, "latency_ms": None, "error": "API key not configured"}
    start = time.monotonic()
    try:
        # Use lite model for health check (avoids quota on rate-limited models)
        # Key via header to avoid leaking it in request URLs / logs
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                "gemini-2.5-flash-lite:generateContent",
                headers={"x-goog-api-key": api_key},
                json={"contents": [{"parts": [{"text": "ping"}]}]},
            )
        ms = round((time.monotonic() - start) * 1000)
        if r.status_code == 200:
            return {"ok": True, "latency_ms": ms, "error": None}
        return {"ok": False, "latency_ms": ms, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "latency_ms": None, "error": str(e)[:120]}


async def _check_ollama_provider(base_url: str) -> dict[str, Any]:
    from app.services.ollama_svc import check_ollama_health
    start = time.monotonic()
    result = await check_ollama_health(base_url)
    ms = round((time.monotonic() - start) * 1000)
    return {
        "ok":        result["ok"],
        "latency_ms": ms if result["ok"] else None,
        "error":      result["error"],
        "models":     result.get("models", []),
    }


@router.get("/health/providers")
async def provider_health():
    """
    Check connectivity to each configured AI provider.
    Runs all checks in parallel (5s each timeout).
    """
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models import OsSettingsRow
    from app.config import settings

    # Load API keys from DB settings
    anthropic_key = ""
    openai_key    = ""
    google_key    = ""
    ollama_url    = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(OsSettingsRow).where(OsSettingsRow.id == "global"))
            row = result.scalars().first()
            if row:
                anthropic_key = row.api_key_anthropic or settings.anthropic_api_key
                openai_key    = row.api_key_openai    or settings.openai_api_key
                google_key    = row.api_key_google    or settings.google_api_key
            else:
                anthropic_key = settings.anthropic_api_key
                openai_key    = settings.openai_api_key
                google_key    = settings.google_api_key
    except Exception:
        anthropic_key = settings.anthropic_api_key
        openai_key    = settings.openai_api_key
        google_key    = settings.google_api_key

    results = await asyncio.gather(
        _check_anthropic(anthropic_key),
        _check_openai(openai_key),
        _check_google(google_key),
        _check_ollama_provider(ollama_url),
        return_exceptions=True,
    )

    def _safe(r, name: str) -> dict:
        if isinstance(r, Exception):
            return {"ok": False, "latency_ms": None, "error": str(r)[:120]}
        return r

    anthropic_result, openai_result, google_result, ollama_result = [
        _safe(r, n) for r, n in zip(results, ["anthropic", "openai", "google", "ollama"])
    ]

    all_ok = any(r["ok"] for r in [anthropic_result, openai_result, google_result, ollama_result])

    return {
        "status": "ok" if all_ok else "degraded",
        "providers": {
            "anthropic": anthropic_result,
            "openai":    openai_result,
            "google":    google_result,
            "ollama":    ollama_result,
        },
    }
