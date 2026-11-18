# DFX Test Case Authoring Guide

## 1. Definition

DFX = Design for X (design for the full lifecycle)
X represents the various non-functional dimensions of a component's full lifecycle. DFX testing specifically verifies whether the system design satisfies non-functional capabilities such as operation, deployment, troubleshooting, scaling, self-healing, and observability — unlike ordinary functional testing, which only checks whether the business logic works.

DFX test case: a standardized test case dedicated to verifying serviceable, observable, deployable, and highly reliable design capabilities; it is not a functional case but a non-functional dedicated integration / stability test case (framework §10 dedicated testing).

**Division from FIT**: judge by the verification goal. Cases whose verification goal is probes/logs/metrics/self-healing/performance/security/compatibility belong to DFX; business functional correctness (deployment readiness, main path, business effective after functional config changes, business state transitions, business-level negatives) belongs to FIT. Scenario ownership follows `fit-dfx-scenario-attribution-criteria.md`; FIT business scenarios must not be copied in detail.

## 2. Common DFX Categories and Test Case Design Methods

| Category | Full Name | Abbr. |
| ------------ | -------------------------- | ---- |
| Testability Design | Design for Testability | DFT |
| Diagnosability Design | Design for Diagnosability | DFD |
| Serviceability Design | Design for Serviceability | DFS |
| Reliability Design | Design for Reliability | DFR |
| Performance Design | Design for Performance | DFP |
| Security Design | Design for Security | DFNS |
| Compatibility Design | Design for Compatibility | DFC |

**DFX type → case type (value of the "Case Type" column) mapping**:

| DFX Type | Case Type (Case Type column value) | Description |
|----------|----------|------|
| DFT | `Functional Test` | Probe/health/metrics endpoints, state externally assertable |
| DFD | `Functional Test` | Log levels, error context, no silent failures |
| DFS | `Deployment Test` | compose upgrade/rollback, config hot reload, scaling |
| DFR | `Stability Test` | Fault-injection self-healing, isolation, retry; 7×24 long-stability also uses `Stability Test` |
| DFP | `Performance Test` | Resource curves, latency, concurrency; extreme/stress scenarios fill `Stress Test` |
| DFNS | `Security Test` | Auth, encryption, audit, injection protection |
| DFC | `Compatibility Test` | Multi-version / multi-language SDK / multi-architecture compatibility |

DFX rows must write `dfx_type:DFx` in Notes to keep seven-dimension coverage traceable.

### 2.1 DFT Testability Design

**Core verification goal**
Whether the component is easy to automate-test, easy to probe externally, and verifiable in state without intrusive modification.

**Generic check points**
- Provides a standardized health probe interface / health endpoint / readiness probe
- Provides standardized observable output (logs/metrics/status APIs)
- Supports dynamic config taking effect without restarting the service (assert **probeability / external identifiability**, not that business functions take effect under the new config; business effect belongs to FIT)
- Output is structured, machine-parseable, and automatically assertable
- Startup, running, and exit states are externally identifiable

**DFT generic standard case example**
Case Name: Verify the component exposes a standardized health probe interface
`dfx_type`: DFT
Precondition: the component container is running and ready
Test Steps: invoke the component health-check endpoint (e.g. GET /health)
Expected Results:
- The endpoint returns the standard success status code (200)
- The component running state can be identified externally and automatically
- Meets the containerized design requirements of probeability and automated testability

### 2.2 DFD Diagnosability Design

**Core verification goal**
The component outputs sufficient observation information in normal/abnormal scenarios to support rapid root-cause location and reduce failure MTTR.

**Generic check points**
- Log level discipline: INFO/WARN/ERROR
- Abnormal scenarios have independent error logs, error identifiers, and error context
- Key behaviors observable: startup, config loading, requests, exceptions, exit
- Exception counting, error statistics, and status metrics are available
- No silent failures, no errors without logs

**Split between DFD and FIT invalid input**: constructing invalid input is only a trigger. DFD asserts ERROR logs, error context, no silent failure, and error metrics; "invalid input rejected by API validation with a business error message per spec" belongs to FIT and must not be the only assertion of this category.

**DFD generic standard case example**
Case Name: Verify the component is observable and traceable in abnormal scenarios
`dfx_type`: DFD
Precondition: the component is running normally
Test Steps: construct an invalid input or a fault injection (triggering means only), and inspect the logs and status/metric output
Expected Results:
- The abnormal behavior has a clear ERROR log record
- The log contains the error cause, trigger location, and key context
- No silent failures, no black-box exceptions
- Do not use "request failed / business rejected" as the only expected result of this case (that assertion belongs to FIT)

### 2.3 DFS Serviceability Design

**Core verification goal**
The component fits containerized standard ops processes: deployment, upgrade, rollback, config change, scaling, and start/stop.

**Generic check points**
- Deployed with standard orchestration such as docker-compose, service definitions externalized
- Supports upgrade/rebuild without interruption or dirty data
- Config files externalized, not baked into the image
- Supports config hot reload or smooth-restart taking effect (assert the ops mechanism itself; "business functions take effect per spec after a business config change" belongs to FIT and must not be copied in detail as DFS)
- Supports version rollback and fast recovery
- Supports horizontal instance scaling without state conflicts

**DFS generic standard case example**
Case Name: Verify component upgrade/rebuild has no service interruption
`dfx_type`: DFS
Precondition: the component is running stably
Test Steps: perform a compose upgrade/rebuild and continuously observe the component running state
Expected Results:
- Old and new instances are replaced smoothly, with no service interruption or restart storm
- Service state is normal after the upgrade completes
- Complies with containerized rolling-release ops standards

### 2.4 DFR Reliability Design

**Core verification goal**
The component has fault tolerance, self-healing, and isolation capabilities under abnormal environments, resource fluctuations, process anomalies, and network anomalies.

**Generic check points**
- Automatic restart and recovery after process crash or abnormal exit
- A single task failure does not affect the overall service (fault isolation)
- Retry/circuit-breaker protection under network jitter and timeouts
- No meltdown under resource insufficiency, with degradation protection
- Startup failure is retryable and does not affect other services in the same environment

**DFR generic standard case example**
Case Name: Verify the component self-heals and recovers after abnormal exit
`dfx_type`: DFR
Precondition: the component is running normally
Test Steps: manually kill the component process or stop its container, and observe the rebuild and recovery state
Expected Results:
- The compose restart policy / daemon process automatically brings the service back up
- The component automatically recovers to the running state
- A single-instance failure does not affect other services in the same compose environment

### 2.5 DFP Performance Design

**Core verification goal**
Component resource overhead is controlled, long-term running is stable, there is no meltdown under high load, and there are no resource leaks.

**Generic check points**
- Stable CPU/memory usage without continuous growth or leaks
- No blocking or freezing under high concurrency/high task volume
- No leaks of connections, handles, threads/coroutines
- Stable processing latency without severe performance spikes
- Supports resource limit control without preempting host resources

**DFP generic standard case example**
Case Name: Verify the component has no resource leaks during long-term running
`dfx_type`: DFP
Precondition: the component is running normally
Test Steps: run continuously for a period and observe the CPU and memory trends of the container/process (docker stats or the service's own metrics)
Expected Results:
- Memory shows no continuous growth or leaks
- CPU usage is stable without abnormal high load
- Stable long-term running without restarts or OOM

### 2.6 DFNS Security Design

**Core verification goal**
The component has security mechanisms such as identity authentication, authorization, encryption, and auditing, can resist common security threats, and protects data confidentiality, integrity, and auditability.

**Generic check points**
- Identity authentication and access authorization mechanisms (Token/mTLS, etc.)
- Sensitive data encrypted in transmission and storage (TLS, key management)
- Audit logs for key operations, traceable
- Input validation against injection (SQL/command/path traversal, etc.)
- Least privilege, no privilege escalation or default high-risk configuration
- Dependent components free of known high-risk vulnerabilities

**DFNS generic standard case example**
Case Name: Verify component interface authorization and unauthorized-access interception
`dfx_type`: DFNS
Precondition: the component is running normally with authorization enabled
Test Steps: invoke component interfaces with an unauthorized/invalid token and observe the response
Expected Results:
- The interface returns an authorization-failure status code (e.g. 401/403)
- The illegal request is intercepted without executing business logic
- The authorization-failure behavior is recorded in audit logs

### 2.7 DFC Compatibility Design

**Core verification goal**
The component maintains interface and behavior compatibility across multi-version, multi-environment, and multi-dependency combinations; no breaking changes appear in upgrade, integration, or coexistence scenarios.

**Generic check points**
- Interfaces are backward compatible; version upgrades do not break existing callers
- Compatible with upstream/downstream multi-version dependencies (API, config, data formats)
- Multi-language SDK interoperability is consistent (Java ↔ Python A2A-T)
- Consistent behavior across operating systems and architectures (x86/arm)
- Old and new versions can coexist briefly during upgrade/rollback
- Config changes provide a compatibility policy or deprecation notice
- Dependent component version changes do not affect core functions

**DFC generic standard case example**
Case Name: Verify component interface backward compatibility across versions
`dfx_type`: DFC
Precondition: an N-1 version caller and the current version of the component exist
Test Steps: call the current version of the component interface with the N-1 version client
Expected Results:
- Interface fields, protocol, and behavior remain backward compatible
- The caller works without modification
- Compatibility behavior is observable with an explicit compatibility scope statement

**Multi-language SDK interoperability example**
Case Name: Verify A2A-T task interoperability between the Java and Python SDKs
`dfx_type`: DFC
Precondition: the Java SDK client and the Python SDK server are started per the compose environment
Test Steps: use the Java SDK to send a Task-T task to the Python SDK server
Expected Results:
- The task is dispatched and responded to per the A2A-T protocol
- Both sides have consistent serialization/deserialization behavior for protocol primitives
- No field loss or semantic deviation due to language differences

## 3. Test Case Field Design

**Core principles: atomicity, repeatability, traceability, completeness, independence**

The 16-column field rules are as follows (header order fixed, verbatim identical to the official template; see `../test-cases-generator/templates/case-template.csv`):

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

Generic fields (Milestone/Case Name/Module/Requirement Link/Priority/Precondition/Expected Result/Automatable/Automated Test/Dev Owner/Test Owner) follow the same rules as FIT authoring guide §3; only the DFX differences are listed below.

### Case ID (required)

- The ID is unique within the feature scope
- Format: wrapped in square brackets `[DFX-<feature>-<topic>-<3-digit seq>]`, e.g. `[DFX-registry-center-reliability-001]` (framework §6.1 does not define a dedicated DFX ID; the FIT pattern is reused); when referenced in code, write the ID without the square brackets
  - `feature`: lowercase hyphenated feature/repo name, consistent with the "Module" column
  - `topic`: lowercase hyphenated short name of the DFX scenario this case belongs to (e.g. `health-probe`, `log-diagnosis`, `upgrade-rollback`)
- English letters, digits, and hyphens only; no Chinese, underscores, spaces, or special characters

### Case Type (required)

- Fill per the §2 "DFX type → case type mapping" table with the English enum: `Functional Test` (DFT/DFD) / `Deployment Test` (DFS) / `Stability Test` (DFR) / `Performance Test` (DFP, `Stress Test` for stress scenarios) / `Security Test` (DFNS) / `Compatibility Test` (DFC)
- Cases involving A2A-T protocol primitives fill `Protocol Test`
- One case maps to exactly one DFX type; typical problem: one case stuffed with multiple DFX assertions (should be split into multiple cases)

### Priority (required)

- **P0**: core observable/serviceable main paths (feature acceptance-level non-functional capabilities)
- **P1**: key diagnosability and reliability
- **P2**: extended DFX scenarios and performance boundaries (DFX cases are written into this DFX table and must **not** be mixed into the FIT table)
- DFX cases are mostly P2; core acceptance-level cases may be raised to P0/P1, with justification in the coverage summary

### Precondition (required)

- Describe the pre-configured environment, component state, and monitoring tools (software versions, hardware, network environment)
- **Explicit environment elements**: state the compose service components and versions, ports, metrics endpoints, monitoring tools, preset data, etc.
- Every statement is numbered: `arabic numeral` + `. ` (half-width period and space, official template style), starting from 1
- Preconditions are **not** test steps: no operations such as API invocation; no more than 10 steps

### Steps (required)

- Each step is numbered: `arabic numeral` + `. ` (half-width period and space)
- Steps whose operation results need checking end with `see result N`, where N is the number in "Expected Result"
- Each independent step is numbered independently; consecutive independent steps must not be merged under one number
- State the operation entry, commands, API paths, test parameters, and observation windows
- **The last step must be a cleanup action** (framework §6.3): restore injected faults, delete stress-test data, revert config, etc., ensuring case independence and repeatability
- No more than 10 steps recommended
- Typical problems: non-executable or ambiguous steps, missing commands and parameters

### Expected Result (required)

- Each expected result is numbered: `arabic numeral` + `.`
- No ambiguity or vague descriptions; use explicit data assertions: HTTP status codes, log levels and keywords, metric names and thresholds, health/metrics endpoint fields, container/process resource data
- Expected result numbering should match the corresponding steps; when one step corresponds to multiple results, use `see result N` to state the correspondence
- **Prohibited**: business results as the only assertion (business correctness belongs to FIT); invalid input asserts only diagnosability; config change asserts only ops/testability mechanisms
- Typical problems: non-verifiable statements like `works fine`, `no exception`

### Notes (required keys + optional supplements)

Keys are separated by `;` (or `;`), and multiple values within a key are separated by `|`:

- `dfx_type:DFT|DFD|DFS|DFR|DFP|DFNS|DFC`: **required for every case**, consistent with the case-type mapping; the basis for seven-dimension coverage checks
- `checkpoint_source:<design-doc section/source path>`: recommended, to ease review traceability
- `language_profile:python|java|js|shell`: **required for every case**; defaults to the primary language of the repo under test; for cross-component cases, use the language of the repo where the tests land
- `Component Deps` (separate 5th column): **required for every case**; `n/a` when there is no cross-component dependency; multiple separated by `;`; not written into Notes
- `protocol_primitive:none|Task-T|Notification-T|Negotiation-T|Authorization-T`: **required for every case**; fill the corresponding primitive for A2A-T protocol cases, `none` for pure REST
- `environment:docker-compose|with-workload-cluster|online|offline`: **required for every case** (framework §6.4 environment dimension): fill the real runtime environment of the case, for CI environment filtering
- `execution_strategy:smoke|full|slow`: **required for every case**: core observable/serviceable acceptance fills `smoke`, regular DFX fills `full`, long-stability/stress and other time-consuming scenarios fill `slow`
- Supplementary notes: material differences, to-be-confirmed items, reasons for non-automation, etc.
