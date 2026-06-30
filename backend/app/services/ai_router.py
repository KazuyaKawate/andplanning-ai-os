"""
Factory → model routing, provider fallback chains, and cost estimation.
"""
from __future__ import annotations

FACTORY_DEFAULT_MODELS: dict[str, str | None] = {
    "dev":         "claude-sonnet-4-6",   # Virtual Claude Dev — prefer Claude
    "debug":       "claude-sonnet-4-6",   # Auto Debugger — prefer Claude for analysis
    "team":        "claude-sonnet-4-6",   # Virtual Claude Team orchestration
    "writing":     "claude-sonnet-4-6",
    "research":    "gpt-4o",
    "marketing":   "gemini-2.5-flash",
    "video":       "gemini-2.5-flash",
    "fortune":     "claude-haiku-4-5-20251001",
    "creator":     "gpt-4o-mini",
    "ai-os":       None,
    "coding":      "gpt-4o",
    "legal":       "claude-sonnet-4-6",
    "hr":          "gpt-4o-mini",
    "finance":     "gpt-4o",
    "translation": "gemini-2.5-flash",
    "support":     "gpt-4o-mini",
    "education":   "claude-sonnet-4-6",
    "social":      "gemini-2.5-flash",
    "email":       "gpt-4o-mini",
    "seo":         "gpt-4o-mini",
    "design":      "gemini-2.5-flash",
    "data":        "gpt-4o",
    "press":       "claude-sonnet-4-6",
    "proposal":    "claude-sonnet-4-6",
    "meeting":     "gpt-4o-mini",
    "brand":       "claude-sonnet-4-6",
    "product":     "gpt-4o",
    "knowledge":   "claude-sonnet-4-6",
}

MODEL_PROVIDER: dict[str, str] = {
    "gpt-4o":                     "openai",
    "gpt-4o-mini":                "openai",
    "o1":                         "openai",
    "o1-mini":                    "openai",
    "claude-opus-4-8":            "anthropic",
    "claude-sonnet-4-6":          "anthropic",
    "claude-haiku-4-5-20251001":  "anthropic",
    "gemini-2.5-flash":           "google",
    "gemini-2.5-flash-lite":      "google",
    "gemini-2.5-pro":             "google",
    "gemini-2.0-flash":           "google",
    "gemini-1.5-pro":             "google",
    "gemini-1.5-flash":           "google",
    # Ollama — local model names are dynamic; we use the prefix "ollama/"
    "ollama/llama3.2":            "ollama",
    "ollama/mistral":             "ollama",
    "ollama/phi3":                "ollama",
    "ollama/gemma2":              "ollama",
    "ollama/qwen2.5":             "ollama",
    "ollama/codellama":           "ollama",
    "ollama/deepseek-coder":      "ollama",
}

# Cost per 1M tokens (USD). Rough input:output = 30:70 split assumed.
MODEL_COSTS_PER_1M: dict[str, dict[str, float]] = {
    "gpt-4o":                    {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini":               {"input": 0.15,  "output": 0.60},
    "o1":                        {"input": 15.00, "output": 60.00},
    "claude-opus-4-8":           {"input": 15.00, "output": 75.00},
    "claude-sonnet-4-6":         {"input": 3.00,  "output": 15.00},
    "claude-haiku-4-5-20251001": {"input": 0.25,  "output": 1.25},
    "gemini-2.5-flash":          {"input": 0.075, "output": 0.30},
    "gemini-2.5-pro":            {"input": 1.25,  "output": 5.00},
    "gemini-2.0-flash":          {"input": 0.075, "output": 0.30},
}

# Provider fallback order when primary fails
PROVIDER_FALLBACK: dict[str, list[str]] = {
    "openai":    ["openai",    "anthropic", "google"],
    "anthropic": ["anthropic", "openai",    "google"],
    "google":    ["google",    "openai",    "anthropic"],
}

# Best cheap fallback model per provider
PROVIDER_FALLBACK_MODEL: dict[str, str] = {
    "openai":    "gpt-4o-mini",
    "anthropic": "claude-haiku-4-5-20251001",
    "google":    "gemini-2.5-flash",
}


def resolve_model(
    factory_id: str | None,
    factory_preferred_model: str | None,
    os_default_model: str,
    requested_model: str | None = None,
) -> str:
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
    if model.startswith("ollama/"):
        return "ollama"
    return MODEL_PROVIDER.get(model, "openai")


def calculate_cost_usd(model: str, tokens: int) -> float:
    """Estimate USD cost for a run. Assumes 30% input / 70% output token split."""
    costs = MODEL_COSTS_PER_1M.get(model, {"input": 1.0, "output": 4.0})
    return (tokens * 0.30 / 1_000_000 * costs["input"] +
            tokens * 0.70 / 1_000_000 * costs["output"])
