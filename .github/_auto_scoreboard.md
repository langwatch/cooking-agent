# Candidate Scoreboard — 2026-04-23

## Evidence Summary
- 113 traces over 7 days, all from automated scenario tests (3 scenarios × ~37 runs)
- All 3 scenarios pass 100% — no thumbs-down annotations, no error spans
- PII masking false positives: en/em dashes (e.g. "30–45 seconds") appear as `<US_DRIVER_LICENSE>` in ~50% of recipe traces
- System prompt explicitly claims safety-warning behavior but **no scenario tests it**
- No user-asked scaling requests visible; no multi-turn refinement traces

---

## Candidates

| # | Title | Evidence | Impact | Risk | Rank |
|---|-------|----------|--------|------|------|
| 1 | **Add safety-warning scenario + enhanced prompt formatting** | System prompt states "If the user's request is unsafe … say so clearly" but zero tests validate this. Agent could silently drop the warning after a prompt change. Traces show no adversarial probes ever ran. | High | Low | **1 (pick this)** |
| 2 | Add recipe-modification follow-up scenario | `conftest.py` adapter only passes `last_new_user_message_str()` — stateless per turn. Multi-turn refinement ("make it dairy-free") is untested and likely broken. | Medium | Medium | 2 |
| 3 | Fix PII false-positive: replace em/en dashes with hyphens in prompt | `<US_DRIVER_LICENSE>` appears in ~50% of recipe traces where "30–45" numeric ranges appear, corrupting monitoring data. Easy fix (one prompt line), but purely operational — no user-facing improvement. | Low | Low | 3 |

---

## Winner: Candidate 1

**Rationale**: The system prompt makes a concrete safety promise ("say so clearly before continuing") that no test has ever validated. A prompt change tomorrow could silently break it. Adding a scenario and a small prompt enhancement (behind a flag) gives permanent regression protection for stated safety behavior. It also exercises an unexplored path in traces — advisable per iterator guardrails when scenarios are otherwise 100% green.
