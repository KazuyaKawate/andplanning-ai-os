"""
Business Knowledge Base — seed data.
Called from main.py lifespan after create_all.
Inserts default licenses and price plans only if tables are empty.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.biz_models import BizLicense, BizPricePlan


def _now() -> datetime:
    return datetime.now(timezone.utc)


_DEFAULT_LICENSES = [
    {
        "id":             str(uuid.uuid4()),
        "name":           "個人利用ライセンス",
        "name_en":        "Personal License",
        "license_type":   "personal",
        "can_modify":     True,
        "can_sublicense": False,
        "can_resell":     False,
        "max_users":      1,
        "attribution_req": False,
        "description":    "個人・非商用プロジェクトでの利用に限定されます。",
        "terms_text":     "本ライセンスは個人利用のみを許可します。商用利用・再販売・再配布は禁止です。",
        "is_active":      True,
    },
    {
        "id":             str(uuid.uuid4()),
        "name":           "商用利用ライセンス",
        "name_en":        "Commercial License",
        "license_type":   "commercial",
        "can_modify":     True,
        "can_sublicense": False,
        "can_resell":     False,
        "max_users":      None,
        "attribution_req": False,
        "description":    "商用プロジェクト・クライアントワークでの利用が可能です。",
        "terms_text":     "商用利用を許可しますが、再販売・再配布は禁止です。",
        "is_active":      True,
    },
    {
        "id":             str(uuid.uuid4()),
        "name":           "再販売ライセンス",
        "name_en":        "Resale License",
        "license_type":   "resale",
        "can_modify":     True,
        "can_sublicense": True,
        "can_resell":     True,
        "max_users":      None,
        "attribution_req": False,
        "description":    "商用利用・再販売・クライアント向け提供が可能です。",
        "terms_text":     "再販売・クライアントへの提供を許可します。サブライセンス発行可能。",
        "is_active":      True,
    },
]

_DEFAULT_PRICE_PLANS = [
    {
        "id":               str(uuid.uuid4()),
        "name":             "Free",
        "name_ja":          "無料",
        "price_jpy":        0,
        "price_usd_cents":  0,
        "currency":         "JPY",
        "billing_type":     "free",
        "billing_interval": None,
        "discount_pct":     0.0,
        "trial_days":       0,
        "description":      "基本機能を無料でお試しいただけます。",
        "features":         ["月100回実行", "公開Agentのみ", "コミュニティサポート"],
        "is_active":        True,
        "sort_order":       0,
    },
    {
        "id":               str(uuid.uuid4()),
        "name":             "Basic",
        "name_ja":          "ベーシック（買い切り）",
        "price_jpy":        1980,
        "price_usd_cents":  1300,
        "currency":         "JPY",
        "billing_type":     "one_time",
        "billing_interval": None,
        "discount_pct":     0.0,
        "trial_days":       0,
        "description":      "個人プロジェクト向けの買い切りライセンスです。",
        "features":         ["個人利用ライセンス", "全機能アクセス", "メールサポート"],
        "is_active":        True,
        "sort_order":       1,
    },
    {
        "id":               str(uuid.uuid4()),
        "name":             "Pro Monthly",
        "name_ja":          "プロ（月額）",
        "price_jpy":        2980,
        "price_usd_cents":  1980,
        "currency":         "JPY",
        "billing_type":     "subscription",
        "billing_interval": "monthly",
        "discount_pct":     0.0,
        "trial_days":       14,
        "description":      "商用利用可能なプロプランです。",
        "features":         ["商用利用ライセンス", "無制限実行", "優先AIルーティング", "優先サポート"],
        "is_active":        True,
        "sort_order":       2,
    },
    {
        "id":               str(uuid.uuid4()),
        "name":             "Pro Yearly",
        "name_ja":          "プロ（年額・20%割引）",
        "price_jpy":        28608,
        "price_usd_cents":  19000,
        "currency":         "JPY",
        "billing_type":     "subscription",
        "billing_interval": "yearly",
        "discount_pct":     20.0,
        "trial_days":       14,
        "description":      "年払いで20%お得なプロプランです。",
        "features":         ["商用利用ライセンス", "無制限実行", "優先AIルーティング", "優先サポート", "年払い割引"],
        "is_active":        True,
        "sort_order":       3,
    },
    {
        "id":               str(uuid.uuid4()),
        "name":             "Enterprise",
        "name_ja":          "エンタープライズ",
        "price_jpy":        0,
        "price_usd_cents":  0,
        "currency":         "JPY",
        "billing_type":     "enterprise",
        "billing_interval": None,
        "discount_pct":     0.0,
        "trial_days":       30,
        "description":      "大規模チーム向けカスタムプランです。お問い合わせください。",
        "features":         ["再販売ライセンス", "専用インフラ", "SLA保証", "チームSeat", "SSO", "専任サポート"],
        "is_active":        True,
        "sort_order":       4,
    },
]


async def seed_biz_if_empty(db: AsyncSession) -> None:
    license_count = (await db.execute(select(BizLicense))).scalars().first()
    if not license_count:
        for data in _DEFAULT_LICENSES:
            db.add(BizLicense(**data, created_at=_now()))
        await db.commit()

    plan_count = (await db.execute(select(BizPricePlan))).scalars().first()
    if not plan_count:
        for data in _DEFAULT_PRICE_PLANS:
            db.add(BizPricePlan(**data, created_at=_now(), updated_at=_now()))
        await db.commit()
