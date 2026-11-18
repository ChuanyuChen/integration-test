---
name: test-cases-reviewer
description: Review test case tables (CSV/Markdown) against the openan 16-column case table (official 15 columns + a standalone component_deps column) and the review checklist — checking FIT/DFX scenario attribution boundaries and cross-table duplication, validating the 5th column component_deps and the Notes orchestration keys (language_profile/protocol_primitive/execution_strategy/environment/dfx_type), and outputting a Markdown report with pass/fail verdicts and remediation suggestions. Use when the user asks to review test cases or to validate the quality of FIT/DFX/functional test cases.
---

# Test Cases Reviewer

Performs **template compliance**, **FIT/DFX scenario attribution**, and **per-case checklist review** on test case tables (usually CSV), and outputs a Markdown review report (including failed/to-be-fixed items with remediation suggestions).

## Mandatory References (must read before every review)

1. **[references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md)** — FIT/DFX scenario attribution and cross-table deduplication (required when reviewing FIT, DFX, or the full set)
2. **[references/test-case-template.md](references/test-case-template.md)** — the 16-column header and column meanings (openan official 15 columns + component_deps; Notes column orchestration key conventions)
3. **[references/test-case-review-checklist.md](references/test-case-review-checklist.md)** — self-check items, mandatory/suggested grading, and rule descriptions (**universal baseline**, applicable to all cases)
4. **[references/fit-case-authoring-guide.md](references/fit-case-authoring-guide.md)** — FIT-specific fields and design method requirements (**required when the case type is FIT**)
5. **[references/dfx-case-authoring-guide.md](references/dfx-case-authoring-guide.md)** — DFX-specific fields and the seven design method requirements (**required when the case type is a DFX type**)

**Core principles** (consistent with the checklist): atomicity, repeatability, traceability, completeness, independence.

## Case Classification and Writing Guide Selection

Before reviewing, determine which writing guide applies to the current file/cases, then overlay the universal checklist items for per-case review.

### Decision Priority

1. **Explicit user statement** (e.g. "review the FIT cases", "review the DFX cases", "review the full test cases" in the conversation) — highest priority
2. **Filename keywords** (see the table below)
3. **The "Case Type" column and the `dfx_type` key in Notes** (after parsing the CSV, consistent row types confirm the file-level decision; if mixed, **select the guide per row**)
4. **Undeterminable** → treat as the **full test cases** of the feature/component and **consult both** the FIT and DFX writing guides

### Filename Keywords (Case-Insensitive)

| Decision | When the filename contains |
|----------|------------------|
| **FIT** | `-fit-test-cases`, `fit-test-cases`, or `FIT` (and not `DFX`) |
| **DFX** | `-dfx-test-cases`, `DFX`, `_DFT_`, `_DFD_`, `_DFS_`, `_DFR_`, `_DFP_`, `_DFNS_`, or `_DFC_` |
| **Full set** | `full-set`, only a repo/feature name without a type identifier (e.g. `agent-registration-test-cases.csv`), or any other naming that cannot be classified into FIT/DFX |

Examples:

- `registry-center_agent-registration-fit-test-cases.csv` → **FIT**
- `registry-center_agent-registration-dfx-test-cases.csv` → **DFX** (contains the `DFX` identifier)
- `agent-registration-test-cases.csv` → **Full set** (no FIT/DFX identifier)
- `agent-registration-full-set-test-cases.csv` → **Full set**
- The user says "this is a FIT table" → **FIT** (overrides the filename)

### Per-Row Selection (Mixed Tables)

If the same CSV contains both FIT types (`Functional Test`/`Exception Test`/`Protocol Test`) and DFX types (`Functional Test`/`Deployment Test`/`Stability Test`/`Performance Test`/`Stress Test`/`Security Test`/`Compatibility Test`, or Notes containing `dfx_type:xxx`) in the "Case Type" column / `dfx_type` key:

- Record the file-level decision as **Full set**
- During **per-case review**: FIT-type rows are checked against the FIT writing guide; DFX-type rows against the DFX writing guide; other types against the checklist only

### Recording in the Report

The "Review Summary" section of the review report must state:

- **File-level decision**: FIT / DFX / Full set
- **Per-row guide application**: if full set or mixed, explain the per-row selection rule
- **References used**: the list of reference files actually read and cited

## Inputs

| Input | Description |
|------|------|
| **Test case file** (required) | CSV or Markdown table; path specified by the user |
| **Case classification** (optional) | User-declared `FIT` / `DFX` / `full set`; when not declared, infer from the filename and the "Case Type" column per the rules above |
| **Counterpart case CSV** (optional) | The other artifact passed in for FIT+DFX joint review or by the orchestration layer; used for boundary re-check and cross-table deduplication. Pass the DFX CSV when reviewing FIT, and the FIT CSV when reviewing DFX |
| **Boundary check conclusion** (optional) | A boundary check report already produced by the orchestration layer; must be re-checked, and out-of-scope/duplicated cases must be included as mandatory failures — do not ignore them |
| **Target milestone/release** (optional) | When the user gives a version, validate each row's "Milestone" column against it; skip the check when not given |
| **Requirement/design materials** (optional) | Feature proposal, design docs, requirement lists; used for file-level mandatory items such as "requirement coverage", "scenario coverage", and "DFX coverage" |
| **Output path** (optional) | Defaults to `outputs/<original filename>-review-report.md` when not specified |

When the file cannot be read or the header does not match the template, state it in the report and stop the per-case review.

## Template Compliance (Review Prerequisite)

The header must have **16 columns** (openan official 15 columns + component_deps as the 5th column) in the exact order:

```text
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

The single source of truth for the header is `../test-cases-generator/templates/case-template.csv`.

The generation side requires the CSV to start with a UTF-8 BOM (EF BB BF) so Excel displays Chinese correctly. When validating the header, **strip the BOM before comparing** — do not fail the case as "template non-compliant" merely because a BOM exists.

| Check Item | Level | When Not Met |
|--------|------|----------|
| 16 columns, order matching the header above | Mandatory | Report "template non-compliant" and list the differences; do not proceed to the per-case checklist |
| Each row's column count matches the header (multi-line CSV cells parsed per the spec) | Mandatory | Mark the row as a structural error |
| Filename conforms to the convention (see checklist "Test Case File Naming Convention") | Mandatory | Record as a file-level failure |

Filename rules (consistent with the checklist "Test Case File Naming Convention"; the version segment may be omitted):

| Case Classification | Standard Format | Example |
|----------|----------|------|
| **FIT** | `[<version>_]<target repo>_<feature>`-fit-test-cases | `registry-center_agent-registration-fit-test-cases` |
| **DFX** | `[<version>_]<target repo>_<feature>`-dfx-test-cases | `registry-center_agent-registration-dfx-test-cases` |

The repo and feature must be included; when the filename is classified as FIT/DFX, its suffix must match the classification in the table above (the full-set table has no single suffix — combine by actual types or follow the user's declaration).

## Review Rules: Mandatory vs Suggested

Check each case (and the file-level items) **item by item** against [test-case-review-checklist.md](references/test-case-review-checklist.md); then append the mandatory/suggested items of **the writing guide applicable to that row**:

| Checklist "Requirement" | Review Conclusion | Written To |
|-------------------|----------|--------------|
| **Mandatory** | Not met → **Fail** | "Failed / To-Be-Fixed Items" |
| **Suggested** | Not met → **Remediation Suggestion** (the case is still marked "Pass (with suggestions)" if it passes all mandatory items) | "Remediation Suggestions" |

A single case may fail multiple mandatory items; suggested items do not alone cause a failure, unless the user requires suggestions to be treated as a hard gate.

### Review Scope Exclusions (not validated by this skill)

| Column | Description |
|----|------|
| **Notes** (parts other than orchestration keys) | Free text such as verification-point sources, material differences, and to-be-confirmed items; **per-case review does not check its content**, but the **orchestration keys** in Notes (`language_profile`/`protocol_primitive`/`execution_strategy`/`environment`/`dfx_type`) are checked per the checklist "Notes - Mandatory"; the inapplicable-dimension explanations may be read during **file-level DFX coverage** analysis |

**Rule/Basis column**: when a mandatory item fails, besides writing `checklist`, if the rule comes from the FIT/DFX writing guides, cite `fit-case-authoring-guide §x` or `dfx-case-authoring-guide §x`.

### Mandatory Item Quick Reference (per-case, unless noted otherwise)

| Attribute | Key Mandatory Self-Checks |
|------|----------------|
| Case ID | Unique within the repository; English letters, digits, and hyphens only — no Chinese characters, underscores, spaces, or special characters; wrapped in square brackets `[FIT-...]`/`[DFX-...]` |
| Case Type | Accurate type (see FIT/DFX specifics below) |
| Module | Non-empty; consistent with the feature segment of the case ID |
| component_deps (Component Deps) | Non-empty; `n/a` or openan repo names (multiple separated by `;`); consistent with the actual interactions in the steps |
| Case Name | Expresses the test purpose/intent; concise, clear, and unambiguous |
| Priority | P0–P2 filled reasonably (see the checklist ratio and definitions) |
| Precondition | States environment/data/system state; **explicit environment elements** (compose services, image versions, ports, tokens, test data, etc.); each step prefixed with an `Arabic numeral` + `. ` separator (official template style) |
| Steps | Sequentially numbered; executable and unambiguous; verification points marked `see result N`; multiple independent steps must not share one number; **the last step is a cleanup action** (Framework §6.3) |
| Expected Result | Sequentially numbered; vague or ambiguous expressions prohibited; objectively verifiable (status codes, fields, logs, metrics); contains the assertion corresponding to the cleanup step |
| Automatable | P0/P1 must be `Yes` (Framework §4.3.1 acceptance; §8.1 TRR entry); values other than `Yes`/`No` fail |
| Notes orchestration keys | `language_profile` non-empty and one of `python`/`java`/`js`/`shell`; `protocol_primitive` (must be one of the four A2A-T primitives for protocol-related cases, `none` for pure REST cases — never empty or an invented primitive); `execution_strategy` one of `smoke`/`full`/`slow`; `environment` non-empty (Framework §6.4, e.g. `docker-compose`, `with-workload-cluster`, `online`, `offline`) |

### FIT Specifics (appended when the case type is `Functional Test`/`Exception Test`/`Protocol Test`)

Against [fit-case-authoring-guide.md](references/fit-case-authoring-guide.md) §2–§3:

| Attribute | Mandatory/Suggested | Key Points |
|------|-----------|------|
| Case Type | Mandatory | One of `Functional Test`/`Exception Test`/`Protocol Test` |
| Case ID | Mandatory | Matches `[FIT-<feature>-<topic>-<3-digit seq>]` (square-bracket wrapped), e.g. `[FIT-registry-center-agentcard-001]`; only English letters, digits, and hyphens |
| Precondition | Mandatory | Same as checklist mandatory items; in FIT scenarios the environment elements must be concrete enough to reproduce (image versions, compose services, ports, etc.) |
| Steps/Expected Result | Mandatory | The business integration scenario is executable; business assertions such as HTTP status codes/response fields are objectively verifiable; last step is a cleanup action |
| Scenario attribution | Mandatory (semantic) | Against the attribution criteria: process/container self-healing, degradation under insufficient resources, dependency fault recovery, and probe/log/metric/performance/security/compatibility specialties are prohibited; P2 does not mean DFX cases are allowed |

### DFX Specifics (appended when Notes contain the `dfx_type` key / the case type is a DFX mapped value)

Against [dfx-case-authoring-guide.md](references/dfx-case-authoring-guide.md) §2–§3:

| Attribute | Mandatory/Suggested | Key Points |
|------|-----------|------|
| Notes dfx_type | Mandatory | One of DFT/DFD/DFS/DFR/DFP/DFNS/DFC, and consistent with the DFX segment of the case ID |
| Case Type | Mandatory | Mapped from the `dfx_type` key in Notes: `Functional Test` (DFT/DFD), `Deployment Test` (DFS), `Stability Test` (DFR), `Performance Test` (DFP; `Stress Test` for stress scenarios), `Security Test` (DFNS), `Compatibility Test` (DFC) |
| Case ID | Mandatory | Matches `[DFX-<feature>-<topic>-<3-digit seq>]` (square-bracket wrapped), e.g. `[DFX-registry-center-agentcard-001]`; only English letters, digits, and hyphens |
| Steps | Mandatory | Contains concrete commands, interface paths, parameters, and observation windows; non-executable descriptions prohibited; last step is a cleanup action (restore configs, clear fault injection) |
| Expected Result | Mandatory | Contains objectively verifiable items such as HTTP status codes, log levels and keywords, metric names, and health/metrics endpoint fields; `normal`/`no error`-style expressions prohibited |
| Priority | Suggested | DFX cases are mostly P2; core observability/serviceability acceptance may be P0/P1 and must be reasonably distributed in the file |
| Scenario boundary | Mandatory (semantic) | Against the attribution criteria: do not duplicate the FIT business main path; invalid input only asserts diagnosability; config changes only assert the service/testability mechanism; taking business results as the only assertion is prohibited |

### Full-Set Tables (consult both FIT + DFX guides)

- Apply the **FIT specifics** to FIT-type rows
- Apply the **DFX specifics** to DFX-type rows
- Apply only the universal checklist items to the remaining "Case Type" rows
- File-level **scenario coverage**: examine whether functional/integration scenarios and non-functional (DFX) dimensions match the actual type combination in the table
- File-level **DFX coverage** (when the DFX table or a full-set table contains DFX rows): among the seven DFX dimensions (DFT/DFD/DFS/DFR/DFP/DFNS/DFC), **all applicable dimensions** must have corresponding cases; inapplicable dimensions must have their reasons stated in Notes, a coverage note, or the requirement/design materials

### Suggested Item Quick Reference (written to remediation suggestions, not failing by themselves)

- Case name: ≤50 characters; verb-object (complement) phrase; conditions can be appended with `_`
- Case ID: consecutive numbering, feature segment consistent across the table
- Priority: overall P0/P1/P2 ratio reasonable
- Precondition: contains no operation steps such as login/calling; ≤10 steps
- Steps: specifies the entry and parameters; ≤10 steps
- Expected Result: numbering corresponds to the steps; state the correspondence when there are multiple steps; concrete and observable
- Notes: for complex scenarios it is suggested to annotate the design method used; when the user provides a milestone, filling the "Milestone" column is recommended for traceability

### File-Level Mandatory Items (once per table)

| Item | Key Points |
|----|------|
| Requirement coverage | When requirement materials exist: cases cover all function points with no misunderstanding of the requirements |
| Scenario coverage | Covers normal/abnormal/interaction scenarios; DFX dimensions match the case types (a full-set table must cover the FIT and DFX types present in the table; without materials, record "not validated — requirement input missing") |
| Scenario attribution | Against [fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md): out-of-scope cases in this table → fail (list concrete case IDs in §3 with the problem attribute "Scenario attribution") |
| Cross-table deduplication | When a counterpart CSV is provided: the same trigger + the same assertion focus appearing in both tables → fail (list both IDs); without a counterpart CSV, record "not validated — no counterpart CSV". Legitimate coexistence (different assertion focus) does not count as a failure |
| DFX coverage | When the DFX table or a full-set table contains DFX rows: among the seven DFX dimensions (DFT/DFD/DFS/DFR/DFP/DFNS/DFC), all **applicable** dimensions must have corresponding cases; inapplicable dimensions must have stated reasons (in Notes, the report, or design materials); covering only some applicable dimensions or not stating inapplicable reasons → fail; without design/requirement materials to determine applicability, record "not validated — feature design materials missing" |

## Review Process

1. **Read** `fit-dfx-scenario-attribution-criteria.md`, `test-case-template.md`, and `test-case-review-checklist.md`; based on the classification decision, additionally read the FIT and/or DFX writing guide.
2. **Classify the cases**: user declaration → filename → the "Case Type" column / `dfx_type` key distribution in Notes; record the file-level decision FIT / DFX / Full set.
3. **Parse** the user-specified case file (mind newlines inside CSV quotes); parse the counterpart CSV if provided.
4. **Template validation**: header, column count, filename.
5. **File-level review**: filename convention; if the user provides requirement materials, perform coverage analysis (for full-set tables, examine functional and non-functional coverage separately); DFX tables or full-set tables containing DFX rows must undergo the **DFX dimension coverage** check (applicability of the seven dimensions, reasons for inapplicable ones).
6. **Scenario attribution and cross-table deduplication** (mandatory items): check this table for out-of-scope cases against the attribution criteria; check cross-table duplication when a counterpart CSV exists; if a boundary check conclusion was passed in, re-check it — missed out-of-scope/duplicated cases still count as failures.
7. **Per-case review**: for each case row, first check the checklist mandatory items (including the Notes orchestration keys `language_profile`/`protocol_primitive`/`execution_strategy`/`environment` and the 5th column `component_deps`), then append the FIT/DFX specifics per the row type; record failed items with evidence (quote the original text fragments).
8. **ID uniqueness**: scan the whole table for duplicate "Case ID" values; all duplicates are marked as failed.
9. **Suggested item scan**: aggregate suggested-type issues from the checklist and the FIT/DFX guides.
10. **Generate the report**: write it to a file per the Markdown template below, and give a summary in the conversation.

## Output: Markdown Review Report

**Must** write the complete report to a `.md` file (user-specified path or the default `outputs/`).

```markdown
# Test Case Review Report

## 1. Review Summary

| Item | Content |
|------|------|
| Reviewed file | `<path>` |
| Counterpart CSV | `<path or "none">` |
| Case classification decision | FIT / DFX / Full set (and the basis: user declaration / filename / case types in the table) |
| Target milestone | `<version or "not specified">` |
| Total cases | N |
| Pass (mandatory items only) | X |
| Fail | Y |
| Pass with suggestions | Z |
| Review date | YYYY-MM-DD |
| References used | test-case-template.md, test-case-review-checklist.md, fit-dfx-scenario-attribution-criteria.md; fit-case-authoring-guide.md (if applicable); dfx-case-authoring-guide.md (if applicable); requirement materials (if any); counterpart CSV (if any) |

## 2. Template and File-Level Conclusions

- **Template compliance**: Pass / Fail — <notes>
- **File naming**: Pass / Fail — <notes; FIT tables must carry the `-fit-test-cases` suffix, DFX tables must carry `-dfx-test-cases` or an equivalent identifier>
- **Requirement coverage** (if materials provided): Pass / Fail / Not validated — <notes>
- **Scenario coverage** (if materials provided): Pass / Fail / Not validated — <notes>
- **Scenario attribution (FIT/DFX boundary)**: Pass / Fail — <out-of-scope case IDs and where they belong; write "none" if none>
- **Cross-table deduplication**: Pass / Fail / Not validated (no counterpart CSV) — <duplicate pairs: FIT ID ↔ DFX ID; legitimate coexistence not counted as failure>
- **DFX coverage** (for DFX tables or tables with DFX rows): Pass / Fail / Not validated — <covered dimensions, missing applicable dimensions, inapplicable dimensions and stated reasons>

## 3. Failed / To-Be-Fixed Items (Mandatory Items)

> List only cases that fail **mandatory** self-check items; file-level issues go on a separate row with the case ID `— (file level)`.

| Case ID | Case Name | Problem Attribute | Self-check Item | Problem Description | Rule/Basis |
|----------|----------|----------|--------|----------|-----------|
| ... | ... | Steps | A step whose result needs checking must end with "see result xx" | ... | checklist Steps-Mandatory |
| ... | ... | Expected Result | Vague expressions prohibited | ... | dfx-case-authoring-guide §3 |

(Sorted by case ID; multiple rows of the same case are listed separately.)

## 4. Remediation Suggestions (Suggested Items)

| Case ID | Case Name | Problem Attribute | Suggested Self-check Item | Current State | Improvement Suggestion |
|----------|----------|----------|------------|----------|----------|
| ... | ... | Case Name | Keep the title within 50 Chinese characters | Currently 62 characters | Shorten to a verb-object phrase highlighting "verify ..." |

(When there are no suggestions, write "none" or "no suggested-type issues found".)

## 5. Passed Case List (optional; the detail may be omitted in favor of counts when there are many cases)

| Case ID | Case Name | Notes |
|----------|----------|------|
| ... | ... | No mandatory-item issues |

## 6. Statistics and Conclusion

- **Conclusion**: <deliverable / needs rework and re-review / template non-compliant — fix the table structure first>
- **Priority fixes**: <list the 3–5 items related to P0 or with the most blockers>
- **Re-review suggestion**: after fixing, re-run this skill and compare against the case IDs in this report
```

In the conversation reply: give a **summary** (pass rate, main problem types, case classification decision, report path) — do not paste the full report.

## Determination Details (Applied Uniformly During Review)

**Case ID**

- Allowed: English letters, digits, `-` (hyphen); must be wrapped in square brackets (e.g. `[FIT-registry-center-agentcard-001]`)
- Not allowed: Chinese characters, underscores, spaces, `#`, `/`, parentheses, or other special characters
- Duplicates anywhere in the table → every involved ID fails
- FIT rows: the ID must match `[FIT-<feature>-<topic>-<3-digit seq>]`; DFX rows: the ID must match `[DFX-<feature>-<topic>-<3-digit seq>]`

**Precondition / Steps / Expected Result Numbering**

- Numbering separator: `1. ` (half-width period, the official template standard); legacy forms (`1,` `1 `) are tolerated when reviewing pre-existing tables
- Not acceptable: no numbering, dash-only lists, multi-level `1.1` without a stated convention

**Steps and Expected Result**

- A step contains "verify"/"check" without `see result N` → Steps mandatory item fails
- Multiple independent operations chained with semicolons under a single number → fails
- **The last step is not a cleanup action** (test data/services created by this case not deleted, modified configs or fault injection not restored) → Steps mandatory item fails (Framework §6.3)
- The expected result contains non-objectively-verifiable wording such as "normal", "successful", or "as expected" → Expected Result mandatory item fails
- Cases involving LLM/generative output must use deterministic assertions (status codes/response structure/flow state/ordering fields) and must not directly assert model-generated text → violation fails the Expected Result mandatory item (basis: Test Plan Template §3.3)
- **DFX rows**: the expected result lacks a checkable status code/field/log/metric → Expected Result mandatory item fails (DFX Writing Guide §3)

**component_deps Standalone Column (Component Deps, 5th Column) and Notes Orchestration Keys (language_profile / protocol_primitive / execution_strategy / environment / dfx_type)**

- Notes missing the `language_profile` key, or its value is outside the python/java/js/shell enum → mandatory item fails
- The `Component Deps` column is empty, or filled with a non-openan repo name (including an owner prefix or obvious typos); when only the module under test is involved, fill `n/a` (the original `none` is deprecated); separate multiple dependencies with `;` → mandatory item fails
- Notes missing the `protocol_primitive` key → mandatory item fails; cases involving A2A-T steps (Task-T/Notification-T/Negotiation-T/Authorization-T or A2A-T SDK calls appearing in the steps) filled `none` → mandatory item fails; invented primitive names → mandatory item fails
- Notes missing the `environment` key or with an empty value (Framework §6.4 requires the environment label) → mandatory item fails
- Notes missing the `execution_strategy` key, or its value is outside the smoke/full/slow enum → mandatory item fails
- DFX rows with Notes missing the `dfx_type` key, its value outside the DFT/DFD/DFS/DFR/DFP/DFNS/DFC enum, or inconsistent with the DFX segment of the case ID → mandatory item fails

**Automatable**

- P0/P1 rows with "Automatable" not `Yes` → mandatory item fails (Framework §4.3.1 acceptance; §8.1 TRR entry)
- Values other than `Yes`/`No` → mandatory item fails; P2 as `No` without a stated reason in Notes → remediation suggestion

**Milestone (Optional Annotation)**

- User gives a target version: the "Milestone" column is filled but the version differs from the target → fails; the format should be `<YY>-<season>` (e.g. `26-winter`), corresponding to the archive directory `docs/plans/<version>/`
- User does not give a target version: do not validate whether the milestone annotation exists

**Requirement Link**

- P0/P1 rows with Requirement Link empty → mandatory item fails (hard requirement, not conditionally required); P2 rows may be left empty
- The requirement materials contain requirement/Issue/PR links but the whole column is empty → remediation suggestion; when the materials contain no links either, leaving it empty (P2) is allowed and noted in the review notes

**Scenario Attribution and Cross-Table Deduplication (Mandatory Items)**

- First read [fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md)
- A FIT row's verification target is probes/logs/metrics/self-healing/performance/security/compatibility → scenario attribution mandatory item fails (basis: Attribution Criteria §2–§4)
- A DFX row takes the business main path / functional config effect / business negative rejection as the only assertion with no non-functional assertion → scenario attribution mandatory item fails (basis: Attribution Criteria §3–§4)
- With a counterpart CSV: the same trigger and the same assertion focus → cross-table deduplication mandatory item fails (list both IDs in §3)
- A boundary check conclusion from the orchestration layer was passed in: it must be re-checked; out-of-scope/duplicated cases from that conclusion not included in this report must be added as failures
- Legitimate coexistence (different assertion focus) is not marked as failing

**Filename (File-Level)**

- File-level decision is **FIT**: the filename should match the `*-fit-test-cases` pattern (see the checklist convention table) → mismatch recorded as a file-level failure
- File-level decision is **DFX**: the filename should match `*-dfx-test-cases` or contain an explicit DFX type identifier → mismatch recorded as a file-level failure
- File-level decision is **Full set**: no single suffix is enforced, but the repo and feature must be included

**Precondition**

- Only a generic environment description without key environment elements (compose services, image versions, ports, network/permissions, etc.) → precondition mandatory item fails (checklist explicit environment elements)

**DFX Coverage (File-Level)**

- When the file-level decision is **DFX**, or **Full set** and the table contains DFX rows, the coverage of the seven DFX dimensions (DFT/DFD/DFS/DFR/DFP/DFNS/DFC) must be checked
- Derive the covered dimensions from the `dfx_type` key in Notes and the DFX segment of the case IDs
- With design/requirement materials: determine whether each dimension is applicable; applicable but not covered → file-level failure (recorded in §3 with the case ID `— (file level)`)
- Inapplicable dimensions without a stated reason (neither Notes, a report note, nor design materials) → file-level failure
- Without materials to determine applicable dimensions → record "not validated — feature design materials missing" instead of forcing a failure

**Case Type (FIT/DFX Specifics)**

- FIT rows with "Case Type" not `Functional Test`/`Exception Test`/`Protocol Test` → case type mandatory item fails
- DFX rows with "Case Type" not an English enum mapped value (`Functional Test` (DFT/DFD) / `Deployment Test` (DFS) / `Stability Test` (DFR) / `Performance Test` (DFP; `Stress Test` for stress scenarios) / `Security Test` (DFNS) / `Compatibility Test` (DFC)), or the `dfx_type` key in Notes missing/invalid/inconsistent with the ID segment → mandatory item fails
- **Not reviewed**: free text in the Notes column beyond the orchestration keys (see "Review Scope Exclusions" above)

## Quality Self-Check (Before Delivery)

- [ ] Have read the template, checklist, and attribution criteria; have read the FIT and/or DFX writing guide per the classification decision
- [ ] The review summary states the case classification decision and its basis
- [ ] The 16-column template validation has been completed
- [ ] File-level review covers requirement coverage, scenario coverage, and scenario attribution; cross-table deduplication reviewed when a counterpart CSV exists; DFX dimension coverage reviewed for DFX/full-set tables
- [ ] Every case has been checked against the checklist mandatory items (including Notes orchestration keys); FIT/DFX rows have the appended specifics (including scenario attribution); suggested items are recorded in §4
- [ ] §3 contains only mandatory-item failures (including out-of-scope and cross-table duplicates); §4 contains only suggested items; no failure or suggestion was written against free text in Notes
- [ ] The Rule/Basis column distinguishes checklist, writing guides, and attribution criteria
- [ ] The report has been written to a `.md` file
- [ ] The conversation summary includes the report path, classification decision, boundary check conclusion, and overall verdict

## Invocation Examples

```text
/test-cases-reviewer

Please review outputs/registry-center_agent-registration-dfx-test-cases.csv
Case classification: DFX
Target milestone: 26-winter
Requirement materials: docs/xxx-proposal.md
Output: outputs/registry-center_agent-registration-dfx-test-cases-review-report.md
```

```text
/test-cases-reviewer

Please review outputs/agent-registration-test-cases.csv
(No classification declared and the filename has no FIT/DFX identifier → review as the full set, consulting both the FIT and DFX writing guides)
```

## Execution Instructions (Model)

1. **Must read first** [fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md), [test-case-template.md](references/test-case-template.md), and [test-case-review-checklist.md](references/test-case-review-checklist.md).
2. **Classify the cases** (user declaration → filename → case types in the table / dfx_type in Notes); read [fit-case-authoring-guide.md](references/fit-case-authoring-guide.md) and/or [dfx-case-authoring-guide.md](references/dfx-case-authoring-guide.md) as needed.
3. Parse the user-specified case file; parse the counterpart CSV (if any); re-check the boundary check conclusion (if any); optionally read requirement materials for file-level coverage analysis.
4. Template validation → file-level (including scenario attribution and cross-table deduplication) → per-case mandatory items (checklist + Notes orchestration keys + FIT/DFX specifics) → suggested items → ID uniqueness.
5. **Write the Markdown report** (§2 includes scenario attribution and cross-table deduplication; §3 and §4 must not be omitted; write "none" in §3 when there are no issues).
6. Reply with a summary, and declare: the reference paths (including the attribution criteria and the actually selected writing guides), the case classification decision, the counterpart CSV, the boundary check conclusion, the reviewed file path, and the output report path.
