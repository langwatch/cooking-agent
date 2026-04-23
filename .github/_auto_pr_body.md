# auto: premium UI with interactive recipe cards

> @aryansharma28 img402 upload broken — screenshots committed to .github/_auto_screenshots/ instead

## Why

The agent already outputs a perfectly structured recipe format on every single response (title, cuisine/time, ingredient groups, numbered steps, dietary info, chef's tip), but the frontend renders it as a flat wall of markdown text. 224 traces over 7 days confirm 100% of recipe responses follow this structure — yet none of that structure is surfaced to the user. Transforming these responses into interactive recipe cards makes the cooking-along experience dramatically better and uses zero additional API calls.

The operator focus hint ("go wild on the design, make it the best one ever!") confirms UI is the right investment area.

## What

- `web/lib/parse-recipe.ts`: New parser that detects recipe responses and extracts title, meta (cuisine + time), ingredient groups, numbered steps, dietary info, and chef's tip from the agent's consistent output format.
- `web/components/recipe-card.tsx`: New `RecipeCard` component renders parsed recipes as a structured two-column card — interactive ingredient checklist on the left (per-item checkboxes, checked/total counter), numbered instruction steps on the right (click to mark complete), dietary badges at the top, and a chef's tip callout at the bottom. Non-recipe responses fall back to markdown.
- `web/components/chat.tsx`: When `premium_ui` flag is on, replaces the entire chat layout: gradient hero header with chef hat icon + model tier selector, dietary filter chips in a toolbar, 2×2 starter prompt grid for the empty state, right-aligned user bubbles, animated bouncing-dots loading indicator, and `RecipeCard` for all assistant messages. Legacy layout is preserved verbatim when flag is off.
- `api/main.py`: Exposes `premium_ui` key from the `/flags` endpoint.

## Flag

- `auto_premium_ui` — default **off**. Enable in Flagsmith "cooking" project → Development to activate.

## Eval delta

| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ | ✅ |
| dietary_constraints | ✅ | ✅ |
| safety_warning | ✅ | ✅ |
| substitution | ✅ | ✅ |

No scenarios were modified. Changes are purely in the frontend rendering layer.

## Screenshots

> img402.dev was unreachable. Screenshots committed to `.github/_auto_screenshots/` for download.

| State | File |
|---|---|
| Before (flag off) | `.github/_auto_screenshots/before_ui.jpg` |
| After — empty state | `.github/_auto_screenshots/after_empty_state.jpg` |
| After — recipe card | `.github/_auto_screenshots/after_recipe_card.jpg` |

Visual diff: the "after empty" state shows a gradient hero header with orange gradient "Cooking Agent" text, chef-hat icon, compact tier dropdown, and a 2×2 starter prompt grid. The "after recipe" state shows right-aligned user bubbles and a structured dark recipe card with title + time badge, dietary badges, a two-column body (ingredient checklist with checkboxes on the left, orange numbered step circles on the right), and a chef's tip bar.

## How to test

```
git checkout auto/improve-20260423-115315
pip install -e ".[dev]"
uvicorn api.main:app --port 8000 &
cd web && npm install && npm run dev &
# Flip auto_premium_ui ON in Flagsmith → Development
# Visit http://localhost:3000 — try "30-minute weeknight pasta for two"
# Verify: recipe card with interactive checkboxes renders
cd .. && pytest -v tests/ -m agent_test
```

## Rollback

Flip `auto_premium_ui` off in Flagsmith. No code revert needed.

## Follow-ups

- Multi-turn meal planning scenario to exercise the `auto_conversation_history` flag path.
- Allergen confusion red-team scenario: user says "nut-free" but asks for Thai peanut sauce.
