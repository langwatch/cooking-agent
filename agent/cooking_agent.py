"""Cooking agent (v0.1). Single Agno agent, OpenAI-backed, LangWatch-traced."""

from __future__ import annotations

import langwatch
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from openai import OpenAI

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

# Additional rule injected when auto_consistent_ingredient_quantities flag is on.
_CONSISTENT_MEASUREMENTS_INSTRUCTION = (
    "Ingredient quantity rule: When you list an ingredient with both a weight and a "
    "volume (e.g. '200 g (7 oz)' or '1 cup (240 ml)'), both measurements MUST be "
    "accurate conversions of the exact same amount — never approximate one to a value "
    "that would imply a different quantity. If you are not confident in the conversion, "
    "list a single measurement only. Clarity beats completeness. "
    "Example of a WRONG entry: '40 g (about 4 packed cups / 120 g) baby spinach' — "
    "40 g of spinach is roughly 1.5 cups, not 4 cups, and 40 g ≠ 120 g. "
    "Correct: '40 g (about 1½ cups) baby spinach' or simply '40 g baby spinach'."
)

# Additional rule appended when auto_dietary_safe_substitutions flag is on.
_DIETARY_SAFE_SUBSTITUTIONS_ADDENDUM = (
    "Dietary-safety rule — applies to the ENTIRE response (recipe title, ingredients, "
    "optional garnishes, AND substitutions): every ingredient you name must comply with "
    "ALL dietary restrictions the user has stated. Specific rules:\n"
    "- Nut-free / nut-allergic user: never include tree nuts, peanuts, or ANY product derived "
    "from them. Coconut is classified as a tree nut under FDA allergen rules — this means "
    "coconut milk, coconut cream, coconut aminos, coconut flour, desiccated coconut, and "
    "similar coconut-derived ingredients are ALL off-limits. Do not build the recipe around "
    "coconut; do not list coconut aminos as a tamari substitute. Use coconut-free alternatives "
    "(e.g. extra vegetable broth to thin sauces, or additional tamari with a splash of water).\n"
    "- Gluten-free user: never list soy sauce, wheat, barley, rye, or any gluten-containing "
    "item anywhere in the response, not even as a 'not gluten-free' option.\n"
    "- Vegan user: never list meat, fish, dairy, eggs, or honey.\n"
    "If any ingredient or substitution would violate a stated restriction, omit it entirely "
    "rather than listing it with a caveat or parenthetical note."
)


class CookingAgent:
    def __init__(self, tier: str = DEFAULT_TIER):
        self.tier = tier
        self.model_id = model_for_tier(tier)
        flags = load_flags()
        prompt = SYSTEM_PROMPT
        if flags.is_on("auto_consistent_ingredient_quantities", default=False):
            prompt = prompt.rstrip() + "\n" + _CONSISTENT_MEASUREMENTS_INSTRUCTION + "\n"
        if flags.is_on("auto_safety_check_enhanced", default=False):
            prompt = prompt + _SAFETY_ENHANCED_INSTRUCTION
        if flags.is_on("auto_dietary_safe_substitutions", default=False):
            prompt = prompt.rstrip() + "\n" + _DIETARY_SAFE_SUBSTITUTIONS_ADDENDUM + "\n"
        self._prompt = prompt
        self._agent = Agent(
            model=OpenAIChat(id=self.model_id),
            description="World-class home-cooking assistant.",
            instructions=prompt,
            markdown=True,
        )

    @langwatch.trace(name="cooking_agent.chat")
    def chat(self, message: str, history: list[dict] | None = None, thread_id: str | None = None) -> str:
        if thread_id:
            langwatch.get_current_trace().update(metadata={"thread_id": thread_id})
        if history:
            # Multi-turn path: build full OpenAI messages array with conversation history.
            # Uses the raw OpenAI client so history is sent verbatim without Agno's
            # in-memory session accumulating across requests.
            flags = load_flags()
            system_content = (
                self._prompt
                if flags.is_on("auto_fix_history_prompt", default=False)
                else SYSTEM_PROMPT
            )
            client = OpenAI()
            messages: list[dict] = [{"role": "system", "content": system_content}]
            messages.extend({"role": h["role"], "content": h["content"]} for h in history)
            messages.append({"role": "user", "content": message})
            resp = client.chat.completions.create(model=self.model_id, messages=messages)
            return resp.choices[0].message.content or ""
        response = self._agent.run(message)
        return response.content or ""


def build_agent(tier: str = DEFAULT_TIER) -> CookingAgent:
    return CookingAgent(tier=tier)
