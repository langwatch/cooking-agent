# Auto Scoreboard — 2026-04-23

## Candidate Changes

| # | Title | Evidence | Impact | Risk | Rank |
|---|---|---|---|---|---|
| 1 | **Multimodal image input (Gemini 1.5 Flash)** | Operator focus hint. Zero image-related traces in 265 sampled — entirely absent capability. Fridge-photo → recipe and dish-recreation are highly natural user flows. `GEMINI_API_KEY` already wired in CI. | High | Med | **1st** |
| 2 | Add multi-turn conversation test scenario | Trace `59fd8cb8a61cb6ceb948a060977ed85b` shows multi-turn working but no scenario validates it. `auto_conversation_history` flag exists but is untested at the scenario level. | Med | Low | 2nd |
| 3 | Extend system prompt with fridge-inventory parsing | Several traces show users listing "what's in my fridge" style queries but the agent sometimes asks clarifying questions instead of immediately parsing. A structured inventory-extraction instruction would reduce latency. | Med | Med | 3rd |

## Decision

**Candidate 1 — multimodal image input** wins. Explicit `FOCUS` directive, entirely new capability with zero existing coverage, infrastructure (`GEMINI_API_KEY`, `httpx`) already in place.
