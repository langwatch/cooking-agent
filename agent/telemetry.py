"""LangWatch setup. Call setup() once at process start."""

from __future__ import annotations

import os

import langwatch


_initialized = False


def setup() -> None:
    global _initialized
    if _initialized:
        return
    if not os.getenv("LANGWATCH_API_KEY"):
        return
    langwatch.setup()
    _initialized = True
