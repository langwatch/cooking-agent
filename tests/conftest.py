"""Shared scenario test setup."""

from __future__ import annotations

import scenario
from dotenv import load_dotenv

from agent.cooking_agent import build_agent
from agent.telemetry import setup as setup_telemetry

load_dotenv()
setup_telemetry()
scenario.configure(default_model="openai/gpt-5-mini", cache_key="cooking-agent-v0.1")


class CookingAgentAdapter(scenario.AgentAdapter):
    """Adapter that wraps our CookingAgent for the Scenario framework."""

    def __init__(self, tier: str = "mid"):
        self.agent = build_agent(tier=tier)

    async def call(self, input: scenario.AgentInput) -> scenario.AgentReturnTypes:
        return self.agent.chat(input.last_new_user_message_str())
