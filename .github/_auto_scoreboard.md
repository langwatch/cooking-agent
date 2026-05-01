# Auto Scoreboard — 2026-05-01 (iteration)

## Evidence Summary
- **All 5 existing scenarios pass** (100% baseline: basic_weeknight_recipe, dietary_constraints, multimodal_image, safety_warning, substitution)
- **334 traces** in last 30 days
- **Critical off-topic failure in trace d92027fa** (thread c9d826f2): Real user in an active cooking conversation asked "where is the light mode in this website" — agent responded with a step-by-step guide to changing dark/light mode in **ChatGPT** and other websites; never redirected to cooking. Core identity failure.
- **Markdown rendering complaint in trace 0ee0a635** (same thread): User said "markdown is not rendering the numbers" — the agent's `1)` numbered lists may not render as styled ordered lists. Noted as follow-up.
- **`auto_fix_history_prompt` flag** already addresses multi-turn prompt bug from last iteration.

## Candidates

| # | Title | Axis | Evidence | Impact | Risk | Rank |
|---|-------|------|----------|--------|------|------|
| 1 | **Topic guard: deflect non-cooking questions** | Prompt + Agent | Trace d92027fa — agent gave ChatGPT UI instructions to a cooking-chat user | **High** — core identity/trust failure | **Low** — system prompt addition, flag-gated | **1st ⭐** |
| 2 | Fix markdown `1)` ordered list rendering | UI | Trace 0ee0a635 — user said "markdown not rendering numbers" | Med | Low-Med | 2nd |
| 3 | Add keto dietary chip to UI | UI | Trace 14d418e2 — user said "I expected to have a keto filter" | Med | Low | 3rd |

## Decision: Candidate 1

Off-topic deflection is backed by a documented production failure (trace d92027fa) and zero test coverage. A system prompt instruction under `auto_topic_guard` (default off) fixes this and a new scenario (`test_topic_guard`) verifies it.
