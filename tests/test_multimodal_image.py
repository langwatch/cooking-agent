"""Scenario test for multimodal image input (OpenAI Vision).

Calls OpenAI directly (mirroring api/main.py:_call_openai_vision) without
requiring a running HTTP server.

Skipped when OPENAI_API_KEY is absent.
"""

from __future__ import annotations

import os

import pytest
import scenario
from openai import OpenAI

from agent.models import model_for_tier

_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

_FOOD_IMAGE_URL = "https://picsum.photos/id/429/400/300.jpg"

_VISION_SYSTEM = (
    "You are a world-class home-cooking assistant. "
    "The user has shared an image. Analyse what you see (e.g. fridge contents, "
    "a finished dish, ingredients on a counter) and give actionable cooking advice: "
    "suggest 2–3 recipes if it looks like a fridge/pantry photo, or explain how to "
    "recreate the dish if it looks like a finished meal. "
    "Follow the same response format as always: 1-line summary, ingredients with "
    "quantities, numbered steps, dietary notes, chef's tip."
)


def _call_openai_vision(message: str, image_url: str) -> str:
    client = OpenAI()
    resp = client.chat.completions.create(
        model=model_for_tier("mid"),
        messages=[
            {"role": "system", "content": _VISION_SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": message},
                ],
            },
        ],
    )
    return resp.choices[0].message.content or ""


class OpenAIVisionAdapter(scenario.AgentAdapter):
    async def call(self, input: scenario.AgentInput) -> scenario.AgentReturnTypes:
        return _call_openai_vision(input.last_new_user_message_str(), _FOOD_IMAGE_URL)


@pytest.mark.agent_test
@pytest.mark.asyncio
@pytest.mark.skipif(not _OPENAI_API_KEY, reason="OPENAI_API_KEY not set")
async def test_multimodal_image():
    """OpenAI vision path should suggest at least one recipe from a food photo."""
    result = await scenario.run(
        name="multimodal_image",
        description=(
            "The user uploads a food photo and asks what they can cook. "
            "The image shows food ingredients or a dish."
        ),
        agents=[
            OpenAIVisionAdapter(),
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
