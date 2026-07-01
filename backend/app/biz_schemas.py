"""
Pydantic schemas for Business Knowledge Base endpoints.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# License
# ---------------------------------------------------------------------------

class BizLicenseOut(BaseModel):
    id:             str
    name:           str
    name_en:        str
    license_type:   str
    can_modify:     bool
    can_sublicense: bool
    can_resell:     bool
    max_users:      int | None
    attribution_req: bool
    description:    str
    is_active:      bool
    created_at:     str

    model_config = ConfigDict(from_attributes=True)


class BizLicenseCreate(BaseModel):
    name:           str
    name_en:        str = ""
    license_type:   Literal["personal", "commercial", "resale", "enterprise", "open_source"]
    can_modify:     bool = True
    can_sublicense: bool = False
    can_resell:     bool = False
    max_users:      int | None = None
    attribution_req: bool = False
    description:    str = ""
    terms_text:     str = ""


# ---------------------------------------------------------------------------
# Price Plan
# ---------------------------------------------------------------------------

class BizPricePlanOut(BaseModel):
    id:               str
    name:             str
    name_ja:          str
    price_jpy:        int
    price_usd_cents:  int
    currency:         str
    billing_type:     str
    billing_interval: str | None
    discount_pct:     float
    trial_days:       int
    description:      str
    features:         list[str]
    is_active:        bool
    sort_order:       int
    created_at:       str

    model_config = ConfigDict(from_attributes=True)


class BizPricePlanCreate(BaseModel):
    name:             str
    name_ja:          str = ""
    price_jpy:        int = 0
    price_usd_cents:  int = 0
    currency:         str = "JPY"
    billing_type:     Literal["free", "one_time", "subscription", "license", "enterprise"]
    billing_interval: Literal["monthly", "yearly"] | None = None
    discount_pct:     float = 0.0
    trial_days:       int = 0
    description:      str = ""
    features:         list[str] = []
    sort_order:       int = 0


class BizPricePlanUpdate(BaseModel):
    name:             str | None = None
    name_ja:          str | None = None
    price_jpy:        int | None = None
    discount_pct:     float | None = None
    description:      str | None = None
    features:         list[str] | None = None
    is_active:        bool | None = None
    sort_order:       int | None = None
    stripe_price_id:  str | None = None


# ---------------------------------------------------------------------------
# Asset
# ---------------------------------------------------------------------------

class BizAssetOut(BaseModel):
    id:               str
    owner_id:         str
    name:             str
    asset_type:       str
    storage_key:      str
    storage_provider: str
    public_url:       str | None
    mime_type:        str
    size_bytes:       int
    metadata:         dict[str, Any]
    tags:             list[str]
    description:      str
    is_public:        bool
    usage_count:      int
    created_at:       str

    model_config = ConfigDict(from_attributes=True)


class BizAssetUpdate(BaseModel):
    name:        str | None = None
    description: str | None = None
    tags:        list[str] | None = None
    is_public:   bool | None = None


# ---------------------------------------------------------------------------
# Marketplace Item
# ---------------------------------------------------------------------------

ITEM_TYPES = Literal[
    "factory", "workflow", "agent", "template",
    "prompt", "knowledge_pack", "plugin", "business_pack"
]

ITEM_STATUSES = Literal["draft", "published", "suspended", "removed", "pending_review"]


class BizMarketplaceItemOut(BaseModel):
    id:                  str
    title:               str
    title_ja:            str
    description:         str
    short_desc:          str
    item_type:           str
    item_id:             str | None
    seller_id:           str
    license_id:          str | None
    thumbnail_id:        str | None
    status:              str
    tags:                list[str]
    category:            str
    subcategory:         str
    version:             str
    features:            list[str]
    requirements:        list[str]
    total_sales:         int
    avg_rating:          float
    review_count:        int
    affiliate_enabled:   bool
    creator_revenue_pct: float
    created_at:          str
    updated_at:          str

    model_config = ConfigDict(from_attributes=True)


class BizMarketplaceItemCreate(BaseModel):
    title:         str
    title_ja:      str = ""
    description:   str = ""
    short_desc:    str = ""
    item_type:     ITEM_TYPES
    item_id:       str | None = None
    license_id:    str | None = None
    thumbnail_id:  str | None = None
    tags:          list[str] = []
    category:      str = ""
    subcategory:   str = ""
    version:       str = "1.0.0"
    features:      list[str] = []
    requirements:  list[str] = []


class BizMarketplaceItemUpdate(BaseModel):
    title:                str | None = None
    title_ja:             str | None = None
    description:          str | None = None
    short_desc:           str | None = None
    license_id:           str | None = None
    thumbnail_id:         str | None = None
    status:               ITEM_STATUSES | None = None
    tags:                 list[str] | None = None
    category:             str | None = None
    version:              str | None = None
    features:             list[str] | None = None
    requirements:         list[str] | None = None
    affiliate_enabled:    bool | None = None
    affiliate_pct:        float | None = None
    creator_revenue_pct:  float | None = None


class BizMarketplaceListOut(BaseModel):
    items: list[BizMarketplaceItemOut]
    total: int
    skip:  int
    limit: int


class BizItemPricePlanCreate(BaseModel):
    price_plan_id: str
    is_default:    bool = False


# ---------------------------------------------------------------------------
# Purchase
# ---------------------------------------------------------------------------

class BizPurchaseRequest(BaseModel):
    marketplace_item_id: str
    price_plan_id:       str
    payment_provider:    str = "mock"
    affiliate_id:        str | None = None


class BizPurchaseOut(BaseModel):
    id:                  str
    user_id:             str
    marketplace_item_id: str
    price_plan_id:       str
    license_id:          str | None
    amount_jpy:          int
    currency:            str
    payment_provider:    str
    payment_ref:         str | None
    status:              str
    purchased_at:        str
    expires_at:          str | None

    model_config = ConfigDict(from_attributes=True)


class BizPaymentIntentOut(BaseModel):
    provider_id:   str
    client_secret: str | None
    status:        str
    amount_jpy:    int
    currency:      str


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------

class BizSubscribeRequest(BaseModel):
    price_plan_id:       str
    marketplace_item_id: str | None = None
    payment_provider:    str = "mock"
    affiliate_id:        str | None = None


class BizSubscriptionOut(BaseModel):
    id:                  str
    user_id:             str
    price_plan_id:       str
    marketplace_item_id: str | None
    status:              str
    payment_provider:    str
    started_at:          str
    trial_ends_at:       str | None
    current_period_end:  str | None
    auto_renew:          bool
    cancelled_at:        str | None
    created_at:          str

    model_config = ConfigDict(from_attributes=True)


class BizAccessCheckOut(BaseModel):
    item_id:    str
    has_access: bool
    reason:     str   # "free" | "purchased" | "subscribed" | "no_access"
    expires_at: str | None = None


# ---------------------------------------------------------------------------
# Favorite
# ---------------------------------------------------------------------------

class BizFavoriteCreate(BaseModel):
    item_type: Literal["marketplace_item", "asset", "factory", "workflow", "agent"]
    item_id:   str


class BizFavoriteOut(BaseModel):
    id:         str
    user_id:    str
    item_type:  str
    item_id:    str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

class BizHistoryCreate(BaseModel):
    item_type: Literal["marketplace_item", "asset", "factory", "workflow", "agent"]
    item_id:   str
    action:    Literal["view", "download", "run", "purchase", "favorite", "share", "install"]
    metadata:  dict[str, Any] = {}


class BizHistoryOut(BaseModel):
    id:         str
    user_id:    str
    item_type:  str
    item_id:    str
    action:     str
    metadata:   dict[str, Any]
    created_at: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Revenue
# ---------------------------------------------------------------------------

class BizRevenueSummaryOut(BaseModel):
    seller_id:             str | None
    total_revenue_jpy:     int
    seller_revenue_jpy:    int
    platform_revenue_jpy:  int
    total_transactions:    int
    active_subscriptions:  int
    mrr_jpy:               int
    period_days:           int


class BizTransactionOut(BaseModel):
    id:                   str
    buyer_id:             str
    seller_id:            str
    marketplace_item_id:  str
    price_plan_id:        str
    amount_jpy:           int
    seller_revenue_jpy:   int
    platform_revenue_jpy: int
    transaction_type:     str
    payment_provider:     str
    created_at:           str

    model_config = ConfigDict(from_attributes=True)


class BizRankingItemOut(BaseModel):
    item_id:     str
    title:       str
    item_type:   str
    total_sales: int
    avg_rating:  float
    revenue_jpy: int


class BizSnapshotOut(BaseModel):
    id:                   str
    seller_id:            str | None
    snapshot_date:        str
    total_sales_count:    int
    total_revenue_jpy:    int
    seller_revenue_jpy:   int
    new_subscribers:      int
    churned_subscribers:  int
    mrr_jpy:              int
    created_at:           str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Knowledge Relations
# ---------------------------------------------------------------------------

ENTITY_TYPES = Literal[
    "factory", "workflow", "agent", "asset", "marketplace_item",
    "template", "prompt", "knowledge_pack", "plugin", "business_pack", "user"
]

RELATION_TYPES = Literal[
    "uses", "contains", "extends", "requires", "produces",
    "derives_from", "related_to", "sold_in", "purchased_by",
    "created_by", "depends_on", "supersedes", "part_of"
]


class BizRelationCreate(BaseModel):
    source_type:    ENTITY_TYPES
    source_id:      str
    target_type:    ENTITY_TYPES
    target_id:      str
    relation_type:  RELATION_TYPES
    strength:       float = 1.0
    metadata:       dict[str, Any] = {}


class BizRelationOut(BaseModel):
    id:             str
    source_type:    str
    source_id:      str
    target_type:    str
    target_id:      str
    relation_type:  str
    strength:       float
    auto_generated: bool
    metadata:       dict[str, Any]
    created_at:     str

    model_config = ConfigDict(from_attributes=True)


class BizGraphNode(BaseModel):
    id:    str    # "{type}:{id}"
    type:  str
    label: str
    icon:  str


class BizGraphEdge(BaseModel):
    id:            str
    source:        str   # GraphNode.id
    target:        str
    relation_type: str
    strength:      float


class BizGraphOut(BaseModel):
    nodes: list[BizGraphNode]
    edges: list[BizGraphEdge]
    total_nodes: int
    total_edges: int


# ---------------------------------------------------------------------------
# Affiliate Engine (Phase 1)
# ---------------------------------------------------------------------------

class BizAffiliateStatsOut(BaseModel):
    total_referrals:       int
    total_revenue_jpy:     int
    total_commission_jpy:  int
    unpaid_commission_jpy: int
    paid_commission_jpy:   int


class BizAffiliateReferralOut(BaseModel):
    id:                     str
    buyer_id:               str
    marketplace_item_id:    str
    marketplace_item_title: str
    amount_jpy:             int
    commission_jpy:         int
    created_at:             str
