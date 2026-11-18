# openan-powers Skill Smoke-Test Guide

## Local Paths

The prompts below use two placeholders — replace them with your own local paths before pasting:

- `<REGISTRY_CENTER>` — a local clone of the [registry-center](https://github.com/project-openan/registry-center) repo (used as the target repo under test; Python/pytest)
- `<INTEGRATION_TEST>` — a local clone of this repo (`integration-test`, the skill repository itself; sample inputs are referenced from its `skills/smoke-test/` directory)

## Prerequisites

- The relevant skills are installed to your skills directory (the OpenCode global default `~/.config/opencode/skills/`, or the fallback `~/.agents/skills/` with the `openan-` prefix to isolate them from the openfuyao skills of the same name); for skills that are new under the repository `skills/` directory but not yet installed (github-pr-manager / github-pr-review / github-issue-fixer / code-reviewer / e2e-issue-verifier), copy the directory (with the `openan-` prefix for the fallback path) into that directory to make them testable
- **It is recommended to open a new OpenCode session** before running the tests below (simulating a real load; this session is already hot-loaded and can also be tested directly)
- All sample inputs are in this directory (`skills/smoke-test/`); reference them by path during testing

## Test 1: openan-test-cases-generator (full-pipeline case generation)

**Purpose**: verify the hard input gate STOP + sub-skill orchestration + FIT/DFX boundary check + review loop (epoch ≤ 3).

**Action**, paste:

> Use openan-test-cases-generator to generate FIT test cases for registry-center and run the auto-review loop. The requirement materials are the README and API docs of that repo (`<REGISTRY_CENTER>`), generation scope FIT, feature/module name agent-registration, target repo registry-center, final output to that repo's `tests/assets/` directory.

**Pass criteria**:
- If it first lists missing items / confirms inputs, the input validation works (normal behavior)
- Before executing it reads the three sub-skills (feature-level-test-cases-gen / dfx-test-cases-gen / test-cases-reviewer, located by skill name) and the attribution criteria
- Under `intermediate/` (or the user-specified intermediate directory) there are CSVs with the `-epoch-N` suffix, the review report, and the boundary-check report, complete for every round
- Final deliverables: the FIT case CSV (16-column case table, consistent with `templates/case-template.csv`, UTF-8 with BOM, filename without epoch suffix) + the last-round review report + the boundary-check report
- Every case's Notes carry `language_profile=python`, and the `protocol_primitive`/`execution_strategy`/`environment` keys and the standalone `component_deps` column are filled
- The conversation ends with a full-pipeline summary (rounds, boundary-check conclusion, termination reason, paths); total rounds ≤ 3

**Negative test (STOP behavior)**:

> Use openan-test-cases-generator to generate cases.

(Provide no inputs at all) → it should STOP and list the missing items (feature materials, generation scope, feature/module name), create no directories, and call no sub-skill.

**Optional additional test (FIT+DFX dual scope)**: change the generation scope to `FIT+DFX` to additionally verify cross-table deduplication and independent iteration of the two scopes (a scope that has passed is not re-run in later epochs).

## Test 2: openan-e2e-test-code-gen (code generation)

**Purpose**: verify the language-profile routing + pytest code generation + minimal self-verification.

**Action**, paste:

> Use openan-e2e-test-code-gen to turn the case CSV into executable test code. The case CSV is at `<INTEGRATION_TEST>\skills\smoke-test\sample-cases.csv`, the target repo is `<REGISTRY_CENTER>` (Python), test type integration, output under registry-center's `tests/integration/`. Only generate the test code; do not modify the product source.

**Pass criteria**:
- Before generating it declares it has read `references/python.md` (profile routing correct)
- Produces a pytest file: case ID in the docstring, uses httpx ASGI mode, no hardcoded environment variables
- Tries `uv run pytest --collect-only` and reports the result (if the registry-center environment lacks dependencies, honestly reporting the missing pieces also counts as pass)

## Test 3: openan-e2e-test-runner (executor)

**Purpose**: verify the four-phase flow and language dispatch.

**Action**, paste:

> Use openan-e2e-test-runner to run registry-center's tests. The repo is at `<REGISTRY_CENTER>`; run only the integration layer. If the environment fails the pre-check, report what is missing honestly.

**Pass criteria**:
- Outputs the pre-check results first (uv / pyproject.toml / dependency status), then decides whether to execute
- If executed: real-time logs + a structured JSON at the end (including repo/lang/command/exitCode/failedCases)
- If pre-check fails: clearly reports which tool is missing and installation guidance, without forcing execution

## Test 4: openan-e2e-failure-analyzer (failure analysis)

**Purpose**: verify evidence extraction + clustering + the 5-class root-cause classification.

**Action**, paste:

> Use openan-e2e-failure-analyzer to analyze this failure log: `<INTEGRATION_TEST>\skills\smoke-test\sample-failure.log`. Background: registry-center's integration tests; the log is in the file.

**Pass criteria**:
- Extracts the 2 failed cases (FIT-registry-center-agentcard-001, FIT-registry-center-agentcard-002)
- Clusters them into 1 cluster (same 500 signature) with a stated rationale
- Classifies as SOURCE_BUG (500 does not match the documented 201/409), with a confidence level
- Produces the follow-up call text (github-issue-creator draft), and declares that it does not execute / modify code / create Issues itself

## Test 5: openan-e2e-test-regression (test fixing)

**Purpose**: verify the precondition check + minimal fix + post-fix verification.

**Action**, paste:

> Use openan-e2e-test-regression to process this analysis report: `<INTEGRATION_TEST>\skills\smoke-test\sample-analysis-e2e-code-bug.md`. Target repo `<INTEGRATION_TEST>` (this is the skill repository itself; the fixture is under its skills/smoke-test/fixture/).

**Pass criteria**:
- First checks the preconditions (is the classification all E2E_CODE_BUG ✓)
- Changes the assertion 200→201 in `skills/smoke-test/fixture/test_agent_register.py`, **touching only this one line**
- Runs the verification command `python -m pytest skills/smoke-test/fixture/test_agent_register.py -q` and reports the result
- Outputs a fix report table

**Negative test (should refuse)**:

> Use openan-e2e-test-regression to process this report: `...\sample-analysis-source-bug.md`

→ It should refuse (the report contains SOURCE_BUG classifications, failing the preconditions) and suggest going through github-issue-creator instead.

## Test 6: openan-github-issue-creator (issue creation)

**Purpose**: verify the draft-then-confirm flow (does not actually create an Issue; no token needed).

**Action**, paste:

> Use openan-github-issue-creator to create a Bug Issue for registry-center: POST /v1/agents returns 500 for a valid payload (expected 201). Log evidence is at `<INTEGRATION_TEST>\skills\smoke-test\sample-failure.log`, commit SHA `b824a2a`. Write the draft for me first; do not create it directly.

**Pass criteria**:
- Attempts a dedup check (when no GitHub MCP is available, honestly explains why it is skipped)
- Writes `.issue.draft.md` in the registry-center workspace, following the `templates/bug-issue.md` structure: DCO notice, reproduction steps, environment info, log reference (≤30 lines)
- **Stops here and waits for confirmation**, without creating the Issue on its own

## Test 7: openan-e2e-issue-verifier (failure verification and handoff)

**Purpose**: verify the input-gate STOP + real execution of a minimal verification command + root-cause classification aligned with e2e-failure-analyzer + handoff authorization gate (no overreach in fixing code / creating issues).

**Negative test (gate STOP)**:

> Use openan-e2e-issue-verifier to handle: registry-center's integration tests are failing.

→ It should STOP and ask for the test command, error log, or Issue link, without entering code exploration.

**Positive path A (E2E_CODE_BUG, real minimal verification)**, paste:

> Use openan-e2e-issue-verifier to analyze and verify this failure: target repo `<INTEGRATION_TEST>`, backend Python case FIT-registry-center-agentcard-001 (register a valid Agent successfully, expected 201) fails when running `python -m pytest skills/smoke-test/fixture/test_agent_register.py -q`, assertion 200 != 201. I pasted the log above; rerun the minimal command yourself if needed.

**Pass criteria**:
- Generates a minimal verification command (`pytest path::case -q` or `-k` level) and actually executes it, capturing stdout/stderr as evidence
- Reads the source and locates: the test assertion is wrong (expects 201, asserts 200); classification E2E_CODE_BUG, fix status = unfixed
- Outputs a FixContext (`action_required` uses `FIX_ASSERTION`, including `recommended_test_cmd`)
- Asks for authorization before handoff; without authorization it must not call github-issue-fixer or modify code
- The verification result table has all four rows; items not executed are marked "not executed" with a stated reason

**Positive path B (SOURCE_BUG, analysis + issue-creation suggestion)**, paste:

> Use openan-e2e-issue-verifier to analyze this failure log: `<INTEGRATION_TEST>\skills\smoke-test\sample-failure.log`. Background: registry-center's integration tests; the API documentation promises 201/409 but the actual response is 500; product source is at `<REGISTRY_CENTER>`.

**Pass criteria**:
- Extracts the 2 failed cases and clusters them into 1 cluster (same 500 signature), with a stated rationale
- Determines SOURCE_BUG (500 does not match the documented promise), with a confidence level
- Suggests handing off to github-issue-creator (passing the reproduction command, log evidence, expected/actual) and **asks for authorization**; without authorization, it neither creates the Issue nor writes back to an Issue
- Declares that this skill does not modify code or run the fix main flow

## Suggested Test Order

2 → 3 is one chain (generate → execute), 4 → 5 → 7(A) is one chain (analyze → fix → verify), 7(B) → 6 is one chain (verify → create issue), and 1 is relatively independent. After all pass, the skills' behavioral contracts conform to the SKILL.md definitions and the set can enter the Phase 1 pilot (full pipeline on a real repository); integration tests for github-pr-manager / github-pr-review / github-issue-fixer are covered by the "single account simulating upstream/origin" end-to-end prompt in the session.
