# auto: fix flag-augmented prompt bypassed in multi-turn conversations

## Why

Code inspection of `agent/cooking_agent.py:96` reveals a silent bug: the `chat()` method's multi-turn path (used whenever a user sends a second message) passes bare `SYSTEM_PROMPT` as the system message instead of the flag-augmented `prompt` built in `__init__`. The `prompt` local variable collects all flag-based instruction injections (`auto_safety_check_enhanced`, `auto_consistent_ingredient_quantities`, `auto_dietary_safe_substitutions`) but is never stored as an instance attribute, so it is unreachable in `chat()`.

This means **every real multi-turn conversation** — every user who sends more than one message — receives the bare base system prompt with none of the deployed safety, measurement accuracy, or dietary compliance rules applied. All three flag-based prompt improvements shipped in previous iterations are silently no-ops for the most common real-world usage pattern.

Confirmed by real conversation traces: thread `c9d826f2` (traces `93bebcf7`, `4e6afe15`, `dafdb4a5`, `0ee0a635`, `d92027fa`) shows a real user going through a multi-turn session that would have bypassed all flag instructions entirely.

## What

- `agent/cooking_agent.py`: Store the assembled `prompt` as `self._prompt` in `__init__`. In `chat()`, when `history` is provided and the `auto_fix_history_prompt` flag is on, use `self._prompt` as the system message instead of the bare `SYSTEM_PROMPT` constant.

The change is 6 lines: 1 new instance attribute assignment + 5 lines for the flag-gated conditional.

## Flag

- `auto_fix_history_prompt` — default **off**. Enable in Flagsmith "cooking" project → Development to activate. When on, multi-turn conversations receive the full flag-augmented system prompt (including any active safety/dietary/measurement instructions). When off, existing behavior is preserved exactly.

## Eval delta

| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ 4/4 | ✅ 4/4 |
| dietary_constraints | ✅ 4/4 | ✅ 4/4 |
| multimodal_image | ✅ 4/4 | ✅ 4/4 |
| safety_warning | ✅ 4/4 | ✅ 4/4 |
| substitution | ✅ 4/4 | ✅ 4/4 |

No regressions. All scenarios are single-turn so they test the unaffected code path; this fix targets the `history` branch which is exercised only in real multi-turn usage.

## How to test

```bash
git checkout auto/improve-20260423-153627
pip install -e ".[dev]"
pytest -v tests/ -m agent_test

# To exercise the fix live:
# 1. Enable auto_fix_history_prompt + any of:
#    auto_safety_check_enhanced / auto_dietary_safe_substitutions / auto_consistent_ingredient_quantities
#    in Flagsmith → Development
# 2. uvicorn api.main:app --port 8000
# 3. Send a multi-turn request:
#    POST /chat {"message": "now make it vegan", "history": [{"role":"user","content":"give me a pasta recipe"}, {"role":"assistant","content":"..."}]}
# With flag OFF: safety/dietary rules absent from system prompt
# With flag ON: full augmented prompt applied
```

## Rollback

Flip `auto_fix_history_prompt` off in Flagsmith. No code revert needed.

## Follow-ups

- Add Keto dietary chip: trace `14d418e2` shows a user saying "I expected to have a keto filter." Current chips are Vegan, GF, Nut-Free, Dairy-Free.
- Fix agent identity confusion: trace `d92027fa` shows the agent responding with ChatGPT-specific instructions when a user asked about "light mode in this website." System prompt has no identity anchor or on-topic guardrail.
