"""
Payment provider factory.
Set PAYMENT_PROVIDER env var: mock (default) | stripe | paypal | payjp
"""
from __future__ import annotations

import os
from functools import lru_cache

from app.services.payment.base import PaymentProvider


@lru_cache(maxsize=1)
def get_payment_provider() -> PaymentProvider:
    name = os.getenv("PAYMENT_PROVIDER", "mock").lower()

    if name == "mock":
        from app.services.payment.mock_provider import MockPaymentProvider
        return MockPaymentProvider()

    if name == "stripe":
        from app.services.payment.stripe_provider import StripePaymentProvider
        return StripePaymentProvider()

    raise ValueError(f"Unknown PAYMENT_PROVIDER: '{name}'. Choose: mock | stripe")
