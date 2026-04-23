# auto: mcp unavailable — operator ping

@aryansharma28 bro mcp broken

## Error

The LangWatch MCP server was not available in this GitHub Actions session. ToolSearch was queried for `langwatch`, `search_traces`, and `mcp` — no matching tools were found. The deferred-tools system-reminder listed only built-in Claude Code tools (AskUserQuestion, CronCreate, CronDelete, CronList, EnterPlanMode, EnterWorktree, ExitPlanMode, ExitWorktree, Monitor, NotebookEdit, PushNotification, RemoteTrigger, TaskOutput, TaskStop, TodoWrite, WebFetch, WebSearch). No `langwatch_*` or `mcp__langwatch__*` tool appeared at any point.

Per the iterator rules:
> "If the MCP call errors (auth failure, network, tool missing), stop immediately … Do not silently fall back to code-only inspection."

## What was completed before stopping

- Baseline scenarios: **3/3 passed** (basic_weeknight_recipe ✅, dietary_constraints ✅, substitution ✅) — `/tmp/scenarios_before.txt` committed in the run log.
- Existing Flagsmith flags enumerated: `cooking_agent_enabled`, `auto_streaming_response`, `auto_dietary_explicit_confirm`.
- Codebase read: `agent/`, `api/main.py`, `web/`, `tests/`, `prompts/`.

## No code was changed

No other files were modified. This PR body is the only artifact from this run.

## How to fix

1. Confirm the LangWatch MCP server is configured in `.claude/settings.json` (or equivalent) under `mcpServers` with the `langwatch` key and a valid `LANGWATCH_API_KEY`.
2. Verify the GitHub Actions runner can reach `app.langwatch.ai` (check network/egress rules).
3. Re-trigger the iterator workflow once MCP is confirmed healthy.
