# auto: chat bubble layout — directional message alignment

## Why
The existing chat UI uses `ml-8`/`mr-8` indented blocks for messages — both user and assistant messages are visually identical blocks that differ only by their tiny "You"/"Chef" label. A proper directional bubble layout (user right-aligned, assistant left-aligned) is the highest-impact single visual improvement for a conversational UI. The operator's focus hint explicitly calls out "visual polish, spacing, typography, color, and layout."

## What
- `web/components/chat.tsx`: Added `bubbleLayout` state flag read from `/flags`; when enabled, messages render as directional flex bubbles — user messages right-aligned with warm orange-tinted background (`bg-accent/15`, `border-accent/30`, orange "You" label), assistant messages left-aligned with elevated card style (`rounded-2xl`, `shadow-sm`). Old layout preserved as fallback when flag is off.
- `api/main.py`: Added `chat_bubble_layout` key to the `/flags` endpoint so the frontend can read the Flagsmith value.

## Flag
- `auto_chat_bubble_layout` — default **off**. Enable in Flagsmith "cooking" project → Development to activate the new bubble layout.

## Eval delta
| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ | ✅ |
| dietary_constraints | ✅ | ✅ |
| safety_warning | ✅ | ✅ |
| substitution | ✅ | ✅ |

No scenarios were modified. Change is purely frontend CSS/layout.

## How to test
```
git checkout auto/improve-20260423-113311
pip install -e ".[dev]"
# flip auto_chat_bubble_layout ON in Flagsmith Development environment
uvicorn api.main:app --port 8000 &
cd web && npm install && npm run dev
# open http://localhost:3000 and send a few messages
```

## Rollback
Flip `auto_chat_bubble_layout` off in Flagsmith. No code revert needed.
