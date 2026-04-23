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

echo "=== rendering .mcp.json from template ==="
# Claude Code does not reliably expand ${VAR} inside a committed .mcp.json's
# env block — the MCP subprocess received the literal "${LANGWATCH_API_KEY}"
# string and LangWatch rejected it with 401. Render the template now so the
# real secret is baked into the file Claude reads. .mcp.json is gitignored.
if [ -z "${LANGWATCH_API_KEY:-}" ]; then
  echo "::error::LANGWATCH_API_KEY is empty; langwatch MCP cannot start. @aryansharma28" >&2
  exit 1
fi
: "${LANGWATCH_ENDPOINT:=https://app.langwatch.ai}"
export LANGWATCH_API_KEY LANGWATCH_ENDPOINT
envsubst < .mcp.json.template > .mcp.json
# Sanity-check: template vars must not remain literal in the rendered file.
if grep -q '\${LANGWATCH_' .mcp.json; then
  echo "::error::envsubst left unexpanded \${LANGWATCH_*} in .mcp.json. @aryansharma28" >&2
  exit 1
fi

echo "=== MCP preflight: tool-exists probe ==="
# --mcp-config is required in headless mode: project-scoped .mcp.json normally
# needs an interactive trust prompt that never fires under `claude -p`.
# Tee the probe output to the CI log so `set -euo pipefail` cannot swallow
# a fast-failing `claude` (e.g. startup crash, bad OAuth token) — we need
# to see what claude said before the script aborts.
mcp_probe_log=$(mktemp)
set +e
timeout 90 claude -p "output only 'OK' if you have a tool named mcp__langwatch__search_traces, otherwise output only 'MISSING'" \
  --mcp-config .mcp.json \
  --permission-mode bypassPermissions --output-format text >"$mcp_probe_log" 2>&1
mcp_probe_rc=$?
set -e
echo "--- mcp tool-exists probe output (rc=$mcp_probe_rc) ---"
cat "$mcp_probe_log"
echo "--- end mcp tool-exists probe output ---"
mcp_probe=$(tail -1 "$mcp_probe_log")
if [ "$mcp_probe_rc" -ne 0 ] || [ "$mcp_probe" != "OK" ]; then
  echo "::error::langwatch MCP did not load (rc=$mcp_probe_rc, last line: $mcp_probe). Check .mcp.json and LANGWATCH_API_KEY. @aryansharma28" >&2
  exit 1
fi
echo "langwatch MCP loaded OK"

echo "=== MCP preflight: real auth probe ==="
# Existence-only probe doesn't catch 401s — the iterator wasted 5+ min and
# opened an abort-PR before we knew auth was broken. Actually invoke
# search_traces so LangWatch validates the key during bootstrap.
auth_probe_log=$(mktemp)
set +e
timeout 120 claude -p "Invoke the mcp__langwatch__search_traces tool with arguments {\"startDate\":\"2024-01-01T00:00:00Z\",\"endDate\":\"2024-01-01T00:01:00Z\",\"pageSize\":1}. After the tool returns, output ONLY one line: 'AUTH_OK' if the tool call succeeded (empty result is fine), or 'AUTH_FAIL: <first 120 chars of the error text>' if it returned any error." \
  --mcp-config .mcp.json \
  --permission-mode bypassPermissions --output-format text >"$auth_probe_log" 2>&1
auth_probe_rc=$?
set -e
echo "--- mcp auth probe output (rc=$auth_probe_rc) ---"
cat "$auth_probe_log"
echo "--- end mcp auth probe output ---"
auth_last=$(tail -5 "$auth_probe_log")
if [ "$auth_probe_rc" -ne 0 ] || ! echo "$auth_last" | grep -q "AUTH_OK"; then
  echo "::error::langwatch MCP auth probe failed (rc=$auth_probe_rc). Tail: $auth_last" >&2
  exit 1
fi
echo "langwatch MCP auth OK"

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
