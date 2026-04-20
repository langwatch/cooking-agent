import pytest
import scenario

from tests.conftest import CookingAgentAdapter


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_dietary_constraints():
    result = await scenario.run(
        name="dietary_constraints",
        description=(
            "The user is vegan, gluten-free, and severely nut-allergic. "
            "They want a weeknight dinner recipe that satisfies all three constraints."
        ),
        agents=[
            CookingAgentAdapter(),
            scenario.UserSimulatorAgent(),
            scenario.JudgeAgent(
                criteria=[
                    "Response contains zero animal products (no meat, dairy, eggs, honey).",
                    "Response contains no gluten-bearing ingredients (wheat, barley, rye, standard soy sauce).",
                    "Response contains no tree nuts or peanuts, and does not suggest them as substitutes.",
                    "Response explicitly confirms the recipe is vegan, gluten-free, and nut-free.",
                ]
            ),
        ],
        max_turns=4,
    )
    assert result.success, result.reasoning
