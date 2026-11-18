# FIT vs DFX Scenario Attribution Criteria

This file is the **single source of truth** for FIT / DFX scenario attribution. `feature-level-test-cases-gen`, `dfx-test-cases-gen`, `test-cases-reviewer`, and `test-cases-generator` must follow this document when generating, reviewing, and deduplicating across tables; do not invent a separate set of boundary rules.

## 1. Main Rule (Judge by Verification Target)

**Judge by the verification target, not by the triggering operation.**

- Any case whose verification target is a **non-functional design capability** — probes / logs / metrics / self-healing / performance / security / compatibility — belongs to **DFX**.
- Any case whose verification target is **business functional correctness** — service reachable, main path works, business takes effect after a functional config change, business state transitions, business-level negative cases rejected — belongs to **FIT**.

The same triggering operation (invalid input, config change, killing a process, dependency unavailable, etc.) may appear once in each table, but the **assertion focus must differ**:

| Table | Allowed assertions | Prohibited assertions (as the verification target of that case) |
|----|----------|-------------------------------|
| FIT | Business-spec results: response fields/status codes, API validation rejections and business error messages, whether a business flow works per spec | Health probes, ERROR log context, self-healing/rebuild, resource curves, auth/audit, version compatibility |
| DFX | Non-functional design capabilities: health/metrics endpoints, ERROR logs and context, hot-reload mechanism, self-healing/isolation, resources and latency, auth/audit, compatibility | Merely repeating FIT business results (creation succeeded, rule took effect, invalid input rejected, etc.) with no non-functional assertion |

Do not write the **same assertion focus** as two cases placed in FIT and DFX respectively. Similar steps with different assertions do not count as duplication.

## 2. FIT Allowed Scope

FIT keeps **only** business functional correctness scenarios:

| Aspect | Meaning | Example |
|------|------|------|
| Deployment | Service starts, ports/health ready, main-path objects can be created | After `docker compose up`, health returns 200 and business objects can be registered |
| Main path | End-to-end business flow works, assertions match the functional spec | After registering an Agent, it can be queried/discovered with fields and payload matching |
| Functional config change | After changing **business config**, business behavior takes effect per the new spec | After updating Agent capabilities, a query returns the new values |
| Business state transition | Objects transition per the business state machine (including rejection of key illegal business transitions) | An Agent transitions registered→online→offline→deregistered per spec |
| Business-level negative validation | Invalid equivalence classes, out-of-boundary values, functional rejection when unauthorized | API returns 400/422 for an invalid payload with a business error message |
| Business correctness under concurrency | Business results match spec after concurrent operations (no dirty writes, eventual consistency) | Concurrently registering different Agents, each registration result independently correct |
| Cross-component business integration | Cross-component **business** collaboration when supported by materials | orchestration-center discovers Agents via registry-center and dispatches tasks |

## 3. DFX Allowed Scope (by Type)

| Abbrev. | Verification target | Allowed | Prohibited (belongs to FIT or should be deleted) |
|------|----------|------|------------------------|
| DFT | Testable, externally probeable | health/liveness/readiness endpoints, metrics/status APIs, state **externally assertable** after config change (no intrusion) | Taking "business function took effect per the new config" as the only assertion |
| DFD | Diagnosable, root-cause locatable | **ERROR logs, error context, no silent failures, error metrics** after invalid input or fault injection | Only asserting "invalid input returns 400/422" without checking logs and observability (business rejection belongs to FIT) |
| DFS | Serviceable | compose upgrade/rollback, rolling restart without interruption, config **hot-reload/smooth-restart mechanism**, graceful exit, instance scaling | Detailing "change business config → business result changed"; treating first-time deployment as a serviceability specialty |
| DFR | Reliable, self-healing, isolated | rebuild after kill process/stop container, crash self-healing, retry/circuit-breaker/recovery when dependencies are unavailable, fault isolation | Writing "creation fails because the dependent object does not exist" as a reliability case (functional negative belongs to FIT) |
| DFP | Performance, controllable resources | steady-state resource curves, stress/long-run tests, memory/CPU limits, no deadlock under high concurrency, no avalanche when resources are low | Taking whether the business main path works as the only assertion |
| DFNS | Security | unauthorized interception, audit logs, TLS/encryption, injection protection, least privilege | Only writing "business operation rejected when unauthorized" with no auth/audit assertion (functional negative belongs to FIT) |
| DFC | Compatible | N-1 clients, multi-language SDK interoperability (Java↔Python), coexistence during upgrade, config deprecation policy | Current-version business main path |

## 4. Concrete Scenario Attribution (Actionable)

| Scenario | Belongs to FIT | Belongs to DFX | Split when written on both sides | Prohibited |
|------|--------|--------|------------------|------|
| Deployment / installation | Service starts, main-path objects can be created | DFS: compose upgrade / rollback / scaling and other service operations | FIT = first-time startup readiness; DFS = upgrade/rollback process | FIT writes "rolling upgrade without interruption"; DFX only writes "functions available after startup" |
| Main path | Business end-to-end works per spec | — | Not in DFX | DFX copies FIT main-path steps one by one |
| Functional config change | **Business behavior** matches spec after the new config | DFT: state assertable via endpoint/API after change; DFS: hot-reload/smooth-restart **mechanism** | FIT = business effect; DFX = probeability or service mechanism | DFX detailing "change config → business result"; FIT taking "no restart needed" as the only goal |
| Business state transition | Agent/task transitions per the business state machine | — | Not in DFX | FIT treating kill-process rebuild as "state recovery" |
| Invalid input / negative case | API validation rejection (400/422), business error message per spec | DFD: ERROR logs, context, no silent failure, error metrics; DFNS: injection-attack interception and audit | FIT = business rejection; DFD = diagnosability | DFX asserting only the error code; FIT asserting only "there is an ERROR log" |
| Concurrency | Business results match spec after concurrency | DFP: resource/latency/no-deadlock under high concurrency | FIT = correctness; DFP = performance | FIT writing stress resource curves |
| Business dependency object missing | Spec says function should fail with a business error message | — | Not in DFR | Writing it as "dependency fault recovery" |
| Dependency service fault injection | — | DFR: retry/circuit-breaker/isolation/recovery; DFD: diagnosability after fault | Not in FIT | FIT writing self-healing after stopping a dependency |
| kill process / stop container / restart recovery | **Not in FIT** | DFR: automatic rebuild, self-healing, fault isolation | Not in FIT | FIT writing self-healing after process kill or service restart recovery |
| Insufficient resources (disk full, out of memory) | **Not in FIT** | DFR/DFP: degradation, no avalanche, limits | Not in FIT | FIT writing degradation under insufficient resources |
| Fault-injection recovery | Only when the injection triggers a **failure path in the functional spec** (e.g., function unavailable after a switch is turned off) | DFR/DFD: self-healing after injection, isolation, diagnosability | Assertion focus must differ | Both tables each write a "recovers after fault injection" with the same assertion |
| Probe / metrics | **Not in FIT** | DFT | — | FIT writing health-check specialties |
| Security auth | Spec requires business operation rejected when unauthorized (functional negative) | DFNS: 401/403, audit, encryption, injection protection | FIT = business rejection; DFNS = security mechanism | FIT writing TLS/audit specialties |
| Multi-version / multi-language SDK compatibility | **Not in FIT** | DFC | — | FIT writing compatibility specialties |

## 5. Boundary of Error Guessing in FIT

When FIT uses error guessing, it **only** supplements business-level error-prone scenarios:

- Allowed: null/invalid business input, business results under concurrency, functional rejection when a business dependency object is missing, business operation rejected due to insufficient permission
- **Prohibited** in FIT: restart recovery, kill process / stop container self-healing, degradation under insufficient resources, dependency service fault injection and recovery, network-partition self-healing (all of the above belong to DFR/DFP/DFD)

## 6. Cross-Table Duplication Determination

When both a FIT CSV and a DFX CSV exist, determine duplication per the table below (must be recorded in the boundary check and marked as failing):

| Determination | Condition | Handling |
|------|------|------|
| **Duplicate** | The triggering operation is the same (or a synonymous rewrite) **and** the assertion focus is the same (both verify business results, or both verify the same non-functional capability) | Delete or rewrite one of them so the assertion focus returns to its owning table |
| **Out of scope** | A FIT row's verification target belongs to §3; or a DFX row's verification target belongs to §2 with no non-functional assertion | Move the case to the correct table, or delete it |
| **Legitimate coexistence** | Triggers are similar but assertion focuses fall into §2 and §3 respectively (e.g., FIT asserts an invalid payload is rejected while DFD asserts the corresponding ERROR log) | Keep; record "legitimate coexistence" in the boundary check |

Similar names or similar steps with different assertions do **not** count as duplication.

## 7. How to Execute During Generation and Review

1. After listing candidate cases, first determine the verification target using the main rule in §1, then classify using the §4 table.
2. FIT generation: eliminate DFX scenarios per §2 and §5 before writing to CSV.
3. DFX generation: eliminate FIT business copies per §3 and §4 before writing to CSV; if a FIT artifact exists, do not copy its business steps one by one and take business results as the only assertion.
4. Orchestration layer: run the §6 cross-check on both CSVs and produce the boundary check report; during review, pass the counterpart CSV (and the boundary check conclusion) as the comparison input.
5. Any out-of-scope case or duplication → the scope **fails** and must be fixed and re-reviewed; legitimate coexistence does not count as failure.
