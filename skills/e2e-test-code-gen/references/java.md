# Java Profile (JUnit5)

Applicable repositories: `a2a-t-sdk-java`, `workflow-engine-sdk-java`

## Tech stack

- Test framework: **JUnit 5** (Jupiter) + **AssertJ** (uniform assertion style)
- Mocking: **Mockito** (including `mockito-inline` for static mocking)
- HTTP/JSON-RPC interaction testing: **WireMock** (to simulate the peer Agent / Registry — the preferred choice for A2A-T JSON-RPC over HTTP scenarios)
- Build: Maven (reuse the root `pom.xml` multi-module structure; tests go into `src/test/java` of the corresponding module)
- Coverage: JaCoCo + `mvn verify`; thresholds are controlled by the root pom — do not create a separate config

## Directory structure conventions

E2E/contract test code goes into `src/test/java` of the corresponding module (Maven standard directory layout, **language-enforced exception**: it does not land in `e2e/<feature>/`; this is the authoritative directory convention and is already documented):

```text
<module>/src/test/java/com/openan/a2at/<area>/
├── unit/          // pure-logic tests
├── contract/      // JSON-RPC / AgentCard protocol contract tests (WireMock)
└── integration/   // multi-component assembly tests
<module>/src/test/resources/
└── wiremock/      // WireMock mapping files (__files / mappings)
```

## Naming and markers

- Classes: `<Scenario>Test` (unit, e.g. `TaskTSubmitContractTest`) / `<Protocol>ContractTest` (contract) / `<Flow>IT` (integration, taken over by Failsafe); scenario/protocol/flow names in PascalCase, no leading underscore
- Methods: `should_<expected>_<when_condition>`
- The case ID is written in `@DisplayName` (without brackets), e.g. `@DisplayName("FIT-A2A-003: Negotiation-T rejects unauthorized operations")`

## Labels (test-plan §5.3, mandatory)

Every test case must carry the `feature` / `environment` / `components` / `priority` / `execution` (smoke|full|slow) / `skip` (a temporary skip must comment the related issue) labels, plus the Case ID label and the Milestone label. Implement with JUnit5 `@Tag`, with key:value written in `key:value` form:

```java
@Tag("feature:registry-center")
@Tag("environment:docker-compose")
@Tag("components:registry-center,mockagent")
@Tag("priority:P0")
@Tag("execution:smoke")
@Tag("FIT-A2A-003")            // Case ID label — supports filtering a single case by label
@Tag("milestone:26-winter")
class TaskTSubmitContractTest { ... }
```

- Temporary skip: `@Disabled("blocked by https://github.com/project-openan/a2a-t-sdk-java/issues/123")` — the comment must contain the issue link
- Filter by label: `mvn test -Dgroups="feature:registry-center"`; local self-check (fast subset): `mvn test -Dgroups=smoke`

## Key patterns

```java
@WireMockTest
class TaskTSubmitContractTest {

    @Test
    @DisplayName("FIT-A2A-001: Task-T submit returns a structured task definition")
    void should_return_structured_task_when_submit_valid_task(WireMockRuntimeInfo wm) {
        stubFor(post("/jsonrpc")
            .willReturn(okJson("""
                {"jsonrpc":"2.0","id":1,
                 "result":{"taskId":"t-001","status":"SUBMITTED"}}
                """)));
        var client = A2ATClient.builder().endpoint(wm.getHttpBaseUrl()).build();
        var task = client.submitTask(validTaskT());
        assertThat(task.getTaskId()).isEqualTo("t-001");
    }
}
```

- Interop test note: when running against the Python SDK, protocol sample data goes into the existing `a2a-t-corpus` directories — do not maintain samples separately in each SDK
- For waiting/synchronization use Awaitility or poll the health endpoint — `Thread.sleep` is forbidden; test cases must be independently rerunnable — no inter-test ordering dependencies or shared mutable state; every `see result N` must have an explicit assertion — log-only is forbidden; teardown uses `@AfterEach` to delete all resources created by the case; session-scoped fixtures (`@BeforeAll`) are limited to read-only config (LLM config, login state); for LLM/generative output use deterministic assertions (status codes/structure/state/sort fields) — never assert on generated text

## Run commands

```bash
mvn test                           # unit + contract (Surefire)
mvn verify                         # plus integration (Failsafe)
mvn test -Dgroups=smoke            # local self-check (fast subset)
mvn test "-Dtest=*TaskTSubmitContractTest"   # filter by class-name pattern
```

## Minimal validation after generation

```bash
mvn -q test-compile   # test code must compile
```
