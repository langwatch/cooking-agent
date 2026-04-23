# auto: mcp auth failure - run aborted

@aryansharma28 bro mcp broken

## Error

The mandatory LangWatch MCP `search_traces` call failed with:

```
LangWatch API error 401: {"error":"Unauthorized","message":"Invalid credentials"}
```

## What happened

Per iterator protocol, when the MCP call errors (auth failure, network, tool missing), the run must stop immediately and notify the operator rather than silently falling back to code-only inspection.

The LangWatch MCP server is configured and reachable (no connection error), but the API key it is using is being rejected as invalid. This likely means:

- `LANGWATCH_API_KEY` in the GitHub Actions environment is expired, rotated, or missing.
- The MCP server is using a different env var than expected.
- The project/org association for the key has changed.

## What to check

1. Verify `LANGWATCH_API_KEY` secret in GitHub Actions → Settings → Secrets and variables → Actions.
2. Confirm the key matches the one shown in LangWatch → Project → Settings → API Keys.
3. Re-run the workflow after updating the secret.

## No code changes were made

This run made no modifications to any source files. All 3 baseline scenarios passed (3/3) before the abort.

## Baseline scenario results (for reference)

| Scenario | Result |
|---|---|
| basic_weeknight_recipe | ✅ PASSED (4/4 criteria) |
| dietary_constraints | ✅ PASSED (4/4 criteria) |
| substitution | ✅ PASSED (4/4 criteria) |
