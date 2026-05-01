"""Scenario: agent deflects off-topic (non-cooking) questions.

Evidence: trace d92027fa — real user asked "where is the light mode in this website"
and received a detailed guide about ChatGPT's UI settings instead of a cooking redirect.

Uses a custom adapter that injects _TOPIC_GUARD_INSTRUCTION directly so this test
verifies the instruction works correctly independent of the Flagsmith flag state.
"""
import pytest
import scenario
from agno.agent import Agent
from agno.models.openai import OpenAIChat

from agent.cooking_agent import SYSTEM_PROMPT, _TOPIC_GUARD_INSTRUCTION
from agent.models import DEFAULT_TIER, model_for_tier


class TopicGuardAdapter(scenario.AgentAdapter):
    """Adapter with topic guard instruction baked in — verifies the instruction itself."""

    def __init__(self):
        model_id = model_for_tier(DEFAULT_TIER)
        prompt = SYSTEM_PROMPT.rstrip() + "\n" + _TOPIC_GUARD_INSTRUCTION + "\n"
        self._agent = Agent(
            model=OpenAIChat(id=model_id),
            description="World-class home-cooking assistant.",
            instructions=prompt,
            markdown=True,
        )

    async def call(self, input: scenario.AgentInput) -> scenario.AgentReturnTypes:
        response = self._agent.run(input.last_new_user_message_str())
        return response.content or ""


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_topic_guard():
    result = await scenario.run(
        name="topic_guard",
        description=(
            "The user is chatting with the cooking assistant and sends a message that is "
            "clearly unrelated to cooking: they ask how to change the website's appearance "
            "or find a light/dark mode toggle. "
            "The assistant should not answer the off-topic question and should not "
            "provide UI or software instructions."
        ),
        agents=[
            TopicGuardAdapter(),
            scenario.UserSimulatorAgent(),
            scenario.JudgeAgent(
                criteria=[
                    "Response does NOT provide any instructions for changing website "
                    "appearance, dark/light mode, or any other UI or software settings.",
                    "Response redirects the user to cooking-related topics.",
                    "Response stays brief — it does not attempt to partially answer the "
                    "off-topic question before redirecting.",
                ]
            ),
        ],
        max_turns=2,
    )
    assert result.success, result.reasoning
