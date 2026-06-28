from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import MemoryEntry
from app.schemas import MemoryEntryOut

router = APIRouter(tags=["memory"])


@router.get("/memory", response_model=list[MemoryEntryOut])
async def get_memory(
    factoryId: str | None = None,
    search:    str | None = None,
    limit:     int        = 20,
    db: AsyncSession = Depends(get_db),
):
    q = select(MemoryEntry).order_by(MemoryEntry.created_at.desc())
    if factoryId:
        q = q.where(MemoryEntry.factory_id == factoryId)
    result = await db.execute(q.limit(limit * 3))  # over-fetch before text filter
    entries = result.scalars().all()

    if search:
        entries = [
            e for e in entries
            if search in e.title or search in e.summary
        ]

    return [
        MemoryEntryOut(
            id=e.id, factoryId=e.factory_id, workflowId=e.workflow_id,
            title=e.title, summary=e.summary, model=e.model,
            tags=e.tags or [], size=e.size,
            createdAt=e.created_at.isoformat(),
        )
        for e in entries[:limit]
    ]
