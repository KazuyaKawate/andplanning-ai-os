from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import ActivityItem
from app.schemas import ActivityItemOut

router = APIRouter(tags=["activity"])


@router.get("/activity", response_model=list[ActivityItemOut])
async def get_activity(limit: int = 10, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ActivityItem)
        .order_by(ActivityItem.timestamp.desc())
        .limit(limit)
    )
    items = result.scalars().all()
    return [
        ActivityItemOut(
            id=a.id, type=a.type,
            factoryId=a.factory_id, factoryName=a.factory_name, factoryIcon=a.factory_icon,
            message=a.message, detail=a.detail,
            timestamp=a.timestamp.isoformat(),
        )
        for a in items
    ]
