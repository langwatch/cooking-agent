import pytest
import scenario

from tests.conftest import CookingAgentAdapter


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_basic_weeknight_recipe():
    result = await scenario.run(
        name="basic_weeknight_recipe",
        description=(
            "The user wants a 30-minute weeknight pasta recipe for two people. "
            "They have no specific dietary restrictions but want something quick and comforting."
        ),
        agents=[
            CookingAgentAdapter(),
            scenario.UserSimulatorAgent(),
            scenario.JudgeAgent(
                criteria=[
                    "Response includes a total cooking time at or under 30 minutes.",
                    "Response lists ingredients with clear quantities.",
                    "Response provides numbered, actionable steps with heat or timing details.",
                    "Response does not invent brand names or non-existent ingredients.",
                ]
            ),
        ],
        max_turns=4,
    )
    assert result.success, result.reasoning
