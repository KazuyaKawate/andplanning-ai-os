"""
OpenAI chat service — streaming SSE generator.
"""
from __future__ import annotations

import json
from typing import AsyncGenerator

from app.schemas import ChatMessage


async def stream_openai(
    messages:    list[ChatMessage],
    model:       str,
    api_key:     str,
    temperature: float = 0.7,
    max_tokens:  int   = 4096,
) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted strings: `data: {...}\n\n`"""
    if not api_key:
        yield _err("OpenAI API key が設定されていません。Settings → API Keys で設定してください。")
        return

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        params: dict = {
            "model":       model,
            "messages":    [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "stream":      True,
        }
        if not model.startswith("o1"):
            params["max_tokens"] = max_tokens

        stream = await client.chat.completions.create(**params)
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield _data({"content": delta})

        yield "data: [DONE]\n\n"

    except Exception as exc:  # noqa: BLE001
        yield _err(str(exc))


def _data(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _err(message: str) -> str:
    return f"data: {json.dumps({'error': message}, ensure_ascii=False)}\n\ndata: [DONE]\n\n"
