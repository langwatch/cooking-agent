# auto: add multi-turn conversation history support

## Why
The chat UI (`web/components/chat.tsx`) maintains a full `messages[]` conversation state, but every API request was stateless — the backend discarded all prior turns. A user asking "make it vegan" or "what if I don't have Parmesan?" would get a confused, context-free response. The same `_agent_cache` also shared one Agno `Agent` instance per tier across all users, meaning conversation history from User A could bleed into User B's responses.

## What
- `agent/cooking_agent.py`: Added optional `history: list[dict]` parameter to `chat()`. When history is non-empty, builds a full OpenAI messages array (`system` + prior turns + new user message) via the raw OpenAI client instead of Agno, so context is sent verbatim without session accumulation side-effects.
- `api/main.py`: Added `HistoryMessage` model and `history` field to `ChatRequest` (max 50 messages, each max 4000 chars). When `auto_conversation_history` is on and history is present, creates a fresh agent per request (fixes cross-user isolation) and passes history to `agent.chat()`.
- `web/components/chat.tsx`: Always sends the current `messages` state as `history` with each request. The backend ignores it when the flag is off, so the change is backward-compatible.

## Flag
- `auto_conversation_history` — default **off**. Enable in Flagsmith "cooking" project → Development to activate.

## Eval delta
| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ 4/4 | ✅ 4/4 |
| dietary_constraints | ✅ 4/4 | ✅ 4/4 |
| substitution | ✅ 4/4 | ✅ 4/4 |

No regressions. All existing scenarios continued to use the single-turn (flag-off) path — zero behavior change until the flag is flipped.

## How to test
```
git checkout auto/improve-20260423-084145
pip install -e ".[dev]"
pytest -v tests/ -m agent_test
# then flip auto_conversation_history ON in Flagsmith to exercise multi-turn live:
# POST /chat with {"message": "make it vegan", "tier": "mid",
#   "history": [{"role": "user", "content": "give me a pasta recipe"},
#               {"role": "assistant", "content": "..."}]}
```

## Rollback
Flip `auto_conversation_history` off in Flagsmith. No code revert needed.

## Follow-ups
- Add a `test_followup_refinement.py` scenario that sends a two-turn conversation and verifies the agent adapts correctly (e.g., "make it vegan" after a non-vegan recipe).
- Consider replacing `_agent_cache` with a proper per-session store so the Agno path also benefits from isolation in future.
