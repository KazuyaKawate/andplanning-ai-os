"""Business Knowledge Base — User Library (purchases, favorites, history)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.biz_models import BizUserPurchase, BizUserFavorite, BizUserHistory
from app.biz_schemas import (
    BizFavoriteCreate, BizFavoriteOut, BizHistoryCreate, BizHistoryOut, BizPurchaseOut,
)
from app.database import get_db
from app.models import User

router = APIRouter(tags=["biz-library"])


# ---------------------------------------------------------------------------
# Purchases
# ---------------------------------------------------------------------------

@router.get("/biz/library/purchases", response_model=list[BizPurchaseOut])
async def my_purchases(
    skip:  int          = Query(0, ge=0),
    limit: int          = Query(20, ge=1, le=100),
    db:    AsyncSession = Depends(get_db),
    user:  User         = Depends(get_current_user),
):
    q = (select(BizUserPurchase)
         .where(BizUserPurchase.user_id == user.id)
         .order_by(BizUserPurchase.purchased_at.desc())
         .offset(skip).limit(limit))
    rows = (await db.execute(q)).scalars().all()
    return [_purchase_out(r) for r in rows]


@router.get("/biz/library/purchases/{purchase_id}", response_model=BizPurchaseOut)
async def get_purchase(
    purchase_id: str,
    db:          AsyncSession = Depends(get_db),
    user:        User         = Depends(get_current_user),
):
    row = await _get_purchase_or_404(db, purchase_id, user.id)
    return _purchase_out(row)


# ---------------------------------------------------------------------------
# Favorites
# ---------------------------------------------------------------------------

@router.get("/biz/library/favorites", response_model=list[BizFavoriteOut])
async def my_favorites(
    item_type: str | None   = Query(None),
    skip:      int          = Query(0, ge=0),
    limit:     int          = Query(50, ge=1, le=100),
    db:        AsyncSession = Depends(get_db),
    user:      User         = Depends(get_current_user),
):
    q = select(BizUserFavorite).where(BizUserFavorite.user_id == user.id)
    if item_type:
        q = q.where(BizUserFavorite.item_type == item_type)
    q = q.order_by(BizUserFavorite.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return [_fav_out(r) for r in rows]


@router.post("/biz/library/favorites", response_model=BizFavoriteOut, status_code=201)
async def add_favorite(
    body: BizFavoriteCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    row = BizUserFavorite(
        user_id=user.id,
        item_type=body.item_type,
        item_id=body.item_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    try:
        await db.commit()
        await db.refresh(row)
    except IntegrityError:
        await db.rollback()
        existing = (await db.execute(
            select(BizUserFavorite).where(
                BizUserFavorite.user_id == user.id,
                BizUserFavorite.item_type == body.item_type,
                BizUserFavorite.item_id == body.item_id,
            )
        )).scalars().first()
        row = existing
    return _fav_out(row)


@router.delete("/biz/library/favorites/{item_type}/{item_id}", status_code=204)
async def remove_favorite(
    item_type: str,
    item_id:   str,
    db:        AsyncSession = Depends(get_db),
    user:      User         = Depends(get_current_user),
):
    await db.execute(
        delete(BizUserFavorite).where(
            BizUserFavorite.user_id == user.id,
            BizUserFavorite.item_type == item_type,
            BizUserFavorite.item_id == item_id,
        )
    )
    await db.commit()


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

@router.get("/biz/library/history", response_model=list[BizHistoryOut])
async def my_history(
    item_type: str | None   = Query(None),
    action:    str | None   = Query(None),
    skip:      int          = Query(0, ge=0),
    limit:     int          = Query(50, ge=1, le=100),
    db:        AsyncSession = Depends(get_db),
    user:      User         = Depends(get_current_user),
):
    q = select(BizUserHistory).where(BizUserHistory.user_id == user.id)
    if item_type:
        q = q.where(BizUserHistory.item_type == item_type)
    if action:
        q = q.where(BizUserHistory.action == action)
    q = q.order_by(BizUserHistory.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return [_hist_out(r) for r in rows]


@router.post("/biz/library/history", response_model=BizHistoryOut, status_code=201)
async def record_history(
    body: BizHistoryCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    row = BizUserHistory(
        user_id=user.id,
        item_type=body.item_type,
        item_id=body.item_id,
        action=body.action,
        meta=body.metadata,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _hist_out(row)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_purchase_or_404(db: AsyncSession, pid: str, user_id: str) -> BizUserPurchase:
    row = (await db.execute(
        select(BizUserPurchase).where(
            BizUserPurchase.id == pid, BizUserPurchase.user_id == user_id,
        )
    )).scalars().first()
    if not row:
        raise HTTPException(404, "Purchase not found")
    return row


def _purchase_out(r: BizUserPurchase) -> BizPurchaseOut:
    def _f(dt): return dt.isoformat() if dt else None
    return BizPurchaseOut(
        id=r.id, user_id=r.user_id, marketplace_item_id=r.marketplace_item_id,
        price_plan_id=r.price_plan_id, license_id=r.license_id,
        amount_jpy=r.amount_jpy, currency=r.currency,
        payment_provider=r.payment_provider, payment_ref=r.payment_ref,
        status=r.status, purchased_at=_f(r.purchased_at) or "",
        expires_at=_f(r.expires_at),
    )


def _fav_out(r: BizUserFavorite) -> BizFavoriteOut:
    return BizFavoriteOut(
        id=r.id, user_id=r.user_id, item_type=r.item_type, item_id=r.item_id,
        created_at=r.created_at.isoformat() if r.created_at else "",
    )


def _hist_out(r: BizUserHistory) -> BizHistoryOut:
    return BizHistoryOut(
        id=r.id, user_id=r.user_id, item_type=r.item_type, item_id=r.item_id,
        action=r.action, metadata=r.meta or {},
        created_at=r.created_at.isoformat() if r.created_at else "",
    )
