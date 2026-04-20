# Self-Improving Cooking Agent — Plan (v2: Multi-Agent Edition)

A **multi-agent cooking system** instrumented with **LangWatch**, gated by **Flagsmith**, that rewrites its own prompts AND its own scenarios via a GitHub Actions loop and opens PRs for human review. Ships with a premium web UI.

Philosophy: **cheap models do most of the work; expensive models arbitrate, critique, and self-improve.** Every agent is a flag-gated, swappable node.

**Rollout**: start M1 with **1 agent + 1 scenario** end-to-end (Recipe Generator + basic_weeknight_recipe), prove the loop works, then expand to the full 17-agent mesh in later milestones. Each new agent is added only when traces justify it.

**Multimodal**: Recipe Generator accepts optional image input (fridge photo / dish reference / handwritten recipe card) via Gemini 1.5 Flash (free tier) or GPT-4o vision. Flag-gated: `multimodal_enabled` + `multimodal_provider` (gemini/openai).

---

## 1. Goals

1. Multi-agent cooking system that produces best-in-class recipes, meal plans, substitutions, shopping lists.
2. **Self-improving prompts** — loop pulls traces, rewrites prompts, opens PR.
3. **Self-improving scenarios** — loop also drafts *new* scenarios from real failure modes, not just re-running static ones.
4. Everything flag-gated: models, agents enabled/disabled, prompt versions, loop kill-switches, UI panels.
5. A polished UI that makes all of this visible and operable.

## 2. The agent mesh

All agents are LangWatch-traced. Each has a flag for model tier (cheap/mid/premium) and an on/off flag.

### Execution agents (handle user request)

| # | Agent | Default model | Role |
|---|---|---|---|
| 1 | **Router** | gpt-4o-mini | Classifies intent (recipe / plan / sub / shopping / chat) and routes to downstream agents |
| 2 | **Recipe Generator** | claude-sonnet-4-6 | Drafts recipes (premium tier — user-facing quality) |
| 3 | **Dietary Guardrail** | haiku-4.5 | Checks recipe vs user constraints (vegan, allergens, kosher, halal) — fast |
| 4 | **Nutrition Analyst** | gpt-4o-mini | Estimates macros/calories per serving, flags concerns |
| 5 | **Substitution Expert** | haiku-4.5 | Missing-ingredient swaps with ratios |
| 6 | **Shopping Planner** | gpt-4o-mini | Aggregates ingredients into a shopping list, dedupes, groups by aisle |
| 7 | **Meal Planner** | claude-sonnet-4-6 | Multi-day plans balancing variety + nutrition + budget |
| 8 | **Cuisine Stylist** | claude-sonnet-4-6 | Rewrites tone/authenticity for requested cuisine |
| 9 | **Critic** | claude-opus-4-7 | Reads final answer; scores clarity / feasibility / authenticity 0–10; can request revision (max 1 loop) |
| 10 | **Explainer** | haiku-4.5 | Converts critic revisions into user-friendly "why I changed this" notes |

### Self-improvement agents (run in GH Action)

| # | Agent | Default model | Role |
|---|---|---|---|
| 11 | **Trace Miner** | gpt-4o-mini | Pulls LangWatch traces, filters to candidates (thumbs-down, low critic scores, errors) |
| 12 | **Failure Clusterer** | gpt-4o-mini | Groups failures into themes with representative examples |
| 13 | **Prompt Rewriter** | claude-opus-4-7 | For each failing agent, drafts a new prompt addressing cluster themes |
| 14 | **Scenario Synthesizer** | claude-opus-4-7 | Writes NEW scenarios from unseen failure modes |
| 15 | **Scenario Critic** | gpt-4o-mini | Reviews synthesized scenarios for triviality/duplication/ambiguity; rejects weak ones |
| 16 | **Eval Judge** | claude-opus-4-7 | LLM-as-judge for scenario runs when rule-based check isn't enough |
| 17 | **PR Author** | claude-sonnet-4-6 | Writes PR body: rationale, eval tables, trace links, risk notes |

That's **17 agents**. Every one is its own module, with its own prompt file, its own flag for enable/disable and model tier.

## 3. Cost/quality routing

`agent/models.py` defines three tiers; each agent's Flagsmith flag picks a tier:

```
free:    gemini-1.5-flash | gemini-2.0-flash     ($0 — free tier, multimodal)
cheap:   haiku-4.5        | gpt-4o-mini          (<$0.001/1k)
mid:     claude-sonnet-4-6 | gpt-4o              (~$0.003–0.015/1k)
premium: claude-opus-4-7  | o1                   (expensive, slow)
```

Defaults biased to **cheap** for high-volume nodes (router, guardrail, miner), **premium** for arbitration (critic, rewriter, judge). Flags let you upgrade any agent live.

## 4. Flagsmith flags (~30 flags, all created via MCP at bootstrap)

**Master**: `cooking_system_enabled`, `auto_improvement_enabled`, `scenario_gate_enabled`, `scenario_synthesis_enabled`

**Per-agent (×17)**: `agent_<name>_enabled` (bool) + `agent_<name>_tier` (cheap/mid/premium)

**Routing**: `router_fallback_agent`, `critic_revision_max_loops`, `prompt_version` (baseline/candidate) — per execution agent

**UI**: `ui_show_traces`, `ui_show_improvements`, `ui_show_agent_graph`, `ui_show_cost_panel`

Centralized in `agent/flags.py` with a typed `Flags` dataclass so the IDE autocompletes every flag name.

## 5. Repo layout

```
.
├── agent/
│   ├── agents/                 # one file per agent
│   │   ├── router.py
│   │   ├── recipe_generator.py
│   │   ├── dietary_guardrail.py
│   │   ├── nutrition_analyst.py
│   │   ├── substitution_expert.py
│   │   ├── shopping_planner.py
│   │   ├── meal_planner.py
│   │   ├── cuisine_stylist.py
│   │   ├── critic.py
│   │   └── explainer.py
│   ├── prompts/                # markdown, one file per agent
│   │   ├── baseline/
│   │   └── candidate/          # written by rewriter; merged on PR
│   ├── models.py               # tier → provider+model map
│   ├── flags.py                # typed Flagsmith wrapper
│   ├── orchestrator.py         # run() — calls agents in order per intent
│   ├── telemetry.py            # LangWatch decorators, cost tracker
│   └── server.py               # FastAPI: /chat (SSE), /flags, /traces, /cost, /graph
├── improvement/
│   ├── pipeline.py             # end-to-end run
│   ├── miner.py
│   ├── clusterer.py
│   ├── rewriter.py
│   ├── scenario_synth.py
│   ├── scenario_critic.py
│   ├── judge.py
│   └── open_pr.py
├── scenarios/
│   ├── seeds/                  # hand-written starting scenarios
│   ├── synthesized/            # generated; reviewed before merge
│   ├── runner.py
│   └── conftest.py
├── ui/                         # Next.js 15 + shadcn/ui + Tailwind + tRPC
│   ├── app/
│   │   ├── page.tsx            # Chat
│   │   ├── flags/page.tsx
│   │   ├── traces/page.tsx
│   │   ├── improvements/page.tsx
│   │   ├── agents/page.tsx     # live agent graph + costs
│   │   └── scenarios/page.tsx  # browse + approve synthesized scenarios
│   └── lib/
├── .github/workflows/
│   ├── improve-agent.yml
│   ├── synthesize-scenarios.yml
│   └── scenarios-ci.yml
├── Makefile
├── pyproject.toml
├── ui/package.json
└── plan.md
```

## 6. Self-improvement pipeline (`improve-agent.yml`, workflow_dispatch)

```
[0] guard: auto_improvement_enabled ?
[1] Trace Miner      → candidates.jsonl
[2] Failure Clusterer → clusters.json (theme, severity, examples)
[3] FOR each failing agent in clusters:
       Prompt Rewriter → prompts/candidate/<agent>.md + rationale.md
[4] Scenario Synthesizer → scenarios/synthesized/*.py (covers unseen modes)
[5] Scenario Critic → drops weak ones
[6] Runner → eval table {scenario, agent, baseline, candidate} via Eval Judge
[7] Gate (if scenario_gate_enabled): candidate must non-regress on existing + pass ≥80% of new
[8] PR Author → opens PR with:
       - per-agent prompt diffs
       - new scenario files
       - eval table + worst-trace links
       - risk/rollback notes
       - flag flip checklist for staging
```

Separate `synthesize-scenarios.yml` runs weekly to grow the scenario corpus even without prompt changes.

## 7. Seed scenarios (~10 to start, then auto-grown)

- basic_weeknight_recipe
- vegan_glutenfree_nutfree_dinner
- out_of_buttermilk_substitution
- hallucination_probe (nonexistent ingredient)
- six_cuisine_authenticity
- budget_7day_meal_plan (<$50)
- high_protein_lowcarb_plan
- shopping_list_dedupe_across_recipes
- allergen_guardrail_red_team (tries to smuggle peanuts)
- nutrition_sanity (flag absurd macro claims)

## 8. UI — "goated" scope

**Stack**: Next.js 15 app router, shadcn/ui, Tailwind, tRPC, TanStack Query, Framer Motion micro-animations, dark default.

**Pages**:
1. **Chat** — streaming SSE, shows live agent-graph sidebar lighting up per step, per-message cost badge, thumbs wired to LangWatch annotation.
2. **Agents** — interactive graph (react-flow), click any node to see its prompt, current tier flag, latency p50/p95, cost per call.
3. **Flags** — all ~30 flags grouped + searchable; toggle/select with optimistic UI; diff log.
4. **Traces** — search/list, drill-down with span tree, tool calls, tokens, cost, critic score.
5. **Improvements** — open PRs from loop, embedded diff, eval delta table, "promote candidate for me only" button (sets `prompt_version=candidate` for a user-segment flag).
6. **Scenarios** — seed vs synthesized, approve / reject synthesized; run-on-demand button.

Each panel flag-gated via `ui_*` flags.

## 9. Milestones

1. **M1 Skeleton** — repo, FastAPI, one agent (recipe generator), LangWatch trace, Flagsmith client.
2. **M2 Flag bootstrap** — create all ~30 flags via MCP; typed wrapper.
3. **M3 Full mesh** — all 10 execution agents + orchestrator + critic loop.
4. **M4 UI shell** — chat + flags + agent graph pages.
5. **M5 Seed scenarios** — 10 scenarios, runnable locally + CI.
6. **M6 Improvement loop** — all 7 improvement agents, GH Action end-to-end, first PR.
7. **M7 Scenario synthesis loop** — weekly workflow, scenarios page in UI.
8. **M8 Traces + Improvements UI** — last two pages, cost panel.
9. **M9 Browser-QA pass** — smoke the whole thing end-to-end via `browser-qa` skill.
10. **M10 Polish** — README with GIF, demo script, rotate keys.

## 10. Risks / open items

- **OpenAI key**: not in `.env` yet. Please add `OPENAI_API_KEY=...`.
- **Key exposure**: Flagsmith + LangWatch keys leaked into chat. Rotate post-launch.
- **PR automation**: needs a `GH_PAT` (or GH App) with `contents:write` + `pull_requests:write`.
- **Flagsmith target**: which project/env? Default proposal: create project `cooking-agent`, env `development`.
- **LangWatch target**: which project? Default: `cooking-agent`.
- **Cost ceiling**: improvement loop uses opus for rewriter+judge — a single run may cost $1–3. Worth setting a monthly cap via flag (`improvement_monthly_usd_cap`).
- **Flakiness**: LLM-as-judge scenarios can be noisy; we run each scenario N=3 and take median. Flag: `scenario_sample_count`.

## 11. What I need from you to start M1

1. Confirm this v2 plan (or edits).
2. Add `OPENAI_API_KEY` to `.env`.
3. Install `browser-qa` skill (`npx skills add rogeriochaves/skills -g`) or grant `/chrome`.
4. Flagsmith project/env name — or let me create `cooking-agent` / `development`.
5. LangWatch project slug — or let me create `cooking-agent`.
6. Want me to set up the GH remote now too (repo name)? Or keep local until M1 done?
