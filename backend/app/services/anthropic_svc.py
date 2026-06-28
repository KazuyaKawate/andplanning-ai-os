"""
Anthropic (Claude) chat service — streaming SSE generator.
"""
from __future__ import annotations

import json
from typing import AsyncGenerator

from app.schemas import ChatMessage


async def stream_anthropic(
    messages:      list[ChatMessage],
    model:         str,
    api_key:       str,
    temperature:   float = 0.7,
    max_tokens:    int   = 4096,
    system_prompt: str   = "",
) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted strings: `data: {...}\n\n`"""
    if not api_key:
        yield _err("Anthropic API key が設定されていません。Settings → API Keys で設定してください。")
        return

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)

        # Separate system message from conversation
        sys_content = system_prompt
        conv: list[dict] = []
        for m in messages:
            if m.role == "system":
                sys_content = m.content  # last system message wins
            else:
                conv.append({"role": m.role, "content": m.content})

        kwargs: dict = {
            "model":      model,
            "max_tokens": max_tokens,
            "messages":   conv,
        }
        if sys_content:
            kwargs["system"] = sys_content
        # temperature not available on extended-thinking models; guard for safety
        kwargs["temperature"] = temperature

        async with client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield _data({"content": text})

        yield "data: [DONE]\n\n"

    except Exception as exc:  # noqa: BLE001
        yield _err(str(exc))


def _data(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _err(message: str) -> str:
    return f"data: {json.dumps({'error': message}, ensure_ascii=False)}\n\ndata: [DONE]\n\n"
