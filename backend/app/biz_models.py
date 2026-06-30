"""
Business Knowledge Base — SQLAlchemy ORM models.
biz_ prefix prevents conflicts with existing 25 tables.
Extensible for: Business Engine, AI Marketplace, Affiliate, Creator Dashboard.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean, Column, Date, Float, ForeignKey, Integer,
    JSON, String, Text, DateTime, UniqueConstraint,
)
from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Licenses
# ---------------------------------------------------------------------------

class BizLicense(Base):
    __tablename__ = "biz_licenses"

    id              = Column(String, primary_key=True, default=_uuid)
    name            = Column(String, nullable=False)
    name_en         = Column(String, nullable=False, default="")
    license_type    = Column(String, nullable=False)
    # personal | commercial | resale | enterprise | open_source
    can_modify      = Column(Boolean, nullable=False, default=True)
    can_sublicense  = Column(Boolean, nullable=False, default=False)
    can_resell      = Column(Boolean, nullable=False, default=False)
    max_users       = Column(Integer, nullable=True)        # NULL = unlimited
    attribution_req = Column(Boolean, nullable=False, default=False)
    description     = Column(Text, nullable=False, default="")
    terms_text      = Column(Text, nullable=False, default="")
    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Price Plans
# ---------------------------------------------------------------------------

class BizPricePlan(Base):
    __tablename__ = "biz_price_plans"

    id               = Column(String, primary_key=True, default=_uuid)
    name             = Column(String, nullable=False)
    name_ja          = Column(String, nullable=False, default="")
    price_jpy        = Column(Integer, nullable=False, default=0)
    price_usd_cents  = Column(Integer, nullable=False, default=0)
    currency         = Column(String, nullable=False, default="JPY")
    billing_type     = Column(String, nullable=False)
    # free | one_time | subscription | license | enterprise
    billing_interval = Column(String, nullable=True)        # monthly | yearly
    discount_pct     = Column(Float, nullable=False, default=0.0)
    trial_days       = Column(Integer, nullable=False, default=0)
    description      = Column(Text, nullable=False, default="")
    features         = Column(JSON, nullable=False, default=list)
    stripe_price_id  = Column(String, nullable=True)        # Future: Stripe
    paypal_plan_id   = Column(String, nullable=True)        # Future: PayPal
    is_active        = Column(Boolean, nullable=False, default=True)
    sort_order       = Column(Integer, nullable=False, default=0)
    created_at       = Column(DateTime(timezone=True), default=_now)
    updated_at       = Column(DateTime(timezone=True), default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------

class BizAsset(Base):
    __tablename__ = "biz_assets"

    id               = Column(String, primary_key=True, default=_uuid)
    owner_id         = Column(String, nullable=False)       # ref users.id
    name             = Column(String, nullable=False)
    asset_type       = Column(String, nullable=False)
    # icon | image | video | audio | code | prompt | document | model_weight
    storage_key      = Column(String, nullable=False)       # provider-relative path
    storage_provider = Column(String, nullable=False, default="local")
    # local | s3 | r2 | supabase
    public_url       = Column(String, nullable=True)
    mime_type        = Column(String, nullable=False, default="")
    size_bytes       = Column(Integer, nullable=False, default=0)
    meta             = Column("metadata", JSON, nullable=False, default=dict)
    # {width, height, duration_sec, language, lines, ...}
    tags             = Column(JSON, nullable=False, default=list)
    description      = Column(Text, nullable=False, default="")
    is_public        = Column(Boolean, nullable=False, default=False)
    usage_count      = Column(Integer, nullable=False, default=0)
    created_at       = Column(DateTime(timezone=True), default=_now)
    updated_at       = Column(DateTime(timezone=True), default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Marketplace Items
# ---------------------------------------------------------------------------

class BizMarketplaceItem(Base):
    __tablename__ = "biz_marketplace_items"

    id                   = Column(String, primary_key=True, default=_uuid)
    title                = Column(String, nullable=False)
    title_ja             = Column(String, nullable=False, default="")
    description          = Column(Text, nullable=False, default="")
    short_desc           = Column(String, nullable=False, default="")
    item_type            = Column(String, nullable=False)
    # factory | workflow | agent | template | prompt |
    # knowledge_pack | plugin | business_pack
    # (future: model | automation | integration | dataset)
    item_id              = Column(String, nullable=True)    # FK to source table
    seller_id            = Column(String, nullable=False)   # ref users.id
    license_id           = Column(String, nullable=True)    # ref biz_licenses.id
    thumbnail_id         = Column(String, nullable=True)    # ref biz_assets.id
    status               = Column(String, nullable=False, default="draft")
    # draft | published | suspended | removed | pending_review
    tags                 = Column(JSON, nullable=False, default=list)
    category             = Column(String, nullable=False, default="")
    subcategory          = Column(String, nullable=False, default="")
    version              = Column(String, nullable=False, default="1.0.0")
    changelog            = Column(JSON, nullable=False, default=list)
    preview_asset_ids    = Column(JSON, nullable=False, default=list)
    features             = Column(JSON, nullable=False, default=list)
    requirements         = Column(JSON, nullable=False, default=list)
    total_sales          = Column(Integer, nullable=False, default=0)
    avg_rating           = Column(Float, nullable=False, default=0.0)
    review_count         = Column(Integer, nullable=False, default=0)
    # Creator economy / Affiliate (future Business Engine)
    affiliate_enabled    = Column(Boolean, nullable=False, default=False)
    affiliate_pct        = Column(Float, nullable=False, default=0.0)
    creator_revenue_pct  = Column(Float, nullable=False, default=70.0)
    created_at           = Column(DateTime(timezone=True), default=_now)
    updated_at           = Column(DateTime(timezone=True), default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Marketplace Item <-> Price Plan (M:N)
# ---------------------------------------------------------------------------

class BizItemPricePlan(Base):
    """One item can offer multiple pricing options (free + paid tiers)."""
    __tablename__ = "biz_item_price_plans"
    __table_args__ = (
        UniqueConstraint("item_id", "price_plan_id", name="uq_item_priceplan"),
    )

    id            = Column(String, primary_key=True, default=_uuid)
    item_id       = Column(String, nullable=False)  # ref biz_marketplace_items.id
    price_plan_id = Column(String, nullable=False)  # ref biz_price_plans.id
    is_default    = Column(Boolean, nullable=False, default=False)
    created_at    = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# User Purchases
# ---------------------------------------------------------------------------

class BizUserPurchase(Base):
    __tablename__ = "biz_user_purchases"

    id                       = Column(String, primary_key=True, default=_uuid)
    user_id                  = Column(String, nullable=False)
    marketplace_item_id      = Column(String, nullable=False)
    price_plan_id            = Column(String, nullable=False)
    license_id               = Column(String, nullable=True)
    amount_jpy               = Column(Integer, nullable=False, default=0)
    amount_usd_cents         = Column(Integer, nullable=False, default=0)
    currency                 = Column(String, nullable=False, default="JPY")
    payment_provider         = Column(String, nullable=False, default="mock")
    # mock | stripe | paypal | payjp | komoju
    payment_ref              = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    paypal_order_id          = Column(String, nullable=True)
    status                   = Column(String, nullable=False, default="completed")
    # completed | refunded | disputed | pending | failed
    purchased_at             = Column(DateTime(timezone=True), default=_now)
    expires_at               = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

class BizSubscription(Base):
    __tablename__ = "biz_subscriptions"

    id                     = Column(String, primary_key=True, default=_uuid)
    user_id                = Column(String, nullable=False)
    price_plan_id          = Column(String, nullable=False)
    marketplace_item_id    = Column(String, nullable=True)  # NULL = platform sub
    status                 = Column(String, nullable=False, default="active")
    # active | cancelled | expired | trial | past_due
    payment_provider       = Column(String, nullable=False, default="mock")
    stripe_subscription_id = Column(String, nullable=True)
    paypal_subscription_id = Column(String, nullable=True)
    started_at             = Column(DateTime(timezone=True), default=_now)
    trial_ends_at          = Column(DateTime(timezone=True), nullable=True)
    current_period_start   = Column(DateTime(timezone=True), nullable=True)
    current_period_end     = Column(DateTime(timezone=True), nullable=True)
    auto_renew             = Column(Boolean, nullable=False, default=True)
    cancelled_at           = Column(DateTime(timezone=True), nullable=True)
    created_at             = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# User Favorites
# ---------------------------------------------------------------------------

class BizUserFavorite(Base):
    __tablename__ = "biz_user_favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "item_type", "item_id", name="uq_favorite"),
    )

    id         = Column(String, primary_key=True, default=_uuid)
    user_id    = Column(String, nullable=False)
    item_type  = Column(String, nullable=False)
    # marketplace_item | asset | factory | workflow | agent
    item_id    = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# User History
# ---------------------------------------------------------------------------

class BizUserHistory(Base):
    __tablename__ = "biz_user_history"

    id         = Column(String, primary_key=True, default=_uuid)
    user_id    = Column(String, nullable=False)
    item_type  = Column(String, nullable=False)
    item_id    = Column(String, nullable=False)
    action     = Column(String, nullable=False)
    # view | download | run | purchase | favorite | share | install
    meta       = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Sales Transactions
# ---------------------------------------------------------------------------

class BizSalesTransaction(Base):
    __tablename__ = "biz_sales_transactions"

    id                    = Column(String, primary_key=True, default=_uuid)
    buyer_id              = Column(String, nullable=False)
    seller_id             = Column(String, nullable=False)
    marketplace_item_id   = Column(String, nullable=False)
    price_plan_id         = Column(String, nullable=False)
    purchase_id           = Column(String, nullable=False)
    amount_jpy            = Column(Integer, nullable=False, default=0)
    amount_usd_cents      = Column(Integer, nullable=False, default=0)
    currency              = Column(String, nullable=False, default="JPY")
    platform_fee_pct      = Column(Float, nullable=False, default=30.0)
    seller_revenue_jpy    = Column(Integer, nullable=False, default=0)
    platform_revenue_jpy  = Column(Integer, nullable=False, default=0)
    affiliate_id          = Column(String, nullable=True)
    affiliate_revenue_jpy = Column(Integer, nullable=False, default=0)
    transaction_type      = Column(String, nullable=False)
    # sale | refund | subscription_renewal | chargeback
    payment_provider      = Column(String, nullable=False, default="mock")
    payment_ref           = Column(String, nullable=True)
    created_at            = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Revenue Snapshots (daily aggregates)
# ---------------------------------------------------------------------------

class BizRevenueSnapshot(Base):
    __tablename__ = "biz_revenue_snapshots"
    __table_args__ = (
        UniqueConstraint("seller_id", "snapshot_date", name="uq_revenue_snapshot"),
    )

    id                   = Column(String, primary_key=True, default=_uuid)
    seller_id            = Column(String, nullable=True)    # NULL = platform-wide
    snapshot_date        = Column(Date, nullable=False)
    total_sales_count    = Column(Integer, nullable=False, default=0)
    total_revenue_jpy    = Column(Integer, nullable=False, default=0)
    platform_revenue_jpy = Column(Integer, nullable=False, default=0)
    seller_revenue_jpy   = Column(Integer, nullable=False, default=0)
    new_subscribers      = Column(Integer, nullable=False, default=0)
    churned_subscribers  = Column(Integer, nullable=False, default=0)
    mrr_jpy              = Column(Integer, nullable=False, default=0)
    arr_jpy              = Column(Integer, nullable=False, default=0)
    top_item_id          = Column(String, nullable=True)
    extra                = Column(JSON, nullable=False, default=dict)
    created_at           = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Knowledge Relations (Graph)
# ---------------------------------------------------------------------------

class BizKnowledgeRelation(Base):
    __tablename__ = "biz_knowledge_relations"
    __table_args__ = (
        UniqueConstraint(
            "source_type", "source_id", "target_type", "target_id", "relation_type",
            name="uq_knowledge_relation",
        ),
    )

    id             = Column(String, primary_key=True, default=_uuid)
    source_type    = Column(String, nullable=False)
    # factory | workflow | agent | asset | marketplace_item |
    # template | prompt | knowledge_pack | plugin | business_pack | user
    source_id      = Column(String, nullable=False)
    target_type    = Column(String, nullable=False)
    target_id      = Column(String, nullable=False)
    relation_type  = Column(String, nullable=False)
    # uses | contains | extends | requires | produces |
    # derives_from | related_to | sold_in | purchased_by |
    # created_by | depends_on | supersedes | part_of
    strength       = Column(Float, nullable=False, default=1.0)
    auto_generated = Column(Boolean, nullable=False, default=False)
    meta           = Column("metadata", JSON, nullable=False, default=dict)
    created_at     = Column(DateTime(timezone=True), default=_now)
