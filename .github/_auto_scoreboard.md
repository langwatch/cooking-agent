# Auto-iterator Scoreboard — 2026-04-23

## Baseline
- Scenarios: 3/3 passed (100%)
- Traces searched: 146 traces over last 7 days

## Evidence from traces & code inspection
- 40%+ of all traces include dietary restriction queries ("vegan gluten-free nut-free") — users must retype these every single message.
- Flag `auto_dietary_pref_chips` was created by a prior iterator run but **never implemented** in any code file.
- UI has zero dietary controls beyond a model-tier dropdown; empty state shows only a single static hint.
- No conversation-reset button, no copy-to-clipboard on assistant messages.
- Error state shows raw HTTP status with no retry button.

## Candidate Changes

| # | Title | Evidence | Impact | Risk | Rank (I/R) |
|---|-------|----------|--------|------|------------|
| 1 | **Dietary preference chips (toggle chips UI)** | 40%+ traces show repeated dietary constraint text; `auto_dietary_pref_chips` flag exists but unimplemented; high user friction typing same prefs each message | **High** | Low | ⭐ 1st |
| 2 | Clickable example prompts in empty state | Current empty state is a single static hint; users may not know what to ask; low discoverability | Med | Low | 2nd |
| 3 | Copy-to-clipboard button on assistant messages | Recipes are long markdown; copying to use elsewhere is a common action with no affordance | Med | Low | 3rd |

## Decision
**Candidate 1 — Dietary preference chips** wins.

Rationale: Clear trace evidence (typing "vegan gluten-free nut-free" in every message is high friction), an existing Flagsmith flag that was never wired up, and the operator hint "ui ui and more ui!" all align. The flag `auto_dietary_pref_chips` is used; default remains off so no live users are affected until a human enables it.

Follow-ups (future runs):
- Candidate 2: clickable example prompts
- Candidate 3: copy-to-clipboard on assistant messages
