# Auto Improvement Scoreboard — 2026-04-23

## Evidence Summary
- **4/4 scenarios passing** — agent quality is solid, no functional regressions to fix
- **224 traces in 7 days** — healthy traffic, no thumbs-down or error spans visible
- **Focus hint**: "go wild on the design, make it the best one ever!"
- **Existing flags**: `auto_chat_bubble_layout`, `auto_dietary_pref_chips`, `auto_starter_prompts` — UI scaffolding is already in place but the experience is still very utilitarian (plain text rendering of structured recipes)

## Candidates

| # | Title | Evidence | Impact | Risk | Rank |
|---|---|---|---|---|---|
| 1 | **Premium UI: interactive recipe cards + visual overhaul** | Agent outputs a consistent structured format (title, ingredients grouped by category, numbered steps, dietary info, chef's tip). Rendering this as plain markdown wastes the structure entirely. Traces show 100% recipe-format responses. A card UI with ingredient checkboxes and step progress would transform the cook-along experience. | **High** | **Low** | 🥇 |
| 2 | Add multi-turn meal-plan scenario | Traces show conversation history flag is live but no scenario tests multi-turn cooking sessions. A follow-up test would catch regressions. | Med | Low | 🥈 |
| 3 | Add adversarial red-team scenario (allergen confusion) | No scenario tests a user claiming one allergy but requesting an ingredient that triggers another (e.g., "nut-free" + asking for Thai peanut sauce). Safety gap. | Med | Low | 🥉 |

## Winner: **#1 — Premium UI with interactive recipe cards**

Rationale: The agent already produces beautifully structured recipe data on every response. Right now that structure is completely wasted — users see a wall of markdown text. Rendering it as an interactive recipe card (ingredient checkboxes, step-by-step progress, dietary badges, chef's tip callout) is the highest-leverage single change possible. Zero risk to agent functionality; purely additive behind a flag.
