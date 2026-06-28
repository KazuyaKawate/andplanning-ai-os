"""
Google Gemini chat service — streaming SSE generator.
Uses asyncio.to_thread because google-generativeai SDK is synchronous.
"""
from __future__ import annotations

import asyncio
import json
from typing import AsyncGenerator

from app.schemas import ChatMessage


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
        import google.generativeai as genai
        from google.generativeai.types import GenerationConfig

        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel(
            model_name=model,
            generation_config=GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )

        # Build history for multi-turn (Gemini uses 'user'/'model' roles)
        history = []
        last_user_content = ""
        for m in messages:
            if m.role == "system":
                # Inject system prompt as a user turn at the start
                history.append({"role": "user",  "parts": [m.content]})
                history.append({"role": "model", "parts": ["了解しました。"]})
            elif m.role == "user":
                last_user_content = m.content
                history.append({"role": "user",  "parts": [m.content]})
            elif m.role == "assistant":
                history.append({"role": "model", "parts": [m.content]})

        # Remove the last user message from history (it becomes the send message)
        if history and history[-1]["role"] == "user":
            history = history[:-1]

        def _sync_stream():
            chat = gemini_model.start_chat(history=history)
            return chat.send_message(last_user_content or "こんにちは", stream=True)

        # Run blocking SDK call in a thread pool
        response = await asyncio.to_thread(_sync_stream)

        # Iterate chunks synchronously via to_thread for each chunk
        for chunk in response:
            if chunk.text:
                yield _data({"content": chunk.text})

        yield "data: [DONE]\n\n"

    except Exception as exc:  # noqa: BLE001
        yield _err(str(exc))


def _data(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _err(message: str) -> str:
    return f"data: {json.dumps({'error': message}, ensure_ascii=False)}\n\ndata: [DONE]\n\n"
