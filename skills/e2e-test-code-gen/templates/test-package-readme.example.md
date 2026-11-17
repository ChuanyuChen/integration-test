# <module> Automated Tests

This directory is the automated test package for the `<module>` module of <target repository> (<profile: pytest / JUnit5 / Vitest+Playwright / bats>), verifying <one-sentence core value>.

> Note: <unit / integration / e2e layering boundaries (if any)>

## Test scope

| Case ID | What it verifies | Type | Priority | Status |
| --- | --- | --- | --- | --- |
| <FIT-registry-center-agentcard-001> | <one-sentence verification point> | Functional Test | P0 | ✅ stable |

### By test file (when there are multiple files)

| File | Covered case IDs | Description |
| --- | --- | --- |
| `<test_xxx.py / XxxTest.java / xxx.spec.ts / xxx.bats>` | <ID list> | <responsibility> |

## Directory structure

Follow the directory conventions of the profile in use (see `references/<profile>.md`):

```text
e2e/<feature>/
├── <per profile convention>    # test source (file header notes source CSV and case ID; java uses src/test/java as a language-enforced exception)
├── fixtures/ or assets/        # test data (interop samples reuse the existing a2a-t-corpus directory)
tests/
└── README.md                   # this file (orchestration doc)
```

## fixtures / test data

1. <fixture name and purpose, e.g. a service instance started by compose, an in-memory client>
2. <data file locations and how they are loaded>

## Environment variables

All loaded from the repo-root `e2e/.env.template` (copy it to `.env` locally for use; **never commit `.env` to git — it must be in `.gitignore`**; new variables must be synced to the template and registered in the variable table of this document):

```bash
# <variable purpose group>
<KEY_1>=<example value>
<KEY_2>=<example value>
```

| Variable | Purpose | Default behavior |
| --- | --- | --- |
| `<KEY_1>` | <purpose> | <skip / reuse other variables / error> |

## Cross-component topology (when Component Deps ≠ n/a)

| Service | Source | Startup method | Port |
| --- | --- | --- | --- |
| <orchestration-center> | <openan/orchestration-center> | `docker compose up -d` (<compose file path>) | <port> |

Startup order and readiness conditions: <description>

## Suite lifecycle

Setup phase:

1. <compose up / temporary directory / in-memory store initialization>
2. <wait for readiness: poll the health endpoint, etc.>

Teardown phase:

- <compose down / temporary directory cleanup>

## Running

Run from the target repo root (per profile — see `references/<profile>.md` for details):

```bash
# all
<profile run command, e.g. uv run pytest e2e/<feature>/ -q>

# local self-check (fast subset)
pytest e2e/<feature>/ -m "not slow"   # semantics: a fast-subset self-check, unified across languages (java -Dgroups=smoke / playwright --grep @smoke / bats --filter smoke)

# filter by case ID
<profile filter command, e.g. pytest -k / --grep / "-Dtest=*<Scenario>Test">

# filter by execution strategy (the Notes execution_strategy key smoke/full/slow is already mapped to the execution label)
<e.g. pytest -m smoke / npx playwright test --grep @smoke>
```

Minimal validation (must pass before delivery): <collect-only / test-compile / vitest run / bats --count command>

## Known limitations (optional)

1. <skip conditions: automatic skip when the service is not started, when e2e-layer environment variables are missing, etc.>
