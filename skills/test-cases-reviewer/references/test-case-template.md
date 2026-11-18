# Test Case Template

The openan test case CSV has a fixed 16-column header, exactly matching the official template (`docs/templates/testcases-template.csv`, identical to `../test-cases-generator/templates/case-template.csv`):

```csv
Milestone,Case Name,Case ID,Module,Component Deps,Requirement Link,Case Type,Priority,Precondition,Steps,Expected Result,Automatable,Automated Test,Dev Owner,Test Owner,Notes
```

| Milestone | Case Name | Case ID | Module | Component Deps | Requirement Link | Case Type | Priority | Precondition | Steps | Expected Result | Automatable | Automated Test | Dev Owner | Test Owner | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `<YY>-<season>` (e.g. `26-winter`), filled when specified by the user | Verb-object phrase ≤50 characters, **without the Case ID prefix** | `[FIT-<feature>-<topic>-<3-digit seq>]` / `[DFX-<feature>-<topic>-<3-digit seq>]` (wrapped in square brackets) | Feature under test (kebab-case matching the feature segment of the Case ID, e.g. an openan repo name) | `n/a` or the openan repo names of dependencies (separated by `;`), listing only components actually interacted with in the steps | Requirement/Issue/PR links; **required for P0/P1** | English enum: `Functional Test`/`Exception Test`/`Protocol Test`/`Performance Test`/`Stress Test`/`Stability Test`/`Security Test`/`Compatibility Test`/`Deployment Test`/`System Test`; DFX rows map from the `dfx_type` key in Notes | P0/P1/P2 | Environment/data/system state, numbered `1. `, with explicit environment elements | Operation steps, numbered `1. `, executable, checkpoints marked `see result N`, last step is a cleanup action | Expected results, numbered `1.`, objectively verifiable; LLM-related cases use deterministic assertions (status codes/structure/state fields) and never assert generated text | `Yes`/`No`, P0/P1 must be `Yes` | Left empty at generation time; backfilled by e2e-test-code-gen as `<test file>::<test function>` | Filled when specified by the user | Filled when specified by the user | Note keys (separated by `;`): `design_method:xxx`, `dfx_type:DFx` (required for DFX rows), `environment:docker-compose`, `language_profile:python`, `protocol_primitive:none`, `execution_strategy:smoke`, plus source and to-be-confirmed items |
| 26-winter | Register a valid Agent successfully | [FIT-registry-center-agentcard-001] | registry-center | n/a | https://github.com/project-openan/registry-center/issues/1 | Functional Test | P0 | 1. the registry-center service is started with image v1.0; 2. port 8080 is reachable | 1. POST /v1/agents with a valid payload see result 1; 2. GET to query the Agent see result 2; 3. DELETE the Agent to clean up test data | 1. returns 201 and the response body contains agent_id; 2. GET returns 200 with fields matching the submission; 3. cleanup succeeds with 204 | Yes | | | | design_method:equivalence partitioning;environment:docker-compose;language_profile:python;protocol_primitive:none;execution_strategy:smoke |

## Notes Column Key Convention

`language_profile` / `protocol_primitive` / `execution_strategy` / `environment` / `dfx_type` no longer have their own columns; they are all written as `key:value` pairs in the "Notes" column, with multiple keys separated by `;` (or `;`) and multiple values of the same key separated by `|`. `Component Deps` is the standalone 5th column (value is `n/a` or repo names separated by `;`) and **must not be written into Notes**:

```text
design_method:equivalence partitioning;environment:docker-compose;language_profile:python;protocol_primitive:none;execution_strategy:smoke
dfx_type:DFR;environment:docker-compose;language_profile:java;protocol_primitive:Task-T;execution_strategy:slow
```
