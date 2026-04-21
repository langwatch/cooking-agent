"""Model tier map. Tiers are stable names; underlying models can swap freely."""

TIERS: dict[str, str] = {
    "cheap": "gpt-5-nano",
    "mid": "gpt-5-mini",
    "premium": "gpt-5",
}

DEFAULT_TIER = "mid"


def model_for_tier(tier: str) -> str:
    return TIERS.get(tier, TIERS[DEFAULT_TIER])
