# Reviewed CSV → Test Code Generation Guide

## 1. Positioning

Converts an openan 16-column case CSV that has **passed review** (fixed English headers, verbatim) into runnable test code in the target repository (Python pytest / Java JUnit5 / JS Vitest+Playwright / Shell bats). The header matches `../test-cases-generator/templates/case-template.csv` (openan-itest `docs/templates/testcases-template.csv`; authoritative field descriptions in `testcases-template-fields.md`).

## 2. CSV format (fixed 16 columns)

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

Sample: [reviewed-csv-sample.csv](reviewed-csv-sample.csv)

Orchestration keys (`language_profile` / `protocol_primitive` / `execution_strategy` / `environment` / `dfx_type`) do not get separate columns — they are written as `key:value` pairs in the Notes column; Component Deps is the standalone column 5 and is not written into Notes, with `n/a` for a single component and multiple dependencies separated by `;`; `parse-test-cases.mjs` parses them into the corresponding fields automatically, so the model does not need to split the Notes by hand. In the CSV, the Case ID is wrapped in brackets (e.g. `[FIT-registry-center-agentcard-001]`); parsing strips them automatically, and code uses the ID without brackets.

Case Type is an English enum: `Functional Test` / `Exception Test` / `Protocol Test` / `Performance Test` / `Stress Test` / `Stability Test` / `Security Test` / `Compatibility Test` / `Deployment Test` / `System Test`. DFX dimensions (DFT/DFD/DFS/DFR/DFP/DFNS/DFC) go through the Notes `dfx_type` key and are not part of Case Type.

## 3. Field → code mapping

| CSV column | Code mapping (per profile) |
|--------|------------------------|
| `Case ID` | python: first line of the test docstring `"""FIT-registry-center-agentcard-001: <Case Name>"""`; java: `@DisplayName("FIT-...: ...")`; js: `test("FIT-...: ...")` or `test.describe`; shell: `@test "DFX-...: ..."`; also serves as the Case ID label for single-case filtering |
| `Case Name` | Main body of the test description (natural language, without a Case ID prefix) |
| `Case Type` | For DFX rows (Notes `dfx_type` key is DFT/DFD/…/DFC), generated assertions must include observability items such as log level/keywords, metrics, health/metrics endpoints |
| `Module` | Test file ownership and the `<feature>` of the target directory `e2e/<feature>/`; file naming group key (python `test_<feature>_<scenario>.py`) |
| `Priority` | Filtering/sorting metadata (`--priority P0,P1`); written into the `priority` label |
| `Automatable` | Rows with `No` are skipped for generation (P2 Automatable is No with the reason explained in Notes); P0/P1 must be "Yes" |
| `Milestone` | `<YY>-<season>` (e.g. `26-winter`); written into case metadata and feeds the milestone label |
| `Automated Test` | Empty at generation time; after generation, backfilled with `<test file>::<test function>` |
| `Precondition` | fixtures / `@BeforeEach` / `setup()`; environment preparation steps |
| `Steps` | Implemented one by one in order; assertions inserted at `see result N`; the final cleanup action is implemented as teardown |
| `Expected Result` | Source of assertion implementations; numbered step by step, corresponding to the steps |
| Notes `language_profile` | Determines the target profile and framework; read row by row, mixing allowed (e.g. interop cases landing in java) |
| `Component Deps` (column 5) | Orchestration dependencies: compose service list; `n/a` for a single component, `;` separated; feeds the `components` label |
| Notes `protocol_primitive` | `Task-T`/`Notification-T`/`Negotiation-T`/`Authorization-T` → orchestrate with the A2A-T SDK; `none` → REST/CLI |
| Notes `execution_strategy` | `smoke`/`full`/`slow` → mapped to the `execution` label for CI filtering by strategy |
| Notes `environment` | Runtime environment (framework §6.4, e.g. `docker-compose`/`with-workload-cluster`/`online`/`offline`) → mapped to the `environment` label for CI environment filtering |
| Other Notes keys | `design_method`, source, items to confirm → reference information, written into test docstring comments |

### CSV → label mapping (test-plan §5.3, mandatory for every test case)

| CSV field / Notes key | Code label | Description |
|-------------------|-----------|------|
| Module | `feature` | Feature dimension, e.g. `feature:registry-center` |
| Notes `environment` | `environment` | CI environment filtering |
| `Component Deps` | `components` | Expanded with comma separation, e.g. `components:registry-center,mockagent`; omit or write `components:none` when `n/a` |
| `Priority` | `priority` | e.g. `priority:P0` |
| Notes `execution_strategy` | `execution` | `smoke`/`full`/`slow` |
| Temporary skip (declared in code) | `skip` | A temporary skip must comment the related issue |
| `Case ID` | Case ID label | e.g. `FIT-registry-center-agentcard-001`, supports filtering a single case by label |
| `Milestone` | milestone label | e.g. `26-winter` |

For the exact syntax per profile, see the "Labels" section of [python.md](python.md) / [java.md](java.md) / [js.md](js.md) / [shell.md](shell.md).

## 4. Scenario inference

`parse-test-cases.mjs` infers a `scenario` from Case Name / Steps / Expected Result / Notes / Precondition to help identify the scenario type:

| scenario | Trigger features (matched top to bottom) |
|----------|------------------------------|
| `service_startup` | docker compose / start service / health check readiness |
| `agent_register` | register / POST /v1/agents |
| `agent_query` | query / GET / list / pagination |
| `agent_update_delete` | update / deregister / PUT / DELETE |
| `task_dispatch` | task dispatch / Task-T / cross-component |
| `protocol_negotiation` | negotiate / Negotiation-T / Authorization-T |
| `service_restart` | restart container / process / data persistence |
| `invalid_input` | invalid / reject / 400 / 422 / not found / 404 |
| `boundary` | boundary / length limit / 63 characters / 64 characters |
| `concurrency` | concurrent / idempotent / duplicate |
| `generic` | none of the above matched |

`scenario` is only a suggestion for file grouping and naming — the concrete style always follows the target repo's existing test files.

## 5. Entry-type inference (entry_type)

Inferred from Steps and the Notes `protocol_primitive` key to help decide the orchestration method:

| entry_type | Trigger features | Orchestration method |
|------------|----------|----------|
| `A2A-T` | Notes `protocol_primitive` ≠ none, or the steps contain Task-T / Notification-T / Negotiation-T / Authorization-T / JSON-RPC | A2A-T SDK client |
| `UI` | console / page / login / browser | Playwright |
| `Compose` | docker compose / container / service startup | compose CLI + REST client |
| `API` | api / http / curl / rest (default) | the profile's default HTTP client |

## 6. Case filtering and skipping

- `--ids FIT-registry-center-agentcard-001,FIT-registry-center-agentcard-002`: generate only the specified case IDs (pass IDs without brackets)
- `--priority P0,P1`: generate only the specified priorities
- Skip: when Case Type is not Functional Test / Exception Test / Protocol Test and Notes lacks a valid `dfx_type` key, or Case ID is empty; skipped rows must be listed in the delivery summary
