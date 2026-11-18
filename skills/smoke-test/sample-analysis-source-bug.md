# Failure Analysis Report (smoke-test input for e2e-test-regression)

## Conclusion Overview

| Cluster | Cases | Classification | Confidence |
| --- | --- | --- | --- |
| 1 | FIT-registry-center-agentcard-001 / FIT-registry-center-agentcard-002 | SOURCE_BUG | Medium |

## Cluster 1 Details

- Cases: FIT-registry-center-agentcard-001 (register a valid Agent successfully), FIT-registry-center-agentcard-002 (duplicate agent name registration returns conflict)
- Test file: `tests/integration/test_agent_register.py`
- Key log: `POST /v1/agents` returns 500 for both a valid payload and a duplicate payload
- Rationale: the API documentation promises 201 for valid registration and 409 for duplicates; the actual uniform 500 does not match the promise
- Evidence: see `skills/smoke-test/sample-failure.log`
- Recommendation: create a GitHub Issue (via github-issue-creator); do not modify the test code

## Verification Command

```bash
uv run pytest tests/integration/test_agent_register.py -q
```
