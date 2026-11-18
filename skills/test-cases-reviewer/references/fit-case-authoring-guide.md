# Feature-Level Integration Test Case Authoring Guide

## 1. Definition

The feature-level integration test (feature-level-integration-test), abbreviated FIT, aims to verify a feature end-to-end in real scenarios. It centers on a concrete business feature and verifies whether the multiple modules or services involved can work together to implement that feature correctly. Unlike a "big and comprehensive" full-system regression test, and unlike a "small and precise" single-API test, FIT focuses on one complete business function, triggered from a user operation and verified across the entire technical chain.

FIT **only verifies business functional correctness**: service deployment readiness, main path works, business behavior effective after functional config changes, business state transitions, and business-level negative validation. Non-functional design capabilities such as probes/logs/metrics/self-healing/performance/security/compatibility belong to DFX and must not be written into the FIT table just because they are "exception scenarios" or carry priority P2. Scenario ownership follows `fit-dfx-scenario-attribution-criteria.md`.

## 2. Design Methods

### 2.1 Design Method Overview

Test case design should apply the following methods, and each case must annotate the method used (in the "Notes" column: `design_method:xxx`). Different methods suit different scenarios and are usually combined to achieve sufficient coverage.

| Design Method | Applicable Scenarios | Coverage Goal |
|----------|----------|----------|
| Equivalence Partitioning | Input parameters have clear valid/invalid ranges | Cover all input classes with the fewest cases |
| Boundary Value Analysis | Input has numeric ranges or length limits | Cover values on, just inside, and just outside the boundaries |
| Orthogonal Experiment | Multiple independent factors, each with multiple values | Cover interactions among factors with fewer combinations |
| State Transition | The object under test has multiple states and transitions between them | Cover all legal and illegal state transition paths |
| Decision Table | Multiple condition combinations produce different actions | Cover all condition combinations and their corresponding actions |
| Error Guessing | Business-level error-prone scenarios inferred from experience | Supplement **business negative cases** not covered by other methods (excluding DFX self-healing/resource/fault-injection recovery) |
| Scenario Method | The business flow contains multiple steps and branches | Cover the main flow and business-level key negative flows |

### 2.2 Equivalence Partitioning

Divide input data into equivalence classes and select a representative value from each class as test data.

- **Valid equivalence class**: input conforming to the requirement spec
- **Invalid equivalence class**: input not conforming to the requirement spec

**Application rules:**

1. At least one case per valid equivalence class
2. One separate case per invalid equivalence class (to prevent multiple invalid inputs from masking each other)

**Example: Agent registration payload input rule validation**

| Equivalence Class | Class | Representative Value | Corresponding Case |
|--------|------|--------|----------|
| Legal name (letters + digits) | Valid | `agent-test-01` | Verify registration succeeds with a legal name |
| Legal name (maximum length) | Valid | 63-character string | Verify registration succeeds with a maximum-length name |
| Empty string | Invalid | `""` | Verify 400/422 returned for an empty name |
| Contains special characters | Invalid | `agent@#$` | Verify 400/422 returned for special characters |
| Overlong name | Invalid | more than 64 characters | Verify 400/422 returned for an overlong name |

### 2.3 Boundary Value Analysis

On top of equivalence partitioning, focus on boundary values and values near the boundaries.

**Application rules:**
1. Take the boundary value itself, just inside the boundary (boundary-1), and just outside the boundary (boundary+1)
2. Both lower and upper boundaries must be covered

**Example: assume a single-batch registration limit of 100 entries**

| Boundary | Test Value | Expected Result |
|------|--------|----------|
| Lower boundary | 0 entries | Returns 400 parameter error |
| Lower boundary+1 | 1 entry | Registration succeeds |
| Upper boundary-1 | 99 entries | Registration succeeds |
| Upper boundary | 100 entries | Registration succeeds |
| Upper boundary+1 | 101 entries | Returns 400 over the limit |

### 2.4 Orthogonal Experiment

When multiple independent factors exist, select representative factor combinations to avoid exhaustive testing.

**Application rules:**
1. Identify all orthogonal factors and their values
2. Annotate the interaction strategy between factors:
   - **Orthogonal**: interaction effects exist between factors; pairwise combinations must be covered
   - **Coverage**: factors are independent; only ensure each value appears at least once
3. The concrete orthogonal factors must be decided based on the business feature

**Common orthogonal factor examples:**

| Orthogonal Factor | Values | Interaction Strategy | Notes |
| -------- | ---- | -------- | ---- |
| Registration channel | REST API / A2A-T SDK | Orthogonal | |
| Agent type | resident service / ephemeral task | Coverage | |
| Auth method | no auth / API Key / mTLS | Orthogonal | |

### 2.5 State Transition

For scenarios where the object under test has explicit state changes, draw the state transition diagram and cover all legal and key illegal transition paths.

**Application rules:**
1. Draw the state transition diagram: list all states and the events that trigger transitions
2. Cover all legal transition paths
3. Cover key illegal transition paths (verify the system rejects illegal transitions)

**Example — Agent lifecycle management:**

```text
              ┌──────────────┐
              │ Unregistered │
              └──────┬───────┘
                     │ register OK
                     v
              ┌──────────────┐
        ┌─────│  Registered  │─────┐
        │     └──────┬───────┘     │
   reported    dereg│          reported
   offline          │             online
        │           v              │
        │     ┌──────────────┐     │
        └────►│ Online ◄────►│Offline
              └──────────────┘
```

Transitions to cover:
- Legal transitions: Unregistered→Registered, Registered→Online, Registered→Offline, Online→Offline, Offline→Online, Registered→Unregistered (deregister)
- Illegal transition validation: an unregistered Agent cannot report status directly; a deregistered Agent cannot become online again

### 2.6 Error Guessing

Infer **business** scenarios that may go wrong, based on experience, historical defects, and common error patterns. Error guessing in FIT **only** covers error-prone points related to business functional correctness; restart recovery, resource insufficiency, and dependency fault injection with self-healing belong to DFX (see ownership criteria §4–§5).

**Error guessing directions allowed in FIT:**
- Null/illegal business input (assert API validation rejection: 400/422 and a business error message)
- Concurrent operations (business results conform to spec after simultaneous operations on the same business resource)
- Missing business dependency object (the spec requires functional failure with a business error message — not dependency-service fault self-healing)
- Business operation rejected due to insufficient permission (functional negative case; auth mechanisms/audit logs belong to DFNS)
- Business results still conform to spec under large data volumes (resource curves/leaks belong to DFP)

**Error guessing directions prohibited from FIT (all belong to DFX):**
- Dependency component fault injection, recovery after stopping a dependency process (DFR/DFD)
- Resource insufficiency (disk full, out of memory) degradation or no meltdown (DFR/DFP)
- Retry/circuit-breaker/self-healing under network anomalies (timeout, disconnect, DNS failure) (DFR)
- Self-healing and state recovery after service/process restart (DFR)
- Automatic rebuild after killing a process / stopping a container (DFR)

## 3. Test Case Field Design

**Core principles: atomicity, repeatability, traceability, completeness, independence**

The 16-column field rules are as follows (header order fixed, verbatim identical to the official template; see `../test-cases-generator/templates/case-template.csv`):

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

### Milestone (conditional required)

- Fill when the user specifies a version milestone, format `<YY>-<season>` (e.g. `26-winter`), corresponding to the test plan archive directory `docs/plans/<version>/`; leave blank if unspecified — no inference from materials
- Test plans and case tables are archived by version (framework §4.3.1); the version is the attribution basis for transfer-to-test and report review

### Case Name (required)

- Concisely express the test intent, within 50 characters
- Verb-object phrase; conditions or reasons may be appended via `_`, e.g. `VerifyAgentRegistrationWithInvalidPayload_emptyName`
- Concise, clear, unambiguous language
- Typical problems: mutually contained names, redundant information, inconsistent formatting

### Case ID (required)

- The ID is unique within the feature scope
- Format: wrapped in square brackets `[FIT-<feature>-<topic>-<3-digit seq>]`, e.g. `[FIT-registry-center-agentcard-001]` (framework §6.1); when referenced in code, write the ID without the square brackets
  - `feature`: lowercase hyphenated feature/repo name, consistent with the "Module" column (e.g. `registry-center`, `orchestration-center`)
  - `topic`: lowercase hyphenated short name of the functional scenario this case belongs to (e.g. `agentcard`, `workflow`, `task-dispatch`)
- English letters, digits, and hyphens only; no Chinese, underscores, spaces, or special characters
- Typical problems: mixed-case feature/topic, non-continuous or duplicated sequence numbers, IDs not matching scenarios

### Module (required)

- The official feature/module name specified by the user (an openan repo name or an in-repo module name, e.g. `registry-center`)
- Corresponds to the feature segment of the case ID; typical problem: overly generic description (e.g. just `backend`)

### Component Deps (required)

- `n/a` or the openan repo names actually interacted with in the steps (e.g. `orchestration-center`), multiple separated by `;`
- Distinct from the feature segment of the case ID: the feature segment is the module under test; Component Deps lists only dependency components

### Requirement Link (required)

- The requirement/Issue/PR link corresponding to this case (e.g. `https://github.com/project-openan/registry-center/issues/1`)
- **Required for P0/P1 cases** (requirement-coverage traceability, template field 6); when materials contain no link, it may be left blank and recorded in the information-gap list
- Framework §4.3.1 acceptance requires "requirement links complete"; traceability relies on this column
- Typical problems: link not matching the case scenario, meaningless placeholders

### Case Type (required)

- Main path, deployment readiness, functional config change, business state transition → `Functional Test`
- Business-level negative cases, boundary values, concurrency/idempotency exception scenarios → `Exception Test`
- Cases involving A2A-T protocol primitives (Task-T/Notification-T/Negotiation-T/Authorization-T) → `Protocol Test`
- Typical problems: negative cases wrongly filled as Functional Test; protocol cases not marked Protocol Test

### Priority (required)

- **P0**: feature acceptance cases — service deployment readiness, core functional main flow
- **P1**: feature basic function cases — basic functions and coverage of most of the spec, business correctness under concurrency/idempotency
- **P2**: feature complex scenarios and business-level exceptions/negatives (the FIT table only expresses business-scenario priority and **contains no DFX cases**; probes/logs/self-healing/performance/security/compatibility are written into a separate DFX table)
- Review the overall tier distribution for reasonableness

### Precondition (required)

- Describe the pre-configured environment, data, and system state (software versions, hardware, network environment)
- **Explicit environment elements**: state the started compose service components and versions, ports, auth tokens, preset test data, etc.
- Every statement is numbered: `arabic numeral` + `. ` (half-width period and space, official template style), starting from 1
- Preconditions are **not** test steps: no operations such as login or invocation; no more than 10 steps
- Typical problems: preconditions written as test steps, redundancy with test steps

### Steps (required)

- Each step is numbered: `arabic numeral` + `. ` (half-width period and space)
- Steps whose operation results need checking end with `see result N`, where N is the number in "Expected Result"
- Each independent step is numbered independently; consecutive independent steps must not be merged under one number
- State the operation entry, API path, and test parameters
- **The last step must be a cleanup action** (framework §6.3): delete the test data, Agents, temporary configs, or started services created by this case, ensuring case independence and repeatability
- No more than 10 steps recommended
- Typical problems: non-executable or ambiguous steps, missing input data, missing cleanup action

### Expected Result (required)

- Each expected result is numbered: `arabic numeral` + `.`
- No ambiguity or vague descriptions; use explicit data assertions: HTTP status codes, response body fields and values, query results, business object states
- Expected result numbering should match the corresponding steps; when one step corresponds to multiple results, use `see result N` to state the correspondence
- Accurate and specific; no hard-to-observe results; the cleanup step must have a verifiable assertion (e.g. a re-query returns 404, the container no longer exists)
- Typical problems: non-verifiable statements like `works fine`, `no exception`

### Automatable (required)

- `Yes`/`No`
- **P0/P1 must be `Yes`** (Framework §4.3.1 acceptance: P0/P1 100% automated; §8.1 TRR entry: 100% pass rate for P0/P1 cases); P2 may be `No`, with the reason stated in Notes
- Typical problem: P0/P1 filled `No` without a Notes explanation

### Automated Test (blank)

- Blank at generation time; backfilled with `<test file path>::<test function name>` after `e2e-test-code-gen` generates the test code, so failures can be traced back

### Dev Owner / Test Owner (conditional required)

- Fill when specified by the user; leave blank otherwise — no inference or placeholders

### Notes (required keys + optional supplements)

Keys are separated by `;` (or `;`), and multiple values within a key are separated by `|`:

- `design_method:xxx`: annotate the design method(s) used per §2 (multiple separated by `|`)
- `orthogonal_factors:factorA=value1|factorB=value2`: annotate factor values for orthogonal experiment cases
- `language_profile:python|java|js|shell`: **required for every case**; defaults to the primary language of the repo under test; for cross-component cases, use the language of the repo where the tests land; consumed directly by `e2e-test-code-gen` per profile — a wrong value leads to a wrong tech stack in generated test code
- `Component Deps` (separate 5th column): **required for every case**; `n/a` when there is no cross-component dependency; otherwise the openan repos actually interacted with in the steps (e.g. `orchestration-center`), multiple separated by `;`; fully-qualified names with owner prefixes are prohibited; not written into Notes
- `protocol_primitive:none|Task-T|Notification-T|Negotiation-T|Authorization-T`: **required for every case**; fill the corresponding primitive for A2A-T protocol cases, `none` for pure REST cases; no invented primitive names
- `environment:docker-compose|with-workload-cluster|online|offline`: **required for every case** (framework §6.4 environment dimension): fill the real runtime environment of the case (a local compose environment fills `docker-compose`), for CI environment filtering
- `execution_strategy:smoke|full|slow`: **required for every case** (framework §6.4 execution dimension): P0 core acceptance fills `smoke` (PR CI), regular P1/P2 fill `full` (daily build), long-stability/stress and other time-consuming scenarios fill `slow`
- Supplementary notes: material differences, to-be-confirmed items, reasons for non-automation, etc.
