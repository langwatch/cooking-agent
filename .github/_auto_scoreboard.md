# Auto-iteration Scoreboard — 2026-04-23

## Baseline
- Scenarios: 3/4 passed (75%)
- Traces searched: 187 traces over last 7 days

## Evidence from traces & code inspection
- `basic_weeknight_recipe` scenario FAILING: judge reasoning shows "baby spinach listed as both '40 g' and 'about 4 packed cups / 120 g'" — contradictory because 40g ≠ 120g for spinach. This is a prompt quality failure.
- Trace `cff64b4ed48078438e97b4d1f34a4a2b` shows the exact problematic output from the live agent.
- Multiple pasta-recipe traces (e.g. `172be6fe68944475ae0ea758b1994227`, `a36f7e53205ed42a35fc5a0d428d49b1`) contain `<US_DRIVER_LICENSE>` PII tags replacing em dashes — shows LangWatch PII scrubbing is active, not a bug.
- System prompt only says "List ingredients with quantities" — no rule about measurement accuracy or cross-unit consistency.

## Candidate Changes

| # | Title | Evidence | Impact | Risk | Rank |
|---|-------|----------|--------|------|------|
| 1 | **Add measurement-accuracy rule to system prompt** | `basic_weeknight_recipe` fails due to contradictory measurements. Direct prompt fix. Trace evidence + scenario failure. | High | Low | **1st** |
| 2 | Fix multi-turn path ignoring flag-gated system prompt additions | Code: `chat()` uses raw `SYSTEM_PROMPT` in multi-turn mode, losing safety/dietary addenda. No failing test but a silent regression risk. | Medium | Low | 2nd |
| 3 | Add scenario to explicitly test measurement consistency | No scenario validates that unit conversions are accurate. Would prevent this class of regression. | Low | Low | 3rd |

## Decision
**Candidate 1** — Add explicit measurement-accuracy instruction to system prompt, gated by `auto_consistent_ingredient_quantities`. Directly addresses the only failing scenario with minimal risk.
