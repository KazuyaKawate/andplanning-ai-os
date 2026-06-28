from __future__ import annotations

from fastapi import APIRouter
from app.schemas import ModelOptionOut

router = APIRouter(tags=["models"])

AVAILABLE_MODELS: list[ModelOptionOut] = [
    ModelOptionOut(id="gpt-4o",                    name="GPT-4o",              provider="openai",    maxTokens=4096,  contextWindow=128000),
    ModelOptionOut(id="gpt-4o-mini",               name="GPT-4o mini",         provider="openai",    maxTokens=4096,  contextWindow=128000),
    ModelOptionOut(id="claude-sonnet-4-6",          name="Claude Sonnet 4.6",   provider="anthropic", maxTokens=8192,  contextWindow=200000),
    ModelOptionOut(id="claude-haiku-4-5-20251001",  name="Claude Haiku 4.5",    provider="anthropic", maxTokens=4096,  contextWindow=200000),
    ModelOptionOut(id="gemini-2.0-flash",           name="Gemini 2.0 Flash",    provider="google",    maxTokens=8192,  contextWindow=1000000),
    ModelOptionOut(id="gemini-1.5-pro",             name="Gemini 1.5 Pro",      provider="google",    maxTokens=8192,  contextWindow=2000000),
]


@router.get("/models", response_model=list[ModelOptionOut])
async def get_models():
    return AVAILABLE_MODELS
