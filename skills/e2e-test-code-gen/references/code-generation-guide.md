# Test Code Generation Guide

## 1. Positioning

Converts a **reviewed case CSV** (openan fixed 16-column English headers, orchestration keys in the Notes column) into runnable test code in the target repository, grouped by the `language_profile` key in Notes.

**Inputs**: reviewed CSV + a confirmed `tests/README.md`.
**Outputs**: test source code in the target repo's test directory (python `e2e/<feature>/`; java `src/test/java` — Maven language-enforced exception; js `e2e/<feature>/`; shell `e2e/<feature>/*.bats`).

## 2. Common rules (shared by all four languages)

1. **Case IDs must land in code**: every test case must be searchable by its case ID (docstring / `@DisplayName` / `test()` title / `@test` name); write the **stripped form** of the bracketed Case ID from the CSV (e.g. `FIT-registry-center-agentcard-001`)
2. **Steps ↔ Expected Result alignment**: an assertion with the corresponding number must be inserted wherever a step says `see result N`; "walking through steps without asserting" is forbidden; the final cleanup action is implemented as teardown
3. **DFX cases assert non-functional observability points**: log level + keywords, metrics/health endpoint fields, process/container state; a business outcome as the sole assertion is forbidden
4. **Protocol cases use the SDK**: when the Notes `protocol_primitive` ≠ none, orchestrate with the A2A-T SDK; interop sample data goes into the existing `a2a-t-corpus` directories — do not maintain samples separately in each SDK
5. **Environment via variables**: service addresses, tokens, etc. must come from environment variables + the repo-root `e2e/.env.template` — hardcoding is forbidden; new variables must be synced to the template and documented in the README; never commit `.env` to git (add it to `.gitignore`)
6. **Align with the target repo's existing style**: read the repo's existing test files before generating; import order, fixture style and assertion library follow what already exists
7. **File header notes the source**: source CSV path + the list of case IDs covered by this file
8. **Labels are mandatory (test-plan §5.3)**: every test case must carry the `feature`, `environment`, `components`, `priority`, `execution` (smoke|full|slow) and `skip` (a temporary skip must comment the related issue) labels, plus the Case ID label and the Milestone label to support filtering a single case by label; see the "Labels" section of the corresponding profile file for the exact syntax

## 3. Anti-pattern list (red lines, forbidden)

- **No sleep/fixed-wait synchronization**: must use framework wait/retry mechanisms (e.g. tenacity, Playwright `await expect`, polling the health endpoint)
- **No inter-test ordering dependencies or shared mutable state**: test cases must be independently rerunnable
- **Every `see result N` checkpoint must have an explicit assertion** — log-only is forbidden
- **Teardown/cleanup must delete all resources created by the case** (python fixture post-yield cleanup, java `@AfterEach`, js `afterEach`, shell `teardown` function)
- **Session-scoped fixtures are limited to read-only config** (LLM config, login state)
- **LLM/generative-output cases use deterministic assertions** (status codes/structure/state/sort fields) — never assert on generated text

## 4. Python (pytest)

See [python.md](python.md). Key points:

- e2e layer: connect to a running service via environment variables (e.g. `REGISTRY_CENTER_URL`, from the repo-root `e2e/.env.template`); skip with `skipif` when unset — raising an error is forbidden
- integration layer: `httpx.ASGITransport` for in-process direct connection — no need to start a service
- Async cases must add `@pytest.mark.asyncio`
- DFX observation: use `caplog` to assert log level/keywords, or request `/health`, `/metrics`

```python
@pytest.mark.e2e
async def test_restart_data_persisted(client):
    """DFX-registry-center-service-restart-001: registered agent data persists after a registry-center process restart"""
    ...  # restart via compose, then assert agents retrievable
    assert resp.status_code == 200
```

Run (full): `uv run pytest e2e/<feature>/ -q`; local self-check (fast subset): `uv run pytest e2e/<feature>/ -m "not slow"` (or `-m smoke`); by case: `uv run pytest e2e/<feature>/ -q -k "fit_registry_center_agentcard_001 or dfx_registry_center_service_restart_001"`.

## 5. Java (JUnit5)

See [java.md](java.md). Key points:

- Contract/protocol tests use `@WireMockTest` to simulate the peer; class name `_<Protocol>ContractTest`
- integration classes `_<Flow>IT` are taken over by Failsafe (`mvn verify`)
- DFX observation: capture logs (Logback ListAppender) or assert Actuator/health endpoints

```java
@Test
@DisplayName("DFX-registry-center-service-restart-001: registered agent data persists after a service restart")
void should_keep_agents_after_restart() { ... }
```

Run: `mvn test "-Dtest=*<Scenario>Test"`; integration: `mvn verify`; local self-check (fast subset): `mvn test -Dgroups=smoke`.

## 6. JS/TS (Vitest + Playwright)

See [js.md](js.md). Key points:

- Component/unit tests use Vitest + MSW; page E2E uses Playwright, with cases in `e2e/<feature>/{module}.{scenario}.spec.ts`
- Playwright case ID goes in the `test()` title; baseURL comes from an environment variable
- Keep screenshots/traces on failure: `screenshot: 'only-on-failure'`
- DFX observation: assert in the page log panel, or poll `/health` via API

```ts
test('FIT-marketplace-agentcard-001: shows the agent market after login', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Agent Market' })).toBeVisible()
})
```

Run (full): `npx playwright test e2e/<feature>/`; local self-check (fast subset): `npx playwright test e2e/<feature>/ --grep @smoke`; by case: `npx playwright test e2e/<feature>/ --grep "FIT-marketplace-agentcard-001"`; Vitest: `npm run test`.

## 7. Shell (bats)

See [shell.md](shell.md). Key points:

- Every case has independent setup/teardown with temporary-directory isolation (`mktemp -d`, isolated `$HOME`)
- The script under test is invoked by absolute path; `skip` when docker scenarios are unavailable
- DFX observation: assert log keywords and container state via `docker logs` / `docker inspect`

```bash
@test "DFX-ofpower-install-invalid-input-001: installer prints an error and exits non-zero on invalid input" {
    run "$BATS_TEST_DIRNAME/../../binary/installer.sh" --invalid-flag
    [ "$status" -ne 0 ]
    [[ "$output" == *"invalid"* ]]
}
```

Run (full): `bats e2e/<feature>/`; local self-check (fast subset): filter by the `execution` label in the file header (e.g. `bats e2e/<feature>/ --filter smoke` or split smoke files); static checks: `shellcheck e2e/<feature>/ && shfmt -d .`.

## 8. Minimal validation (must run before delivery)

| profile | Validation command |
|---------|----------|
| python | `uv run pytest --collect-only -q` + `uv run ruff check e2e/<feature>/` |
| java | `mvn -q test-compile` |
| js | `npx vitest run --reporter=dot` (no collection errors) |
| shell | `bats --count e2e/<feature>/` + `shellcheck e2e/<feature>/` |

If validation fails, fix the generated code first (or report a target-repo environment issue) — never deliver with errors.
