"""Scenario test for multimodal image input (Gemini 2.0 Flash).

Calls Gemini directly (matching the logic in api/main.py:_call_gemini_vision)
without requiring a running HTTP server.

Skipped when:
  - GEMINI_API_KEY is absent (standard CI without vision key)
  - Gemini API returns 429 at setup time (quota exhausted — external issue)
"""

from __future__ import annotations

import base64
import os

import httpx
import pytest
import scenario

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# A small publicly accessible food photo (~3 KB).
_FOOD_IMAGE_URL = "https://picsum.photos/id/429/100/100.jpg"

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)
_GEMINI_SYSTEM = (
    "You are a world-class home-cooking assistant. "
    "The user has shared an image. Analyse what you see (e.g. fridge contents, "
    "a finished dish, ingredients on a counter) and give actionable cooking advice: "
    "suggest 2–3 recipes if it looks like a fridge/pantry photo, or explain how to "
    "recreate the dish if it looks like a finished meal. "
    "Follow the same response format as always: 1-line summary, ingredients with "
    "quantities, numbered steps, dietary notes, chef's tip."
)


def _fetch_image_b64(url: str) -> tuple[str, str]:
    resp = httpx.get(
        url,
        timeout=20,
        follow_redirects=True,
        headers={"User-Agent": "cooking-agent-test/1.0"},
    )
    resp.raise_for_status()
    mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]
    return mime, base64.b64encode(resp.content).decode()


def _call_gemini_vision(message: str, mime: str, b64: str) -> str:
    payload = {
        "system_instruction": {"parts": [{"text": _GEMINI_SYSTEM}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": mime, "data": b64}},
                    {"text": message},
                ],
            }
        ],
    }
    r = httpx.post(
        _GEMINI_URL,
        params={"key": _GEMINI_API_KEY},
        json=payload,
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


class GeminiVisionAdapter(scenario.AgentAdapter):
    """Adapter that calls Gemini 2.0 Flash with a pre-fetched food image."""

    def __init__(self, mime: str, b64: str):
        self._mime = mime
        self._b64 = b64

    async def call(self, input: scenario.AgentInput) -> scenario.AgentReturnTypes:
        message = input.last_new_user_message_str()
        return _call_gemini_vision(message, self._mime, self._b64)


def _check_gemini_quota(mime: str, b64: str) -> str | None:
    """Return an error string if quota is exceeded, else None."""
    try:
        r = httpx.post(
            _GEMINI_URL,
            params={"key": _GEMINI_API_KEY},
            json={
                "contents": [{
                    "role": "user",
                    "parts": [
                        {"inlineData": {"mimeType": mime, "data": b64}},
                        {"text": "say 'ok'"},
                    ],
                }]
            },
            timeout=30,
        )
        if r.status_code == 429:
            return "Gemini API quota exceeded"
        if not r.is_success:
            return f"Gemini API error: {r.status_code}"
        return None
    except Exception as exc:
        return f"Gemini API unreachable: {exc}"


@pytest.mark.agent_test
@pytest.mark.asyncio
@pytest.mark.skipif(not _GEMINI_API_KEY, reason="GEMINI_API_KEY not set")
async def test_multimodal_image():
    """Gemini vision path should suggest at least one recipe from a food photo."""
    mime, b64 = _fetch_image_b64(_FOOD_IMAGE_URL)

    quota_error = _check_gemini_quota(mime, b64)
    if quota_error:
        pytest.skip(quota_error)

    result = await scenario.run(
        name="multimodal_image",
        description=(
            "The user uploads a food photo and asks what they can cook. "
            "The image shows food ingredients or a dish."
        ),
        agents=[
            GeminiVisionAdapter(mime, b64),
            scenario.UserSimulatorAgent(),
            scenario.JudgeAgent(
                criteria=[
                    "Response describes what is visible in the image (ingredients, dish, or food items).",
                    "Response suggests at least one concrete recipe or cooking idea.",
                    "Response includes some cooking instructions or steps.",
                    "Response stays on-topic for cooking assistance.",
                ]
            ),
        ],
        max_turns=2,
    )
    assert result.success, result.reasoning
