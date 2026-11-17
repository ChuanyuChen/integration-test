# JS/TS Profile (Vitest + Playwright)

Applicable repositories: `openan-portal`, `openan-demo`

## Tech stack

- Unit/component tests: **Vitest** (already built into the repo — reuse the root `vitest.config.js`)
- E2E (portal pages): **Playwright**
- API mocking: **MSW** (Mock Service Worker) or Playwright `page.route`
- Build: npm monorepo (`packages/*`); test scripts are all attached to the root `package.json`

## Directory structure conventions

E2E (portal page) cases go into the repo-root `e2e/<feature>/` (test-plan §11), with files named `{module}.{scenario}.spec.ts`:

```text
packages/<pkg>/src/**/*.test.ts       # unit/component tests (same directory as the code under test, or a tests/ subdirectory)
e2e/<feature>/                        # Playwright cases (e.g. e2e/marketplace/marketplace.agentcard.spec.ts)
e2e/fixtures/                         # test data and MSW handlers
playwright.config.ts                  # E2E config (baseURL via environment variable)
```

## Naming and markers

- Unit test files: `*.test.ts`, test cases `should <expected outcome> when <condition>`
- Playwright: `e2e/<feature>/{module}.{scenario}.spec.ts`; the case ID is written in the `test.describe` or `test()` title (without brackets), e.g. `test("FIT-marketplace-agentcard-001: shows the agent market after login", ...)`
- Test titles are uniformly short English phrases for friendlier reporting

## Labels (test-plan §5.3, mandatory)

Every test case must carry the `feature` / `environment` / `components` / `priority` / `execution` (smoke|full|slow) / `skip` (a temporary skip must comment the related issue) labels, plus the Case ID label and the Milestone label. Playwright implements them with annotations; Vitest equivalently via the options meta of `describe`/`test`:

```ts
// Playwright: test.describe / test-level annotations
test.describe('Agent market', {
  annotation: [
    { type: 'feature', description: 'marketplace' },
    { type: 'environment', description: 'online' },
    { type: 'components', description: 'openan-portal' },
    { type: 'priority', description: 'P0' },
    { type: 'execution', description: 'smoke' },
    { type: 'case_id', description: 'FIT-marketplace-agentcard-001' },  // Case ID label
    { type: 'milestone', description: '26-winter' },
  ],
}, () => {
  test('FIT-marketplace-agentcard-001: shows the agent market after login', async ({ page }) => { ... })
})
```

```ts
// Vitest equivalent (options.meta — same mandatory label set as the Playwright example); CI filters by meta
describe('Agent market', { meta: {
  feature: 'marketplace',
  environment: 'online',
  components: 'openan-portal',
  priority: 'P0',
  execution: 'smoke',
  case_id: 'FIT-marketplace-agentcard-001',
  milestone: '26-winter',
} }, () => {
  test('shows agent market after login', () => { ... })
})
```

- Temporary skip: Playwright `test.skip(condition, "blocked by https://github.com/project-openan/openan-portal/issues/123")` (the comment must contain the issue link); Vitest `describe.skip` / `it.skip` likewise
- Filter by label: `npx playwright test --grep @smoke` (or a custom grep by annotation)

## Key patterns

```ts
// Vitest + MSW component test
import { setupServer } from 'msw/node'
const server = setupServer(...handlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

```ts
// Playwright E2E
import { test, expect } from '@playwright/test'
test('FIT-marketplace-agentcard-001: shows the agent market after login', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Agent Market' })).toBeVisible()
})
```

- The portal backend address goes through `PLAYWRIGHT_BASE_URL` / `PORTAL_API_BASE` (from the repo-root `e2e/.env.template`) — hardcoding is forbidden; never commit `.env` to git (add it to `.gitignore`)
- Keep screenshots and traces on failure: in `playwright.config.ts` use `use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' }`
- For waiting/synchronization rely on `await expect(...)` auto-retry or poll the health endpoint — fixed `page.waitForTimeout` waits are forbidden; test cases must be independently rerunnable — no inter-test ordering dependencies or shared mutable state; every `see result N` must have an explicit assertion — log-only is forbidden; teardown uses `afterEach` to delete all resources created by the case; session-scoped fixtures are limited to read-only config (LLM config, login state); for LLM/generative output use deterministic assertions (status codes/structure/state/sort fields) — never assert on generated text

## Run commands

```bash
npm run test                                     # Vitest
npx playwright test e2e/<feature>/               # E2E full run
npx playwright test e2e/<feature>/ --grep @smoke # local self-check (fast subset)
npx playwright test e2e/<feature>/ --grep "FIT-marketplace-agentcard-001"
npx playwright show-report
```

## Minimal validation after generation

```bash
npx vitest run --reporter=dot   # at least no collection errors
```
