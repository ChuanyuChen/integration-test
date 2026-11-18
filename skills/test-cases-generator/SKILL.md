---
name: test-cases-generator
description: Orchestrates the full pipeline of openan test case generation through self-review and self-revision — invoking feature-level-test-cases-gen / dfx-test-cases-gen to generate (or revise per the review report), performing FIT/DFX boundary checks and cross-table deduplication, invoking test-cases-reviewer to review, iterating on failures per the report for at most 3 rounds, and delivering the final 16-column case CSV (openan official 15 columns + a standalone component_deps column) together with the review report. Use when the user asks for the full test case pipeline, generation with review, or a FIT/DFX generation-to-review closed loop, or when running /test-cases-generator; STOP and list all missing required inputs when any is absent.
---

# Test Cases Generator (Full-Pipeline Orchestration)

Chains together **feature-level integration test case generation**, **DFX test case generation**, **FIT/DFX boundary checking and deduplication**, and **test case review** into a closed loop of "generate/revise → boundary check → review → revise per the report when failed". This skill **does not write case details itself** — generation and review must be performed by reading and executing the sub-skills; boundary checks are executed against the attribution criteria in this directory.

## Table Specification (openan Official Template, the Unified Baseline for Generation and Review)

The case CSV has a fixed **16-column** header (openan official 15 columns + a standalone component_deps column), with the header order identical to the openan-itest `docs/templates/testcases-template.csv` (single source of truth: [templates/case-template.csv](templates/case-template.csv)):

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

Key rules (details in each generation/review sub-skill):

- **Case ID**: `[FIT-<feature>-<topic>-<3-digit seq>]` (square-bracket wrapped, e.g. `[FIT-registry-center-agentcard-001]`); DFX cases use `[DFX-<feature>-<topic>-<3-digit seq>]`; only English letters, digits, and hyphens allowed (no Chinese characters or underscores); external SIT tables use `[SIT-<scenario>-<number>]`
- **Case Type**: FIT rows use `Functional Test`/`Exception Test`/`Protocol Test`; DFX rows map from the `dfx_type:DFx` key in Notes: DFT/DFD→`Functional Test`, DFS→`Deployment Test`, DFR→`Stability Test`, DFP→`Performance Test` (`Stress Test` for stress scenarios), DFNS→`Security Test`, DFC→`Compatibility Test` — keeping the seven-dimension coverage traceable
- **Priority**: P0/P1/P2; P0/P1 rows must have "Automatable" = `Yes` (Framework §4.3.1 acceptance requires P0/P1 100% automated; §8.1 TRR entry requires P0/P1 100% pass rate)
- **Cleanup action**: the last step of Steps must be a cleanup action (Framework §6.3), and Expected Result contains the corresponding verifiable assertion
- **Requirement Link**: **required for P0/P1 rows (hard requirement); P2 rows may be left empty**. Write the requirement/Issue/PR links from the materials into this column; when P0/P1 materials provide no links, record it in the information-gap list (Framework §4.3.1 acceptance requires "requirement links complete")
- **Notes keys** (separated by `;`): `design_method:xxx`; `dfx_type:DFx` for DFX rows; every case requires `language_profile:python|java|js|shell` and `protocol_primitive:none|Task-T|Notification-T|Negotiation-T|Authorization-T` (consumed directly by e2e-test-code-gen); the 5th column `Component Deps` is a standalone column — fill `n/a` when only the module under test is involved (the original `none` is deprecated), and fill openan repo names when there are dependencies (multiple separated by `;`); `environment:<runtime environment>` (Framework §6.4 environment dimension, e.g. `docker-compose`, `with-workload-cluster`, `online`, `offline`, for CI environment filtering); `execution_strategy:smoke|full|slow` (Framework §6.4 execution dimension — PR CI runs smoke, daily builds run full)
- Milestone, Dev Owner/Test Owner, Automated Test: leave empty when the user does not specify — do not infer placeholders

## Test Plan and Archive Conventions

- Test plans follow the authoritative template [references/test-plan-template.md](references/test-plan-template.md) (copied verbatim from the integration-test repo `docs/templates/` — do not rewrite it)
- Milestone value format `<YY>-<season>` (e.g. `26-winter`), corresponding to the archive directory `docs/plans/<version>/`
- The final case CSV is archived as `docs/plans/<version>/testcases-<feature>.csv` (in the same directory as the test plan)

## Sub-Skill Paths (Must Read Before Executing)

| Step | Skill | How to Locate |
|------|-------|------|
| FIT generation/revision | feature-level-test-cases-gen | The corresponding directory under `skills/` in this repo; once installed into an agent environment it may carry the `openan-` prefix (`openan-feature-level-test-cases-gen`) — locate its `SKILL.md` by the **skill name** |
| DFX generation/revision | dfx-test-cases-gen | Same as above (may be `openan-dfx-test-cases-gen` after installation) |
| Case review | test-cases-reviewer | Same as above (may be `openan-test-cases-reviewer` after installation) |
| FIT/DFX boundary check | (executed by this skill) | [references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md) |

Before invoking a sub-skill: **first use the Read tool to fully read its `SKILL.md`** (the `SKILL.md` under its skill directory), then operate per its "Execution Instructions" and input/output conventions; do not skip the sub-skill's mandatory reference reading and quality self-check. The attribution criteria in this directory must be read before any boundary check.

## Pipeline Overview

```text
User input (materials + generation scope + required metadata)
        │
        ▼
┌──────────────── epoch = 1..3 ────────────────┐
│  1. Generate (epoch=1) or revise per the      │
│     review report (epoch>1)                   │
│     → write the intermediate CSV              │
│     (with the epoch-N suffix)                 │
│  2. FIT/DFX boundary check and deduplication  │
│     → write the intermediate boundary check   │
│     report                                    │
│  3. Invoke the review skill (passing the      │
│     counterpart CSV and boundary conclusion)  │
│     → write the intermediate review report    │
│  4. Decision: review mandatory items +        │
│     boundary check both pass → break out;     │
│     otherwise epoch++ (terminate after epoch  │
│     reaches 3 regardless of the result)       │
└──────────────────────────────────────────────┘
        │
        ▼
Deliver the final CSV + last-round review report + boundary check report + full-pipeline summary
```

**Hard limit**: the full pipeline runs for **at most 3 rounds** (`epoch-1` … `epoch-3`). After the round-3 review ends, it **must terminate** even if the result is still a failure.

## Inputs

| Input | Description |
|------|------|
| **Feature materials (at least one, required)** | Proposal, design, interface/API docs, user manual, source code of the target repo, existing FIT, etc.; stop and ask for supplements when none |
| **Generation scope (required intent)** | `FIT` / `DFX` / `FIT+DFX`; infer from the user's request when not explicit — ask when it cannot be inferred |
| **Feature/module name (required)** | Passed through to the sub-skills for the "Module" column and file naming; stop when missing — do not infer from materials |
| Requirement links (optional) | Requirement/Issue/PR link list (e.g. `https://github.com/project-openan/registry-center/issues/1`); passed through to the "Requirement Link" column. Extract from materials when not specified; when the materials have none either, leave the column empty and record it in the information-gap list |
| Target repo (optional) | Used for the default file naming prefix (`<target repo>_<feature name>…`) and source code location; omit this segment when not given |
| Milestone (optional) | Passed through when the user specifies a version (e.g. `26-winter`, format `<YY>-<season>`), and the sub-skills write it into the "Milestone" column; leave the column empty when unspecified |
| Existing FIT CSV | **Passed through** to the DFX sub-skill for cross-deduplication; leave empty per the sub-skill rules when not specified |
| Requirement/design materials (for review) | Optional; passed through to the reviewer for file-level coverage analysis |
| **Final output path** | Optional; the final CSV paths for FIT/DFX specified separately. Defaults to the basenames `[<target repo>_]<feature name>`-fit-test-cases / `[<target repo>_]<feature name>`-dfx-test-cases (**without** the `epoch-` suffix) |
| **Intermediate artifact directory** | Optional; defaults to `intermediate/` under the project root (created if missing) |

User-specified final paths and intermediate directories may be relative (to the project root) or absolute.

**Hard gate**: the items marked required in the table above (feature materials, generation scope, feature/module name) — **do not proceed if any is missing**. Do not create intermediate directories, invoke sub-skills, generate/revise CSVs, or run reviews. List all missing items at once in the conversation and wait for the user to supply them.

## Intermediate Artifact Archiving

The CSV and review report of **every** iteration round **must** be written to the intermediate artifact directory, with the filename appending the suffix `-epoch-<round number>` (before the extension) on top of the final basename.

### Naming Rules

When the final path is not specified, `{base}` is composed from the optional parts: `[<target repo>_]<feature name>`-fit-test-cases or `[<target repo>_]<feature name>`-dfx-test-cases. When the user specifies a final path, use its filename (without extension) as `{base}`.

Given the final delivery basenames `{base}.csv` / `{base}-review-report.md`, the intermediate paths are:

| Artifact | Intermediate Path Example |
|------|----------------|
| Case CSV | `{intermediate dir}/{base}-epoch-1.csv` |
| Review report | `{intermediate dir}/{base}-review-report-epoch-1.md` |
| Boundary check report | `{intermediate dir}/{feature basename}-boundary-check-epoch-1.md` (one shared copy for FIT+DFX; the out-of-scope check is also written for a single scope) |

For multiple scopes, archive each separately, e.g.:

- `registry-center_agent-registration-fit-test-cases-epoch-2.csv`
- `registry-center_agent-registration-fit-test-cases-review-report-epoch-2.md`
- `registry-center_agent-registration-dfx-test-cases-epoch-2.csv`
- `registry-center_agent-registration-dfx-test-cases-review-report-epoch-2.md`
- `agent-registration-boundary-check-epoch-2.md`

### Directory Conventions

1. Resolve the intermediate directory: user-specified takes precedence; otherwise `{project root}/intermediate`
2. Create it with `mkdir -p` if it does not exist
3. **Immediately** write the round CSV after each round of generation/revision; immediately write the round boundary check report after the boundary check; immediately write the round report after the review — do not keep only the last round

### Final Deliverables

After the loop ends (pass or 3 rounds exhausted):

1. Copy/write the **last round's** CSV that passed review (or the epoch-3 CSV if still failing) to the user-specified final path (or the default `outputs/` path), with the filename **not containing** the `epoch-` suffix; after writing, you must run `node scripts/ensure-bom.cjs <final CSV>` to verify the UTF-8 BOM (rewriting the file with a write tool may lose the BOM)
2. Keep the last-round review report and boundary check report alongside the final path or in `outputs/` as well — suggested names `{base}-review-report.md` and `{feature basename}-boundary-check.md` (an extra copy with the last round's `epoch-N` suffix may be kept for traceability)
3. **Archive convention**: the final case CSV is archived as `docs/plans/<version>/testcases-<feature>.csv` (in the same directory as the test plan — see "Test Plan and Archive Conventions")
4. List in the conversation: the intermediate artifact paths of each round, the final CSV/report paths, the boundary check conclusion, and the termination reason (passed / round limit reached)

## Generation Scope and Sub-Skill Selection

| User Scope | Step 1 in an Epoch | Step 2 in an Epoch (Boundary Check) | Step 3 in an Epoch |
|----------|----------------|---------------------------|----------------|
| FIT only | Run feature-level-test-cases-gen | Single-table out-of-scope check (FIT mixed with DFX) | Review the FIT CSV |
| DFX only | Run dfx-test-cases-gen | Single-table out-of-scope check (DFX copying FIT); cross-deduplicate against the user's existing FIT CSV when provided | Review the DFX CSV (using the existing FIT as the counterpart when provided) |
| FIT+DFX | FIT first, then DFX (or in parallel when materials allow, but each must fully run its sub-skill) | **Cross-check** both CSVs: out-of-scope + duplicates | Review each CSV separately; **pass the counterpart CSV and this round's boundary check conclusion to each** |

- First time (`epoch=1`): follow the sub-skill's "generation" flow and write the output to `*-epoch-1.csv`
- Non-first time (`epoch≥2`): use the **previous round's CSV + previous round's review report + previous round's boundary check report** as the main revision inputs, together with the original feature materials, invoke the corresponding generation skill again, and require **targeted fixes of the failed/to-be-fixed items** (including out-of-scope cases and cross-table duplicates) — do not ignore the report and rewrite unrelated content; write the output to `*-epoch-N.csv`

Additional instructions passed to the generation skill (write into the invocation context):

```text
[Full-pipeline orchestration · epoch-N]
- Mode: first-time generation | revision per review report
- Feature/module name: <user-specified, used for the "Module" column and file naming>
- Requirement links: <user-specified or "extract from materials">
- Target repo: <user-specified or "none">
- Milestone: <user-specified or "none">
- Previous round cases: <path>
- Previous round review report: <path> (revision mode only)
- Previous round boundary check: <path> (revision mode only)
- This round's intermediate output: <path-with-epoch-N>
- Must follow fit-dfx-scenario-attribution-criteria; out-of-scope scenarios are prohibited
Execute strictly per this skill's specification; in revision mode, prioritize eliminating the report's "Failed / To-Be-Fixed Items" and the out-of-scope/duplicated items in the boundary check.
```

Additional instructions passed to the review skill:

```text
[Full-pipeline orchestration · epoch-N]
- File to review: <this round's epoch-N CSV>
- Case classification: FIT | DFX (consistent with the generation scope)
- Counterpart CSV: <the counterpart scope's CSV this round, or the user-provided existing FIT; write "none" if absent>
- Boundary check conclusion: <this round's boundary check report path>
- Target milestone: <user-specified or "not specified">
- Requirement materials: <path or none>
- This round's report output: <path-with-epoch-N>
The review must record scenario-attribution out-of-scope cases and cross-table duplicates as mandatory failures.
```

## FIT/DFX Boundary Check and Deduplication (Required Every Round)

After the generated (or revised) CSV is written and **before** invoking the review, this step must be executed. The rules are governed by [references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md) §1, §4, and §6.

### What to Check

| Check Item | When | Determination |
|--------|--------|------|
| **Out-of-scope** | Every CSV produced in the current round | FIT rows whose verification target is DFX (kill process/stop container self-healing, degradation under insufficient resources, dependency fault recovery, probe/log/metric/performance/security/compatibility specialties) → out of scope; DFX rows taking business results as the only assertion (main path works, functional config takes effect, business negative rejected with no non-functional assertion) → out of scope |
| **Cross-table duplicate** | FIT+DFX; or DFX only with the user-provided existing FIT | The same trigger operation (or synonymous) **and** the same assertion focus → duplicate. Similar triggers but assertions split between business vs non-functional → legitimate coexistence, not a duplicate |

### Boundary Check Report (Written to the Intermediate Directory)

```markdown
# FIT/DFX Boundary Check · epoch-N

- Criteria reference: skills/test-cases-generator/references/fit-dfx-scenario-attribution-criteria.md
- FIT CSV: <path or none>
- DFX CSV: <path or none>
- Conclusion: Pass / Fail
- Out-of-scope: <none | ID list + where they belong>
- Cross-table duplicates: <none | FIT ID ↔ DFX ID + the same assertion focus>
- Legitimate coexistence: <optional listing, not counted as a failure>
```

Any out-of-scope case or duplicate → this step's conclusion is **Fail**; the corresponding scope must not be marked as passing in this round. Revision rounds must prioritize re-attributing or deleting duplicates so that the assertion focus returns to its owning table.

## Pass / Fail Determination

Read **§6 Statistics and Conclusion** of the current round's review report (and §2 Template and File-Level Conclusions), and combine it with the current round's **boundary check** conclusion:

| Conclusion Semantics | Determination | Action |
|----------|------|------|
| Deliverable; or the "Fail" count is 0 and the template is compliant; **and** the boundary check has no out-of-scope/duplicates | **Pass** | The scope is done; for FIT+DFX, continue only the failed scope if the other has not passed |
| Needs rework and re-review / template non-compliant / mandatory-item failures exist / **the boundary check has out-of-scope or cross-table duplicates** | **Fail** | Enter the next revision round when `epoch < 3`; terminate when `epoch = 3` |
| Only "pass with suggestions", no mandatory-item failures, boundary check passed | **Pass** | Suggestions may optionally be absorbed in the next round, but **no extra round is forced**; a passed scope is done |

FIT+DFX: the whole pipeline ends only when **both scopes pass** (or 3 rounds are exhausted). A scope that has passed is **not re-run** in later epochs — only the still-failing scopes iterate; the intermediate archives of the passed scope are kept, and the final delivery uses its last passing round's CSV. Cross-table duplicates found by the boundary check are treated as **both scopes failing** (unless only one side of a duplicate pair is out of scope while the other is correctly attributed — then only the out-of-scope side iterates).

## Execution Instructions (Model)

1. **Confirm inputs**: verify that all required items have been provided by the user: feature materials (at least one), generation scope (may be inferred when not explicit; ask when it cannot be), feature/module name. **Stop if any is missing** and list all items to be supplied at once; do not create directories, invoke sub-skills, or write files. For optional fields (target repo, milestone, existing FIT CSV, final path, intermediate directory, requirement materials for review), follow the defaults below or leave empty when not given.
2. **Prepare directories**: create the intermediate artifact directory (default `{project root}/intermediate`).
3. **Initialize** `epoch = 1`; record the set of scopes to process (FIT / DFX). **Read first** [references/fit-dfx-scenario-attribution-criteria.md](references/fit-dfx-scenario-attribution-criteria.md).
4. **Loop** (while `epoch ≤ 3` and there are still failed scopes):
   1. For each failed scope: Read the corresponding generation skill → generate/revise in first-time or revision mode → **immediately** write `{base}-epoch-{epoch}.csv` → **immediately** run `node scripts/ensure-bom.cjs <this round's CSV>` to ensure the UTF-8 BOM (the script is under this skill's `scripts/`; sub-skills also run their own copies — repeated execution is idempotent and harmless)
   2. **Boundary check**: check the current round's CSVs against the attribution criteria (cross-deduplication for FIT+DFX; out-of-scope check for a single scope; cross-deduplication for DFX-only with an existing FIT) → **immediately** write `{feature basename}-boundary-check-epoch-{epoch}.md`
   3. For each CSV produced this round: Read the review skill → pass in the counterpart CSV and the boundary check conclusion → review → **immediately** write `{base}-review-report-epoch-{epoch}.md`
   4. Update each scope's pass status per the determination above (both the review mandatory items **and** the boundary check must pass); break out if all pass; otherwise `epoch += 1`, and break out after 3 rounds
5. **Final delivery**: write the final CSV without the `epoch-` suffix (plus the review report and boundary check report); summarize the full pipeline.
6. **Conversation reply**: scopes, rounds, pass/fail per round, boundary check results, intermediate/final paths, termination reason; do not paste full reports.

## Full-Pipeline Summary Template (End of Conversation)

```markdown
## Full-Pipeline Summary
- Generation scope: FIT / DFX / FIT+DFX
- Rounds used: N / 3
- Termination reason: review passed | maximum rounds reached (still failing)
- Boundary check: Pass / Fail (N out-of-scope cases, M duplicate pairs; legitimate coexistence not counted as failures)
- Boundary check report: <path>
- Intermediate directory: <path>
- Artifacts per round:
  - epoch-1: <csv>, <report>, <boundary check> …
  - epoch-2: …
- Final delivery: <csv path>, <report path>
- Sub-skills: feature-level-test-cases-gen / dfx-test-cases-gen / test-cases-reviewer
- Attribution criteria: references/fit-dfx-scenario-attribution-criteria.md
```

## Quality Self-Check

- [ ] Every round's CSV and the final CSV are UTF-8 with BOM (the `scripts/ensure-bom.cjs` result is `[OK]`) and use the 16-column header (order consistent with `templates/case-template.csv`)
- [ ] Case IDs match `[FIT-/DFX-<feature>-<topic>-<3-digit seq>]` (square-bracket wrapped); Case Type values are the standard enums; Notes contain the `language_profile`/`protocol_primitive`/`environment`/`execution_strategy` keys; the 5th column `Component Deps` is filled (`n/a` or openan repo names)
- [ ] P0/P1 rows have "Automatable" = `Yes`; the last step of Steps is a cleanup action
- [ ] All required inputs (feature materials, generation scope, feature/module name) were provided before execution; did not start with any missing
- [ ] The corresponding generation skill was fully executed per scope (including its mandatory references and attribution criteria) — no handwriting shortcut taken
- [ ] The FIT/DFX boundary check (out-of-scope + cross-table deduplication when applicable) was done before review in every round, and the report was written to the intermediate directory
- [ ] The review received the counterpart CSV and the boundary check conclusion; out-of-scope/duplicates were factored into the pass/fail determination
- [ ] Every round's output was reviewed, and reviews went through test-cases-reviewer (including its mandatory references)
- [ ] Rounds ≤ 3; terminated after round 3
- [ ] Every round's CSV, boundary check report, and review report were written to the intermediate directory with `-epoch-<N>` in the filenames
- [ ] Revision rounds used the review report's mandatory items and the boundary check's out-of-scope/duplicates as the revision basis; required metadata was passed through and not left empty; optional metadata stayed empty when unspecified — no inferred placeholders
- [ ] Final files have no `epoch-` suffix; the conversation contains the full-pipeline summary (including the boundary check result) and a path declaration

## Invocation Examples

```text
/test-cases-generator

Please generate FIT+DFX test cases from docs/xxx-proposal.md and the registry-center source code, with an automatic review closed loop.
Feature/module name: agent-registration
Target repo: registry-center
Milestone: 26-winter
Intermediate artifact directory: intermediate/agent-register
Final FIT: outputs/registry-center_agent-registration-fit-test-cases.csv
Final DFX: outputs/registry-center_agent-registration-dfx-test-cases.csv
```

```text
/test-cases-generator

Generate and review DFX cases only; see the materials under design/ and the existing FIT CSV.
Feature/module name: agent-registration
Target repo: registry-center
Intermediate directory not specified (use the project-root intermediate/).
```
