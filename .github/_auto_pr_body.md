# auto: thread traces per session so conversations group in LangWatch

## Why
239 traces in the last 7 days all appear as isolated root traces in LangWatch — multi-turn conversations (e.g. traces `2f8f5f558589310067df55ae1e5f7344` and `4c57edaa3ccdf751aa307e6d5fc3085a` are the same "hey → diet question" session) show up as unrelated entries, making it impossible to replay or debug a full conversation in the UI. Grouping traces by a stable `session_id` (set as `metadata.thread_id` in LangWatch) solves this directly. As a bonus, persisting messages in `localStorage` means a page refresh no longer wipes the conversation.

## What
- `web/components/chat.tsx`: On mount, generates or loads a stable UUID from `localStorage` as `cooking_session_id`. When `session_threading` flag is on, includes `session_id` in every `/chat` POST and persists the message history to `localStorage` (`cooking_session_messages`) so refresh restores the conversation.
- `api/main.py`: Adds optional `session_id` field (max 64 chars) to `ChatRequest`; exposes `session_threading` boolean in the `/flags` response; passes `session_id` → `thread_id` to the agent when the flag is on.
- `agent/cooking_agent.py`: Adds `thread_id` parameter to `chat()`; when provided, calls `langwatch.get_current_trace().update(metadata={"thread_id": thread_id})` so every turn of a conversation is filed under the same thread in LangWatch.

## Flag
- `auto_session_threading` — default **off**. Enable in Flagsmith "cooking" project → Development to activate.

## Eval delta
| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ | ✅ |
| dietary_constraints | ✅ | ✅ |
| safety_warning | ✅ | ✅ |
| substitution | ✅ | ✅ |

No scenarios were modified. The `thread_id` path is only taken when the flag is on (off by default); agent behaviour is unchanged.

## How to test
```
git checkout auto/improve-20260423-121036
pip install -e ".[dev]"
# flip auto_session_threading ON in Flagsmith Development environment
uvicorn api.main:app --port 8000 &
cd web && npm install && npm run dev
# open http://localhost:3000, send a few messages, refresh — history is restored
# check LangWatch: all turns of the session appear under one thread
```

## Rollback
Flip `auto_session_threading` off in Flagsmith. No code revert needed. `localStorage` entries are harmless if the flag is off.

## Follow-ups
- The `session_id` currently lives only in `localStorage` — private/incognito tabs and new browsers start fresh sessions, which is correct behaviour. Cross-device continuity would require server-side session storage.
- `cooking_session_messages` in `localStorage` grows unboundedly; a future iteration could cap it at N messages or add a "Clear chat" button.
