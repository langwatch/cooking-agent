# cooking-agent

langwatch x flagsmith — a self-improving cooking agent.

## v0.1

Single Agno agent on OpenAI (`gpt-5-mini` by default), LangWatch-traced, gated by one Flagsmith flag, with three seed scenarios.

```bash
cp .env.example .env   # fill in keys
pip install -e ".[dev]"
python -m agent chat "give me a 30-minute weeknight pasta for two"
make test
```

### Flags (v0.1)
| Flag | Default | Purpose |
|---|---|---|
| `cooking_agent_enabled` | on | Kill-switch for the agent |

### Scenarios (v0.1)
- `basic_weeknight_recipe`
- `dietary_constraints`
- `substitution`

### Model tiers
| Tier | Model |
|---|---|
| cheap | `gpt-5-nano` |
| mid (default) | `gpt-5-mini` |
| premium | `gpt-5` |

---

Versioning follows classic SWE: every new capability lands in its own PR with its own Flagsmith flag. See `plan.md` for the roadmap.

## Self-improvement loop (v0.2+)

One click = one PR. The `improve` workflow runs Claude Code (Sonnet 4.5) headlessly in CI with full repo access, the LangWatch MCP, the `browser-qa` skill, and the Flagsmith admin API. It reads traces + scenario results + current code, picks the single highest-impact improvement, implements it behind a new Flagsmith flag (default off), and opens a PR for your review.

```bash
# Trigger from CLI...
gh workflow run improve.yml --repo langwatch/cooking-agent

# ...or click "Run workflow" in the GH Actions UI.
gh run watch
```

Required secrets: `ANTHROPIC_API_KEY`, `FLAGSMITH_API_TOKEN`, plus the ones already used by `scenarios.yml`.

The iterator's prompt lives at `prompts/iterator.md` — edit it to change the loop's behavior.

