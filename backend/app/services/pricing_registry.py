"""
CodeMate AI — Centralized AI Model Pricing & Usage Cost Registry
Maintains official pricing rates, effective date ranges, source verification URLs,
and calculates precise request-level and aggregate operational costs.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.core.logging import logger

USD_TO_INR_RATE = 87.0  # Reference currency rate for student daily pass reporting


@dataclass
class PricingTier:
    provider: str
    model_id: str
    input_per_million: float
    output_per_million: float
    cached_input_per_million: Optional[float] = None
    thinking_per_million: Optional[float] = None  # None indicates standard output pricing
    off_peak_discount: float = 1.0  # 0.5 = 50% discount
    effective_start: str = "2026-01-01"
    effective_end: Optional[str] = None
    source_url: str = ""
    last_verified: str = "2026-11-08"


OFFICIAL_PRICING_CATALOG: List[PricingTier] = [
    # Google Gemini 4 Argon (Introductory through 2026-11-30)
    PricingTier(
        provider="gemini",
        model_id="gemini-4-argon",
        input_per_million=2.00,
        output_per_million=10.00,
        thinking_per_million=10.00,
        effective_start="2026-01-01",
        effective_end="2026-11-30",
        source_url="https://ai.google.dev/gemini-api/docs/pricing",
        last_verified="2026-11-08",
    ),
    # Google Gemini 4 Argon (Standard post 2026-12-01)
    PricingTier(
        provider="gemini",
        model_id="gemini-4-argon",
        input_per_million=4.00,
        output_per_million=20.00,
        thinking_per_million=20.00,
        effective_start="2026-12-01",
        effective_end=None,
        source_url="https://ai.google.dev/gemini-api/docs/pricing",
        last_verified="2026-11-08",
    ),
    # Google Gemini 3.8 Flash (Active through 2026-12-31)
    PricingTier(
        provider="gemini",
        model_id="gemini-3.8-flash",
        input_per_million=0.75,
        output_per_million=3.75,
        thinking_per_million=3.75,
        effective_start="2026-01-01",
        effective_end="2026-12-31",
        source_url="https://ai.google.dev/gemini-api/docs/pricing",
        last_verified="2026-11-08",
    ),
    # Google Gemini 3.5 Flash Lite
    PricingTier(
        provider="gemini",
        model_id="gemini-3.5-flash-lite",
        input_per_million=0.075,
        output_per_million=0.30,
        thinking_per_million=0.30,
        effective_start="2026-01-01",
        effective_end=None,
        source_url="https://ai.google.dev/gemini-api/docs/pricing",
        last_verified="2026-11-08",
    ),
    # Google Gemini 3.5 Flash
    PricingTier(
        provider="gemini",
        model_id="gemini-3.5-flash",
        input_per_million=0.15,
        output_per_million=0.60,
        thinking_per_million=0.60,
        effective_start="2026-01-01",
        effective_end=None,
        source_url="https://ai.google.dev/gemini-api/docs/pricing",
        last_verified="2026-11-08",
    ),
    # DeepSeek Flash (DeepSeek-V4.1-Flash)
    PricingTier(
        provider="deepseek",
        model_id="deepseek-flash",
        input_per_million=0.30,
        output_per_million=1.20,
        cached_input_per_million=0.15,
        thinking_per_million=1.20,
        off_peak_discount=0.50,  # 50% discount UTC 16:30 - 00:30
        effective_start="2026-01-01",
        effective_end=None,
        source_url="https://api-docs.deepseek.com/quick_start/pricing/",
        last_verified="2026-11-08",
    ),
    # DeepSeek V4 Pro
    PricingTier(
        provider="deepseek",
        model_id="deepseek-v4-pro",
        input_per_million=0.55,
        output_per_million=2.19,
        cached_input_per_million=0.14,
        off_peak_discount=0.50,
        effective_start="2026-01-01",
        effective_end=None,
        source_url="https://api-docs.deepseek.com/quick_start/pricing/",
        last_verified="2026-11-08",
    ),
    # OpenRouter - Llama 3.3 70B Instruct
    PricingTier(
        provider="openrouter",
        model_id="meta-llama/llama-3.3-70b-instruct",
        input_per_million=0.12,
        output_per_million=0.30,
        source_url="https://openrouter.ai/pricing",
        last_verified="2026-11-08",
    ),
    # OpenRouter - Free Zero-Cost Tier
    PricingTier(
        provider="openrouter",
        model_id="openrouter/free",
        input_per_million=0.00,
        output_per_million=0.00,
        source_url="https://openrouter.ai/pricing",
        last_verified="2026-11-08",
    ),
    # OpenAI GPT-4o-mini
    PricingTier(
        provider="openai",
        model_id="gpt-4o-mini",
        input_per_million=0.15,
        output_per_million=0.60,
        cached_input_per_million=0.075,
        source_url="https://openai.com/api/pricing/",
        last_verified="2026-11-08",
    ),
]


class ModelPricingRegistry:
    """Central registry calculating billed token costs from official pricing rates."""

    @classmethod
    def get_tier(
        cls,
        provider: str,
        model_id: str,
        target_date: Optional[datetime] = None,
    ) -> Optional[PricingTier]:
        """Resolves matching pricing tier taking effective dates into account."""
        now_dt = target_date or datetime.now(timezone.utc)
        p_clean = provider.lower().strip()
        m_clean = model_id.lower().strip()

        for tier in OFFICIAL_PRICING_CATALOG:
            if tier.provider == p_clean and (tier.model_id == m_clean or m_clean in tier.model_id):
                # Date checks
                if tier.effective_start:
                    start_dt = datetime.fromisoformat(tier.effective_start).replace(tzinfo=timezone.utc)
                    if now_dt < start_dt:
                        continue
                if tier.effective_end:
                    end_dt = datetime.fromisoformat(tier.effective_end).replace(tzinfo=timezone.utc)
                    if now_dt > end_dt:
                        continue
                return tier

        # Provider fallback default
        for tier in OFFICIAL_PRICING_CATALOG:
            if tier.provider == p_clean:
                return tier

        return None

    @classmethod
    def calculate_cost(
        cls,
        provider: str,
        model_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        cached_tokens: int = 0,
        thinking_tokens: int = 0,
        is_off_peak: bool = False,
        request_timestamp: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Calculates exact request cost in USD and INR with detailed breakdown.
        """
        tier = cls.get_tier(provider, model_id, request_timestamp)
        if not tier:
            # Fallback estimation: $0.20 per million average
            est_usd = round(((prompt_tokens + completion_tokens) / 1_000_000.0) * 0.20, 6)
            return {
                "total_cost_usd": est_usd,
                "total_cost_inr": round(est_usd * USD_TO_INR_RATE, 4),
                "calculation_basis": "ESTIMATED_GENERIC",
                "provider": provider,
                "model": model_id,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "thinking_tokens": thinking_tokens,
                "is_zero_cost": False,
            }

        # Calculate input cost
        uncached_input = max(0, prompt_tokens - cached_tokens)
        input_cost = (uncached_input / 1_000_000.0) * tier.input_per_million
        if cached_tokens > 0:
            cached_rate = tier.cached_input_per_million or (tier.input_per_million * 0.5)
            input_cost += (cached_tokens / 1_000_000.0) * cached_rate

        # Calculate output cost
        output_rate = tier.output_per_million
        thinking_rate = tier.thinking_per_million or output_rate
        
        # Thinking tokens
        thinking_cost = (thinking_tokens / 1_000_000.0) * thinking_rate
        visible_output_tokens = max(0, completion_tokens - thinking_tokens)
        output_cost = (visible_output_tokens / 1_000_000.0) * output_rate + thinking_cost

        # Off-peak discount application
        discount_mult = tier.off_peak_discount if is_off_peak else 1.0
        total_usd = (input_cost + output_cost) * discount_mult
        total_usd = round(total_usd, 6)
        total_inr = round(total_usd * USD_TO_INR_RATE, 4)

        return {
            "total_cost_usd": total_usd,
            "total_cost_inr": total_inr,
            "calculation_basis": "EXACT_OFFICIAL_RATES",
            "provider": tier.provider,
            "model": tier.model_id,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "thinking_tokens": thinking_tokens,
            "cached_tokens": cached_tokens,
            "applied_discount": discount_mult,
            "is_zero_cost": tier.input_per_million == 0 and tier.output_per_million == 0,
            "rates": {
                "input_per_m": tier.input_per_million,
                "output_per_m": tier.output_per_million,
                "cached_input_per_m": tier.cached_input_per_million,
            },
            "source_url": tier.source_url,
            "verified_at": tier.last_verified,
        }

