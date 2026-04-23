# auto: fix markdown prose styling for non-recipe chat responses

## Why

Two real user traces confirm that numbered lists and bullet points are invisible in the chat UI:
- Trace `0ee0a635e5b25b7abe154d9e730c90ab`: User said "I think the markdown is not rendering the numbers" after receiving a numbered dinner-options list.
- Trace `dafdb4a5e3bbb0d1a6e12f2466ae1315`: User asked the agent to format options "like 1, 2, 3" — implying current list rendering was broken.

Root cause: `@tailwindcss/typography` is not installed and not in `tailwind.config.ts` plugins. Tailwind's preflight CSS resets `<ol>/<ul>` defaults — it strips `list-style-type` and `padding-left` from all list elements. The `prose-invert` class used throughout the chat components has **no effect** without the typography plugin, so every numbered list and bullet the agent produces renders as flat, unstyled text with no visible markers.

This affects every non-recipe response: numbered dinner options, clarifying-question lists, substitution bullet points, multi-turn follow-ups.

## What

- `web/components/markdown-renderer.tsx` *(new)*: Shared `MarkdownRenderer` component wrapping `react-markdown` with a `components` prop that applies explicit Tailwind utility classes (`list-decimal pl-5`, `list-disc pl-5`, `leading-relaxed`, etc.) when `proseEnabled` is true. Falls back to unstyled rendering when flag is off, preserving current behavior exactly.
- `api/main.py`: Added `markdown_prose_styling` key to `/flags` response, reading the `auto_markdown_prose_styling` Flagsmith flag (default off).
- `web/components/chat.tsx`: Replaced direct `ReactMarkdown` usage in bubble-layout and column-layout paths with `MarkdownRenderer`; reads new `markdown_prose_styling` flag and passes `proseEnabled` down.
- `web/components/recipe-card.tsx`: Updated fallback (non-recipe) rendering path to use `MarkdownRenderer` with `proseEnabled` prop instead of direct `ReactMarkdown`.

No new npm packages — uses only the already-installed `react-markdown`'s `components` prop.

## Flag

- `auto_markdown_prose_styling` — default **off**. Enable in Flagsmith "cooking" project → Development to activate. When off, markdown renders as before (no visible change to existing behavior).

## Eval delta

| Scenario | Before | After |
|---|---|---|
| basic_weeknight_recipe | ✅ 4/4 | ✅ 4/4 |
| dietary_constraints | ✅ 4/4 | ✅ 4/4 |
| safety_warning | ✅ 4/4 | ✅ 4/4 |
| substitution | ✅ 4/4 | ✅ 4/4 |
| multimodal_image | ⏭️ skipped | ⏭️ skipped |

No regressions. No scenarios were modified.

## How to test

```bash
git checkout auto/improve-20260423-134743
pip install -e ".[dev]"

# Start backend
uvicorn api.main:app --port 8000

# Start frontend
cd web && npm install && npm run dev

# Enable flag in Flagsmith: auto_markdown_prose_styling → ON
# Open http://localhost:3000 and ask: "decide my dinner tonight"
# The agent will ask clarifying questions with numbered/bulleted lists
# → With flag ON: numbers and bullets are visible
# → With flag OFF: flat unstyled text (current broken behavior)

# Run scenarios (no backend flag change needed — pure frontend fix)
pytest -v tests/ -m agent_test
```

## Rollback

Flip `auto_markdown_prose_styling` off in Flagsmith. No code revert needed — the entire styled path is a conditional branch off the flag.

## Follow-ups

- Candidate 2: Fix multi-turn system prompt — `cooking_agent.py:96` uses base `SYSTEM_PROMPT` in the history path, silently dropping flag addendums (`auto_safety_check_enhanced`, etc.) for all multi-turn chats.
- Candidate 3: Add off-topic guardrail — trace `d92027fa` shows the agent answering questions about "light mode in this website" with ChatGPT instructions; the system prompt has no stay-on-topic rule.
