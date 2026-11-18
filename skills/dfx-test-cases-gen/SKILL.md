---
name: dfx-test-cases-gen
description: Generate DFX (Design for X) non-functional test case CSVs (16-column case table: 15 official openan columns + component_deps as a separate column) from openAN feature proposals, design docs, API docs, user manuals, target repository source code, and FIT cases. Only non-functional items; never duplicate FIT business main paths or business negative cases; annotate each case in Notes with language_profile/component_deps/protocol_primitive for direct consumption by e2e-test-code-gen. Use when the user asks to generate DFX test cases or non-functional integration test tables such as DFT/DFD/DFS/DFR/DFP/DFNS/DFC.
---

# DFX Test Cases Gen

Based on the feature materials provided by the user, generate the **DFX (Design for X)** non-functional test case table (CSV, 16 columns = 15 official openan columns + Component Deps as a separate 5th column, header identical to `../test-cases-generator/templates/case-template.csv`). Produce only DFX cases; do not generate unit tests, functional tests, or feature-level integration test (FIT) cases.

DFX tests verify non-functional design capabilities such as serviceability, observability, deployability, high reliability, and controlled performance. Any case whose verification goal is a non-functional design capability — probes / logs / metrics / self-healing / performance / security / compatibility — belongs to DFX; business functional correctness scenarios belong to FIT and must not be copied in detail. The ownership rules take [references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md) as the single source of truth.

## Skill Independence Notes

- Invoking `@dfx-test-cases-gen` does **not** automatically load other test-cases-gen skills; each skill injects only its own `SKILL.md` and the files you @ in the conversation.
- This skill must **not** depend on files under other skill directories; required specifications and samples are all placed in this directory's `references/`.
- The boundary with FIT in this document is governed by `references/fit-dfx-scenario-attribution-criteria.md` in this directory; reading other skills is not required.

## Mandatory References (must read before every generation)

1. **[references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md)** — primary FIT/DFX scenario ownership rules; the split of invalid input, config change, etc. with FIT (**read before the authoring guide**)
2. **[references/dfx-case-authoring-guide.md](references/dfx-case-authoring-guide.md)** — DFX definition (§1), the seven design method categories and generic check points (§2.1–§2.7), and field rules (§3)
3. **[references/registry-center-agent-registration--dfx-test-cases.csv](references/registry-center-agent-registration--dfx-test-cases.csv)** — DFX seven-dimension sample (one case each for DFT/DFD/DFS/DFR/DFP/DFNS/DFC), showing the 16-column order, multi-line cells, cleanup steps, and the `dfx_type` and Notes orchestration-key conventions (writing-style reference only; scenarios must be rewritten for the current feature's DFX needs)

### Authoring Guide (must cover)

- Ownership criteria: the split of invalid input / config change / fault injection with FIT; FIT business main paths must not be copied
- §1 DFX definition: lifecycle-wide non-functional dedicated verification; divided from FIT by verification goal
- §2 common DFX categories and test case design methods: the **core verification goal**, **generic check points**, and standard case examples (§2.1–§2.7) for DFT, DFD, DFS, DFR, DFP, DFNS, and DFC, plus the DFX-type → case-type mapping
- §3 field requirements, self-check items, and typical problems (including **explicit environment elements** in preconditions, the Notes-column key rules `language_profile` / `protocol_primitive` / `execution_strategy` / `environment` / `dfx_type`, and the separate 5th column `Component Deps`)

### Production CSV Writing Style (align with it; do not copy the row count)

Abstract **style and structure** from the sample CSV and write the current feature's DFX scenarios into it; do not mechanically copy sample rows or case intents:

| Alignment Item | Requirement |
|--------|------|
| Column structure | 16-column header (15 official openan columns + Component Deps as the 5th column) (`Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes`) |
| ID | Use `[DFX-<feature>-<topic>-<3-digit seq>]` (wrapped in square brackets) as in the sample, e.g. `[DFX-registry-center-testability-001]` (feature=feature/repo name, topic=non-functional scenario, lowercase hyphenated; charset limited to English letters, digits, and hyphens) |
| Case type | Mapped from the Notes key `dfx_type:DFx`: DFT/DFD→`Functional Test`, DFS→`Deployment Test`, DFR→`Stability Test`, DFP→`Performance Test` (`Stress Test` for stress scenarios), DFNS→`Security Test`, DFC→`Compatibility Test`; the DFX dimension is expressed via the Notes key `dfx_type:DFT|DFD|DFS|DFR|DFP|DFNS|DFC` |
| Precondition/step numbering | Preconditions and steps are numbered `1. `, `2. ` (official template style); expected results use `1.` `2.` |
| Cleanup action | The last step of the Steps description is cleanup (restore config, delete injected faults / produced data / temporary containers) |
| Assertion granularity | Verifiable items: API return codes, health/probe status, log levels and keywords, metrics endpoint indicators, resource curves (docker stats), etc. |
| Scenario tiers | P0: core probeable/serviceable main paths; P1: key diagnosability and reliability; P2: performance boundaries, extended DFX scenarios; P0/P1 rows must have "Automatable" = `Yes` |
| Notes keys | Every case requires `language_profile` (python/java/js/shell), `protocol_primitive` (A2A-T primitive, otherwise `none`), `environment` (framework §6.4, e.g. docker-compose, online, offline), `execution_strategy` (smoke/full/slow), `dfx_type:DFx` |
| User-required columns | Write "Milestone" only when the user provides it; **otherwise leave blank — no inference from materials**; same for "Requirement Link" and "Dev/Test Owner" |

If the user specifies another reference CSV, its column order and style take precedence; the authoring guide remains the compliance baseline.

## Inputs

| Input | Description |
|------|------|
| **Feature materials (at least one, required)** | Feature proposal, design doc, interface/API doc, user manual/ops doc, target repository source code, feature-level integration test (FIT) cases, etc. |
| Optional: reference case CSV | Overrides the default writing style; if not specified, use `references/registry-center-agent-registration--dfx-test-cases.csv` |
| Feature/module name (**required**) | Written into the "Module" column and used for file naming and the feature segment of IDs; stop if missing — do not infer from materials |
| Requirement links (optional) | List of requirement/Issue/PR links; written into "Requirement Link". **Required for P0/P1 rows (hard requirement); P2 rows may be left blank**. Extract from materials if not specified; if materials contain none and P0/P1 cases exist, record in the information-gap list |
| Milestone (optional) | When the user specifies a version (e.g. `26-winter`, format `<YY>-<season>`), write it into "Milestone"; otherwise leave the column blank |
| Output path | If not specified, propose `outputs/<target repo>_<feature name>-dfx-test-cases.csv` (e.g. `outputs/registry-center_agent-registration-dfx-test-cases.csv`); use the user-given path when provided |

**Hard requirement**: when the user provides no feature materials at all (proposal, design, interface, user docs, source code, FIT cases, etc.), **do not start generation**; prompt the user to provide at least one reference material.

Options not specified by the user must be left **blank** — no inference or placeholders. Other gaps go into the **information-gap list**; do not fabricate interfaces, probe paths, metric names, or ops processes not present in the materials.

**Source code / FIT cases**: supplement observable and operational acceptance points such as health endpoints, log keywords, metrics paths, compose orchestration, restart policies, and resource limits; actual runtime behavior wins when it conflicts with docs, and the difference is recorded in Notes.

## Outputs

Delivery order: **information-gap list** (if any) → **coverage strategy summary** (including selected DFX types and reasons) → **CSV file** → **quality self-check**.

### CSV Header (16 columns, fixed, official openan template)

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

> The header matches openan-itest `docs/templates/testcases-template.csv` (single source of truth: `../test-cases-generator/templates/case-template.csv`). `Component Deps` is a separate 5th column; `language_profile`/`protocol_primitive`/`execution_strategy`/`environment`/`dfx_type` are written as key-value pairs in the "Notes" column (separated by `;`) for `e2e-test-code-gen` to parse and consume; "Automated Test" stays blank at generation time and is backfilled by `e2e-test-code-gen` with `<test file>::<test function>` after test code is generated.

### Test Plan and Archiving

- Test plans follow the authoritative template [../test-cases-generator/references/test-plan-template.md](../test-cases-generator/references/test-plan-template.md) (copied as-is from the integration-test repository `docs/templates/`)
- The test plan and the case CSV are archived together to `docs/plans/<version>/`; the archived case CSV filename is `testcases-<feature>.csv` (same directory as the test plan)
- Milestone value format `<YY>-<season>` (e.g. `26-winter`), corresponding to the archive directory `docs/plans/<version>/`

### Field Rules (aligned with authoring guide §3)

**Filled after user input; left blank if not specified**:

| Column | Rule |
|----|------|
| Milestone | Fill when the user specifies a release version; format `<YY>-<season>` (e.g. `26-winter`), corresponding to archive directory `docs/plans/<version>/`; do not write otherwise |
| Module | Fill when the user specifies the feature/module name |
| Requirement Link | Required for P0/P1 rows (hard requirement); P2 rows may be blank. Fill when the user provides or the materials contain requirement/Issue/PR links; if neither and P0/P1 cases exist, record in the information-gap list |
| Automated Test | Blank at generation time; backfilled after automation lands |
| Dev Owner | Fill when specified by the user |
| Test Owner | Fill when specified by the user |

**May be filled by the generation process** (must comply with the field rules in authoring guide §3):

| Column | Key Points |
|----|------|
| Case Name | Verb-object phrase, ≤50 characters; a DFX abbreviation prefix is recommended to express intent, e.g. "Verify the health probe endpoint can be invoked automatically"; see guide §3 "Case Name" |
| Case ID | `[DFX-<feature>-<topic>-<3-digit seq>]` (wrapped in square brackets), e.g. `[DFX-registry-center-agentcard-001]`; feature is the feature/repo name (lowercase hyphenated, consistent with the "Module" column), topic is the non-functional scenario in lowercase hyphenated form; unique within the product; charset limited to English letters, digits, and hyphens (no Chinese, no underscores); see guide §3 "Case ID" |
| Case Type | Mapped from the Notes `dfx_type` key: `Functional Test` (DFT/DFD), `Deployment Test` (DFS), `Stability Test` (DFR), `Performance Test` (DFP, `Stress Test` for stress scenarios), `Security Test` (DFNS), `Compatibility Test` (DFC); one case maps to exactly one DFX type (guide §2 mapping table) |
| Priority | DFX cases are mostly P2 (see guide §3 "Priority"); core acceptance-level observable/operational capabilities may be P0/P1, with justification in the coverage summary |
| Precondition | Numbered with `1. `, ≤10 steps, describes the environment/service/component state/monitoring tools, with **explicit environment elements** (image versions, compose services, ports, metrics endpoints, etc.), no operational steps; see guide §3 "Precondition" |
| Steps | **Must be executable and unambiguous**; independently numbered; state commands, API paths, parameters, and observation windows; steps whose results need checking end with `see result N`; **the last step must be a cleanup action** (restore config, delete injected faults and test data); see guide §3 "Steps" |
| Expected Result | **As detailed and objectively verifiable as possible**; include HTTP status codes, log levels and keywords, metric names and thresholds, health/metrics endpoint fields, container/process resource data, etc.; vague statements like "normal" or "no exception" are prohibited; see guide §3 "Expected Result" |
| Automatable | `Yes`/`No`; P0/P1 must be `Yes` (framework §4.3.1 acceptance; §8.1 TRR entry); P2 filled `No` must state the reason in Notes |
| Notes | Required `dfx_type:DFx` (DFT/DFD/DFS/DFR/DFP/DFNS/DFC, consistent with the segments in the case ID); every case requires `language_profile:python\|java\|js\|shell`, `protocol_primitive:none\|Task-T\|Notification-T\|Negotiation-T\|Authorization-T`, `environment:<runtime environment>` (framework §6.4, e.g. `docker-compose`, `with-workload-cluster`, `online`, `offline`, for CI environment filtering), `execution_strategy:smoke\|full\|slow`; also record check-point sources (design-doc sections/source paths), material differences, and to-be-confirmed items |

### CSV Writing

- Multi-line cells are wrapped in double quotes with newlines preserved.
- Metric thresholds explicitly stated in the materials go into Expected Result; uncertain ones go into the information-gap list instead of being guessed.
- The file must be **UTF-8 with BOM** (EF BB BF): without BOM, Excel/WPS opens it using the system ANSI codepage (GBK on Chinese Windows) and Chinese appears garbled. After writing the CSV you must run `node scripts/ensure-bom.cjs <CSV path>` (the script is in this skill's directory; use this skill's absolute path when running from another directory); if the output contains `[FAIL]`, fix it before delivery — rerunning is idempotent.

### Number of Cases

Fixed counts are forbidden, and **padding cases to complete all seven DFX categories is forbidden**. First analyze the non-functional dimensions the feature involves, then split into a **minimum coverage set** and an **extended coverage set**; the total is determined by material-supported scenarios.

## DFX Type Selection (tailor to the feature; corresponds to authoring guide §2.1–§2.7)

**All seven DFX categories are not required**. Based on the feature proposal, design, interface, ops docs, source code, and FIT cases, determine which non-functional designs the feature actually involves, and write only material-supported categories. When writing, check each category's **core verification goal** and **generic check points** in authoring guide §2, and land them with the feature's concrete component names, commands, and interfaces.

| Abbr. | Full Name | Core Verification Goal (§2) | Generic Check Points Summary | Typical Verification Directions |
|------|------|-------------------|----------------|--------------|
| DFT | Design for Testability | Easy to automate tests and probe externally | Health/liveness/readiness endpoints, structured observable output, dynamic config externally assertable, state externally identifiable | health/metrics endpoints, status APIs; **probeability** after config change (do not assert that business functions take effect) |
| DFD | Design for Diagnosability | Observable and root-cause locatable in normal/abnormal scenarios | Log levels, independent ERROR with context for exceptions, key behaviors observable, no silent failures | **ERROR logs / error-code metrics** after fault injection or invalid input (do not assert the business rejection itself) |
| DFS | Design for Serviceability | Fits containerized standard ops processes | Compose service orchestration, externalized config files, upgrade/rollback, graceful exit, instance scaling | compose up/upgrade/rollback, **hot-reload / smooth-restart mechanism**, graceful exit (do not assert that business rules take effect) |
| DFR | Design for Reliability | Fault tolerance, self-healing, and isolation under abnormal environments | Automatic restart after process crash, single-task fault isolation, retry/circuit breaking, degradation under resource insufficiency | rebuild after killing a process/stopping a container, recovery when a dependency **service** is unavailable, retry and recovery |
| DFP | Design for Performance | Controlled resources, long-term stability, no meltdown under load | Stable CPU/memory without leaks, no freeze under high concurrency, no connection/handle leaks, limit constraints | steady-state resource curves (docker stats), stress/long-run tests, OOM boundaries |
| DFNS | Design for Security | Identity authentication, authorization, encryption, and auditing; resists common security threats | Token/mTLS auth, TLS/key encryption, audit logs, input injection protection, least privilege | unauthorized-access interception (401/403), audit on auth failure, encrypted transmission of sensitive data |
| DFC | Design for Compatibility | Interface and behavior compatibility across versions/environments/dependencies | Backward-compatible interfaces, multi-language SDK interoperability, consistency across OS/architectures, coexistence during upgrade, config deprecation policy | N-1 client calling the current version, Java↔Python SDK interoperability, cross-architecture deployment, old/new version coexistence during upgrade |

**Analysis steps**:

1. Extract non-functional design commitments from the materials (probes, logs, deployment mode, reliability strategies, performance indicators, security mechanisms, compatibility requirements, etc.)
2. Map them to the DFX types in the table above, listing **applicable** and **not applicable** types with reasons
3. For applicable types, check each against the "generic check points" and standard case examples in authoring guide §2.1–§2.7, rewriting them into the current feature's concrete commands, interfaces, and metrics
4. When a DFX category has no basis in the materials, state in the coverage summary "DFX type not covered: xxx, reason: not involved in the materials"; do not force-fill cases

## Coverage Aspects (tailor to the materials)

Within the selected DFX types, common aspects include (write only when supported by materials):

- **DFT**: health/readiness endpoints, status query APIs, metrics endpoints; post-change state **externally assertable** after a config change (do not assert business results)
- **DFD**: **ERROR logs, error context, no silent failures, error statistics metrics** after invalid input or fault injection (business rejection of invalid input belongs to FIT)
- **DFS**: compose install/upgrade/rollback, **hot-reload / smooth-restart mechanism**, instance scaling, graceful exit (business effect of config changes belongs to FIT)
- **DFR**: killing a process/stopping a container, dependency service unavailable, network jitter, service retry and recovery (business failure due to a missing dependency object belongs to FIT)
- **DFP**: steady-state resource usage, stress or long-run tests, behavior under limit constraints
- **DFNS**: interception of unauthorized/invalid-token access, privilege escalation, TLS encryption, audit logs, input injection protection (business rejection when unauthorized, without security assertions, belongs to FIT)
- **DFC**: N-1 version client compatibility, multi-language SDK interoperability (Java↔Python A2A-T), multi-architecture (x86/arm) deployment, old/new version coexistence during upgrade/rollback, config-item deprecation compatibility

Priority tiers follow the current feature's non-functional risks; DFX defaults to P2, while release-acceptance-impacting core observable/operational items may be raised to P0/P1.

## Boundary with Functional Tests / FIT

**Must read first** [references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md). The following is an executive summary; details are governed by that file.

| Dimension | Functional/FIT | DFX Tests |
|------|----------|----------|
| Judgment principle | Verification goal is business functional correctness | Verification goal is a non-functional design capability |
| Allowed scenarios | Deployment readiness, main path, business effective after functional config change, business state transitions, business-level negatives | Probes, log diagnosability, ops mechanisms, self-healing, performance, security, compatibility |
| Invalid input | API validation rejection and business error message | DFD: ERROR logs, context, no silent failure; DFNS: injection and audit |
| Config change | Business behavior conforms to spec under the new config | DFT: externally assertable; DFS: hot-reload / smooth-restart mechanism |
| Fault / recovery | In-spec functional failure paths (e.g. feature unavailable after a switch is turned off) | DFR: self-healing, isolation, retry after kill process / stop container / dependency failure |

If the user also provides FIT cases: DFX **supplements** non-functional verification; do not copy FIT business steps step by step with business results as the only assertion. Invalid-input and config-change scenarios must be split per the table above, to avoid refining FIT negatives/functional scenarios into DFX.

## Generation Workflow

1. **Read** `references/fit-dfx-scenario-attribution-criteria.md`, then `references/dfx-case-authoring-guide.md` (§1–§3, focus on §2.1–§2.7 generic check points) and the sample CSV (format and numbering)
2. Confirm the user has provided at least one feature material; otherwise prompt for it
3. Read the user-specified proposal/design/interface/user docs/source code/FIT cases; if the user specifies another reference CSV, use it as the style baseline
4. **DFX type analysis**: summarize applicable types (DFT/DFD/DFS/DFR/DFP/DFNS/DFC) and inapplicable types with reasons
5. List candidate cases → **remove FIT business copies per the ownership criteria** (main paths with business results as the only assertion, functional config taking effect, business negative rejections) → minimum set + extended set → determine the count; bind exactly one DFX type to each case
6. Write the 16 columns case by case, with **steps and expected results as detailed as possible**; self-check against authoring guide §3, the ownership criteria, and the CSV writing style
7. Write the CSV → run `node scripts/ensure-bom.cjs <CSV path>` to ensure UTF-8 BOM (see "CSV Writing") → output the coverage summary (including the DFX-type mapping table and the split explanation relative to FIT) and the quality self-check

## Quality Self-Check

- [ ] CSV is UTF-8 with BOM (`scripts/ensure-bom.cjs` exits with `[OK]`)
- [ ] Checked against the ownership criteria and authoring guide §1–§3 (including §2.1–§2.7 core verification goals and generic check points) and the sample CSV's column structure, numbering, and writing style
- [ ] The user provided at least one feature material; no fabricated interfaces/metrics/operational capabilities absent from the materials
- [ ] **No FIT overflow**: business results are not the only assertion; invalid input asserts only diagnosability; config change asserts only ops/testability mechanisms
- [ ] Every Notes contains `dfx_type:DFx` (one of DFT/DFD/DFS/DFR/DFP/DFNS/DFC), and the "Case Type" column follows the mapping table and is consistent with the DFX type
- [ ] Case IDs are unique, in the format `[DFX-<feature>-<topic>-<3-digit seq>]` (wrapped in square brackets); case names are ≤50 characters without heavy mutual containment
- [ ] Preconditions contain explicit environment elements; the last step is a cleanup action; steps and expected results comply with guide §3 (numbering, `see result N`, objectively verifiable)
- [ ] **Steps are executable** (with concrete commands, paths, and parameters); **expected results are detailed** (with checkable status codes, fields, logs, and metrics)
- [ ] DFX types are derived from feature analysis, not a mechanical completion of all seven; uncovered types are explained in the coverage summary
- [ ] Notes contains the required keys `language_profile` (one of python/java/js/shell), `protocol_primitive` (primitive filled for A2A-T cases), `environment`, `execution_strategy`; the 5th column `Component Deps` is filled (`n/a` or an openan repo name); P0/P1 rows have "Automatable" = `Yes`
- [ ] The count is derived from coverage, not a fixed template
- [ ] Milestone, Requirement Link, Automated Test, Dev/Test Owner: all blank when not user-specified and not in materials (the Requirement Link requirement for P0/P1 is a hard requirement, and gaps are listed in the information-gap list)

## Invocation Example

```text
/dfx-test-cases-gen

Please generate DFX test cases based on docs/xxx-proposal.md, the design doc, the registry-center source code, and docker-compose.yaml, referencing outputs/registry-center_agent-registration-fit-test-cases.csv.
Feature name: agent-registration
Milestone: 26-winter
Output to outputs/registry-center_agent-registration-dfx-test-cases.csv
```

## Execution Instructions (Model)

1. **Must read first** the three references under this skill: [fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md) + [dfx-case-authoring-guide.md](references/dfx-case-authoring-guide.md) + [registry-center-agent-registration--dfx-test-cases.csv](references/registry-center-agent-registration--dfx-test-cases.csv).
2. Confirm the user provided at least one feature material; stop and prompt otherwise.
3. Then read the user-specified proposal/design/interface/user docs/source code/FIT cases; if the user provides another reference CSV, use it as the style baseline.
4. After completing the DFX-type applicability analysis, filter candidate cases against the ownership criteria; output: information-gap list → coverage strategy summary (selected DFX types, reasons for unselected types, split relative to FIT) → write CSV → run `scripts/ensure-bom.cjs` to add the UTF-8 BOM → quality self-check.
5. End with a declaration of: the reference paths consulted (including the ownership criteria), the material/source-code paths relied upon, the selected DFX types, and the output file path.
