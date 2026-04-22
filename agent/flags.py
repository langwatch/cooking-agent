"""Flagsmith client. Reads flags at startup; caches for the process lifetime.

Supports dynamic reads so the iterator can create new `auto_*` flags in
Flagsmith and gate code on them without editing this file.

Usage:
    flags = load()
    if flags.cooking_agent_enabled:        # well-known flag (kill-switch)
        ...
    if flags.is_on("auto_use_pantry_tool"): # dynamic flag, default False
        ...
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from flagsmith import Flagsmith


class Flags:
    """Wrapper around a Flagsmith environment snapshot with safe defaults."""

    def __init__(self, env: Any | None) -> None:
        self._env = env

    def is_on(self, name: str, default: bool = False) -> bool:
        if self._env is None:
            return default
        try:
            return bool(self._env.is_feature_enabled(name))
        except Exception:
            return default

    def value(self, name: str, default: Any = None) -> Any:
        if self._env is None:
            return default
        try:
            return self._env.get_feature_value(name)
        except Exception:
            return default

    @property
    def cooking_agent_enabled(self) -> bool:
        # Kill-switch: defaults ON so local dev / Flagsmith outages don't break the agent.
        return self.is_on("cooking_agent_enabled", default=True)


@lru_cache(maxsize=1)
def _client() -> Flagsmith | None:
    key = os.getenv("FLAGSMITH_ENVIRONMENT_KEY")
    if not key:
        return None
    return Flagsmith(environment_key=key)


def load() -> Flags:
    client = _client()
    if client is None:
        return Flags(None)
    try:
        return Flags(client.get_environment_flags())
    except Exception:
        return Flags(None)
