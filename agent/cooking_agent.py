"""Cooking agent (v0.1). Single Agno agent, OpenAI-backed, LangWatch-traced."""

from __future__ import annotations

import langwatch
from agno.agent import Agent
from agno.models.openai import OpenAIChat

from agent.flags import load as load_flags
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

# Additional instruction injected when auto_safety_check_enhanced flag is on.
_SAFETY_ENHANCED_INSTRUCTION = """
When you detect a food-safety risk (e.g. raw/undercooked protein for a vulnerable person,
cross-contamination, dangerous ingredient combinations), begin your entire response with:

**Safety note:** <one-sentence summary of the risk>

Then provide a safe alternative or adjusted recipe.
"""


class CookingAgent:
    def __init__(self, tier: str = DEFAULT_TIER):
        self.tier = tier
        self.model_id = model_for_tier(tier)
        flags = load_flags()
        instructions = SYSTEM_PROMPT
        if flags.is_on("auto_safety_check_enhanced", default=False):
            instructions = SYSTEM_PROMPT + _SAFETY_ENHANCED_INSTRUCTION
        self._agent = Agent(
            model=OpenAIChat(id=self.model_id),
            description="World-class home-cooking assistant.",
            instructions=instructions,
            markdown=True,
        )

    @langwatch.trace(name="cooking_agent.chat")
    def chat(self, message: str) -> str:
        response = self._agent.run(message)
        return response.content or ""


def build_agent(tier: str = DEFAULT_TIER) -> CookingAgent:
    return CookingAgent(tier=tier)
