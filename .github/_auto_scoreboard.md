# Auto Scoreboard — 2026-04-23

## Evidence Summary
- 294 traces in last 7 days. No thumbs-down annotations, but real user complaints confirmed.
- **Trace `0ee0a635e5b25b7abe154d9e730c90ab`**: User said "I think the markdown is not rendering the numbers" — numbered lists invisible in chat UI.
- **Trace `dafdb4a5e3bbb0d1a6e12f2466ae1315`**: User asked for dinner options "like 1, 2, 3" — implying list rendering was broken.
- **Root cause confirmed in code**: `@tailwindcss/typography` is NOT in `web/package.json` and not in `tailwind.config.ts` plugins. Tailwind preflight resets `<ol>/<ul>` defaults (removes `list-style-type` and `padding`). The `prose-invert` class used throughout chat components has NO EFFECT without the plugin — numbered/bulleted lists render as unstyled flat text.
- **Trace `d92027fa5543cc5efda81de34f984462`**: Off-topic question ("where is light mode") received ChatGPT instructions — agent has no cooking-topic guardrail.
- **Code bug in `cooking_agent.py:96`**: Multi-turn history path uses base `SYSTEM_PROMPT` constant, ignoring flag addendums (`auto_safety_check_enhanced`, etc.).

## Candidates

| # | Title | Evidence | Impact | Risk | Rank |
|---|-------|----------|--------|------|------|
| 1 | **Fix markdown prose styling for non-recipe responses** | Traces `0ee0a635`, `dafdb4a5` — user-confirmed broken numbered lists. Root cause: `prose-invert` class non-functional without `@tailwindcss/typography`. Affects ALL non-recipe responses (numbered options, follow-up clarifications, substitution lists). | HIGH | LOW | **1** |
| 2 | **Fix multi-turn system prompt: apply flag addendums in history path** | `cooking_agent.py:96` — when `history` is present, uses base `SYSTEM_PROMPT` constant. Safety/dietary flags silently ignored for all multi-turn chats. | MED | LOW | 2 |
| 3 | **Add off-topic guardrail to system prompt** | Trace `d92027fa` — user asked about UI light mode; got ChatGPT instructions. No on-topic rule in SYSTEM_PROMPT. | MED | MED | 3 |

## Decision
**Candidate 1** — Fix markdown prose styling.

User-confirmed complaint in traces, reproducible via code inspection, affects every numbered list and bullet response. Fix requires no new npm packages — just a `components` prop on ReactMarkdown and proper styling. Highest impact / lowest risk.
