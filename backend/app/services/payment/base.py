"""
Payment Provider abstract interface.
Switch providers via PAYMENT_PROVIDER env var: mock | stripe | paypal | payjp
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class PaymentIntent:
    provider_id:    str           # e.g., "pi_xxx" for Stripe
    client_secret:  str | None    # Stripe frontend confirmation secret
    status:         str           # pending | succeeded | requires_action
    amount_jpy:     int
    currency:       str = "JPY"
    metadata:       dict = field(default_factory=dict)


@dataclass
class PaymentResult:
    success:     bool
    provider_id: str
    status:      str
    error:       str | None = None


@dataclass
class SubscriptionResult:
    success:         bool
    subscription_id: str
    status:          str
    current_period_end: str | None = None
    error:           str | None = None


class PaymentProvider(ABC):
    """Abstract payment backend. Implement to support Stripe, PayPal, etc."""

    @abstractmethod
    async def create_payment_intent(
        self,
        amount_jpy: int,
        item_id: str,
        user_id: str,
        metadata: dict,
    ) -> PaymentIntent:
        """Create a payment intent for a one-time charge."""

    @abstractmethod
    async def confirm_payment(self, provider_id: str) -> PaymentResult:
        """Confirm/capture a previously created payment intent."""

    @abstractmethod
    async def refund(
        self,
        provider_id: str,
        amount_jpy: int | None = None,
    ) -> PaymentResult:
        """Full or partial refund. amount_jpy=None means full refund."""

    @abstractmethod
    async def create_subscription(
        self,
        price_id: str,
        user_id: str,
        metadata: dict,
    ) -> SubscriptionResult:
        """Create a recurring subscription. price_id is provider-side plan/price ID."""

    @abstractmethod
    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True,
    ) -> SubscriptionResult:
        """Cancel an active subscription. at_period_end=True cancels at cycle end."""

    @abstractmethod
    async def get_subscription_status(self, subscription_id: str) -> SubscriptionResult:
        """Retrieve current status of a subscription (for webhook reconciliation)."""
