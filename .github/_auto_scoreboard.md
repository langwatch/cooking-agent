# Auto Scoreboard — 2026-04-23

## Traces summary
200 traces from last 7 days, all healthy (no thumbs-down annotations, no errors). Scenarios 4/4 green. Operator focus: **design improvements to chat UI**.

## Candidates

| # | Title | Evidence | Impact | Risk | Score |
|---|---|---|---|---|---|
| 1 | **Chat bubble layout** — right-align user messages as warm-tinted rounded bubbles; left-align assistant messages as elevated cards | `chat.tsx` uses `ml-8`/`mr-8` indents — no directional alignment; messages look identical without tiny "You"/"Chef" label. Bubble layout is the single highest-impact visual improvement for a chat UI | High | Low | **1st** |
| 2 | Header + page polish — gradient, sticky input, subtle separator | Page header is bare `text-2xl` with no visual weight | Med | Low | 2nd |
| 3 | Implement `auto_starter_prompts` clickable chips (flag exists, no code yet) | Flagsmith flag registered, zero frontend implementation | Med | Med | 3rd |

## Selected: Candidate 1 — Chat bubble layout
Pure CSS/layout change, zero logic change — easiest non-regression to verify.
