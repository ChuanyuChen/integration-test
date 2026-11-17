# Test Package Orchestration Design Guide (README first)

## 1. Positioning

**Before** generating test code, first produce the **architecture plan and execution scheme** for the target repository's test package (i.e. that repo's `tests/README.md`); after user confirmation it becomes the sole basis for code orchestration and generation.

**Inputs**: reviewed case CSV (openan fixed 16-column English headers, orchestration keys in the Notes column) + orchestration inputs (§3).
**Outputs**: the target repo's `tests/README.md` (orchestration design); code generation begins only after user confirmation.

## 2. What the orchestration design does

Turns the "text steps" of the case table into "executable orchestration", answering each question below:

| Orchestration question | Landing point (README section / code) |
|----------|---------------------------|
| Which file does each case go into | Directory structure + case coverage mapping |
| How preconditions are prepared | fixtures / conftest.py / setup.bash / `@BeforeEach` |
| Which environments and credentials are required | Environment variable contract (repo-root `e2e/.env.template`) |
| How cross-component dependencies are started | docker compose service topology (expanded from the Component Deps column) |
| Which API orchestrates the steps | Reuse list of the target repo's existing client / SDK |
| How protocol cases are orchestrated | A2A-T SDK (python/java) or REST client; the primitive comes from the Notes protocol_primitive key |
| How expectations are asserted | Assertion style per profile (assert / AssertJ / expect / bats-assert) |
| How to run it | Run methods (pytest / mvn / vitest / bats commands, tag filtering, timeouts) |

## 3. Orchestration input checklist (must be complete before generating the README)

| Orchestration input | Question it answers | Typical source |
|----------|--------------|----------|
| Target repository | owner/repo and local path; primary language; existing test directory conventions | User, repo structure |
| Package positioning and scope | unit / integration / e2e layering boundaries; which layer this batch of cases lands in | User, case preconditions |
| Deployment and startup method | How the service under test is started (docker compose? `uv run`? existing service address?) | User, target repo README/docs |
| Environment topology | Single-component or multi-component (Component Deps column); compose file location, service names, ports | CSV, target repo compose files |
| Environment variable contract | Service addresses, tokens, test data locations; which ones are optional | Target repo `e2e/.env.template`, docs |
| Credentials and permissions | Where the tokens needed for registration/auth come from (mandatory for Authorization-T cases) | User, target repo config |
| Suite lifecycle | Startup/cleanup order (compose up/down, temporary-directory isolation) | Profile files, target repo existing tests |
| Reuse list | The target repo's existing test helpers / fixtures / SDK clients | Read the target repo's existing test code |
| Run and filter methods | Commands to filter by tag/case ID, timeout suggestions (including the Notes execution_strategy key → tag mapping) | Profile files |

**STOP**: when any item above cannot be determined from user input, the CSV or the target repo's code, list each missing item and stop — fabrication is forbidden.

## 4. Required README sections (aligned with templates/test-package-readme.example.md)

1. Test scope (case ID ↔ verification content ↔ status mapping table)
2. Directory structure (per profile conventions)
3. fixtures / test data
4. Environment variable contract (`e2e/.env.template` snippet + variable table)
5. Cross-component topology (when Component Deps ≠ n/a: compose service list and startup order)
6. Suite lifecycle (setup/teardown)
7. Run methods (including commands to filter by case ID / tag; the smoke/full/slow execution strategies mapped to tags)
8. Known limitations (optional: skip conditions, resource-sensitive scenarios)

## 5. Executability checklist (README review criteria)

- [ ] Every case's preconditions have a corresponding fixture/setup landing point
- [ ] Every `see result N` has a corresponding assertion implementation plan (including the log/metrics observation means for DFX cases)
- [ ] Every environment variable has a documented source and default behavior
- [ ] Protocol cases (Notes protocol_primitive ≠ none) clearly state the SDK used and the sample data source
- [ ] The run commands work directly from the target repo root
