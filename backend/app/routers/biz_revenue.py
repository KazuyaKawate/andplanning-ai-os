"""Business Knowledge Base — Revenue & sales analytics."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.biz_models import (
    BizSalesTransaction, BizRevenueSnapshot,
    BizSubscription, BizMarketplaceItem,
)
from app.biz_schemas import (
    BizRevenueSummaryOut, BizTransactionOut, BizRankingItemOut, BizSnapshotOut,
    BizAffiliateStatsOut, BizAffiliateReferralOut,
)
from app.database import get_db
from app.models import User

router = APIRouter(tags=["biz-revenue"])


# ---------------------------------------------------------------------------
# Public: ranking
# ---------------------------------------------------------------------------

@router.get("/biz/revenue/ranking", response_model=list[BizRankingItemOut])
async def item_ranking(
    limit: int          = Query(10, ge=1, le=50),
    db:    AsyncSession = Depends(get_db),
):
    q = (select(
            BizMarketplaceItem.id,
            BizMarketplaceItem.title,
            BizMarketplaceItem.item_type,
            BizMarketplaceItem.total_sales,
            BizMarketplaceItem.avg_rating,
         )
         .where(BizMarketplaceItem.status == "published")
         .order_by(BizMarketplaceItem.total_sales.desc())
         .limit(limit))
    rows = (await db.execute(q)).all()

    result = []
    for r in rows:
        rev_q = select(func.sum(BizSalesTransaction.seller_revenue_jpy)).where(
            BizSalesTransaction.marketplace_item_id == r[0]
        )
        rev = (await db.execute(rev_q)).scalar_one() or 0
        result.append(BizRankingItemOut(
            item_id=r[0], title=r[1], item_type=r[2],
            total_sales=r[3], avg_rating=r[4], revenue_jpy=rev,
        ))
    return result


# ---------------------------------------------------------------------------
# Seller: my revenue summary
# ---------------------------------------------------------------------------

@router.get("/biz/revenue/summary", response_model=BizRevenueSummaryOut)
async def my_revenue_summary(
    days: int          = Query(30, ge=1, le=365),
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total_tx = await db.execute(
        select(func.count(), func.sum(BizSalesTransaction.seller_revenue_jpy))
        .where(BizSalesTransaction.seller_id == user.id, BizSalesTransaction.created_at >= since)
    )
    count, seller_rev = total_tx.one()
    count      = count or 0
    seller_rev = seller_rev or 0

    platform_rev = (await db.execute(
        select(func.sum(BizSalesTransaction.platform_revenue_jpy))
        .where(BizSalesTransaction.seller_id == user.id, BizSalesTransaction.created_at >= since)
    )).scalar_one() or 0

    total_rev = seller_rev + platform_rev

    active_subs = (await db.execute(
        select(func.count()).select_from(BizSubscription)
        .where(BizSubscription.user_id == user.id, BizSubscription.status.in_(["active", "trial"]))
    )).scalar_one() or 0

    mrr = seller_rev // max(days // 30, 1)

    return BizRevenueSummaryOut(
        seller_id=user.id,
        total_revenue_jpy=total_rev,
        seller_revenue_jpy=seller_rev,
        platform_revenue_jpy=platform_rev,
        total_transactions=count,
        active_subscriptions=active_subs,
        mrr_jpy=mrr,
        period_days=days,
    )


# ---------------------------------------------------------------------------
# Seller: transaction history
# ---------------------------------------------------------------------------

@router.get("/biz/revenue/transactions", response_model=list[BizTransactionOut])
async def my_transactions(
    skip:  int          = Query(0, ge=0),
    limit: int          = Query(20, ge=1, le=100),
    db:    AsyncSession = Depends(get_db),
    user:  User         = Depends(get_current_user),
):
    q = (select(BizSalesTransaction)
         .where(BizSalesTransaction.seller_id == user.id)
         .order_by(BizSalesTransaction.created_at.desc())
         .offset(skip).limit(limit))
    rows = (await db.execute(q)).scalars().all()
    return [_tx_out(r) for r in rows]


# ---------------------------------------------------------------------------
# Admin: platform-wide revenue
# ---------------------------------------------------------------------------

@router.get("/biz/revenue/platform", response_model=BizRevenueSummaryOut)
async def platform_revenue(
    days: int          = Query(30, ge=1, le=365),
    db:   AsyncSession = Depends(get_db),
    _:    User         = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    row = (await db.execute(
        select(
            func.count(),
            func.sum(BizSalesTransaction.amount_jpy),
            func.sum(BizSalesTransaction.seller_revenue_jpy),
            func.sum(BizSalesTransaction.platform_revenue_jpy),
        ).where(BizSalesTransaction.created_at >= since)
    )).one()

    count, total, seller, platform = row
    active_subs = (await db.execute(
        select(func.count()).select_from(BizSubscription)
        .where(BizSubscription.status.in_(["active", "trial"]))
    )).scalar_one() or 0

    return BizRevenueSummaryOut(
        seller_id=None,
        total_revenue_jpy=total or 0,
        seller_revenue_jpy=seller or 0,
        platform_revenue_jpy=platform or 0,
        total_transactions=count or 0,
        active_subscriptions=active_subs,
        mrr_jpy=(platform or 0) // max(days // 30, 1),
        period_days=days,
    )


# ---------------------------------------------------------------------------
# Admin: daily snapshots
# ---------------------------------------------------------------------------

@router.get("/biz/revenue/snapshots", response_model=list[BizSnapshotOut])
async def list_snapshots(
    skip:  int          = Query(0, ge=0),
    limit: int          = Query(30, ge=1, le=90),
    db:    AsyncSession = Depends(get_db),
    _:     User         = Depends(require_admin),
):
    q = (select(BizRevenueSnapshot)
         .where(BizRevenueSnapshot.seller_id == None)
         .order_by(BizRevenueSnapshot.snapshot_date.desc())
         .offset(skip).limit(limit))
    rows = (await db.execute(q)).scalars().all()
    return [_snap_out(r) for r in rows]


@router.post("/biz/revenue/snapshots/generate", status_code=201)
async def generate_snapshot(
    db: AsyncSession = Depends(get_db),
    _:  User         = Depends(require_admin),
):
    today = date.today()
    existing = (await db.execute(
        select(BizRevenueSnapshot).where(
            BizRevenueSnapshot.seller_id == None,
            BizRevenueSnapshot.snapshot_date == today,
        )
    )).scalars().first()
    if existing:
        return {"ok": True, "message": "Snapshot already exists for today", "date": str(today)}

    since = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    agg = (await db.execute(
        select(
            func.count(), func.sum(BizSalesTransaction.amount_jpy),
            func.sum(BizSalesTransaction.seller_revenue_jpy),
            func.sum(BizSalesTransaction.platform_revenue_jpy),
        ).where(BizSalesTransaction.created_at >= since)
    )).one()

    active_subs = (await db.execute(
        select(func.count()).select_from(BizSubscription)
        .where(BizSubscription.status.in_(["active", "trial"]))
    )).scalar_one() or 0

    snap = BizRevenueSnapshot(
        id=str(uuid.uuid4()),
        seller_id=None,
        snapshot_date=today,
        total_sales_count=agg[0] or 0,
        total_revenue_jpy=agg[1] or 0,
        seller_revenue_jpy=agg[2] or 0,
        platform_revenue_jpy=agg[3] or 0,
        new_subscribers=active_subs,
        created_at=datetime.now(timezone.utc),
    )
    db.add(snap)
    await db.commit()
    return {"ok": True, "date": str(today), "snapshot_id": snap.id}


# ---------------------------------------------------------------------------
# Affiliate Engine (Phase 1)
# ---------------------------------------------------------------------------

@router.get("/biz/affiliate/stats", response_model=BizAffiliateStatsOut)
async def get_affiliate_stats(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    q = select(
        func.count(),
        func.sum(BizSalesTransaction.amount_jpy),
        func.sum(BizSalesTransaction.affiliate_revenue_jpy)
    ).where(BizSalesTransaction.affiliate_id == user.id)
    
    row = (await db.execute(q)).one()
    count, total_sales, total_commission = row
    
    count = count or 0
    total_sales = total_sales or 0
    total_commission = total_commission or 0
    
    paid = int(total_commission * 0.4)
    unpaid = total_commission - paid
    
    return BizAffiliateStatsOut(
        total_referrals=count,
        total_revenue_jpy=total_sales,
        total_commission_jpy=total_commission,
        unpaid_commission_jpy=unpaid,
        paid_commission_jpy=paid,
    )


@router.get("/biz/affiliate/referrals", response_model=list[BizAffiliateReferralOut])
async def get_affiliate_referrals(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    q = (select(BizSalesTransaction)
         .where(BizSalesTransaction.affiliate_id == user.id)
         .order_by(BizSalesTransaction.created_at.desc()))
    
    rows = (await db.execute(q)).scalars().all()
    
    res = []
    for r in rows:
        item_title = "Ecosystem Item"
        if r.marketplace_item_id:
            item = (await db.execute(
                select(BizMarketplaceItem).where(BizMarketplaceItem.id == r.marketplace_item_id)
            )).scalars().first()
            if item:
                item_title = item.title_ja or item.title

        res.append(BizAffiliateReferralOut(
            id=r.id,
            buyer_id=r.buyer_id,
            marketplace_item_id=r.marketplace_item_id or "",
            marketplace_item_title=item_title,
            amount_jpy=r.amount_jpy,
            commission_jpy=r.affiliate_revenue_jpy,
            created_at=r.created_at.isoformat() if r.created_at else "",
        ))
    return res


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tx_out(r: BizSalesTransaction) -> BizTransactionOut:
    return BizTransactionOut(
        id=r.id, buyer_id=r.buyer_id, seller_id=r.seller_id,
        marketplace_item_id=r.marketplace_item_id, price_plan_id=r.price_plan_id,
        amount_jpy=r.amount_jpy, seller_revenue_jpy=r.seller_revenue_jpy,
        platform_revenue_jpy=r.platform_revenue_jpy, transaction_type=r.transaction_type,
        payment_provider=r.payment_provider,
        created_at=r.created_at.isoformat() if r.created_at else "",
    )


def _snap_out(r: BizRevenueSnapshot) -> BizSnapshotOut:
    return BizSnapshotOut(
        id=r.id, seller_id=r.seller_id, snapshot_date=str(r.snapshot_date),
        total_sales_count=r.total_sales_count, total_revenue_jpy=r.total_revenue_jpy,
        seller_revenue_jpy=r.seller_revenue_jpy, new_subscribers=r.new_subscribers,
        churned_subscribers=r.churned_subscribers, mrr_jpy=r.mrr_jpy,
        created_at=r.created_at.isoformat() if r.created_at else "",
    )
