# auto: add dietary preference chips to chat UI

## Why
40%+ of recent traces show users explicitly typing dietary restrictions ("vegan gluten-free nut-free") in every single message — pure repetitive friction. The Flagsmith flag `auto_dietary_pref_chips` was created by a prior iterator run but never wired to any code. This PR implements the feature: a row of toggle chips (Vegan, Gluten-Free, Nut-Free, Dairy-Free) that persist across the session and auto-inject the selected preferences into each outgoing message. Trace evidence: e.g., `6f97e35c`, `64ca9586`, `7655b4d6`, `0bb3aee3`, `4532ec17`.

## What
- `web/components/chat.tsx`: on mount, fetches `/flags` from the backend; if `dietary_pref_chips` is true, renders a row of pill-shaped toggle chips below the model-tier selector. Active chips highlight in the accent colour. When the user sends a message, selected prefs are appended to the text sent to the agent (e.g. `"pasta recipe [dietary: Vegan, Gluten-Free]"`). The displayed bubble shows the raw user text without the injected suffix. Input placeholder also updates to reflect active preferences.
- `api/main.py`: adds a `GET /flags` endpoint that reads Flagsmith flag values and returns them as JSON, so the frontend can query flag state without a JS SDK or exposed env vars.

## Flag
- `auto_dietary_pref_chips` — default **off**. Enable in Flagsmith "cooking" project → Development to activate.

## Eval delta
| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ 4/4 | ✅ 4/4 |
| dietary_constraints | ✅ 4/4 | ✅ 4/4 |
| substitution | ✅ 4/4 | ✅ 4/4 |

No scenarios were modified. All three pass before and after.

## Screenshots

| Before (flag off — no chips) | After (flag on — chips visible) |
|---|---|
| ![before](https://i.img402.dev/g9z7ziw6fh.jpg) | ![after](https://i.img402.dev/e19pb8jrdm.jpg) |

## How to test
```
git checkout <this-branch>
pip install -e ".[dev]"
cd web && npm install && npm run dev &
uvicorn api.main:app --port 8000 &
# then flip auto_dietary_pref_chips ON in Flagsmith to see the chips appear
# try: select "Vegan" + "Gluten-Free", type "give me a pasta recipe", send
# confirm the agent receives the dietary context and respects it
pytest -v tests/ -m agent_test
```

## Rollback
Flip `auto_dietary_pref_chips` off in Flagsmith. No code revert needed — the UI silently hides the chips row when the flag is off.

## Follow-ups
- Candidate 2: Clickable example prompts in empty state (replace single static hint with 3–4 clickable suggestions).
- Candidate 3: Copy-to-clipboard button on assistant message cards (recipe text is long; one-click copy is high-value QOL).
