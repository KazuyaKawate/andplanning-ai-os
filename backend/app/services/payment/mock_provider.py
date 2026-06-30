"""
Mock payment provider — always succeeds. Use in Phase 1 / dev/test environments.
Set PAYMENT_PROVIDER=mock (default).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.services.payment.base import (
    PaymentProvider, PaymentIntent, PaymentResult, SubscriptionResult,
)


class MockPaymentProvider(PaymentProvider):
    async def create_payment_intent(
        self, amount_jpy: int, item_id: str, user_id: str, metadata: dict,
    ) -> PaymentIntent:
        return PaymentIntent(
            provider_id=f"mock_pi_{uuid.uuid4().hex[:12]}",
            client_secret=None,
            status="succeeded",
            amount_jpy=amount_jpy,
            metadata={"item_id": item_id, "user_id": user_id, **metadata},
        )

    async def confirm_payment(self, provider_id: str) -> PaymentResult:
        return PaymentResult(success=True, provider_id=provider_id, status="succeeded")

    async def refund(self, provider_id: str, amount_jpy: int | None = None) -> PaymentResult:
        return PaymentResult(success=True, provider_id=f"mock_rf_{provider_id}", status="refunded")

    async def create_subscription(
        self, price_id: str, user_id: str, metadata: dict,
    ) -> SubscriptionResult:
        sub_id = f"mock_sub_{uuid.uuid4().hex[:12]}"
        end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        return SubscriptionResult(
            success=True,
            subscription_id=sub_id,
            status="active",
            current_period_end=end,
        )

    async def cancel_subscription(
        self, subscription_id: str, at_period_end: bool = True,
    ) -> SubscriptionResult:
        return SubscriptionResult(
            success=True,
            subscription_id=subscription_id,
            status="cancelled",
        )

    async def get_subscription_status(self, subscription_id: str) -> SubscriptionResult:
        return SubscriptionResult(
            success=True,
            subscription_id=subscription_id,
            status="active",
        )
