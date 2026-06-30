"""
Provider fallback logic for AI calls.
When the primary provider fails, automatically retries with the next provider.
"""
from __future__ import annotations

import asyncio
from typing import AsyncGenerator

import os

from app.schemas import ChatMessage
from app.services.ai_router import (
    PROVIDER_FALLBACK, PROVIDER_FALLBACK_MODEL, provider_for,
)
from app.services.openai_svc import stream_openai
from app.services.anthropic_svc import stream_anthropic
from app.services.gemini_svc import stream_gemini
from app.services.ollama_svc import stream_ollama


def _make_stream(messages, model, cfg, system_prompt=""):
    p = provider_for(model)
    if p == "anthropic":
        return stream_anthropic(messages, model, cfg.api_key_anthropic,
                                cfg.temperature if hasattr(cfg, "temperature") else 0.7,
                                cfg.max_tokens  if hasattr(cfg, "max_tokens")  else 4096,
                                system_prompt)
    elif p == "google":
        return stream_gemini(messages, model, cfg.api_key_google)
    elif p == "ollama":
        ollama_model = model.removeprefix("ollama/")
        ollama_url   = getattr(cfg, "ollama_base_url", None) or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        return stream_ollama(messages, ollama_model, base_url=ollama_url, system_prompt=system_prompt)
    else:
        return stream_openai(messages, model, cfg.api_key_openai)


async def stream_with_fallback(
    messages:      list[ChatMessage],
    primary_model: str,
    cfg,                      # OsSettingsRow-like object with api_key_* attrs
    system_prompt: str = "",
    max_attempts:  int = 3,
) -> tuple[str, AsyncGenerator[str, None]]:
    """
    Returns (model_actually_used, sse_generator).
    Tries primary model; on error SSE falls back through provider chain.
    """
    primary_provider = provider_for(primary_model)
    chain = PROVIDER_FALLBACK.get(primary_provider, [primary_provider])

    tried_models: list[str] = []

    async def _attempt(model: str) -> tuple[bool, list[str]]:
        """Collect output; return (had_error, chunks)."""
        import json as _json
        chunks: list[str] = []
        had_error = False
        gen = _make_stream(messages, model, cfg, system_prompt)
        async for chunk in gen:
            for part in chunk.split("\n\n"):
                part = part.strip()
                if not part or not part.startswith("data: "):
                    continue
                raw = part[6:].strip()
                if raw == "[DONE]":
                    break
                try:
                    parsed = _json.loads(raw)
                    if "error" in parsed:
                        had_error = True
                        break
                    elif "content" in parsed:
                        chunks.append(chunk)
                except Exception:
                    pass
        return had_error, chunks

    for provider in chain:
        if provider == primary_provider:
            model = primary_model
        else:
            model = PROVIDER_FALLBACK_MODEL.get(provider, primary_model)

        if model in tried_models:
            continue
        tried_models.append(model)

        # Check if we have a key / config for this provider
        has_key = False
        if provider == "openai"    and getattr(cfg, "api_key_openai",    ""):
            has_key = True
        elif provider == "anthropic" and getattr(cfg, "api_key_anthropic", ""):
            has_key = True
        elif provider == "google"    and getattr(cfg, "api_key_google",    ""):
            has_key = True
        elif provider == "ollama":
            # Ollama is local — no key needed; always attempt
            has_key = True
        if not has_key:
            continue

        had_error, chunks = await _attempt(model)
        if not had_error and chunks:
            # Re-stream the collected chunks as an async generator
            async def _replay(c=chunks, m=model):
                for chunk in c:
                    yield chunk
                yield "data: [DONE]\n\n"
            return model, _replay()

        # Small backoff before next attempt
        await asyncio.sleep(0.5)

    # All providers failed — return error generator from primary
    async def _err_gen():
        import json
        yield f"data: {json.dumps({'error': 'All AI providers failed. Please check API keys and quotas.'})}\n\n"
        yield "data: [DONE]\n\n"
    return primary_model, _err_gen()
