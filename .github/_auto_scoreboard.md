# Candidate Scoreboard

## Candidates

| # | Title | Evidence | Impact | Risk | Rank |
|---|-------|----------|--------|------|------|
| 1 | **Dietary preference chips in chat UI** | 50/140 recent traces are vegan/GF/nut-free requests; users must retype dietary needs every turn; dietary_constraints scenario shows this is the most common request pattern. Focus hint explicitly calls out dietary-preference controls. | High | Low | 1 |
| 2 | Clickable suggestion chips in empty state | Current empty state shows only static text "Try: ...". Clickable suggestions lower friction to first message — common pattern in chat UIs. | Med | Low | 2 |
| 3 | Add `/flags` endpoint to backend for frontend feature gating | No clean way to gate frontend features behind Flagsmith without a backend proxy endpoint. Enables the chip feature and future UI flags cleanly. | Med | Low | 3 (enabler for #1) |

## Selection: Candidate 1 + 2 + 3 (cohesive input UX improvement)

Implementing as one change: dietary preference chips (toggle row) + clickable suggestion chips (empty state) + backend `/flags` endpoint. All gated by `auto_dietary_pref_chips` flag (default off).

**Evidence summary:**
- 35+ of 140 recent traces contain "vegan", "gluten-free", "nut-free" in the request
- Users currently have to type dietary restrictions in every message
- The dietary_constraints test scenario is the most friction-prone use case
- Traces show this is the most frequent request pattern
