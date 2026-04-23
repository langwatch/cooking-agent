# Auto Scoreboard — 2026-04-23

## Traces summary
239 traces from last 7 days. All 4 scenarios pass. Multi-turn conversations visible in traces (e.g. `2f8f5f558589310067df55ae1e5f7344` has `history` showing a prior turn), but every trace appears as an isolated root in LangWatch — no thread_id grouping, making it impossible to replay a full user conversation in the UI.

## Candidates

| # | Title | Evidence | Impact | Risk | Score |
|---|---|---|---|---|---|
| 1 | **Session threading** — generate stable `localStorage` UUID as `session_id`, pass it to `/chat`, set `metadata.thread_id` on LangWatch trace so multi-turn conversations appear as one thread; optionally persist messages across page refresh | Traces `2f8f5f558589310067df55ae1e5f7344` + `4c57edaa3ccdf751aa307e6d5fc3085a` are same conversation but show as unrelated roots; operator explicitly requested this via FOCUS hint | High | Low | **1st** |
| 2 | Streaming SSE responses — emit tokens progressively to reduce perceived latency | Flag `auto_streaming_response` already registered; would duplicate previous iteration's work | Med | Med | 3rd |
| 3 | Starter prompts on empty state — clickable example queries | Flag `auto_starter_prompts` registered but no frontend implementation yet | Low | Low | 4th |

## Selected: Candidate 1 — Session threading
Directly addresses FOCUS hint. Small, reviewable diff. No risk to existing scenarios.
