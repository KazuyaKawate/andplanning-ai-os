"""
Stripe payment provider.
To activate:
  pip install stripe
  Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in .env
  Set PAYMENT_PROVIDER=stripe
JPY is a zero-decimal currency in Stripe — amounts are passed as-is (no cents conversion).
"""
from __future__ import annotations

import os
from app.services.payment.base import (
    PaymentProvider, PaymentIntent, PaymentResult, SubscriptionResult,
)


class StripePaymentProvider(PaymentProvider):
    def __init__(self) -> None:
        try:
            import stripe as _stripe
            _stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
            if not _stripe.api_key:
                raise RuntimeError("STRIPE_SECRET_KEY is not set")
            self._stripe = _stripe
        except ImportError:
            raise RuntimeError("Stripe provider requires: pip install stripe")

    async def create_payment_intent(
        self, amount_jpy: int, item_id: str, user_id: str, metadata: dict,
    ) -> PaymentIntent:
        import asyncio
        intent = await asyncio.to_thread(
            self._stripe.PaymentIntent.create,
            amount=amount_jpy,
            currency="jpy",
            metadata={"item_id": item_id, "user_id": user_id, **metadata},
            automatic_payment_methods={"enabled": True},
        )
        return PaymentIntent(
            provider_id=intent["id"],
            client_secret=intent["client_secret"],
            status=intent["status"],
            amount_jpy=amount_jpy,
            metadata=metadata,
        )

    async def confirm_payment(self, provider_id: str) -> PaymentResult:
        import asyncio
        intent = await asyncio.to_thread(self._stripe.PaymentIntent.retrieve, provider_id)
        ok = intent["status"] == "succeeded"
        return PaymentResult(
            success=ok, provider_id=provider_id, status=intent["status"],
            error=None if ok else intent.get("last_payment_error", {}).get("message"),
        )

    async def refund(self, provider_id: str, amount_jpy: int | None = None) -> PaymentResult:
        import asyncio
        kwargs: dict = {"payment_intent": provider_id}
        if amount_jpy is not None:
            kwargs["amount"] = amount_jpy
        ref = await asyncio.to_thread(self._stripe.Refund.create, **kwargs)
        return PaymentResult(success=True, provider_id=ref["id"], status=ref["status"])

    async def create_subscription(
        self, price_id: str, user_id: str, metadata: dict,
    ) -> SubscriptionResult:
        import asyncio
        sub = await asyncio.to_thread(
            self._stripe.Subscription.create,
            customer=user_id,
            items=[{"price": price_id}],
            metadata=metadata,
        )
        return SubscriptionResult(
            success=True,
            subscription_id=sub["id"],
            status=sub["status"],
            current_period_end=str(sub.get("current_period_end")),
        )

    async def cancel_subscription(
        self, subscription_id: str, at_period_end: bool = True,
    ) -> SubscriptionResult:
        import asyncio
        if at_period_end:
            sub = await asyncio.to_thread(
                self._stripe.Subscription.modify,
                subscription_id,
                cancel_at_period_end=True,
            )
        else:
            sub = await asyncio.to_thread(self._stripe.Subscription.cancel, subscription_id)
        return SubscriptionResult(
            success=True, subscription_id=sub["id"], status=sub["status"],
        )

    async def get_subscription_status(self, subscription_id: str) -> SubscriptionResult:
        import asyncio
        sub = await asyncio.to_thread(self._stripe.Subscription.retrieve, subscription_id)
        return SubscriptionResult(
            success=True,
            subscription_id=sub["id"],
            status=sub["status"],
            current_period_end=str(sub.get("current_period_end")),
        )
