"""
Google Gemini chat service — streaming SSE generator.

Uses the modern `google-genai` SDK (async client). This SDK talks to the native
generativelanguage endpoint and authenticates with the `x-goog-api-key` header,
so it works with BOTH the legacy `AIza...` Standard keys and the current
`AQ.Ab...` Auth keys issued by Google AI Studio. It never routes through the
OpenAI-compatible transport / `Authorization: Bearer`, which is what makes
`AQ.` keys return 401/400.
"""
from __future__ import annotations

import asyncio
import json
from typing import AsyncGenerator

from app.schemas import ChatMessage

_RETRY_DELAYS = [2.0, 5.0, 10.0]  # seconds between 429 retries


async def stream_gemini(
    messages:    list[ChatMessage],
    model:       str,
    api_key:     str,
    temperature: float = 0.7,
    max_tokens:  int   = 4096,
) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted strings: `data: {...}\n\n`"""
    if not api_key:
        yield _err("Google API key が設定されていません。Settings → API Keys で設定してください。")
        return

    try:
        from google import genai
        from google.genai import types

        # Native Gemini API (generativelanguage). No key-prefix assumption:
        # AQ. / AIza both authenticate via the x-goog-api-key header.
        client = genai.Client(api_key=api_key)

        # System prompts → system_instruction; user/assistant turns → contents.
        system_parts: list[str] = []
        contents: list[types.Content] = []
        for m in messages:
            if m.role == "system":
                system_parts.append(m.content)
            elif m.role == "user":
                contents.append(
                    types.Content(role="user", parts=[types.Part.from_text(text=m.content)])
                )
            elif m.role == "assistant":
                contents.append(
                    types.Content(role="model", parts=[types.Part.from_text(text=m.content)])
                )

        if not contents:
            contents.append(
                types.Content(role="user", parts=[types.Part.from_text(text="こんにちは")])
            )

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction="\n\n".join(system_parts) or None,
        )

        async def _run() -> AsyncGenerator[str, None]:
            stream = await client.aio.models.generate_content_stream(
                model=model,
                contents=contents,
                config=config,
            )
            async for chunk in stream:
                if chunk.text:
                    yield _data({"content": chunk.text})

        # Retry up to 3 times on 429 (quota exceeded) with backoff.
        last_exc: Exception | None = None
        for attempt, delay in enumerate([0.0] + _RETRY_DELAYS):
            if delay:
                await asyncio.sleep(delay)
            try:
                async for sse in _run():
                    yield sse
                yield "data: [DONE]\n\n"
                return
            except Exception as exc:
                last_exc = exc
                exc_str = str(exc).lower()
                if "429" in exc_str or "quota" in exc_str or "resource_exhausted" in exc_str:
                    if attempt < len(_RETRY_DELAYS):
                        continue  # retry with backoff
                break  # non-429 error or retries exhausted

        yield _err(str(last_exc))

    except Exception as exc:  # noqa: BLE001
        yield _err(str(exc))


def _data(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _err(message: str) -> str:
    return f"data: {json.dumps({'error': message}, ensure_ascii=False)}\n\ndata: [DONE]\n\n"
