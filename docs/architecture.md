# Architecture (v0.3)

## Runtime flow — a user asks for a recipe

```mermaid
sequenceDiagram
    actor User
    participant Web as web/ (Next.js 15)
    participant API as api/ (FastAPI)
    participant Agent as CookingAgent (Agno)
    participant OpenAI
    participant Flagsmith
    participant LangWatch

    User->>Web: Types a recipe question
    Web->>API: POST /chat { message, tier }
    API->>Flagsmith: load flags (cooking_agent_enabled?)
    Flagsmith-->>API: flag state
    alt flag OFF
        API-->>Web: 503 "flag is OFF"
    else flag ON
        API->>Agent: agent.chat(message)
        Agent->>OpenAI: chat completion (gpt-5-mid)
        OpenAI-->>Agent: reply
        Agent-->>API: markdown reply
        par telemetry
            Agent-->>LangWatch: trace span (cooking_agent.chat)
        end
        API-->>Web: { reply }
        Web-->>User: renders markdown
    end
```

## Component map

```mermaid
flowchart LR
    subgraph Frontend["web/ — Next.js 15 + TS + Tailwind"]
        Page["app/page.tsx"]
        Chat["components/chat.tsx"]
    end

    subgraph Backend["api/ — FastAPI"]
        Main["api/main.py<br/>POST /chat, GET /health"]
    end

    subgraph Agent["agent/ — Agno-based"]
        CA["CookingAgent<br/>(cooking_agent.py)"]
        Flags["flags.py<br/>Flagsmith client"]
        Tele["telemetry.py<br/>LangWatch + OTEL"]
        Models["models.py<br/>tier → model id"]
    end

    subgraph External["External services"]
        FS["Flagsmith<br/>(feature flags)"]
        LW["LangWatch<br/>(traces / evals)"]
        OAI["OpenAI"]
    end

    Page --> Chat
    Chat -- "fetch /chat" --> Main
    Main --> CA
    Main --> Flags
    CA --> Models
    CA --> OAI
    Flags <--> FS
    Tele --> LW
    CA -.emits spans.-> Tele
```

## Self-improvement loop (CI)

```mermaid
flowchart TB
    Op["Operator<br/>(you)"] -- "workflow_dispatch<br/>(optional FOCUS hint)" --> GHA
    GHA["GitHub Actions<br/>.github/workflows/improve.yml"]
    GHA --> Boot["bootstrap_ci_claude.sh<br/>install claude-code + skills + MCP"]
    Boot --> Claude["Claude Code (Sonnet 4.5)<br/>running prompts/iterator.md"]
    Claude -- "read traces / analytics" --> LW2["LangWatch MCP"]
    Claude -- "create flag (default OFF)" --> FS2["Flagsmith REST"]
    Claude -- "edit prompts / tests / agent / web / api" --> Repo[("repo")]
    Claude -- "browser-qa skill" --> LocalUI["local web + api"]
    Repo --> PR["PR opened on GitHub<br/>(flag-gated change)"]
    PR --> Human["Human review + merge"]
    Human -- "flip flag ON in Flagsmith" --> FS2
    FS2 -- "new behavior exposed" --> Prod["running app"]
```

## What lives where

| Path | Purpose |
|---|---|
| `agent/cooking_agent.py` | Core Agno agent + system prompt |
| `agent/models.py` | Model tier → model id map (cheap / mid / premium) |
| `agent/flags.py` | Flagsmith client + typed `Flags` dataclass |
| `agent/telemetry.py` | LangWatch + OpenInference Agno instrumentor |
| `agent/__main__.py` | `python -m agent chat "…"` CLI entrypoint |
| `api/main.py` | FastAPI backend — the UI's only contact with the agent |
| `web/app/` | Next.js App Router pages + global styles |
| `web/components/chat.tsx` | Chat UI (markdown render, tier selector, error states) |
| `tests/` | langwatch-scenario agent tests (pytest `-m agent_test`) |
| `prompts/iterator.md` | The self-improvement prompt Claude Code executes in CI |
| `.github/workflows/improve.yml` | Workflow_dispatch trigger for the iterator |
| `.github/workflows/scenarios.yml` | Per-PR scenario evaluation gate |
| `scripts/bootstrap_ci_claude.sh` | Idempotent CI bootstrap for Claude Code + MCP |

## How to run locally

```bash
pip install -e ".[dev]"
make api                         # terminal 1 — FastAPI on :8000
cd web && npm install && npm run dev   # terminal 2 — Next.js on :3000
open http://localhost:3000
```

Secrets expected (in `.env` or shell):
- `OPENAI_API_KEY`
- `LANGWATCH_API_KEY`
- `FLAGSMITH_ENVIRONMENT_KEY`

Secrets expected in GitHub Actions (for the iterator):
- `CLAUDE_CODE_OAUTH_TOKEN` (Max subscription, no API billing)
- `FLAGSMITH_API_TOKEN` (management / admin token)
- same three as above
