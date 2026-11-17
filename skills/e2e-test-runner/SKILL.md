---
name: e2e-test-runner
description: Configure and actually execute the tests of an openAN target repository (Python pytest/Java Maven/JS Vitest and Playwright/Shell bats), running the full four phases of pre-check, preparation, execution, and cleanup; stream logs in real time, report the first failure immediately, and output structured results consumable by e2e-failure-analyzer
---

# e2e-test-runner

## Trigger Conditions

The user asks to run the tests of an openAN repository, execute generated test code, or runs /e2e-test-runner.

## Four-Phase Process

### 1. Pre-check

Check the toolchain according to the target repository's language (abort and report installation guidance if anything is missing):

| Language | Checks |
| --- | --- |
| Python | `uv`, `pyproject.toml` present |
| Java | `java -version` (17+), `mvn -v` |
| JS | `node -v` (20+), dependencies installed via `npm ci` |
| Shell | `bats --version`, `shellcheck`, `shfmt`; for Docker scenarios also check `docker info` |

### 2. Preparation

- Follow the repository-root `e2e/.env.template` as the baseline (test-plan §6.4) and confirm required environment variables are injected (service addresses, tokens, etc.); any new environment variables introduced by this plan must be synced to `e2e/.env.template` and documented in the README
- **General requirements**: never commit `.env` to git (`.env` must be added to `.gitignore`); never hardcode secrets or intranet addresses in code, configuration, or documentation (testcases-template-fields.md Quality Requirements)
- When the e2e layer needs the service under test running first, prefer the repository's own `docker-compose.yml`; perform a health check after startup (retry ≤ 30 times, 2s interval)

### 3. Execution

- Commands are dispatched by language (see the run-command section of `skills/e2e-test-code-gen/references/<lang>.md`)
- Stream logs in real time; **output the failure context of the first failure verbatim immediately** (case name, assertion, last 50 log lines), without waiting for the whole run to finish
- Support `--grep <caseId>`-level filtered execution

### Local Self-Check (Fast Subset)

- Python: `uv run pytest e2e/<feature>/ -m "not slow"` (local fast subset, excluding slow cases; or `-m smoke` to run only PR-gate cases)
- Full run: `uv run pytest e2e/<feature>/ -q` (no marker filter); filter by execution tiers: `-m smoke` / `-m full` / `-m slow` (corresponding to §3.4 tiers smoke(PR gate) / full(Daily) / slow(long-stability))
- For Java / JS / Shell run commands, refer to the run-command section of `skills/e2e-test-code-gen/references/<lang>.md`

### 4. Cleanup

- Stop services and containers started by this runner (only clean up what it started itself; do not touch the user's existing environment)
- Archive artifacts to `<repo>/.test-output/<timestamp>/`: JUnit XML, Playwright report, coverage files
- Archive test reports by version to `<repo>/docs/reports/<version>/` (test-plan §11; `<version>` takes the case Milestone, e.g. `26-winter`); report template see `integration-test/docs/templates/test-report-template.md`; after execution, prompt the user to archive the conclusion report to that directory

## Structured Output (for e2e-failure-analyzer)

```json
{
  "repo": "project-openan/registry-center",
  "lang": "python",
  "command": "uv run pytest e2e/<feature>/ -q",
  "exitCode": 1,
  "failedCases": [
    {
      "caseId": "FIT-registry-center-agentcard-001",
      "testFile": "e2e/<feature>/test_agent_register.py",
      "testName": "test_register_agent_success",
      "logPath": ".test-output/20261105/junit.xml",
      "evidence": "AssertionError: assert 500 == 201"
    }
  ]
}
```

## Hard Constraints

- Do not modify any source code or test code (failure fixes go to `e2e-test-regression` or `github-issue-creator`)
- For multi-component integration scenarios: the orchestration order must be stated explicitly (e.g. registry-center before orchestration-center); when a failure occurs, annotate which component's startup it was stuck at
