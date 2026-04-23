# cooking-agent

**LangWatch × Flagsmith** — a cooking-assistant chatbot that **rewrites itself**. Every improvement lands as a PR, gated by a Flagsmith flag, so you can flip new behaviors on/off in real time without a deploy.

- **Live app:** https://cooking-agent-five.vercel.app
- **Backend:** https://cooking-agent.onrender.com (FastAPI on Render)
- **Traces:** https://app.langwatch.ai (project "cooking")
- **Flags:** https://app.flagsmith.com → org *Langwatch* → project *cooking*

---

## What it actually is

Three things stacked together:

1. **A conversational cooking agent** (Python / Agno / OpenAI) — answers recipe, substitution, dietary, and meal-plan questions.
2. **A Next.js chat UI** — the thing users see at the live URL above.
3. **A CI self-improvement loop** — a GitHub Action that runs Claude Code headlessly, pulls real production traces from LangWatch, picks the single highest-impact improvement, implements it behind a new Flagsmith flag (default **off**), and opens a PR.

Every capability — UI polish, new prompts, new agents, bug fixes — ships behind its own flag. You flip the flag in Flagsmith to activate or roll back. No redeploy.

---

## Architecture at a glance

```
 ┌─────────────────┐     POST /chat     ┌───────────────────┐     OpenAI
 │ Next.js (Vercel)│ ─────────────────► │ FastAPI (Render)  │ ───► gpt-5-*
 │ web/            │ ◄───────────────── │ api/main.py       │
 └─────────────────┘     GET  /flags    └──────┬────────────┘
                                               │
                                      reads ───┤
                                               │
                                      ┌────────▼────────┐       ┌────────────┐
                                      │ agent/flags.py  │ ────► │  Flagsmith │
                                      │ agent/…         │       └────────────┘
                                      └────────┬────────┘
                                               │ traces
                                               ▼
                                       ┌───────────────┐
                                       │   LangWatch   │
                                       └───────────────┘
```

Full diagrams in `docs/architecture.md`. Product plan (target end-state: 17-agent mesh) in `plan.md`.

| Piece | Path | Purpose |
|---|---|---|
| Frontend | `web/` | Next.js 15 + Tailwind chat UI |
| API | `api/main.py` | FastAPI — `POST /chat`, `GET /flags`, `GET /health` |
| Agent | `agent/cooking_agent.py` | Agno agent + prompt; tier picks model |
| Flags | `agent/flags.py` | Flagsmith client; `is_on()` / `value()` + safe defaults |
| Telemetry | `agent/telemetry.py` | LangWatch / OTEL setup |
| Scenarios | `tests/test_*.py` | pytest-backed scenarios (run as the eval harness in CI) |
| Iterator | `prompts/iterator.md` + `.github/workflows/improve.yml` | the self-improvement loop |

---

## Quickstart (local)

```bash
cp .env.example .env          # fill in keys — see "Flagsmith keys" below
pip install -e ".[dev]"       # Python deps

# one-shot CLI
python -m agent chat "give me a 30-minute weeknight pasta for two"

# full stack
uvicorn api.main:app --reload --port 8000    # terminal 1
cd web && npm install && npm run dev         # terminal 2 → http://localhost:3000

# run the evals
make test
```

### Required env vars

```
OPENAI_API_KEY=sk-...
LANGWATCH_API_KEY=sk-lw-...
FLAGSMITH_ENVIRONMENT_KEY=...        # see next section — this is NOT the admin token
```

For the web app in local dev, set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `web/.env.local` (defaults to `http://localhost:8000` already).

---

## Flagsmith keys — don't confuse them

Two different keys, both live under the word "Flagsmith" and it's an easy footgun that bit us once:

| Env var | What it is | Where to get it | Used by |
|---|---|---|---|
| `FLAGSMITH_ENVIRONMENT_KEY` | **Environment SDK key** — short random string (e.g. `giyCqfv7kHmWKmKzbVkC7K`). Read-only, scoped to one environment, safe to ship to clients. | app.flagsmith.com → project → environment → **SDK Keys** | Python backend (`agent/flags.py`) to read flag state at runtime |
| `FLAGSMITH_API_TOKEN` | **Personal admin API token** — 40-char hex. Can manage flags org-wide. Keep secret. | app.flagsmith.com → **Account Settings → Keys** | The CI self-improvement loop, and any admin API calls |

If the backend `/flags` endpoint keeps returning defaults (all `false`) even after toggling flags in the UI, the deployed `FLAGSMITH_ENVIRONMENT_KEY` is almost certainly set to the admin token by mistake — the Python SDK silently falls back to defaults when the key is wrong.

---

## Current flags

All `auto_*` flags were created by the self-improvement loop and default **off** at birth. `cooking_agent_enabled` is the kill-switch and defaults **on**.

| Flag | Purpose | Surface |
|---|---|---|
| `cooking_agent_enabled` | Kill-switch — flip off to disable `/chat` | backend |
| `auto_dietary_pref_chips` | Dietary chip row (🌱 Vegan / 🌾 GF / 🥜 Nut-Free / 🥛 Dairy-Free) above the input | UI |
| `auto_chat_bubble_layout` | Directional message bubbles — user right (orange), assistant left (card) | UI |
| `auto_starter_prompts` | Clickable example prompts on the empty chat state | UI |
| `auto_streaming_response` | Stream tokens via SSE for lower perceived latency | UI + backend |
| `auto_premium_ui` | Full premium UI overhaul (interactive recipe cards, layout polish) | UI |
| `auto_conversation_history` | Pass prior turns to the agent so follow-ups have context | backend |
| `auto_dietary_explicit_confirm` | Force an explicit dietary-summary block in replies | prompt |
| `auto_dietary_safe_substitutions` | Constrain substitutions to the user's dietary restrictions | prompt |
| `auto_safety_check_enhanced` | Bold "Safety note" header on unsafe-request replies | prompt |
| `auto_consistent_ingredient_quantities` | Enforce consistent cross-unit measurements in recipes | prompt |

Any flag can be read from code with `flags.is_on("flag_name", default=False)` or `flags.value("flag_name", default=...)` for non-boolean values.

---

## How to toggle a flag in the Flagsmith UI

1. https://app.flagsmith.com → org **Langwatch** → project **cooking**.
2. Pick the environment: **Production** (what the live site reads) or **Development**.
3. **Features** tab → find the flag (use the search bar) → click the row.
4. Drawer on the right has an **Enabled** toggle. Flip it, then **Update Feature**.

Edge CDN propagation takes ~30–60s. No redeploy needed — the Python SDK refreshes on its own.

Want to verify it landed on the backend? `curl https://cooking-agent.onrender.com/flags` shows what the backend is currently seeing. Keys in that response map 1:1 to the `auto_*` flags routed through the API.

---

## Scenarios (eval harness)

The scenarios in `tests/` run on every PR via `.github/workflows/scenarios.yml` and act as the pass/fail gate.

- `basic_weeknight_recipe`
- `dietary_constraints`
- `substitution`
- `safety_warning`

---

## Model tiers

The frontend has a dropdown for this; the API accepts `tier` on `POST /chat`.

| Tier | Model |
|---|---|
| cheap | `gpt-5-nano` |
| mid (default) | `gpt-5-mini` |
| premium | `gpt-5` |

---

## The self-improvement loop

One click = one PR. The `improve` workflow runs **Claude Code (Sonnet 4.6)** headlessly in CI with full repo access, the LangWatch MCP (reads real traces), the `browser-qa` skill (screenshots UI before/after), and the Flagsmith admin API (creates flags). It:

1. Pulls recent production traces + scenario results.
2. Writes a **scoreboard** of 3+ candidate improvements across UX / prompt / agent / eval.
3. Picks the single highest-impact one.
4. Creates a new Flagsmith flag `auto_<slug>` (default **off**).
5. Implements the change gated behind that flag.
6. Runs the scenarios, captures before/after screenshots, opens a PR.

```bash
# trigger from CLI…
gh workflow run improve.yml

#  …with an optional focus hint:
gh workflow run improve.yml -f focus="visual polish of the chat UI"

# or click "Run workflow" in the GH Actions UI, then
gh run watch
```

End-to-end takes ~10–25 min. The iterator's prompt is `prompts/iterator.md` — edit it to change the loop's behavior.

Required CI secrets: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LANGWATCH_API_KEY`, `FLAGSMITH_ENVIRONMENT_KEY`, `FLAGSMITH_API_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`.

### Typical review flow

1. Read the PR body (what changed + why, with the flag name and a rollback line).
2. Check the before/after screenshots embedded in the PR.
3. Merge the PR (the flag ships OFF, so nothing visible changes yet).
4. Flip `auto_<slug>` to ON in Flagsmith **Development** → test.
5. Flip it ON in **Production** when you're happy.
6. If it misbehaves in prod: flip the flag OFF. No code revert needed.

---

## Versioning

Every new capability lands in its own PR behind its own Flagsmith flag. `plan.md` has the roadmap toward a full multi-agent mesh (router + dietary guardrail + nutrition analyst + critic + …).
