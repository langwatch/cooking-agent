# Auto Scoreboard — 2026-04-23 (iteration 2)

## Evidence Summary
- **All 5 scenarios pass** (100% success rate, 5/5 baseline)
- **324 traces** searched from last 7 days
- **Previous iteration** (#18): Implemented `auto_markdown_prose_styling` fix — markdown-renderer.tsx now has styled `ol`/`ul`/`li` components; that fix is already in code.
- **Real user conversation thread `c9d826f2`**: Multi-turn session with dietary requests, numbered list complaints, off-topic UI question
- **Trace `14d418e2`**: User said "I expected to have a keto filter" (no keto chip exists)
- **Trace `d92027fa`**: User asked "where is the light mode in this website?" → agent responded with ChatGPT-specific settings instructions (identity confusion)
- **Critical code bug in `cooking_agent.py:96`**: Multi-turn history path uses bare `SYSTEM_PROMPT` constant instead of the flag-augmented `prompt` local variable built in `__init__`. All deployed flag improvements (`auto_safety_check_enhanced`, `auto_consistent_ingredient_quantities`, `auto_dietary_safe_substitutions`) are silently no-ops for every real multi-turn conversation.

## Candidates

| # | Title | Evidence | Impact | Risk | Rank |
|---|-------|----------|--------|------|------|
| 1 | **Fix multi-turn system prompt bug** — history path uses bare `SYSTEM_PROMPT`, ignoring all flag addendums | `cooking_agent.py:96`: `messages = [{"role": "system", "content": SYSTEM_PROMPT}]` — `prompt` local var built in `__init__` with flag injections is never stored as instance attr; silently bypasses safety + dietary + measurement flags in every multi-turn chat | **High** — affects all real users (conversations with history = real usage), silently degrades quality of every conversation after the first message | **Low** — 2-line fix: store `self._prompt = prompt`, use it in history path behind new flag | **1st** |
| 2 | Add Keto dietary chip to UI | Trace `14d418e2` — explicit user complaint "I expected to have a keto filter"; current chips: Vegan, GF, Nut-Free, Dairy-Free | **Medium** | **Low** | 2nd |
| 3 | Fix agent identity confusion | Trace `d92027fa` — agent responded as ChatGPT when asked about app UI | **Medium** | **Low** | 3rd |

## Decision: Candidate 1

The multi-turn system prompt bug silently renders every previously shipped flag-based improvement ineffective for real conversations. Every user who sends more than one message gets the bare system prompt — no safety warnings, no measurement consistency rules, no dietary compliance enforcement. The fix is trivial.
