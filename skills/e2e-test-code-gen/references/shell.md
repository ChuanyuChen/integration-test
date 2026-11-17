# Shell Profile (bats-core)

Applicable repository: `openan-installation`

## Tech stack

- Test framework: **bats-core** (plus the `bats-support` / `bats-assert` assertion libraries)
- Static checks: **shellcheck**, **shfmt** (test code is held to the same bar as the scripts under test)
- Environment isolation: tests run in a `mktemp -d` temporary directory — polluting the real `$HOME` / `/usr/local` is forbidden
- Containerized scenarios (`containerized/`): run when docker is available, otherwise `skip` (bats `skip "docker not available"`)

## Directory structure conventions

E2E test code goes into the repo-root `e2e/<feature>/` (test-plan §11), with `.bats` files under it; helpers and other support files are organized in the same directory:

```text
e2e/<feature>/
├── <module>.bats               # corresponds to the scripts under test in binary/ and containerized/
├── helpers/
│   ├── setup.bash              # shared setup: temporary directory, PATH preset, cleanup
│   └── fixtures/               # fake binaries, fake configs
└── shellcheck.sh               # entry point for a full shellcheck scan
```

## Naming and conventions

- Test cases: `@test "<script>: <action> <expected outcome>"`, with the case ID first (without brackets), e.g. `@test "DFX-ofpower-install-invalid-input-001: installer prints usage and exits 1 when arguments are missing"`
- Every test case has independent setup/teardown and does not depend on execution order
- The script under test is invoked by absolute path (`"$BATS_TEST_DIRNAME/../../binary/installer.sh"`) — do not `cd` into the directory under test

## Labels (test-plan §5.3, mandatory)

Every test case must carry the `feature` / `environment` / `components` / `priority` / `execution` (smoke|full|slow) / `skip` (a temporary skip must comment the related issue) labels, plus the Case ID label and the Milestone label. bats has no built-in tagging mechanism — use a **file-header comment block** as the convention for CI to parse; locally, filter by execution-strategy-split files (see run commands):

```bash
#!/usr/bin/env bats
# labels: feature=openan-installation environment=offline components=registry-center,mockagent priority=P0 execution=smoke
# case_id: DFX-ofpower-install-invalid-input-001
# milestone: 26-winter
load helpers/setup
```

- Use the skip helper for temporary skips, with the issue link commented:

```bash
@test "DFX-ofpower-install-invalid-input-001: installer prints usage and exits 1 when arguments are missing" {
    # skip reason: https://github.com/project-openan/openan-installation/issues/123
    skip "blocked by openan-installation#123"
    ...
}
```

- Filter by execution: locally run the files split by execution (e.g. `bats e2e/<feature>/installer.smoke.bats`); CI parses the file-header comment block; `bats --filter` only matches test names (e.g. `--filter "DFX-ofpower-install-invalid-input-001"` to locate a single case), not the file-header comments — do not use it for label filtering

## Key patterns

```bash
#!/usr/bin/env bats
load helpers/setup

@test "DFX-ofpower-install-invalid-input-001: installer prints usage and exits 1 when arguments are missing" {
    run "$BATS_TEST_DIRNAME/../../binary/installer.sh"
    [ "$status" -eq 1 ]
    [[ "$output" == *"Usage"* ]]
}
```

```bash
# helpers/setup.bash pattern
setup() {
    TEST_TMPDIR="$(mktemp -d)"
    export HOME="$TEST_TMPDIR"   # isolate HOME
}
teardown() {
    rm -rf "$TEST_TMPDIR"        # teardown must delete all resources created by the case
}
```

- For waiting/synchronization poll the health endpoint or use retry loops (e.g. a `wait_for` helper) — fixed sleep waits are forbidden; test cases must be independently rerunnable — no inter-test ordering dependencies or shared mutable state; every `see result N` must have an explicit assertion (bats-assert) — log-only is forbidden; every case teardown must delete all resources it created (temporary directories, fake configs, started containers); session-level setup is limited to read-only config (LLM config, login state); for LLM/generative output use deterministic assertions (status codes/structure/state/sort fields) — never assert on generated text

## Run commands

```bash
bats e2e/<feature>/                          # all
bats e2e/<feature>/<module>.smoke.bats       # local self-check (fast subset — files split by execution)
bats e2e/<feature>/<module>.bats             # single file
shellcheck binary/*.sh containerized/**/*.sh
shfmt -d .
```

## Minimal validation after generation

```bash
bats --count e2e/<feature>/    # cases discoverable (or bats -l to list)
shellcheck e2e/<feature>/      # the test scripts themselves pass static checks
```
