import pytest
import scenario

from tests.conftest import CookingAgentAdapter


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_substitution():
    result = await scenario.run(
        name="substitution",
        description=(
            "The user is halfway through a recipe that calls for buttermilk and has just realized "
            "they are out. They need practical substitutes they can make from pantry items."
        ),
        agents=[
            CookingAgentAdapter(),
            scenario.UserSimulatorAgent(),
            scenario.JudgeAgent(
                criteria=[
                    "Response proposes at least two distinct buttermilk substitutes.",
                    "Each substitute includes a ratio or quantity relative to the original buttermilk.",
                    "Response notes any flavor, texture, or behavior differences caused by the substitute.",
                    "Response does not recommend plain water as a one-to-one swap.",
                ]
            ),
        ],
        max_turns=4,
    )
    assert result.success, result.reasoning
