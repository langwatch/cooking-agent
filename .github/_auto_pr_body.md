# auto: add topic guard to deflect off-topic questions

## Why

Trace `d92027fa` (thread `c9d826f2`) shows a real user in an active cooking session asking
"where is the light mode in this website" — the agent responded with a detailed guide on
changing dark/light mode settings in **ChatGPT** and other websites, never redirecting to
cooking. This is a core identity failure: the agent confused itself with ChatGPT and answered
an off-topic UI question as if it were a general assistant.

The base system prompt says "You are a world-class home-cooking assistant" but includes no
explicit instruction to decline non-cooking requests. This gap surfaces in multi-turn
conversations where users sometimes go off-script.

## What

- `agent/cooking_agent.py`: Added `_TOPIC_GUARD_INSTRUCTION` constant and injected it into
  `self._prompt` when `auto_topic_guard` flag is on. Updated the multi-turn path to use
  `self._prompt` whenever `auto_topic_guard` is enabled (regardless of `auto_fix_history_prompt`),
  so the guard also covers conversations with history — exactly where the failure occurred.
- `tests/test_topic_guard.py`: New scenario test that injects the topic guard instruction
  directly (via a custom adapter) to verify the instruction works, independent of Flagsmith
  flag state.

## Flag

- `auto_topic_guard` (id: 204647) — default **off**. Enable in Flagsmith "cooking" project →
  Development to activate. When on, the agent responds to off-topic questions with a brief
  redirect to cooking instead of answering them.

## Eval delta

| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ | ✅ |
| dietary_constraints | ✅ | ✅ |
| multimodal_image | ✅ | ✅ |
| safety_warning | ✅ | ✅ |
| substitution | ✅ | ✅ |
| topic_guard (new) | — | ✅ |

No regressions. The new `test_topic_guard` uses `TopicGuardAdapter` which bakes the instruction
in directly, so it passes independently of flag state and validates the instruction text itself.

## How to test

```bash
git checkout auto/improve-20260501-141329
pip install -e ".[dev]"
pytest -v tests/ -m agent_test

# To exercise the fix live:
# 1. Enable auto_topic_guard in Flagsmith → Development
# 2. uvicorn api.main:app --port 8000
# 3. Chat with the assistant and ask something unrelated (e.g. "how do I change the font size?")
#    With flag OFF: agent may answer the off-topic question
#    With flag ON: agent declines and redirects to cooking
```

## Rollback

Flip `auto_topic_guard` off in Flagsmith. No code revert needed.

## Follow-ups

- Fix markdown `1)` numbered list rendering: trace `0ee0a635` — user said "markdown is not
  rendering the numbers." The agent uses `1)` style (parenthesis-delimited) for choice menus
  which may not render as styled ordered lists in react-markdown.
- Add keto dietary chip: trace `14d418e2` — user said "I expected to have a keto filter."
  Current chips: Vegan, GF, Nut-Free, Dairy-Free.
