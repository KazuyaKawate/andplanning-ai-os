"""
Notification endpoints.

GET  /api/notifications          — list (newest first, limit 50)
POST /api/notifications/{id}/read — mark as read
POST /api/notifications/read-all  — mark all as read
DELETE /api/notifications/{id}    — delete one
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id:        str
    type:      str
    title:     str
    body:      str
    link:      str | None
    is_read:   bool
    created_at: str


def _out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id        = n.id,
        type      = n.type,
        title     = n.title,
        body      = n.body,
        link      = n.link,
        is_read   = n.is_read,
        created_at = n.created_at.isoformat() if n.created_at else "",
    )


@router.get("", response_model=list[NotificationOut])
async def list_notifications(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return [_out(n) for n in result.scalars().all()]


@router.get("/unread-count")
async def unread_count(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    result = await db.execute(
        select(func.count()).select_from(Notification).where(Notification.is_read == False)  # noqa: E712
    )
    return {"count": result.scalar() or 0}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id)
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification).where(Notification.is_read == False).values(is_read=True)  # noqa: E712
    )
    await db.commit()
    return {"ok": True}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    await db.execute(delete(Notification).where(Notification.id == notification_id))
    await db.commit()
    return {"ok": True}
