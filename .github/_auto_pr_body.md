# auto: fix inconsistent ingredient quantity measurements in recipes

## Why
The `basic_weeknight_recipe` scenario was failing because the agent output contradictory measurements for the same ingredient — e.g. `40 g (about 4 packed cups / 120 g) baby spinach`, where 40 g of baby spinach is roughly 1.5 cups (not 4 cups), and 40 g ≠ 120 g. The judge correctly rejected this as "unclear ingredient quantities". The root cause: the system prompt says only "List ingredients with quantities" — no rule about measurement accuracy or cross-unit consistency. Trace `cff64b4ed48078438e97b4d1f34a4a2b` shows the exact failing output from the live agent.

## What
- `agent/cooking_agent.py`: added `_CONSISTENT_MEASUREMENTS_INSTRUCTION` string constant and wired it into `CookingAgent.__init__` behind the `auto_consistent_ingredient_quantities` flag. When enabled, the instruction explicitly requires that all unit representations for the same ingredient be accurate conversions of the same amount, with a concrete counter-example drawn from the actual failure case.

## Flag
- `auto_consistent_ingredient_quantities` — default **off**. Enable in Flagsmith "cooking" project → Development to activate.

## Eval delta
| Scenario | Before | After (flag on) |
|---|---|---|
| basic_weeknight_recipe | ❌ 3/4 criteria | ✅ 4/4 criteria |
| dietary_constraints | ✅ 4/4 | ✅ 4/4 |
| safety_warning | ✅ 4/4 | ✅ 4/4 |
| substitution | ✅ 4/4 | ✅ 4/4 |

**Before**: 3/4 scenarios pass (75%). **After flag on**: 4/4 pass (100%).

No scenarios were modified or added — the same criteria, fully met.

## How to test
```
git checkout <this-branch>
pip install -e ".[dev]"
# Enable auto_consistent_ingredient_quantities in Flagsmith → Development
pytest -v tests/ -m agent_test
# Expect 4/4 pass; basic_weeknight_recipe should now pass
# Flip flag off to verify 3/4 pass (regression to baseline)
```

## Rollback
Flip `auto_consistent_ingredient_quantities` off in Flagsmith. No code revert needed.

## Follow-ups
- Fix multi-turn conversation path (`chat()` with `history`) using raw `SYSTEM_PROMPT` instead of the flag-modified `prompt`, which silently drops safety and dietary addenda for multi-turn users.
- Add a scenario that explicitly checks measurement accuracy to prevent regressions in this class of failure.
