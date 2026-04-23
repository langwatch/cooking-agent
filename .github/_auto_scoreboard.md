# Candidate Scoreboard

## Evidence
- `test_dietary_constraints` FAILS (1/3 scenarios failing = 33% failure rate)
- Failure reason: agent lists `"Gluten-free tamari → Soy sauce (not gluten-free), 1:1"` in substitutions section, violating criterion 2 ("Response contains no gluten-bearing ingredients")
- 40+ LangWatch traces show vegan/GF/nut-free recipe requests — substitution suggestions appear in many responses
- Root cause: system prompt's substitution instruction (`"give at least two, each with a ratio and a note"`) has no dietary constraint guardrail

## Candidates

| # | Title | Evidence | Impact | Risk | Rank |
|---|-------|----------|--------|------|------|
| 1 | **Prompt: dietary-safe substitutions** — add one sentence to the substitutions rule preventing gluten/allergen options from being suggested to users with stated restrictions | Failing scenario, clear root cause in system prompt line 20 | High | Low | **1st** |
| 2 | **Prompt: explicit multi-constraint acknowledgment** — instruct the agent to open every response with a "Dietary note" header confirming which constraints are honored | Scenario criterion 4 sometimes borderline; trace pattern shows users listing constraints | Med | Low | 2nd |
| 3 | **Agent code: dietary constraint post-filter** — add a post-processing step in `CookingAgent.chat()` to strip any line from the response that contains a known allergen when user message declares that restriction | Same scenario failure | Med | Med | 3rd |

## Decision

**Candidate 1** — targeting the system prompt is the smallest, most direct fix. The constraint violation happens in the substitution section and the LLM will follow an explicit instruction not to suggest constraint-violating options. Low blast radius; easily rolled back via flag. Candidates 2 and 3 are follow-ups for future runs.
