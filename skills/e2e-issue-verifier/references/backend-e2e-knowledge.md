# Backend E2E Troubleshooting Domain Knowledge Base

This knowledge base serves as the domain knowledge support for `e2e-issue-verifier`, used to calibrate real command execution paths, dependency-installation phase blockers, service orchestration states, and common environment issues when analyzing backend pytest / Maven / bats failures.

It is not a process document; the process is owned by `SKILL.md`. This file answers only one question: **when a backend E2E failure occurs, how to make more general and more actionable diagnoses based on stdout/stderr, test reports, and service/container states.**

## Relationship with `SKILL.md`

### What `SKILL.md` is responsible for

`SKILL.md` is responsible for:
- Identifying the frontend / backend verification path and language profile
- Generating minimal verification commands
- Taking over evidence such as logs, traces, stdout/stderr, and Issue comments
- Outputting root cause, fix status, FixContext, and handoff recommendations
- Controlling whether to hand off to `github-issue-fixer` or `github-issue-creator`

### What this knowledge base is responsible for

This knowledge base is responsible for:
- Explaining the real state of local / SSH remote test environments
- Constraining the evidence priority during analysis
- Defining general determination rules for dependency installation failures, environment blockers, tool version mismatches, and service/container state anomalies
- Providing more stable backend diagnostic anchors
- Breaking "looks like a case failure" problems into verifiable structural causes

### How to use

When `SKILL.md` analyzes a backend failure, it must proactively consult this knowledge base, especially for:
- SSH connection and remote-directory execution (bats installation-type scenarios only)
- pytest collection error / fixture failure / assertion failure
- Maven compilation failure / surefire skip / `-Dtest` filtering
- bats `--filter` / `setup`/`teardown` pollution
- `.env` missing or misconfigured
- docker-compose orchestration, service health checks, container states

If this knowledge base can explain the current failure structure, prioritize locating by its rules; if it cannot, go back to stdout / stderr / trace / service states to gather more evidence instead of directly expanding the verification scope.

---

## 0. General Diagnostic Principles

When a backend test fails, troubleshoot in the following order:

1. First determine whether it is a **connection problem** (remote scenarios only)
   - SSH unreachable
   - Authentication failure
   - Port unreachable
   - Wrong hostname / IP

2. Then determine whether it is an **execution environment problem**
   - Target directory does not exist
   - `.env` configuration incomplete
   - Dependencies not installed (`uv sync` not run / Maven dependencies unresolved / bats not installed)
   - Toolchain version mismatch (Python/JDK/Maven/Node/bats versions not matching repo requirements)
   - Basic tools missing

3. Then determine whether it is a **collection/compilation problem**
   - pytest collection error (import failure, conftest error, syntax error)
   - Java compilation failure (method / field missing, import missing, API change not synced)
   - bats syntax error or test file not found

4. Then determine whether it is a **test code problem**
   - Overly strict assertions
   - Wrong assertion target (stdout / stderr / log file)
   - Insufficient waits (poll interval, timeout)
   - fixture/teardown not cleaned up, polluting subsequent cases
   - Case name or filter expression written incorrectly

5. Then determine whether it is a **system-under-test problem**
   - Service startup failure, health check failing
   - Container exited (`docker compose ps` shows `Exit 1`)
   - API returning 5xx, registration/discovery logic errors

6. Only lastly consider **timing / flaky**
   - Insufficient eventual-consistency waits for the service
   - Slow startup
   - Initialization finalization phase not completed

Before ruling out the aforementioned structural problems, do not attribute the failure to "environment too slow" or simply increase timeouts.

---

## 1. Characteristics of Local and Remote Execution Environments

### 1.1 A command starting successfully does not mean verification is complete

- A command starting only shows that the toolchain and directory are basically usable.
- It does not mean dependencies are ready.
- It does not mean service orchestration is complete.
- It does not mean the test has executed the target case (pytest may stop at the collection stage, Maven may stop at the compilation stage).

During diagnosis, distinguish between:
- "Can enter the directory"
- "Can start the test process"
- "Passes the collection/compilation stage"
- "Can run to the target case and produce an assertion result"

### 1.2 The directory must be the real working directory

Backend e2e usually requires running test commands from the repository root or the `e2e/<feature>/` directory.
If the directory is wrong, common symptoms include:
- `pyproject.toml` / `pom.xml` / test files not found
- pytest reporting `file or directory not found`
- Maven reporting `no tests to run` (filter matched nothing)
- bats reporting `does not exist`

### 1.3 `.env` is an important prerequisite for backend verification

Common environment variables include:
- Service addresses, ports (registry-center / orchestration-center endpoints)
- token / credentials
- Database or message-queue connection strings
- `KUBECONFIG` or docker-related configuration (installation-type scenarios)

If `.env` is missing or empty, it may cause:
- Connection refused
- Authentication failure (401/403)
- Case failing at the setup stage

---

## 2. pytest Failure Diagnostic Rules

### 2.1 Collection error takes priority over case failure

If pytest fails before entering the specific case, it is usually:
- import error (dependency not installed, circular import)
- conftest.py error (fixture definition error, plugin missing)
- test file syntax error

Such problems must not be misjudged as the original e2e case failure. `pytest --collect-only -q` can quickly isolate collection problems.

### 2.2 fixture and teardown are a separate class of problems

If the failure pattern is "passes when run alone, fails when run in sequence" or "the previous case affects the next one", prioritize:
- fixture scope too large (session/module-level shared state not reset)
- teardown not executed or not thorough (registered data not deregistered, temp files not cleaned, service not restarted)

This is a **test code defect**, not a system-under-test problem.

### 2.3 stdout / stderr / log files must be examined separately and together

Messages from the system under test and the test script may appear in:
- the command `stdout`
- the command `stderr`
- the service's own log files (archived under `.test-output/<timestamp>/`)

Therefore, when "a certain completion message cannot be found in the output", first determine:
- whether the assertion only looked at pytest-captured output
- whether the success message actually lives in the service log (view with `-s` or `--show-capture`)
- whether the message was upgraded or changed

### 2.4 An assertion failure does not necessarily mean a business failure

If it is merely a mismatch against a fixed string, usually prioritize:
- test assertion too strict
- output message changed
- success signal location changed

Only when the exit code, service state, and post-checks all fail should it be judged as a system-under-test failure.

---

## 3. Maven / JUnit5 Failure Diagnostic Rules

### 3.1 Compilation failure takes priority over case failure

If Maven fails before surefire starts, it is usually:
- compilation error (method / field missing, API change not synced)
- dependency unresolvable (private repo unreachable, version nonexistent)

This class of problems is a **compilation blocker**, not an e2e case business failure. Check `mvn compile` or the `[ERROR]` compilation section of the build log first.

### 3.2 `-Dtest` filter missing its target is a separate class of problems

Symptom: build succeeds but `no tests to run` / `Tests run: 0`:
- class or method name misspelled (mind the surefire/failsafe difference between `*IT` and `*Test`)
- wrong positioning other than missing `-DfailIfNoTests=false`: first `mvn test -Dtest=ClassName`, then narrow down to the method

### 3.3 WireMock / mock service port occupation

Integration tests often embed mock services such as WireMock:
- Port occupied by a leftover process from the previous run → all subsequent cases fail
- This is an environment problem or incomplete teardown, not a business regression

---

## 4. bats / Installation-Deployment Scenario Knowledge

### 4.1 Success determination should not rely on a single string only

Installation/initialization flows usually output multi-stage logs (argument parsing, environment checks, node info, config writing, finalization). If the test only asserts a fixed string, it may misjudge due to rewritten wording, output stream changes, or inter-version prompt differences.

More robust determinations usually combine:
- exit code
- key stage logs
- post-state checks (whether services are listening, whether configs are generated, whether `docker compose ps` is healthy)

### 4.2 setup / teardown must come in pairs

When bats `setup`/`setup_file` and `teardown`/`teardown_file` are not paired, typical symptoms are:
- first case passes, subsequent cases fail (port/directory/container residue)
- the fix is to add teardown, not to loosen assertions

### 4.3 Pay attention to "whether the run truly reached the end"

Some failures superficially look like "initialization did not succeed", when in fact:
- the command executed successfully
- the core actions completed
- but the final completion message was not matched

In this case, check the end state and exit code first, instead of fixating on a single string.

---

## 5. Service / Container State Diagnostic Rules

### 5.1 Post-state checks are key evidence

For installation, initialization, upgrade, and deployment cases, follow-up checks usually include:
- whether each service in `docker compose ps` is `running` / `healthy`
- whether health-check endpoints return 200
- whether key processes listen on expected ports
- for multi-component orchestration, whether upstream components (e.g., registry-center) become ready before downstream ones (orchestration-center)

Only if these states do not hold does it look more like a genuine system-under-test problem.

### 5.2 Common state meanings

- `running` / `healthy`: usually normal
- `starting` / `unhealthy`: starting up or health check failing (a high-incidence zone for timing problems)
- `exited (1)`: container startup / configuration problem
- `connection refused`: service not listening (not started or startup failed)
- Port conflict: host port occupied (environment residue)

### 5.3 Do not misjudge an orchestration state problem as a test-message problem

If a log assertion fails but `docker compose ps` shows the service is abnormal, the problem may already be beyond the test itself.
If a log assertion fails but all post-states are normal, suspect an unstable test assertion instead.

---

## 6. Missing File / Tool / Command Rules

### 6.1 `ModuleNotFoundError` / `cannot find symbol`

Usually indicates:
- dependency not installed or version inconsistent
- code references a nonexistent API
- callers not synced after a refactor

This class of problems is a **dependency/compilation blocker**, not an e2e case business failure.

### 6.2 `command not found`

Usually indicates:
- the target machine lacks tools (uv / mvn / bats / docker)
- PATH not configured
- runtime environment not matching expectations

### 6.3 `No such file or directory`

Usually indicates:
- wrong repository path
- temp file not generated
- missing template or configuration file

### 6.4 `unrecognized arguments` / `Unknown lifecycle phase`

Usually indicates:
- command arguments incompatible with the current tool version
- CLI version inconsistent with what the repo expects
- pytest plugin missing (when the argument is provided by a plugin)

---

## 7. Backend Minimal Verification Command Diagnostic Rules

### 7.1 Minimal verification should prefer single case / single file / single tag

In principle, prefer:
- pytest: `pytest path/to/test_file.py::test_name` or `-k "keyword"`
- Maven: `mvn test -Dtest=ClassName#methodName`
- bats: `bats file.bats --filter "case name"`

Do not run the full suite by default.

### 7.2 Command position and argument order must be compatible with tool versions

Different versions may have different requirements on argument position (e.g., pytest's `-k` must precede the path; Maven's `-D` system properties must precede the goal).
If argument-parsing errors occur, first consider: wrong command order, CLI version mismatch.

### 7.3 Reaching only the collection/compilation stage does not count as completed minimal verification

If the command only completed:
- directory entry
- dependency resolution
- collection/compilation

but did not enter the target case, it only shows "the prerequisite environment is basically usable" and cannot count as "the target case has been verified".

---

## 8. Backend Failure Classification and Conclusion Template

### 8.1 Recommended classification

- SSH / network failure (remote scenarios only)
- Directory / permission failure
- `.env` configuration failure
- Toolchain / version failure
- Dependency installation failure
- Collection / compilation failure
- Test assertion problem
- System-under-test problem
- Service / container state anomaly
- Timing / flaky

### 8.2 Conclusion judgment principles

- If the command did not reach the target-case execution stage: mark as "verification blocked"
- If it entered the target case but the assertion failed: first judge whether it is a test problem or a business problem
- If the post-run service/container state is abnormal: lean toward a system-under-test problem
- If only the completion message does not match but exit code and post-states are all normal: lean toward a test assertion problem

---

## 9. Cooperation with `e2e-issue-verifier`

### 9.1 What `SKILL.md` should do first

- Read failure logs, traces, reports, and Issue comments
- Generate the minimal verification command
- Determine frontend vs. backend, and which backend language profile
- Narrow down to the minimal case / minimal file
- Output root cause, FixContext, and fix-status recommendation

### 9.2 What this knowledge base should provide

- Why a command starting successfully does not equal minimal verification success
- Why collection / compilation failures must be handled first
- Why completion messages cannot be judged by fixed strings only
- Why service/container post-states are more reliable than a single log
- When a problem should be classified as structural rather than a simple waiting problem

### 9.3 Division of responsibilities

- `SKILL.md` owns the process, handoff, verification, and conclusions
- This knowledge base owns the diagnostic rules for backend pytest / Maven / bats / docker-compose

If this knowledge base has given explicit rules, `SKILL.md` should interpret errors by these rules first, then decide whether code changes, handoff, or further verification are needed.

---

## 10. Scope of Application

This knowledge base mainly applies to the following patterns in openAN backend e2e scenarios:
- Local pytest / Maven / bats execution, or SSH remote installation-type scenarios
- Service orchestration (docker-compose) for components such as registry-center and orchestration-center
- Installation / initialization / upgrade / uninstall assertion scenarios
- Dependency installation, toolchain, and environment variable diagnostics

When a failure clearly does not belong to the above patterns, fall back to general shell / Python / Java / container diagnostics; do not mechanically apply this knowledge base.
