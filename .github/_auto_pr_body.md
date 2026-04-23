# auto: MCP broken — LangWatch search_traces unavailable

@aryansharma28 bro mcp broken

## Error Details

The iterator halted because the mandatory LangWatch MCP `search_traces` call could not be completed.

**Root cause**: The LangWatch MCP server configured at `https://app.langwatch.ai/api/mcp` returns HTTP 404 for all requests (GET, POST). Additionally, no LangWatch-specific tools (e.g. `search_traces`) appear in the deferred tool registry — `ToolSearch` returned no matches for `langwatch`, `search_traces`, or related queries.

**Attempts made**:
1. `GET https://app.langwatch.ai/api/mcp` — HTTP 404
2. `POST https://app.langwatch.ai/api/mcp` with MCP initialize payload — HTTP 404
3. `ToolSearch` for `langwatch mcp`, `search_traces`, `get_traces` — no tools found
4. Alternative REST paths probed: `/api/traces`, `/api/v1/traces`, `/api/spans`, `/api/annotations`, `/api/evaluations` — all HTTP 404

The `/api/dataset` endpoint returned HTTP 200 with an empty dataset (no data).

**What was NOT done**: No code changes were made. No Flagsmith flags were created. The iterator aborted before Step 2 per the guardrail: "Do not silently fall back to code-only inspection."

## Baseline (for reference)

Scenario tests all passed before the abort:
- `basic_weeknight_recipe` — PASSED (4/4 criteria)
- `dietary_constraints` — PASSED (4/4 criteria)  
- `substitution` — PASSED (4/4 criteria)

## Action needed

Please check:
1. Whether the LangWatch MCP URL has changed (was `https://app.langwatch.ai/api/mcp`)
2. Whether the `LANGWATCH_API_KEY` secret is valid and scoped for MCP access
3. Whether the MCP server needs a different path, auth header, or protocol version

Once MCP is restored, re-trigger the workflow and the iterator will proceed normally.
