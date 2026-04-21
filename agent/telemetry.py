"""LangWatch setup with Agno auto-instrumentation.

Call setup() once at process start. Idempotent.
"""

from __future__ import annotations

import os

import langwatch


_initialized = False


def setup() -> None:
    """Initialize LangWatch + OpenInference Agno instrumentor."""
    global _initialized
    if _initialized:
        return
    if not os.getenv("LANGWATCH_API_KEY"):
        return

    instrumentors = []
    try:
        from openinference.instrumentation.agno import AgnoInstrumentor

        instrumentors.append(AgnoInstrumentor())
    except ImportError:
        # Fall back to manual @langwatch.trace only.
        pass

    langwatch.setup(instrumentors=instrumentors)
    _initialized = True
