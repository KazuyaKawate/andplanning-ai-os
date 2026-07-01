"""Business Knowledge Base — Pricing plans and subscriptions."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.biz_models import BizPricePlan, BizSubscription, BizUserPurchase, BizMarketplaceItem, BizSalesTransaction
from app.biz_schemas import (
    BizPricePlanCreate, BizPricePlanOut, BizPricePlanUpdate,
    BizSubscribeRequest, BizSubscriptionOut, BizAccessCheckOut,
    BizPurchaseRequest, BizPurchaseOut, BizPaymentIntentOut,
)
from app.database import get_db
from app.models import User
from app.services.payment import get_payment_provider

router = APIRouter(tags=["biz-pricing"])


# ---------------------------------------------------------------------------
# Price Plans (public)
# ---------------------------------------------------------------------------

@router.get("/biz/pricing/plans", response_model=list[BizPricePlanOut])
async def list_plans(db: AsyncSession = Depends(get_db)):
    q = (select(BizPricePlan)
         .where(BizPricePlan.is_active == True)
         .order_by(BizPricePlan.sort_order))
    rows = (await db.execute(q)).scalars().all()
    return [_plan_out(r) for r in rows]


@router.get("/biz/pricing/plans/{plan_id}", response_model=BizPricePlanOut)
async def get_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    return _plan_out(await _get_plan_or_404(db, plan_id))


# ---------------------------------------------------------------------------
# Price Plans (admin)
# ---------------------------------------------------------------------------

@router.post("/biz/pricing/plans", response_model=BizPricePlanOut, status_code=201)
async def create_plan(
    body: BizPricePlanCreate,
    db:   AsyncSession = Depends(get_db),
    _:    object       = Depends(require_admin),
):
    row = BizPricePlan(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _plan_out(row)


@router.patch("/biz/pricing/plans/{plan_id}", response_model=BizPricePlanOut)
async def update_plan(
    plan_id: str,
    body:    BizPricePlanUpdate,
    db:      AsyncSession = Depends(get_db),
    _:       object       = Depends(require_admin),
):
    row = await _get_plan_or_404(db, plan_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _plan_out(row)


# ---------------------------------------------------------------------------
# Purchase (one-time payment)
# ---------------------------------------------------------------------------

@router.post("/biz/pricing/purchase", response_model=BizPurchaseOut, status_code=201)
async def purchase_item(
    body: BizPurchaseRequest,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    plan = await _get_plan_or_404(db, body.price_plan_id)

    # Check not already purchased
    existing = (await db.execute(
        select(BizUserPurchase).where(
            BizUserPurchase.user_id == user.id,
            BizUserPurchase.marketplace_item_id == body.marketplace_item_id,
            BizUserPurchase.status == "completed",
        )
    )).scalars().first()
    if existing:
        raise HTTPException(409, "Item already purchased")

    provider = get_payment_provider()
    intent   = await provider.create_payment_intent(
        amount_jpy=plan.price_jpy,
        item_id=body.marketplace_item_id,
        user_id=user.id,
        metadata={"price_plan_id": plan.id},
    )

    row = BizUserPurchase(
        id=str(uuid.uuid4()),
        user_id=user.id,
        marketplace_item_id=body.marketplace_item_id,
        price_plan_id=plan.id,
        amount_jpy=plan.price_jpy,
        currency=plan.currency,
        payment_provider=body.payment_provider,
        payment_ref=intent.provider_id,
        status="completed" if intent.status == "succeeded" else "pending",
        purchased_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.flush()

    if row.status == "completed":
        item = None
        if body.marketplace_item_id:
            item = (await db.execute(
                select(BizMarketplaceItem).where(BizMarketplaceItem.id == body.marketplace_item_id)
            )).scalars().first()

        seller_id = item.seller_id if item else "platform"
        creator_pct = item.creator_revenue_pct if item else 70.0
        affiliate_enabled = item.affiliate_enabled if item else False
        affiliate_pct = item.affiliate_pct if item else 0.0

        platform_fee_pct = 100.0 - creator_pct
        platform_revenue = int(row.amount_jpy * (platform_fee_pct / 100.0))
        seller_revenue = row.amount_jpy - platform_revenue

        affiliate_id = None
        affiliate_revenue = 0
        if affiliate_enabled and body.affiliate_id:
            affiliate_id = body.affiliate_id
            affiliate_revenue = int(row.amount_jpy * (affiliate_pct / 100.0))
            seller_revenue = max(0, seller_revenue - affiliate_revenue)

        tx = BizSalesTransaction(
            id=str(uuid.uuid4()),
            buyer_id=user.id,
            seller_id=seller_id,
            marketplace_item_id=body.marketplace_item_id,
            price_plan_id=plan.id,
            purchase_id=row.id,
            amount_jpy=row.amount_jpy,
            amount_usd_cents=int(row.amount_jpy * 0.7),
            currency=row.currency,
            platform_fee_pct=platform_fee_pct,
            seller_revenue_jpy=seller_revenue,
            platform_revenue_jpy=platform_revenue,
            affiliate_id=affiliate_id,
            affiliate_revenue_jpy=affiliate_revenue,
            transaction_type="sale",
            payment_provider=body.payment_provider,
            payment_ref=row.payment_ref,
            created_at=datetime.now(timezone.utc),
        )
        db.add(tx)

        if item:
            item.total_sales = (item.total_sales or 0) + 1

    await db.commit()
    await db.refresh(row)
    return _purchase_out(row)


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

@router.get("/biz/pricing/subscriptions", response_model=list[BizSubscriptionOut])
async def my_subscriptions(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    q = (select(BizSubscription)
         .where(BizSubscription.user_id == user.id,
                BizSubscription.status.in_(["active", "trial"]))
         .order_by(BizSubscription.created_at.desc()))
    rows = (await db.execute(q)).scalars().all()
    return [_sub_out(r) for r in rows]


@router.post("/biz/pricing/subscribe", response_model=BizSubscriptionOut, status_code=201)
async def subscribe(
    body: BizSubscribeRequest,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    plan = await _get_plan_or_404(db, body.price_plan_id)
    if plan.billing_type not in ("subscription", "enterprise"):
        raise HTTPException(400, "This plan is not a subscription plan")

    provider = get_payment_provider()
    result   = await provider.create_subscription(
        price_id=plan.stripe_price_id or plan.id,
        user_id=user.id,
        metadata={"plan_name": plan.name},
    )

    row = BizSubscription(
        id=str(uuid.uuid4()),
        user_id=user.id,
        price_plan_id=plan.id,
        marketplace_item_id=body.marketplace_item_id,
        status="trial" if plan.trial_days > 0 else "active",
        payment_provider=body.payment_provider,
        stripe_subscription_id=result.subscription_id if "stripe" in body.payment_provider else None,
        started_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.flush()

    if row.status == "active" and plan.price_jpy > 0:
        item = None
        if body.marketplace_item_id:
            item = (await db.execute(
                select(BizMarketplaceItem).where(BizMarketplaceItem.id == body.marketplace_item_id)
            )).scalars().first()

        seller_id = item.seller_id if item else "platform"
        creator_pct = item.creator_revenue_pct if item else 70.0
        affiliate_enabled = item.affiliate_enabled if item else False
        affiliate_pct = item.affiliate_pct if item else 0.0

        platform_fee_pct = 100.0 - creator_pct
        platform_revenue = int(plan.price_jpy * (platform_fee_pct / 100.0))
        seller_revenue = plan.price_jpy - platform_revenue

        affiliate_id = None
        affiliate_revenue = 0
        if affiliate_enabled and body.affiliate_id:
            affiliate_id = body.affiliate_id
            affiliate_revenue = int(plan.price_jpy * (affiliate_pct / 100.0))
            seller_revenue = max(0, seller_revenue - affiliate_revenue)

        tx = BizSalesTransaction(
            id=str(uuid.uuid4()),
            buyer_id=user.id,
            seller_id=seller_id,
            marketplace_item_id=body.marketplace_item_id or "subscription",
            price_plan_id=plan.id,
            purchase_id=row.id,
            amount_jpy=plan.price_jpy,
            amount_usd_cents=int(plan.price_jpy * 0.7),
            currency=plan.currency,
            platform_fee_pct=platform_fee_pct,
            seller_revenue_jpy=seller_revenue,
            platform_revenue_jpy=platform_revenue,
            affiliate_id=affiliate_id,
            affiliate_revenue_jpy=affiliate_revenue,
            transaction_type="sale",
            payment_provider=body.payment_provider,
            payment_ref=row.stripe_subscription_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(tx)

        if item:
            item.total_sales = (item.total_sales or 0) + 1

    await db.commit()
    await db.refresh(row)
    return _sub_out(row)


@router.post("/biz/pricing/subscriptions/{sub_id}/cancel", response_model=BizSubscriptionOut)
async def cancel_subscription(
    sub_id: str,
    db:     AsyncSession = Depends(get_db),
    user:   User         = Depends(get_current_user),
):
    row = (await db.execute(
        select(BizSubscription).where(
            BizSubscription.id == sub_id, BizSubscription.user_id == user.id
        )
    )).scalars().first()
    if not row:
        raise HTTPException(404, "Subscription not found")

    provider = get_payment_provider()
    ext_id = row.stripe_subscription_id or sub_id
    await provider.cancel_subscription(ext_id)
    row.status = "cancelled"
    row.cancelled_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _sub_out(row)


# ---------------------------------------------------------------------------
# Access check
# ---------------------------------------------------------------------------

@router.get("/biz/pricing/check/{item_id}", response_model=BizAccessCheckOut)
async def check_access(
    item_id: str,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_current_user),
):
    # Free? (no purchase needed)
    from app.biz_models import BizItemPricePlan, BizPricePlan as PP
    free_q = (select(PP)
               .join(BizItemPricePlan, BizItemPricePlan.price_plan_id == PP.id)
               .where(BizItemPricePlan.item_id == item_id, PP.billing_type == "free"))
    if (await db.execute(free_q)).scalars().first():
        return BizAccessCheckOut(item_id=item_id, has_access=True, reason="free")

    # Purchased?
    purchase = (await db.execute(
        select(BizUserPurchase).where(
            BizUserPurchase.user_id == user.id,
            BizUserPurchase.marketplace_item_id == item_id,
            BizUserPurchase.status == "completed",
        )
    )).scalars().first()
    if purchase:
        return BizAccessCheckOut(
            item_id=item_id, has_access=True, reason="purchased",
            expires_at=purchase.expires_at.isoformat() if purchase.expires_at else None,
        )

    # Active subscription for this item?
    sub = (await db.execute(
        select(BizSubscription).where(
            BizSubscription.user_id == user.id,
            BizSubscription.marketplace_item_id == item_id,
            BizSubscription.status.in_(["active", "trial"]),
        )
    )).scalars().first()
    if sub:
        return BizAccessCheckOut(
            item_id=item_id, has_access=True, reason="subscribed",
            expires_at=sub.current_period_end.isoformat() if sub.current_period_end else None,
        )

    return BizAccessCheckOut(item_id=item_id, has_access=False, reason="no_access")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_plan_or_404(db: AsyncSession, plan_id: str) -> BizPricePlan:
    row = (await db.execute(select(BizPricePlan).where(BizPricePlan.id == plan_id))).scalars().first()
    if not row:
        raise HTTPException(404, f"Price plan {plan_id} not found")
    return row


def _plan_out(r: BizPricePlan) -> BizPricePlanOut:
    def _f(dt): return dt.isoformat() if dt else ""
    return BizPricePlanOut(
        id=r.id, name=r.name, name_ja=r.name_ja, price_jpy=r.price_jpy,
        price_usd_cents=r.price_usd_cents, currency=r.currency,
        billing_type=r.billing_type, billing_interval=r.billing_interval,
        discount_pct=r.discount_pct, trial_days=r.trial_days,
        description=r.description, features=r.features or [],
        is_active=r.is_active, sort_order=r.sort_order, created_at=_f(r.created_at),
    )


def _sub_out(r: BizSubscription) -> BizSubscriptionOut:
    def _f(dt): return dt.isoformat() if dt else None
    return BizSubscriptionOut(
        id=r.id, user_id=r.user_id, price_plan_id=r.price_plan_id,
        marketplace_item_id=r.marketplace_item_id, status=r.status,
        payment_provider=r.payment_provider, started_at=_f(r.started_at) or "",
        trial_ends_at=_f(r.trial_ends_at), current_period_end=_f(r.current_period_end),
        auto_renew=r.auto_renew, cancelled_at=_f(r.cancelled_at),
        created_at=_f(r.created_at) or "",
    )


def _purchase_out(r: BizUserPurchase) -> BizPurchaseOut:
    def _f(dt): return dt.isoformat() if dt else None
    return BizPurchaseOut(
        id=r.id, user_id=r.user_id, marketplace_item_id=r.marketplace_item_id,
        price_plan_id=r.price_plan_id, license_id=r.license_id,
        amount_jpy=r.amount_jpy, currency=r.currency,
        payment_provider=r.payment_provider, payment_ref=r.payment_ref,
        status=r.status, purchased_at=_f(r.purchased_at) or "", expires_at=_f(r.expires_at),
    )
