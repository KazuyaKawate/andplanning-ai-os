"""
Lightweight helper to create Notification records from any router.

Usage:
    from app.notify import push_notification
    await push_notification(db, "run_complete", "Workflow finished", "Blog post done!", "/os/workflows/xyz")
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


async def push_notification(
    db:       AsyncSession,
    type:     str,
    title:    str,
    body:     str = "",
    link:     str | None = None,
    user_id:  str | None = None,   # None = broadcast
) -> Notification:
    n = Notification(
        id         = str(uuid.uuid4()),
        user_id    = user_id,
        type       = type,
        title      = title,
        body       = body,
        link       = link,
        is_read    = False,
        created_at = datetime.now(timezone.utc),
    )
    db.add(n)
    return n
