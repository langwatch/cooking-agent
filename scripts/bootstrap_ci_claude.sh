#!/usr/bin/env bash
# Bootstrap Claude Code + skills + LangWatch MCP for CI.
# Idempotent.

set -euo pipefail

echo "=== installing claude code ==="
npm i -g @anthropic-ai/claude-code@latest

echo "=== installing rogeriochaves/skills ==="
# Not fatal if this fails; iterator can still run without skills.
npx -y skills add rogeriochaves/skills -g || echo "skills install failed; continuing"

echo "=== writing ~/.claude/mcp.json ==="
mkdir -p "$HOME/.claude"
if [ -f .claude/mcp.json ]; then
  cp .claude/mcp.json "$HOME/.claude/mcp.json"
else
  cat > "$HOME/.claude/mcp.json" <<JSON
{
  "mcpServers": {
    "langwatch": {
      "type": "http",
      "url": "https://app.langwatch.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer ${LANGWATCH_API_KEY}"
      }
    }
  }
}
JSON
fi

echo "=== claude version ==="
claude --version || true

echo "=== ready ==="
