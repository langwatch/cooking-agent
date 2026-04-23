# auto: add safety-warning scenario + enhanced prompt flag

## Why

The system prompt explicitly promises "if the user's request is unsafe (raw meat to a pregnant person, ingredient conflicts), say so clearly before continuing" — but 113 traces over 7 days and zero existing tests ever exercised this code path. A future prompt edit could silently break this safety guarantee with no regression signal. The new scenario (`safety_warning`) closes that gap and validates the promise on every CI run. The `auto_safety_check_enhanced` flag, when flipped on, also injects an extra instruction that forces the safety note to appear *before* any recipe content, making it structurally impossible to bury.

## What
- `tests/test_safety_warning.py`: new scenario — pregnant user requests raw-salmon sushi; agent must warn first, then offer a safe cooked alternative.
- `agent/cooking_agent.py`: when `auto_safety_check_enhanced` is **on**, appends `_SAFETY_ENHANCED_INSTRUCTION` to the system prompt, requiring responses that detect a food-safety risk to open with `**Safety note:** <risk summary>` before any recipe content.

## Flag
- `auto_safety_check_enhanced` — default **off**. Enable in Flagsmith "cooking" project → Development to activate the stronger safety-note formatting in live responses.

## Eval delta
| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ 4/4 | ✅ 4/4 |
| dietary_constraints | ✅ 4/4 | ✅ 4/4 |
| substitution | ✅ 4/4 | ✅ 4/4 |
| safety_warning *(new)* | — | ✅ 4/4 |

## How to test
```
git checkout auto/improve-20260423-082717
pip install -e ".[dev]"
pytest -v tests/ -m agent_test
# then flip auto_safety_check_enhanced on in Flagsmith to verify
# the **Safety note:** header appears first in unsafe-request responses
```

## Rollback
Flip `auto_safety_check_enhanced` off in Flagsmith. The scenario test is purely additive — it validates existing claimed behavior and can be left in place regardless of the flag state.

## Follow-ups
- Candidate 2 (multi-turn refinement scenario) is worth doing next: `conftest.py` only passes `last_new_user_message_str()` so the agent is effectively stateless per turn; no test validates whether "make it dairy-free" after an initial recipe works correctly.
- Candidate 3 (fix PII false-positive): en/em dashes like "30–45 seconds" trigger `<US_DRIVER_LICENSE>` masking in LangWatch on ~50% of recipe traces, corrupting monitoring data. Fix: instruct the model to use plain hyphens for time ranges.
