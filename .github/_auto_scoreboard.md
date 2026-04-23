# Candidate Scoreboard — 2026-04-23

| # | Title | Evidence | Impact | Risk | Rank |
|---|-------|----------|--------|------|------|
| 1 | **Multi-turn conversation history** | UI (`chat.tsx`) maintains full `messages[]` state but API ignores it — every request is stateless. Follow-up questions ("make it vegan", "what if I don't have X?") get no context. Backend `_agent_cache` also shares Agno history across all users (isolation bug). | High | Medium | **1** |
| 2 | **Fix agent isolation (per-request fresh agent)** | `_agent_cache` in `api/main.py` shares the same Agno `Agent` instance per tier, meaning conversation history bleeds across different users. No direct evidence of symptoms in traces (all single-turn tests), but the code is clearly wrong. | Medium | Low | 2 |
| 3 | **UI: Dietary preference quick-chips** | ~35% of traces are dietary-constrained queries ("vegan gluten-free nut-free"). Empty state only shows one generic suggestion. Clicking a chip would pre-fill common dietary constraints, reducing friction. | Low-Medium | Low | 3 |

**Selected:** #1 — multi-turn history, gated by `auto_conversation_history`.
