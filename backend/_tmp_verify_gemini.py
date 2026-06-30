"""Temp verification: run the real stream_gemini() with the configured AQ key.
Prints NO secrets — only key prefix, status, and a short response snippet.
"""
import asyncio
from app.config import settings
from app.schemas import ChatMessage
from app.services.gemini_svc import stream_gemini

key = settings.google_api_key or ""
print(f"key configured: {bool(key)} | prefix: {key[:3]!r} | len: {len(key)}")


async def main():
    msgs = [
        ChatMessage(role="system", content="You are a terse assistant."),
        ChatMessage(role="user", content="Reply with exactly: PONG"),
    ]
    got_text = ""
    got_error = None
    async for sse in stream_gemini(msgs, "gemini-2.5-flash-lite", key, 0.0, 32):
        line = sse.strip()
        if '"error"' in line:
            got_error = line
        elif '"content"' in line:
            import json
            payload = json.loads(line[len("data: "):])
            got_text += payload.get("content", "")
    if got_error:
        print("RESULT: ERROR ->", got_error[:300])
    else:
        print("RESULT: OK -> response snippet:", repr(got_text[:80]))


asyncio.run(main())
