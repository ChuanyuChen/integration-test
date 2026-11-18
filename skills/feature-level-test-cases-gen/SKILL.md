---
name: feature-level-test-cases-gen
description: Generate feature-level integration test (FIT) case CSVs (16-column case table: 15 official openan columns + component_deps as a separate column) from openAN feature proposals, design docs, API docs, and target repository source code. Only business functional correctness scenarios; no DFX non-functional items; annotate each case in Notes with language_profile/component_deps/protocol_primitive for direct consumption by e2e-test-code-gen. Use when the user asks to generate feature-level integration test cases, FIT cases, or a feature integration test table.
---

# Feature-level Test Cases Gen

Based on the feature materials provided by the user, generate the **Feature-level Integration Test (FIT)** case table (CSV, 16 columns = 15 official openan columns + Component Deps as a separate 5th column, header identical to `../test-cases-generator/templates/case-template.csv`). Produce only FIT cases; do not generate unit tests, functional tests, or DFX non-functional cases.

FIT **only** keeps business functional correctness scenarios: deployment readiness, main path, functional config changes, business state transitions, and business-level negative validation. Anything else — killing processes / container self-healing, resource-insufficiency degradation, dependency failure recovery, or probes/logs/metrics/performance/security/compatibility — must never be written into this table and belongs to DFX. The ownership rules take [references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md) as the single source of truth.

## Mandatory References (must read before every generation)

1. **[references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md)** — primary FIT/DFX scenario ownership rules and the actionable decision table (**read before the authoring guide**)
2. **[references/fit-case-authoring-guide.md](references/fit-case-authoring-guide.md)** — FIT definition (§1), design methods (§2.1–§2.6), and field rules (§3)
3. **[references/registry-center-agent-registration--fit-test-cases.csv](references/registry-center-agent-registration--fit-test-cases.csv)** — production delivery format and writing style

### Authoring Guide (must cover)

- Ownership criteria §1–§5: FIT allowed scope, DFX scenarios prohibited from FIT, error guessing boundaries
- §1 FIT definition and core principles (atomicity, repeatability, traceability, completeness, independence); FIT does not include DFX
- §2 design methods and selection rules: overview (§2.1), equivalence partitioning (§2.2), boundary value analysis (§2.3), orthogonal experiment (§2.4), state transition (§2.5), error guessing (§2.6, business-level negative cases only); annotate the method used in Notes
- §3 field requirements, self-check items, and typical problems (including **explicit environment elements** in preconditions, the Notes-column key rules `language_profile` / `protocol_primitive` / `execution_strategy` / `environment`, and the separate 5th column `Component Deps`); P2 does not mean "DFX cases allowed"

### Production Sample CSV (align with it; do not copy the row count)

Abstract **style and structure** from the sample and write the current feature's content into it; do not mechanically copy scenarios:

| Alignment Item | Sample Manifestation |
|--------|----------|
| Column structure | 16-column header (15 official openan columns + Component Deps as the 5th column) (`Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes`) |
| ID | `[FIT-registry-center-agentcard-001]` → for the current feature `[FIT-<feature>-<topic>-<3-digit seq>]` (wrapped in square brackets; feature=feature/repo name, topic=functional scenario, lowercase hyphenated; charset limited to English letters, digits, and hyphens) |
| Case type | Main path/deployment/config/state transition → `Functional Test`; business-level negative cases → `Exception Test`; A2A-T protocol primitives → `Protocol Test` |
| Precondition/step numbering | Preconditions and steps are numbered `1. `, `2. ` (official template style); expected results use `1.` `2.` |
| Cleanup action | The last step of the Steps description is cleanup (delete the test data/services created); the expected result contains a corresponding verifiable assertion |
| Scenario tiers | P0: service deployment readiness, registration main path, status reporting, functional config updates; P1: business correctness under concurrency/idempotency, cross-component business integration; P2: business-level negative cases and boundary values. "Data preserved after process restart" in the sample only illustrates the writing style; **newly generated FIT must not** include self-healing/restart recovery (belongs to DFR) |
| Assertion granularity | HTTP status codes, response body fields, query results, and other business-observable outcomes |
| Automatable | P0/P1 rows must be `Yes` (framework §4.3.1 acceptance; §8.1 TRR entry); P2 may be `No` with the reason stated in Notes |
| Notes keys | Every case requires `language_profile` (python/java/js/shell), `protocol_primitive` (A2A-T primitive, otherwise `none`), `environment` (framework §6.4, e.g. docker-compose, with-workload-cluster, online, offline), `execution_strategy` (smoke/full/slow); also write `design_method:xxx` |
| User-required columns | "Milestone", "Requirement Link", and "Dev/Test Owner" may be empty in the sample; **still follow this skill's user-required-column rules** — do not infer values the user did not provide just because the sample has them filled |

If the user specifies another reference CSV, its column order and style take precedence; the authoring guide remains the compliance baseline.

## Inputs

| Input | Description |
|------|------|
| Feature materials (at least one, **required**) | Feature proposal, design doc, API doc, user manual |
| Optional: target repository source code | openAN repositories (Python / Java / JS / Shell services, docker-compose orchestration, A2A-T SDKs) |
| Optional: reference case CSV | Overrides the default sample as the style baseline; if not specified, use `references/registry-center-agent-registration--fit-test-cases.csv` |
| Feature/module name (**required**) | Written into the "Module" column and used for file naming and the feature segment of IDs; stop if missing — do not infer from materials |
| Requirement links (optional) | List of requirement/Issue/PR links (e.g. `https://github.com/project-openan/registry-center/issues/1`); written into "Requirement Link". **Required for P0/P1 rows (hard requirement); P2 rows may be left blank**. Extract from materials if not specified; if materials contain none and P0/P1 cases exist, record it in the information-gap list |
| Milestone (optional) | When the user specifies a version (e.g. `26-winter`, format `<YY>-<season>`), write it into "Milestone"; otherwise leave the column blank |
| Output path | If not specified, propose `outputs/<target repo>_<feature name>-fit-test-cases.csv` (e.g. `outputs/registry-center_agent-registration-fit-test-cases.csv`); use the user-given path when provided |

If feature materials or the feature/module name are missing, **stop** and list all missing items at once; do not create directories or write CSVs. Options not specified by the user must be left **blank** — no inference or placeholders. Other gaps go into the **information-gap list**; do not fabricate API behaviors not present in the materials.

**Source code**: supplements observable points such as status codes, response fields, error messages, and log keywords; actual runtime behavior wins when it conflicts with docs, and the difference is recorded in Notes.

## Outputs

Delivery order: **information-gap list** (if any) → **coverage strategy summary** → **CSV file** → **quality self-check**.

### CSV Header (16 columns, fixed, official openan template)

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

> The header matches openan-itest `docs/templates/testcases-template.csv` (single source of truth: `../test-cases-generator/templates/case-template.csv`). `Component Deps` is a separate 5th column; `language_profile`/`protocol_primitive` are written as key-value pairs in the "Notes" column (separated by `;`) for `e2e-test-code-gen` to parse and consume; "Automated Test" stays blank at generation time and is backfilled by `e2e-test-code-gen` with `<test file>::<test function>` after test code is generated.

### Test Plan and Archiving

- Test plans follow the authoritative template [../test-cases-generator/references/test-plan-template.md](../test-cases-generator/references/test-plan-template.md) (copied as-is from the integration-test repository `docs/templates/`)
- The test plan and the case CSV are archived together to `docs/plans/<version>/`; the archived case CSV filename is `testcases-<feature>.csv` (same directory as the test plan)
- Milestone value format `<YY>-<season>` (e.g. `26-winter`), corresponding to the archive directory `docs/plans/<version>/`

### Field Rules (aligned with authoring guide §3)

**Filled after user input; left blank if not specified**:

| Column | Rule |
|----|------|
| Milestone | Fill when the user specifies a release version; format `<YY>-<season>` (e.g. `26-winter`), corresponding to archive directory `docs/plans/<version>/` |
| Module | Fill when the user specifies the feature/module name |
| Requirement Link | Required for P0/P1 rows (hard requirement); P2 rows may be blank. Fill when the user provides or the materials contain requirement/Issue/PR links; if neither and P0/P1 cases exist, record in the information-gap list |
| Automated Test | Blank at generation time; backfilled after automation lands |
| Dev Owner | Fill when specified by the user |
| Test Owner | Fill when specified by the user |

**May be filled by the generation process** (must comply with the field rules in authoring guide §3):

| Column | Key Points |
|----|------|
| Case Name | Verb-object phrase, ≤50 characters; see guide §3 "Case Name" |
| Case ID | `[FIT-<feature>-<topic>-<3-digit seq>]` (wrapped in square brackets), e.g. `[FIT-registry-center-agentcard-001]`; feature is the feature/repo name (lowercase hyphenated, consistent with the "Module" column), topic is the functional scenario in lowercase hyphenated form; unique within the product; charset limited to English letters, digits, and hyphens (no Chinese, no underscores); see guide §3 "Case ID" |
| Case Type | Main path/deployment/config/state transition → `Functional Test`; business-level negative cases → `Exception Test`; A2A-T protocol primitive cases → `Protocol Test` |
| Priority | P0/P1/P2 definitions in guide §3 "Priority" |
| Precondition | Numbered with `1. `, ≤10 steps, describes the environment/service/data state, with **explicit environment elements** (image versions, compose services, ports, network, auth tokens, test data, etc.), no operational steps; see guide §3 "Precondition" |
| Steps | Executable, independently numbered, `see result N`; state the API entry and parameters; **the last step must be a cleanup action** (framework §6.3, delete the test data/services created by this case); see guide §3 "Steps" |
| Expected Result | Objectively verifiable (HTTP status codes, response body fields, query results), no vagueness; numbering corresponds to steps, and includes a verifiable assertion for the cleanup step; see guide §3 "Expected Result" |
| Automatable | `Yes`/`No`; P0/P1 must be `Yes` (framework §4.3.1 acceptance; §8.1 TRR entry); P2 filled `No` must state the reason in Notes |
| Notes | `design_method:xxx` (required by guide §2); `orthogonal_factors:factorA=value1\|factorB=value2`; every case requires `language_profile:python\|java\|js\|shell`, `protocol_primitive:none\|Task-T\|Notification-T\|Negotiation-T\|Authorization-T`, `environment:<runtime environment>` (framework §6.4 environment dimension, e.g. `docker-compose`, `with-workload-cluster`, `online`, `offline`, for CI environment filtering), `execution_strategy:smoke\|full\|slow` (consumed by e2e-test-code-gen and CI trigger filtering); plus material differences, to-be-confirmed items, and reasons for non-automation |

### CSV Writing

- Multi-line cells are wrapped in double quotes with newlines preserved.
- When the design method has no dedicated column, write it in Notes: `design_method:Scenario Method`.
- Orthogonal combination: `orthogonal_factors:factorA=value1|factorB=value2`.
- Notes keys are separated by `;` (or `;`), and multiple values within a key use `|`; multiple components in the 5th column `Component Deps` are separated by `;` (e.g. `registry-center;orchestration-center`); fill `n/a` when only the module under test itself is involved (the former `none` is deprecated).
- The file must be **UTF-8 with BOM** (EF BB BF): without BOM, Excel/WPS opens it using the system ANSI codepage (GBK on Chinese Windows) and Chinese appears garbled. After writing the CSV you must run `node scripts/ensure-bom.cjs <CSV path>` (the script is in this skill's directory; use this skill's absolute path when running from another directory); if the output contains `[FAIL]`, fix it before delivery — rerunning is idempotent.

### Number of Cases

Fixed counts are forbidden. First split into a **minimum coverage set** (service deployment readiness, core main paths, business-level key negative cases) and an **extended coverage set**; the total is determined by scenarios that are material-supported and owned by FIT; select design methods per authoring guide §2.1–§2.6 and annotate them in Notes. Do not pad the count with DFX scenarios.

## Design Method Selection (corresponding to authoring guide §2.1–§2.6)

Choose one or more design methods based on the feature materials — **no mechanical application**; write `design_method:xxx` in Notes, and for orthogonal scenarios you may write `orthogonal_factors:factorA=value1|factorB=value2`.

| Method | Applicable Scenarios (§2) | Typical FIT Scenarios |
|------|----------------|---------------|
| Equivalence Partitioning | Input valid/invalid ranges are clear | Legal/illegal API field values, config parameter classes |
| Boundary Value Analysis | Numeric values or lengths have bounds | Name length limits, batch count limits, page size boundaries |
| Orthogonal Experiment | Multi-factor multi-value combinations | Registration channel / Agent type / auth method combinations |
| State Transition | Object has multiple states and transitions | Agent lifecycle (unregistered→registered→online→offline→deregistered), task state machine |
| Decision Table | Multiple condition combinations with different actions | Multi-condition scheduling/validation rule combinations |
| Error Guessing | Business-level error-prone scenarios (ownership criteria §5) | Null/illegal business input, business results under concurrency, functional rejection when a business dependency object does not exist, business operation rejected due to insufficient permission. **Prohibited**: restart recovery, kill process/container self-healing, resource-insufficiency degradation, dependency fault injection and recovery |
| Scenario Method | Multi-step branching business flows | Deploy→register→discover→config change→business-level negative cases |

## Coverage Aspects (tailor to the materials)

Select design methods per authoring guide §2.1–§2.6 and the ownership criteria, and cover **only** FIT-allowed aspects:

- Service deployment and readiness (compose startup, health checks pass), main path (end-to-end REST API / A2A-T protocol)
- Functional config changes (behavior takes effect per the new spec after modifying business config)
- Business state transitions (Agent/task per the business state machine — **not** process restart/container stop self-healing)
- Parameter matrix and business rules, business-level negative cases and boundaries
- Business correctness under concurrency, cross-component business integration (registry-center ↔ orchestration-center ↔ sdk, only when supported by materials)

**Prohibited as FIT aspects**: restart recovery, kill process/container self-healing, resource-insufficiency degradation, dependency failure recovery, probe/log/metric specific tests, performance stress tests, security audits, multi-version compatibility.

Priority tiers follow the current feature's risks; P0/P1/P2 meanings are in authoring guide §3. P2 is only the priority of complex/abnormal **business** scenarios — it does **not** mean "the FIT table may contain DFX cases".

## Generation Workflow

1. **Read** `references/fit-dfx-scenario-attribution-criteria.md`, then `references/fit-case-authoring-guide.md` (§1–§3, focus on §2.1–§2.6 design methods) and `references/registry-center-agent-registration--fit-test-cases.csv` (style; do not copy its process-restart scenarios)
2. Read the user-provided proposal/docs/target repository source code; if the user specifies another reference CSV, use it as the style baseline instead of the default sample
3. Summarize capability boundaries, environment dependencies, key APIs, and observable acceptance points (status codes, response fields, query results)
4. List candidate cases → **filter out DFX scenarios against the ownership criteria** (process/container self-healing, resource-insufficiency degradation, dependency failure recovery, probe/log/metric specific tests, etc.) → minimum set + extended set → determine the count; select a design method for each case (annotate in Notes)
5. Write the 16 columns case by case; self-check against authoring guide §3, the ownership criteria, and the sample's writing style
6. Write the CSV → run `node scripts/ensure-bom.cjs <CSV path>` to ensure UTF-8 BOM (see "CSV Writing") → output the coverage summary (declaring the DFX scenarios excluded per the ownership criteria) and the quality self-check

## Quality Self-Check

- [ ] CSV is UTF-8 with BOM (`scripts/ensure-bom.cjs` exits with `[OK]`)
- [ ] Checked against the ownership criteria and authoring guide §1–§3 (including §2.1–§2.6 design methods) and the reference production sample CSV's column structure, IDs, and writing style
- [ ] Case types are all `Functional Test`/`Exception Test`/`Protocol Test`; the 16-column header order matches the official template
- [ ] **No DFX overflow**: no process/container self-healing, resource-insufficiency degradation, dependency failure recovery, or probe/log/metric/performance/security/compatibility specific tests
- [ ] Case IDs are unique and follow `FIT-<feature>-<topic>-<3-digit seq>`; case names are ≤50 characters without heavy mutual containment
- [ ] Preconditions contain explicit environment elements; the last step is a cleanup action; steps and expected results comply with guide §3 (numbering, `see result N`, objectively verifiable)
- [ ] Notes contain the design method (required by guide §2) and the `language_profile`/`protocol_primitive`/`environment`/`execution_strategy` keys; the 5th column `Component Deps` is filled (`n/a` or an openan repo name)
- [ ] P0/P1 rows have "Automatable" = `Yes`; P0 covers service deployment readiness and the core main path; business-level key negative cases are covered (not DFR/DFP)
- [ ] The count is derived from coverage, not a fixed template; no fabricated behaviors
- [ ] Milestone, Requirement Link, Automated Test, Dev/Test Owner: all blank when not user-specified and not in materials (the Requirement Link requirement for P0/P1 is a hard requirement, and gaps are listed in the information-gap list)

## Invocation Example

```text
/feature-level-test-cases-gen

Please generate feature-level integration test cases based on docs/xxx-proposal.md and the registry-center source code.
Feature name: agent-registration
Milestone: 26-winter
Output to outputs/registry-center_agent-registration-fit-test-cases.csv
```

## Execution Instructions (Model)

1. **Must read first** the three references: [fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md) + the authoring guide + [registry-center-agent-registration--fit-test-cases.csv](references/registry-center-agent-registration--fit-test-cases.csv).
2. Verify the required inputs (at least one feature material, feature/module name); stop and list the missing items if absent.
3. Then read the user-specified proposal/docs/target repository source code; if the user provides another reference CSV, use it as the style baseline.
4. Candidate cases must be filtered through the ownership criteria before writing; the coverage summary lists the excluded DFX scenarios.
5. Output: information-gap list → coverage strategy summary → write CSV → run `scripts/ensure-bom.cjs` to add the UTF-8 BOM → quality self-check.
6. End with a declaration of: the reference paths consulted (including the ownership criteria), the material/source-code paths relied upon, and the output file path.
