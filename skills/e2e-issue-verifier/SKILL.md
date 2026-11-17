---
name: e2e-issue-verifier
description: Dedicated skill for full-stack e2e failure analysis, minimal verification, artifact/log evidence assessment, and Issue/PR closure conclusions. Supports dual-path verification for frontend Playwright (local workspace) and backend by language profile (Python pytest / Java JUnit5 / Shell bats, locally or via SSH test environments). Focuses on failed-case extraction and joint source-code/environment-state root-cause localization; it does not handle the general code-fixing main flow. If verification indicates code changes are needed, hand off to github-issue-fixer; if a new Issue is needed, hand off to github-issue-creator.
---

# E2E Issue Verifier

The goal of this Skill is to analyze the **real page/service state, root cause, verification conclusion, and handoff recommendation** of an e2e failure clearly.

It is responsible for:
- Collecting failure evidence
- Generating minimal verification commands
- Localizing the root cause by combining source code with the real environment state
- Determining whether the issue is truly fixed
- Producing conclusion drafts that can be written back to Issues / PRs

It is NOT responsible for:
- The general problem-fixing main flow
- commit / push / PR creation / PR review

If the analysis indicates code fixes or a PR are needed, hand off to `github-issue-fixer`.
If a new Issue is needed, hand off to `github-issue-creator`.

## 1. Prerequisites

### 1.1 Input Requirements

You may start once any one of the following inputs is available:

- Failure logs, error screenshots, trace, or report JSON
- File path and line number of the failure location
- GitHub Issue / PR URL or number
- User has already executed verification and pasted the results

**Input gate (blocked at stage 1):**

- **Insufficient information:** If only "the test failed" is provided, you must stop and ask the user to supply the test command, error logs, or an Issue link.
- **Backend-specific requirement:** If verification must run in a remote test environment (e.g., bats installation scenarios requiring a real VM), SSH connection information (IP, username, password/key) and the target project's working directory must be explicitly provided; locally executable pytest / Maven cases must not require SSH. Never guess.

### 1.2 Repository and Verification Prerequisites

- The target Git repository (`owner/repo`) must be uniquely identifiable.
- **Frontend verification:** The target e2e project (e.g., `openan-portal`) is accessible in the current local workspace, and there are no blocking uncommitted changes.
- **Backend verification:** The local toolchain passes the `e2e-test-runner` pre-checks (Python `uv` / Java JDK17+ and Maven / Shell bats, etc.), or the given SSH credentials connect successfully and the remote environment is ready.

## 2. Workflow (tracked with TodoWrite)

Track the following stages with TodoWrite and mark each step complete immediately after finishing it.

| Stage | Name | Description |
| ---- | ---------------- | ------------------------------------------------------------ |
| 1 | Identify and parse input | Distinguish frontend/backend tests and language profile; extract errors or Issue links; **trigger the input gate if insufficient**. |
| 2 | Read context | Pull Issue details and the **comment list** via GitHub MCP. |
| 3 | Extract and cluster evidence | Extract logs, traces, screenshots; cluster multiple failed cases. |
| 4 | Generate minimal verification command | Determine a single-case/file-level rerun command (Playwright or a backend command per language profile). |
| 5 | Run in environment and observe | Execute locally (frontend/backend local cases) or via SSH remotely; localize by combining source code and environment state. |
| 6 | Root-cause determination and report | Output fix status, root-cause classification, and the FixContext conclusion. |
| 7 | Issue / PR write-back | Write the analysis or verification conclusion back to an Issue comment or PR comment. |
| 8 | User authorization and handoff | **After explicit user authorization**, invoke another Skill to fix code or create an Issue. |

## 3. Verification Execution Paths (dual-track)

### 3.1 Frontend Playwright verification path (local workspace)

1. **Working directory:** Before executing frontend minimal verification commands, you must first `cd` into the frontend e2e project directory (e.g., `e2e-frontend/` or `openan-portal`), then run the Playwright command.
2. **Minimal command generation:** Prefer the failed case name with `-g`.
   `npx playwright test path/to/spec.ts -g "failed case name" --project=application`
3. **Command priority:** If the user has already provided an executable Playwright command or spec path, use the user's command directly as the minimal verification command; do not abort just because `package.json`, `playwright.config.ts`, or the entry directory cannot be auto-detected.
4. **Regex escaping:** If the case name contains regex special characters, they must be escaped, or a stable keyword should be used instead.
5. **Environment and artifacts:** Check `e2e/.env.template` (repo root, test-plan §6.4); prefer using `playwright-report`, `test-results`, `trace.zip`, screenshots, video, and `error-context.md` to narrow the scope instead of blindly rerunning.

### 3.2 Backend verification path (dispatched by language profile)

Backend cases **run locally by default** (reusing the pre-check and preparation conventions of `e2e-test-runner`); remote execution only happens when the case itself requires a real installation environment (e.g., the bats scenarios of `openan-installation`) and the user provides SSH information.

1. **Working directory:** Enter the target test package directory (the one containing `pyproject.toml` / `pom.xml` / `e2e/<feature>/`), consistent with the run-command section in `skills/e2e-test-code-gen/references/<lang>.md`; cross-language command formats are forbidden.
2. **Environment check:** Confirm dependencies are installed (Python `uv sync` / Java dependencies resolved / bats executable), and check that `.env` is correctly configured according to the repo-root `e2e/.env.template`; newly added environment variables must be synced to `e2e/.env.template` and documented in the README; `.env` must not be committed to git (add it to `.gitignore`), and secrets/internal addresses must not be hardcoded.
3. **Minimal command generation (by language):**

| Language | Minimal verification command examples |
| --- | --- |
| Python | `uv run pytest e2e/<feature>/test_agent_register.py::test_register_agent_success -q` or `-k "FIT-registry-center-agentcard-001"` |
| Java | `mvn test -Dtest=AgentRegisterIT#registerAgentSuccess` |
| Shell | `bats e2e/<feature>/agent_register.bats --filter "agent register success"` |

4. **Command priority:** If the user has already provided an executable command or case path, use the user's command directly as the minimal verification command; do not abort just because the build file or package entry cannot be auto-detected.
5. **Result capture:** Execute the command in the Shell and capture stdout/stderr as evidence. When SSH remote execution is required, run everything in the remote shell; never copy remote cases back to run locally.
6. **Multi-component integration:** When a case depends on multiple services (e.g., registry-center ↔ orchestration-center), prefer the repo-provided `docker-compose.yml` orchestration; perform health checks after startup; on failure, note which component's startup is stuck.

### 3.3 Verification scope expansion principles

- Minimal verification is mandatory and confirms whether the original failure point is fixed.
- If the fix touches shared helpers, page objects, conftest/fixtures, utility functions, shared locators, or shared test data, proceed to file-level verification.
- If the fix may affect other scenarios in the same module, further add same-module regression.
- If a new failure is already found in the previous verification layer, go back to code fixing first; do not continue expanding the scope.
- Verification order: single e2e -> file verification -> same-module regression -> trace/report check.

## 4. Failure Information Extraction

### 4.1 Issue context retrieval rules

For a GitHub Issue, first pull the body via GitHub MCP, **then immediately call the comment-list tool** (tool name per the MCP descriptor; if the service does not expose a comment list, state so honestly and continue with the body only). Merge the body and comment thread, and extract hidden reproduction environments or prior troubleshooting logs.

### 4.2 Element extraction

- **Generic:** framework, command, failed case name, source path, line number.
- **Frontend-specific:** locator, DOM errors, timeouts, traceId.
- **Backend-specific:** Python traceback / Java exception stack / shell assertion diff, docker container not ready, compose orchestration errors, service health-check timeouts.

## 5. Joint Source-Code and Environment-State Localization

### 5.1 Source code reading

Supports reading spec/test files, page objects / conftest / framework utility packages, test data, and configuration files.

### 5.2 State determination principles (backed by external knowledge bases)

- **Frontend troubleshooting:** First check for hidden instances, stale popup remnants, and zero-size nodes; then wrong containers, same-name node ambiguity, virtual-list visible windows, transient overlays, and unfinished animations; if the trace shows the element never entered the visible DOM, classify it as "incomplete interaction".
- **Backend troubleshooting:** First distinguish between a test-code assertion failure and an environment/orchestration problem (docker container exited, compose service not ready, dependency installation failed); then distinguish language-level structural failures (pytest collection error, Java compilation failure, bats syntax error).

> 💡 **You must proactively retrieve and strictly follow:** for frontend problems retrieve `references/frontend-e2e-knowledge.md`; for backend problems retrieve `references/backend-e2e-knowledge.md`.

## 6. Failed-Case Clustering

When multiple failures exist, cluster preferentially by: identical error summaries, identical spec/package paths, identical locators, identical traceback / exception stacks.

## 7. Root-Cause Classification

Output the confidence level and rationale (aligned with the classification of `e2e-failure-analyzer`):

- **Test code defect (E2E_CODE_BUG):** Wrong locators, unreasonable waits (frontend); fixture/teardown not thorough and polluting the next case, overly strict assertions (backend).
- **System under test defect (SOURCE_BUG):** UI interaction bugs; backend API errors, service startup failures.
- **Environment/dependency issue (ENV_INFRA):** Network unreachable, docker/compose environment anomalies, dependency version mismatches, CI differences.
- **Flaky/timing issue (FLAKY_TIMING):** Frontend animation races; backend insufficient eventual-consistency waits.

## 8. Fix Status Determination

Output status: fixed / not fixed / partially fixed / cannot reproduce / verification blocked.
**Flaky fallback rule:** If a single verification passes but the report shows failure, do not directly conclude it is fixed. It is recommended to add `--repeat-each=3` (frontend Playwright), `--count=3` (pytest-repeat), or rerun bats to verify stability. Never judge a fix solely by PR merge or swallowed exceptions.

## 9. Conclusion Handoff and Skill Collaboration Rules

### 9.1 Authorization gate before handoff

When the FixContext is complete and the root cause is clear, you must first output the complete conclusion and a handoff-ready FixContext recommendation, and **ask the user whether they agree to the handoff**. **Only proceed with the invocation after explicit consent.**

If the user has already clearly said "continue", "confirm", "hand off", or an equivalent authorization, do not stay at the analysis stage; immediately prepare to invoke the corresponding Skill.

If this task has already been confirmed to require an Issue / PR write-back, perform the write-back after authorization, and clearly record the write-back result in the output.

### 9.2 Contract for calling github-issue-fixer

After authorization, call `github-issue-fixer`. Parameters must include `FixContext`. If the user has already requested "hand off directly" or "continue fixing", or has provided a complete FixContext, prioritize executing the handoff flow and do not repeat empty analysis:

```json
{
  "target_file": "path/to/file",
  "line_number": 105,
  "action_required": "UPDATE_LOCATOR | FIX_TEARDOWN | FIX_ASSERTION | INCREASE_POLL_TIMEOUT",
  "suggested_code": "suggested code / locator string",
  "wrong_code_found": "the original code that caused the failure",
  "error_snapshot": "DOM hidden state or container exit log",
  "recommended_test_cmd": "the exact command to rerun this case"
}
```

**Handoff recommendations (output together with FixContext):** The fix PR must add the corresponding regression case and rerun all FIT cases of that feature (test-plan §8); the same applies after fixing test code.

### 9.3 Contract for calling github-issue-creator

If it is a genuine business bug, after authorization call `github-issue-creator`, passing: reproduction command, trace/log evidence, expected vs. actual results.

### 9.4 Contract for writing back to Issue / PR

If the current task has been confirmed to require an Issue or PR write-back and the user has explicitly authorized it, write the following back to the target Issue/PR (GitHub MCP comment tool, per descriptor):
- Root-cause summary
- Minimal verification command
- Verification result
- Fix status
- Whether closing the Issue is recommended

When writing back, prefer existing Issue comment threads or PR comment threads, and never write back without authorization.

## 10. Output Format

Every completion must output the following information (fixed field order):

- Current stage: analyzing / awaiting handoff / write-back executed / handoff executed / awaiting verification / verifying / verified

### Conclusion

- Entry type: frontend local verification / backend local verification / backend SSH verification / Issue / PR
- Target repository:
- Language profile (backend):
- Related Issue / PR:
- Root-cause classification and fix status:

### Failure Information Summary

- Test framework and command:
- Failed cases and files:
- Error summary:
- Key elements (Locator / container or service state):

### Actions Performed

- Issue query / read / comment read: yes/no
- SSH remote invocation / dependency check: yes/no
- Local verification / source analysis: yes/no

### Verification Results

| Step | Command/Action | Result |
| --- | --- | --- |
| Single e2e | ... | pass/fail/not executed |
| File verification | ... | pass/fail/not executed |
| Same-module regression | ... | pass/fail/not executed |
| trace/report check | ... | pass/fail/not executed |
