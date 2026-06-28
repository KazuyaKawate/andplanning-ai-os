"""
Factory → model routing.
Each factory has a preferred AI model. If none is set, the OS default is used.
"""
from __future__ import annotations

# Default factory → model mapping
# Override per factory via the factory's `preferred_model` column.
FACTORY_DEFAULT_MODELS: dict[str, str] = {
    "writing":   "claude-sonnet-4-6",         # Claude — long-form writing quality
    "research":  "gpt-4o",                    # OpenAI — broad knowledge retrieval
    "marketing": "gemini-2.0-flash",          # Gemini — fast, multimodal-ready
    "video":     "gemini-2.0-flash",          # Gemini — video/creative brief
    "fortune":   "claude-haiku-4-5-20251001", # Claude Haiku — light fortune tasks
    "creator":   "gpt-4o-mini",               # OpenAI mini — cost-efficient
    "ai-os":     None,                        # None → use OS default from settings
}

# Model → provider mapping
MODEL_PROVIDER: dict[str, str] = {
    "gpt-4o":                    "openai",
    "gpt-4o-mini":               "openai",
    "o1":                        "openai",
    "o1-mini":                   "openai",
    "claude-opus-4-8":           "anthropic",
    "claude-sonnet-4-6":         "anthropic",
    "claude-haiku-4-5-20251001": "anthropic",
    "gemini-2.0-flash":          "google",
    "gemini-1.5-pro":            "google",
    "gemini-1.5-flash":          "google",
}


def resolve_model(
    factory_id: str | None,
    factory_preferred_model: str | None,
    os_default_model: str,
    requested_model: str | None = None,
) -> str:
    """Return the model ID to use for a given context (highest precedence first)."""
    if requested_model:
        return requested_model
    if factory_preferred_model:
        return factory_preferred_model
    if factory_id:
        fallback = FACTORY_DEFAULT_MODELS.get(factory_id)
        if fallback:
            return fallback
    return os_default_model


def provider_for(model: str) -> str:
    """Return 'openai' | 'anthropic' | 'google' for a given model ID."""
    return MODEL_PROVIDER.get(model, "openai")
