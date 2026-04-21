"""Flagsmith client. Reads flags at startup; caches for the process lifetime.

v0.1 supports a single flag: `cooking_agent_enabled` (kill-switch).
Falls back to `True` if Flagsmith is unreachable so local dev never breaks.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from flagsmith import Flagsmith


@dataclass(frozen=True)
class Flags:
    cooking_agent_enabled: bool


@lru_cache(maxsize=1)
def _client() -> Flagsmith | None:
    key = os.getenv("FLAGSMITH_ENVIRONMENT_KEY")
    if not key:
        return None
    return Flagsmith(environment_key=key)


def load() -> Flags:
    client = _client()
    if client is None:
        return Flags(cooking_agent_enabled=True)
    try:
        env = client.get_environment_flags()
        return Flags(
            cooking_agent_enabled=env.is_feature_enabled("cooking_agent_enabled"),
        )
    except Exception:
        return Flags(cooking_agent_enabled=True)
