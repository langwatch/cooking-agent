#!/usr/bin/env bash
# Bootstrap Claude Code + skills + LangWatch MCP for CI.
# Idempotent.

set -euo pipefail

echo "=== installing claude code ==="
npm i -g @anthropic-ai/claude-code@latest

echo "=== pre-installing @langwatch/mcp-server ==="
# .mcp.json spawns the server via `npx -y @langwatch/mcp-server` (the format
# LangWatch docs prescribe). On a cold CI runner that npx takes ~20s to
# download, which blows past Claude Code's MCP init timeout — the server
# never registers and every tool appears missing. Pre-installing globally
# makes npx resolve the package locally and start in <1s; no config change.
npm i -g @langwatch/mcp-server@latest

echo "=== installing rogeriochaves/skills ==="
# -y on the skills subcommand auto-accepts the "select skills" picker; without
# it CI gets an EOF'd interactive prompt and silently installs zero skills.
npx -y skills add rogeriochaves/skills -g -y || echo "skills install failed; continuing"

echo "=== installing img402/skills (screenshot hosting for UI iterations) ==="
npx -y skills add img402/skills -g -y || echo "img402 skills install failed; continuing"

echo "=== MCP preflight ==="
# Project-scoped MCP lives in .mcp.json at the repo root; Claude Code
# auto-discovers it. Verify langwatch tools actually load before the
# iterator starts — a silent MCP failure wastes the full 40-min budget
# and produces a useless "mcp unavailable" PR.
if [ -z "${LANGWATCH_API_KEY:-}" ]; then
  echo "::error::LANGWATCH_API_KEY is empty; langwatch MCP cannot start. @aryansharma28" >&2
  exit 1
fi
# --mcp-config is required in headless mode: project-scoped .mcp.json normally
# needs an interactive trust prompt that never fires under `claude -p`, so the
# langwatch server silently doesn't load. Explicit --mcp-config bypasses trust.
mcp_probe=$(timeout 90 claude -p "output only 'OK' if you have a tool named mcp__langwatch__search_traces, otherwise output only 'MISSING'" \
  --mcp-config .mcp.json \
  --permission-mode bypassPermissions --output-format text 2>&1 | tail -1)
if [ "$mcp_probe" != "OK" ]; then
  echo "::error::langwatch MCP did not load (probe returned: $mcp_probe). Check .mcp.json and LANGWATCH_API_KEY. @aryansharma28" >&2
  exit 1
fi
echo "langwatch MCP loaded OK"

echo "=== claude version ==="
claude --version || true

echo "=== img402 preflight ==="
# Ping img402 before the iterator needs it. If the host is unreachable
# we fail loud here so the operator gets a GitHub failure email, rather
# than discovering it mid-iteration when a UI screenshot silently
# disappears. A 2xx/3xx/4xx from the free endpoint (even a 4xx for a
# malformed ping) means the host is alive; only network errors fail us.
img402_status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 https://img402.dev/api/free -X POST || echo "000")
if [ "$img402_status" = "000" ]; then
  echo "::error::img402.dev unreachable from CI; UI screenshot uploads will fail. @aryansharma28" >&2
  exit 1
fi
echo "img402 reachable (HTTP $img402_status)"

echo "=== ready ==="
