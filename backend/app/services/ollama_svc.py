"""
Ollama (local LLM) streaming service.

Calls the Ollama HTTP API at OLLAMA_BASE_URL (default: http://localhost:11434).
Compatible with any model pulled via `ollama pull <model>`.

Common models: llama3.2, mistral, phi3, gemma2, qwen2.5, codellama
"""
from __future__ import annotations

import json
from typing import AsyncGenerator

import httpx

from app.schemas import ChatMessage


async def stream_ollama(
    messages:     list[ChatMessage],
    model:        str,
    base_url:     str = "http://localhost:11434",
    temperature:  float = 0.7,
    max_tokens:   int   = 4096,
    system_prompt: str  = "",
) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted strings: `data: {...}\\n\\n`"""
    if not base_url:
        yield _err("Ollama base URL が設定されていません。Settings で ollama_base_url を設定してください。")
        return

    # Build Ollama chat format
    ollama_messages: list[dict] = []
    if system_prompt:
        ollama_messages.append({"role": "system", "content": system_prompt})
    for m in messages:
        if m.role == "system":
            # If a system message appears mid-conversation, prepend it
            ollama_messages.append({"role": "system", "content": m.content})
        else:
            ollama_messages.append({"role": m.role, "content": m.content})

    payload = {
        "model":    model,
        "messages": ollama_messages,
        "stream":   True,
        "options":  {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{base_url.rstrip('/')}/api/chat",
                json=payload,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    yield _err(f"Ollama error {response.status_code}: {body.decode()[:200]}")
                    return

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield _data({"content": content})

                    if data.get("done"):
                        break

        yield "data: [DONE]\n\n"

    except httpx.ConnectError:
        yield _err(
            "Ollama に接続できません。`ollama serve` が起動していることを確認してください。"
            f" (URL: {base_url})"
        )
    except Exception as exc:
        yield _err(str(exc))


async def check_ollama_health(base_url: str = "http://localhost:11434") -> dict:
    """
    Check if Ollama is running and return available models.
    Returns: {"ok": bool, "models": list[str], "error": str|None}
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{base_url.rstrip('/')}/api/tags")
            if r.status_code == 200:
                data = r.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"ok": True, "models": models, "error": None}
            return {"ok": False, "models": [], "error": f"HTTP {r.status_code}"}
    except httpx.ConnectError:
        return {"ok": False, "models": [], "error": "Connection refused — is Ollama running?"}
    except Exception as e:
        return {"ok": False, "models": [], "error": str(e)}


def _data(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _err(message: str) -> str:
    return f"data: {json.dumps({'error': message}, ensure_ascii=False)}\n\ndata: [DONE]\n\n"
