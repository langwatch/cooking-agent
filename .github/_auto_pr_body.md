# auto: add dietary preference chips + suggestion chips to chat UI

## Why
35+ of 140 recent LangWatch traces (25%) contain vegan/gluten-free/nut-free requests, yet users must retype dietary restrictions on every message. The `dietary_constraints` scenario is the most friction-prone use case — matching the most common real-world request pattern in traces. Adding persistent dietary preference chips lets users set restrictions once and have them automatically appended to every message, directly reducing the friction that traces show users repeatedly encounter.

## What
- `web/components/chat.tsx`: adds a row of toggleable dietary preference chips (🌱 Vegan, 🌾 Gluten-Free, 🥜 Nut-Free, 🥛 Dairy-Free, 🥗 Vegetarian) in the toolbar; active chips are auto-appended to every outgoing message as `(dietary restrictions: ...)`. Also replaces the static empty-state hint text with clickable suggestion chips (4 common requests). Active prefs are shown as small tags on user message bubbles so users can see what context was injected.
- `api/main.py`: adds a `GET /flags` endpoint that proxies Flagsmith flag values to the frontend, enabling client-side feature gating without exposing the Flagsmith API key.

## Flag
- `auto_dietary_pref_chips` — default **off**. Enable in Flagsmith "cooking" project → Development to activate.

## Eval delta
| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ 4/4 | ✅ 4/4 |
| dietary_constraints | ✅ 4/4 | ✅ 4/4 |
| substitution | ✅ 4/4 | ✅ 4/4 |

No scenarios modified. All 3 pass unchanged.

## Screenshots

@aryansharma28 img402 upload broken — screenshots committed to `.github/_auto_screenshots/` instead.

| Before | After |
|---|---|
| (see `.github/_auto_screenshots/before_dietary_chips.jpg`) | (see `.github/_auto_screenshots/after_dietary_chips.jpg`) |

**Before**: plain model-tier dropdown, static "Try: ..." hint, single-line input.

**After** (flag on): dietary preference chip row (`Diet: 🌱 Vegan 🌾 Gluten-Free 🥜 Nut-Free 🥛 Dairy-Free 🥗 Vegetarian`), clickable suggestion chips in empty state, placeholder updates to show which prefs are active.

## How to test
```
git checkout auto/improve-20260423-092213
pip install -e ".[dev]"
pytest -v tests/ -m agent_test
# then flip auto_dietary_pref_chips on in Flagsmith → Development to see the UI
cd web && npm install && npm run dev
```

## Rollback
Flip `auto_dietary_pref_chips` off in Flagsmith. No code revert needed.

## Follow-ups
- The `/flags` endpoint polls Flagsmith on every request — could add a short TTL cache if this becomes a latency concern.
- Several traces contain `<US_DRIVER_LICENSE>` PII-masking tags in LangWatch output — this appears to be a false-positive in LangWatch's PII detector, worth investigating in a future iteration.
