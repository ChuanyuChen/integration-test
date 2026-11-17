---
name: e2e-test-regression
description: Based on the failure analysis report from e2e-failure-analyzer, modify test code in openAN repositories only for issues clearly classified as E2E_CODE_BUG (any of Python/Java/JS/Shell), making minimal, safe, and reversible changes and producing a reviewable diff and verification report; do not fix the source code under test, and do not handle unclassified or non-test-code defects
---

# e2e-test-regression

## Trigger Conditions

The user brings an e2e-failure-analyzer analysis report and asks to fix test code, or runs /e2e-test-regression.

## Prerequisites (refuse to proceed if not met)

1. The analysis report exists and every item to fix is classified as `E2E_CODE_BUG`
2. The report contains: test file paths, failure evidence, verification commands
3. The target repository's git working tree is clean (or has a clearly authorized scope of uncommitted changes)

## Fix Principles

- **Minimal changes**: only touch the test code named in the analysis report; no opportunistic refactoring, no formatting of unrelated code
- **Language consistency**: the modification style follows the existing style of the repository's test code; see the corresponding language profile in `skills/e2e-test-code-gen/references/<lang>.md`
- **Reversible**: one commit (or one independent hunk) per cluster; rollback granularity = fix granularity
- **Verify after every fix**: run the verification commands from the report (at least covering the fixed cases) and show the results
- **Fix closure**: a fix PR must add the corresponding regression case and re-run all FIT cases of that feature (test-plan §8); this also applies after fixing test code

## Process

1. Locate the test code cluster by cluster → 2. Minimal modification → 3. Local verification → 4. Produce a report:

```markdown
## Fix Report
| Cluster | Case ID | Test File | Change Summary | Root Cause | Verification Command and Result |
```

## Hard Constraints

- Never modify the source code under test; if a suspected source-code bug is found, stop that item, annotate it in the report, and hand it to `github-issue-creator`
- Items classified as SOURCE_BUG / ENV_INFRA / FLAKY_TIMING / INSUFFICIENT_INFO are skipped outright; do not "fix them along the way"
- Do not run git commit/push (unless the user explicitly authorizes otherwise)
