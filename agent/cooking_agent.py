"""Cooking agent (v0.1). Single Agno agent, OpenAI-backed, LangWatch-traced."""

from __future__ import annotations

import langwatch
from agno.agent import Agent
from agno.models.openai import OpenAIChat

from agent.models import DEFAULT_TIER, model_for_tier

SYSTEM_PROMPT = """You are a world-class home-cooking assistant.

For every recipe you give:
- Start with a 1-line summary (dish name, cuisine, total time).
- List ingredients with quantities, grouped by component when useful.
- Give numbered steps. Be specific about heat, time, and technique.
- Note dietary info (vegetarian / vegan / gluten-free / nut-free) if relevant.
- End with one chef's tip.

If the user asks for substitutions, give at least two, each with a ratio and a note on how it changes the dish.
If the user's request is unsafe (raw meat to a pregnant person, ingredient conflicts), say so clearly before continuing.
Never invent ingredients or claim a recipe exists if it doesn't — say you're improvising.
"""


class CookingAgent:
    def __init__(self, tier: str = DEFAULT_TIER):
        self.tier = tier
        self.model_id = model_for_tier(tier)
        self._agent = Agent(
            model=OpenAIChat(id=self.model_id),
            description="World-class home-cooking assistant.",
            instructions=SYSTEM_PROMPT,
            markdown=True,
        )

    @langwatch.trace(name="cooking_agent.chat")
    def chat(self, message: str) -> str:
        langwatch.get_current_trace().update(
            metadata={"tier": self.tier, "model": self.model_id}
        )
        response = self._agent.run(message)
        return response.content or ""


def build_agent(tier: str = DEFAULT_TIER) -> CookingAgent:
    return CookingAgent(tier=tier)
