"""Business Knowledge Base — Marketplace endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin, optional_user
from app.biz_models import BizMarketplaceItem, BizItemPricePlan
from app.biz_schemas import (
    BizMarketplaceItemCreate, BizMarketplaceItemOut, BizMarketplaceItemUpdate,
    BizMarketplaceListOut, BizItemPricePlanCreate,
)
from app.database import get_db
from app.models import User

router = APIRouter(tags=["biz-marketplace"])


# ---------------------------------------------------------------------------
# Public listing
# ---------------------------------------------------------------------------

@router.get("/biz/marketplace", response_model=BizMarketplaceListOut)
async def list_marketplace(
    item_type: str | None   = Query(None),
    category:  str | None   = Query(None),
    search:    str | None   = Query(None),
    status:    str          = Query("published"),
    skip:      int          = Query(0, ge=0),
    limit:     int          = Query(20, ge=1, le=100),
    sort_by:   str          = Query("created_at"),
    db:        AsyncSession = Depends(get_db),
):
    q = select(BizMarketplaceItem).where(BizMarketplaceItem.status == status)
    if item_type:
        q = q.where(BizMarketplaceItem.item_type == item_type)
    if category:
        q = q.where(BizMarketplaceItem.category == category)
    if search:
        like = f"%{search}%"
        q = q.where(or_(
            BizMarketplaceItem.title.ilike(like),
            BizMarketplaceItem.title_ja.ilike(like),
            BizMarketplaceItem.short_desc.ilike(like),
        ))

    sort_col = {
        "created_at": BizMarketplaceItem.created_at.desc(),
        "total_sales": BizMarketplaceItem.total_sales.desc(),
        "avg_rating":  BizMarketplaceItem.avg_rating.desc(),
        "title":       BizMarketplaceItem.title.asc(),
    }.get(sort_by, BizMarketplaceItem.created_at.desc())

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar_one()

    q = q.order_by(sort_col).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()

    return BizMarketplaceListOut(
        items=[_out(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/biz/marketplace/featured", response_model=list[BizMarketplaceItemOut])
async def featured_items(db: AsyncSession = Depends(get_db)):
    q = (select(BizMarketplaceItem)
         .where(BizMarketplaceItem.status == "published")
         .order_by(BizMarketplaceItem.avg_rating.desc(), BizMarketplaceItem.total_sales.desc())
         .limit(8))
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


@router.get("/biz/marketplace/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    q = (select(BizMarketplaceItem.category)
         .where(BizMarketplaceItem.status == "published",
                BizMarketplaceItem.category != "")
         .distinct())
    rows = (await db.execute(q)).scalars().all()
    return {"categories": sorted(rows)}


@router.get("/biz/marketplace/{item_id}", response_model=BizMarketplaceItemOut)
async def get_marketplace_item(item_id: str, db: AsyncSession = Depends(get_db)):
    row = await _get_or_404(db, item_id)
    return _out(row)


# ---------------------------------------------------------------------------
# Authenticated — publish / manage
# ---------------------------------------------------------------------------

@router.post("/biz/marketplace", response_model=BizMarketplaceItemOut, status_code=201)
async def create_marketplace_item(
    body:    BizMarketplaceItemCreate,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_current_user),
):
    row = BizMarketplaceItem(
        **body.model_dump(),
        seller_id=user.id,
        status="draft",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _out(row)


@router.patch("/biz/marketplace/{item_id}", response_model=BizMarketplaceItemOut)
async def update_marketplace_item(
    item_id: str,
    body:    BizMarketplaceItemUpdate,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_current_user),
):
    row = await _get_or_404(db, item_id)
    if row.seller_id != user.id and user.role != "admin":
        raise HTTPException(403, "Not the seller of this item")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _out(row)


@router.delete("/biz/marketplace/{item_id}", status_code=204)
async def remove_marketplace_item(
    item_id: str,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_current_user),
):
    row = await _get_or_404(db, item_id)
    if row.seller_id != user.id and user.role != "admin":
        raise HTTPException(403, "Not the seller of this item")
    row.status = "removed"
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()


# ---------------------------------------------------------------------------
# Price plan linking
# ---------------------------------------------------------------------------

@router.get("/biz/marketplace/{item_id}/price-plans")
async def get_item_price_plans(item_id: str, db: AsyncSession = Depends(get_db)):
    await _get_or_404(db, item_id)
    q = select(BizItemPricePlan).where(BizItemPricePlan.item_id == item_id)
    rows = (await db.execute(q)).scalars().all()
    return {"item_id": item_id, "price_plans": [
        {"id": r.id, "price_plan_id": r.price_plan_id, "is_default": r.is_default}
        for r in rows
    ]}


@router.post("/biz/marketplace/{item_id}/price-plans", status_code=201)
async def add_price_plan_to_item(
    item_id: str,
    body:    BizItemPricePlanCreate,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_current_user),
):
    row = await _get_or_404(db, item_id)
    if row.seller_id != user.id and user.role != "admin":
        raise HTTPException(403, "Not the seller of this item")
    link = BizItemPricePlan(
        item_id=item_id,
        price_plan_id=body.price_plan_id,
        is_default=body.is_default,
    )
    db.add(link)
    await db.commit()
    return {"ok": True, "item_id": item_id, "price_plan_id": body.price_plan_id}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_404(db: AsyncSession, item_id: str) -> BizMarketplaceItem:
    row = (await db.execute(
        select(BizMarketplaceItem).where(BizMarketplaceItem.id == item_id)
    )).scalars().first()
    if not row:
        raise HTTPException(404, f"Marketplace item {item_id} not found")
    return row


def _out(row: BizMarketplaceItem) -> BizMarketplaceItemOut:
    def _fmt(dt: datetime | None) -> str:
        return dt.isoformat() if dt else ""
    return BizMarketplaceItemOut(
        id=row.id, title=row.title, title_ja=row.title_ja,
        description=row.description, short_desc=row.short_desc,
        item_type=row.item_type, item_id=row.item_id, seller_id=row.seller_id,
        license_id=row.license_id, thumbnail_id=row.thumbnail_id, status=row.status,
        tags=row.tags or [], category=row.category, subcategory=row.subcategory,
        version=row.version, features=row.features or [],
        requirements=row.requirements or [], total_sales=row.total_sales,
        avg_rating=row.avg_rating, review_count=row.review_count,
        affiliate_enabled=row.affiliate_enabled,
        creator_revenue_pct=row.creator_revenue_pct,
        created_at=_fmt(row.created_at), updated_at=_fmt(row.updated_at),
    )
