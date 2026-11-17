---
name: e2e-test-code-gen
description: Generate executable test code from a reviewed openan test-case CSV (16-column case table = openan official 15 columns + component_deps as a separate column; orchestration keys language_profile/protocol_primitive/execution_strategy/environment/dfx_type written as key:value pairs in the Notes column) plus orchestration inputs: first produce the architecture plan and execution scheme (tests/README.md) for the target repository's test package, and only after user confirmation generate executable test code (Python pytest / Java JUnit5 / JS Vitest+Playwright / Shell bats), mapped to the target repo's e2e/<feature>/ directory or the language-conventional directory (java uses src/test/java); STOP and list missing items when orchestration inputs are insufficient. Use when the user asks to generate E2E test code, perform automated test-code generation, or convert a CSV into executable tests, or runs /e2e-test-code-gen.
---

# E2E Test Code Gen

Converts a **reviewed test-case CSV** (the fixed 16-column case table with English headers, produced by test-cases-generator / test-cases-reviewer) into **executable automated test code in the target repository**.

## Input: reviewed case CSV (fixed 16 columns, English headers verbatim)

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

See [references/reviewed-csv-sample.csv](references/reviewed-csv-sample.csv) for a sample; the single source of truth for the template is `../test-cases-generator/templates/case-template.csv` (identical to the openan-itest `docs/templates/testcases-template.csv`; authoritative field descriptions are in `testcases-template-fields.md`).

| Column | Purpose |
|----|------|
| `Case ID` | Written as the test case identifier (first line of the pytest docstring / JUnit `@DisplayName` / Playwright `test()` title / bats `@test` name); the ID in code is written without brackets so failures can be traced back to the CSV |
| `Module` | Determines test file ownership, file naming groups, and the `<feature>` in the target directory `e2e/<feature>/` |
| `Component Deps` | Orchestration dependency list for cross-component cases (docker compose service topology, startup order); `n/a` for a single component, multiple dependencies separated by `;`; this column feeds the `components` label |
| `Case Name` | Main body of the test description (natural language, without a Case ID prefix) |
| `Case Type` | English enum `Functional Test`/`Exception Test`/`Protocol Test`/`Performance Test`/`Stress Test`/`Stability Test`/`Security Test`/`Compatibility Test`/`Deployment Test`/`System Test`; DFX dimensions go through the `dfx_type` key in Notes; when generating DFX cases, assertions must land on non-functional observability points such as logs/metrics/health |
| `Milestone` | `<YY>-<season>` (e.g. `26-winter`); written into case metadata and feeds the milestone label |
| `Precondition` | Preparation logic and fault injection (container restarts, network cutoffs, wrong credentials, etc.) |
| `Steps` / `Expected Result` | Operation steps and assertions; `see result N` in a step maps to assertion number N; the final cleanup action is implemented in code as teardown |
| `Automatable` | `Yes`/`No`; P0/P1 must be "Yes" (framework §8.1) |
| `Automated Test` | Left empty at generation time; after code generation, backfilled with `<test file>::<test function>` |

**Component Deps (column 5)**: `n/a` or openan repo names (multiple separated by `;`), the orchestration dependency list for cross-component cases.

**Notes-column orchestration keys** (`key:value` pairs separated by `；`, parsed automatically by `scripts/parse-test-cases.mjs`):

| Key | Purpose |
|----|------|
| `language_profile` | **Determines the target language profile** (python/java/js/shell); read row by row — a single CSV may mix multiple profiles (e.g. interop cases annotated by where the test lands); STOP and list the affected rows when missing or invalid |
| `protocol_primitive` | One of the four A2A-T primitives (Task-T/Notification-T/Negotiation-T/Authorization-T) or none; protocol cases must be orchestrated with the corresponding SDK/client — do not fabricate protocol behavior |
| `execution_strategy` | `smoke`/`full`/`slow`; mapped to the `execution` label for CI filtering by strategy |
| `environment` | Runtime environment (framework §6.4 environment dimension, e.g. `docker-compose`/`with-workload-cluster`/`online`/`offline`); mapped to the `environment` label for CI environment filtering |
| `dfx_type` | Mandatory for DFX rows (DFT/DFD/DFS/DFR/DFP/DFNS/DFC); determines the DFX-specific assertion direction |
| Others (design_method, source, items to confirm) | Reference information, written into test docstring comments |

**STOP**: when the CSV header does not match the 16 English columns above (compare verbatim after stripping the BOM), prompt the user to fix it through test-cases-reviewer first; never generate out of thin air.

**Skip rules**: rows whose Case Type is not in `Functional Test`/`Exception Test`/`Protocol Test` and whose Notes lack a valid `dfx_type` key are skipped and listed in the report; rows with an empty Case ID are skipped.

## Orchestration gate (README first)

The CSV alone is insufficient to generate executable code — package-level orchestration inputs are also required; when any are missing, **STOP and list each missing item** instead of inventing them. Before generating code, first produce the target repo's `tests/README.md` (architecture plan and execution scheme) and **enter code generation only after user confirmation**. See [references/test-package-orchestration-guide.md](references/test-package-orchestration-guide.md).

## Language profile decision

1. **Read the `language_profile` key from each row's Notes verbatim** (required on the generation side) and group cases by its value for generation; STOP and list the affected rows when `language_profile` is missing or invalid
2. The profile determines the framework, directory structure, naming, run commands and minimal validation commands:

| profile | Framework | Must-read file |
|---------|------|----------|
| `python` | pytest + pytest-asyncio + httpx | [references/python.md](references/python.md) |
| `java` | JUnit5 + AssertJ + Mockito + WireMock | [references/java.md](references/java.md) |
| `js` | Vitest + Playwright + MSW | [references/js.md](references/js.md) |
| `shell` | bats-core + shellcheck + shfmt | [references/shell.md](references/shell.md) |

3. Before generating any code, fully read the corresponding profile file and follow its directory structure, naming conventions and dependency conventions

## Target repository and output paths

- **Target repository**: openan multi-repo (`owner/repo`, e.g. `openan/registry-center`); code lands in **the target repo's own test directory**, with `e2e/<feature>/` as the default (test-plan §11, `<feature>` taken from the CSV Module column in kebab-case; java keeps the `src/test/java` convention as a Maven language-enforced exception, see java.md); the test package README is fixed at `tests/README.md`
- **Write only test code and test configs**; modifying the product source under test is forbidden (if a source defect is found → output an analysis and hand off to `openan-e2e-failure-analyzer`)
- Each test file header notes the source CSV path and the list of covered case IDs, so failures can be traced back

## Workflow

1. **Parse inputs**: read the CSV (use `scripts/parse-test-cases.mjs` to validate the header and output the codegen plan input); confirm the target repository and case scope (`--ids` / `--priority`)
2. **Verify orchestration inputs**: check item by item against orchestration design guide §3; if anything is missing → STOP and list the items
3. **Generate tests/README.md**: follow [templates/test-package-readme.example.md](templates/test-package-readme.example.md), covering the scope table, directory structure, fixtures/data, environment variable contract and run commands
4. **User confirms the README** → only then proceed to code generation
5. **Generate code**: map case by case per [references/code-generation-guide.md](references/code-generation-guide.md); obey the anti-pattern list of the profile
6. **Self-validate**: run the profile's minimal validation commands (collect-only / test-compile / vitest run / bats --count); fix the generated code before delivery if anything fails
7. **Delivery summary**: directory tree + case ID ↔ test file mapping table + run commands

## Script usage

```bash
node scripts/parse-test-cases.mjs <csv-path> [--ids FIT-registry-center-agentcard-001,FIT-registry-center-agentcard-002] [--priority P0,P1]
node scripts/validate-config.mjs [config-path]
node scripts/build-codegen-plan.mjs [config-path]   # = validate + parse + output the full plan
node scripts/run.mjs [config-path]                  # same as above, in one step
```

See [assets/e2e-code-gen.config.example.json](assets/e2e-code-gen.config.example.json) for a config example. The scripts only parse, validate and output plans — **they do not write test code for you**.

## Anti-patterns (forbidden)

- Fabricating URLs / ports / selectors / image tags — everything must come from the orchestration inputs or the target repo's existing code
- Hardcoding keys, tokens or passwords — use environment variables plus the repo-root `e2e/.env.template` pattern (new variables must be synced to the template and documented in the README; never commit `.env` to git — it must be in `.gitignore`)
- Generating code inconsistent with the target repo's existing style — read the repo's existing tests first and align with their style
- DFX cases asserting only business outcomes — assertions must land on observability points such as logs/metrics/health (DFX writing guide §3)
- Red lines: sleep/fixed-wait synchronization, inter-test ordering dependencies or shared mutable state, `see result N` without an explicit assertion (log-only), teardown not deleting all created resources, session-scoped fixtures carrying mutable state, asserting on LLM-generated text — see the anti-pattern list in [references/code-generation-guide.md](references/code-generation-guide.md) and the red-line sections of each profile
- A2A-T protocol cases bypassing the SDK and handcrafting JSON-RPC payloads — use existing data from `a2a-t-corpus` for interop samples
- Modifying the product source under test, or deleting/overwriting existing test files (`overwrite` must be explicitly enabled in config and confirmed by the user)

## Quality self-check (before delivery)

- [ ] CSV header validated against the 16 columns; skipped rows listed in the report
- [ ] Every row's Notes `language_profile` key is valid; generation grouped by profile, and the corresponding profile file was read for each group
- [ ] README-first completed and confirmed by the user; environment variable contract complete, no hardcoded secrets
- [ ] Every test carries its case ID identifier; DFX case assertions land on non-functional observability points; protocol cases use the corresponding primitive
- [ ] Minimal validation commands pass; delivery includes a case ID ↔ file mapping table (and the convention for backfilling the Automated Test column)

## Invocation examples

```text
/e2e-test-code-gen

Reviewed CSV: outputs/registry-center-agentcard-fit-cases.csv
Target repo: openan/registry-center (local path C:\...\registry-center)
Scope: all FIT cases + P0/P1 DFX cases
```

```text
/e2e-test-code-gen

From outputs/registry-center-agentcard-fit-cases.csv generate code only for FIT-registry-center-task-dispatch-001
Target repo: openan/orchestration-center (interop cases generated per test landing)
```

## Execution instructions (for the model)

1. Run `parse-test-cases.mjs` to validate the CSV header (16 columns) and get the parse result (Notes orchestration keys are parsed automatically); STOP if the header mismatches
2. Verify orchestration inputs (orchestration design guide §3); STOP and list missing items if any
3. Group by `language_profile`; read the corresponding profile file for each group
4. Generate `tests/README.md` (template + orchestration guide) → wait for user confirmation
5. Generate test code row by row per the code generation guide; run the minimal validation commands
6. Delivery summary (mapping table + run commands + explanation of skipped rows)
