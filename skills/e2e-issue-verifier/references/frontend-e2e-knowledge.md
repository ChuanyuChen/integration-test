# Frontend Component E2E Troubleshooting Domain Knowledge Base

This knowledge base serves as the domain knowledge support for `e2e-issue-verifier`, used to calibrate real DOM structures, composite-control interaction chains, virtual-list behaviors, and common locator ambiguities when analyzing frontend Playwright failures.

It is not a process document; the process is owned by `SKILL.md`. This file answers only one question: **when a frontend composite-control failure occurs, how to make more general and more actionable diagnoses based on DOM structure.**

## Relationship with `SKILL.md`

### What `SKILL.md` is responsible for

`SKILL.md` is responsible for:
- Identifying the frontend / backend verification paths
- Generating minimal verification commands
- Taking over evidence such as traces, logs, reports, and Issue comments
- Outputting root cause, fix status, FixContext, and handoff recommendations
- Controlling whether to hand off to `github-issue-fixer` or `github-issue-creator`

### What this knowledge base is responsible for

This knowledge base is responsible for:
- Explaining the real DOM structures of frontend composite controls
- Constraining the evidence priority during analysis
- Defining general determination rules for hidden instances, wrong containers, virtual lists, transient overlays, etc.
- Providing a more stable locator-anchor priority
- Breaking "looks like a timeout" problems into verifiable structural causes

### How to use

When `SKILL.md` analyzes a frontend failure, it must proactively consult this knowledge base, especially for:
- dropdowns / version selectors / menus / popups
- virtual lists / lazy-loaded lists
- same-name nodes, hidden nodes, stale instance remnants
- animations, overlays, transition states

If this knowledge base can explain the current DOM structure, prioritize locating by its rules; if it cannot, go back to traces, screenshots, and DOM snapshots to gather more evidence instead of directly increasing timeouts.

---

## 0. General Diagnostic Principles

When a test failure involves a composite control, troubleshoot in the following order:

1. First determine whether it hit a hidden instance, a stale popup remnant, or a zero-size node
2. Then determine whether it hit the wrong container or wrong popup instance
3. Then determine whether there is same-name node ambiguity
4. Then determine whether the target item lies within the current visible window of a virtual list
5. Then determine whether there is a transient overlay or an unfinished animation
6. Only lastly consider insufficient waits or an overly broad selector

Before ruling out the aforementioned structural problems, do not attribute the failure to slow page loading, insufficient timeout, or a need to simply add sleep.

---

## 1. General Characteristics of Select / Dropdown / Popover / Modal

### 1.1 DOM mounting mechanism

- The popup layer of a composite control is usually not mounted inside the business form node, but attached to the page root node or under `body`.
- This means parent-child hierarchical selectors are often unreliable; you must first find the currently active popup container, then locate the target item inside it.

### 1.2 Hidden instances and stale instance remnants

- After the page closes a popup, the DOM may not be removed immediately; a hidden instance may remain.
- A hidden instance is often accompanied by one of the following characteristics:
  - `*-hidden` class name
  - `pointer-events: none`
  - zero or near-zero size
  - `aria-hidden` / inactive state
- If multiple same-name instances exist, `first()` / `last()` easily hit the wrong object.

### 1.3 Diagnostic rules

When the above characteristics are seen, prioritize judging:
- whether the current locator mistakenly hits a hidden instance
- whether the current option belongs to the wrong popup
- whether stale popup remnants on the page are interfering

### 1.4 Recommended locator strategies

Priority order:
1. Nodes inside the currently active container
2. `data-*` / `title` / `aria-label`
3. `role` + visibility constraint
4. Plain text

Avoid relying solely on global text matching to click same-name nodes directly.

---

## 2. Virtual Lists / Lazy-Loaded Lists (Virtual List / rc-virtual-list)

### 2.1 Deferred rendering characteristics

- Long lists, version selectors, and dropdown option sets often use virtual scrolling.
- A virtual list only guarantees that nodes within the current viewport truly exist in the DOM.
- Options outside the current window may not exist at all, or may exist only as zero-size structures in a preparation container.

### 2.2 Diagnostic rules

If the trace or DOM shows:
- the dropdown is already open
- the target item text exists in the candidate list
- but the script can never find the corresponding option

then prioritize checking:
- whether the virtual-list holder needs to be scrolled
- whether the wrong container was scrolled
- whether the locator hit a hidden instance instead of the current window

### 2.3 Recommended scroll targets

Scroll preferentially:
- `rc-virtual-list-holder`
- the actual list holder with `overflow-y: auto`

Do not scroll the entire page by default, and do not increase the timeout by default.

### 2.4 Recommended operation order

1. Open the popup
2. Find the currently active container
3. Confirm the target item is within the visible window
4. Scroll the holder if necessary
5. Click only after the item is found

---

## 3. Animations, Overlays, and Transition States

### 3.1 Transient overlays

- During page switches, loading, submissions, and popup expansion, temporary overlays such as Loading, Toast, and skeleton screens may appear.
- This can cause clicks to be intercepted, but it is usually not the root cause—only a timing phenomenon.

### 3.2 Unfinished animations

- Popups, menus, and dropdowns may be in fade-in, scale, or transform animations while expanding.
- Before the animation ends, the element may not have entered an interactable state; `pointer-events` may still be unavailable.

### 3.3 Diagnostic rules

If the failure occurs right after opening a control, switching a page, or submitting an action, prioritize judging:
- whether an overlay layer exists
- whether it is in an animation transition state
- whether it has truly entered a stable interactable state

Only after ruling out these factors should you consider adjusting wait or retry strategies.

---

## 4. General Analysis Principles for Version Selectors and Composite Dropdowns

### 4.1 Do not assume "version does not exist" first

A version number exists but the locator fails—this usually does not indicate missing data, but more likely:
- hit a hidden instance
- hit the wrong container
- virtual list not scrolled to the item
- unstable text anchor used

### 4.2 Common stable anchors

For version selection, menu items, and popup items, prioritize:
- `title`
- `aria-label`
- `data-*`
- `role` nodes inside the currently active container

Plain text can be a supplement, but should not be the only anchor.

### 4.3 Structural judgment of version selectors

If the page DOM contains simultaneously:
- a hidden dropdown container
- the currently active dropdown container
- a virtual-list holder

then you must first identify the currently active container, then search for the target version inside it.

---

## 5. Composite Control General Diagnostic Checklist

When a failure involves the following controls, you must go through the diagnostic checklist below:
- dropdowns / selectors
- dialogs / modals
- menus / menu items
- tabs
- virtual lists / paged lists
- rollback / upgrade / version-switch panels

### 5.1 Must-check items

- Is there a hidden instance?
- Is there an active instance?
- Are there multiple same-name nodes?
- Is it a virtual list?
- Is the target item only stably exposed via attributes?
- Does the locator need to be scoped to the current popup/container?
- Are there animations / overlays / transition states?

### 5.2 Conclusion categories

Failures can usually be classified into:
- hidden instance mis-hit
- wrong container mis-hit
- same-name node ambiguity
- virtual window omission
- transient overlay
- animation not settled
- unstable text anchor
- incomplete interaction chain

---

## 6. Diagnostic Priority and Taboos

### 6.1 Priority

1. Visibility and active container
2. DOM structure ambiguity
3. Virtual-list visible window
4. Stable anchors (title / aria-label / data-*)
5. Only lastly timeout / retry / scroll-distance fine-tuning

### 6.2 Taboos

- Never click with `.first()` directly while hidden instances exist
- Never use global text clicks before confirming the active container
- Never increase the timeout by default as the first-choice fix in virtual-list scenarios
- Never attribute all failures to slow page loading

---

## 7. Cooperation with `e2e-issue-verifier`

### 7.1 What `SKILL.md` should do first

- Read failure logs, traces, reports, and Issue comments
- Generate the minimal verification command
- Determine frontend vs. backend
- Narrow down to the minimal case/file
- Output root cause, FixContext, and fix-status recommendation

### 7.2 What this knowledge base should provide

- Why this locator mis-hits
- Why this container is not the currently active instance
- Why the target item requires scrolling the virtual list
- Why `title` / `aria-label` are more stable than plain text
- When a problem should be classified as structural rather than a simple waiting problem

### 7.3 Division of responsibilities

- `SKILL.md` owns the process, handoff, verification, and conclusions
- This knowledge base owns the diagnostic rules for frontend DOM / component-library behaviors

If this knowledge base has given explicit rules, `SKILL.md` should interpret the DOM by these rules first, then decide whether code changes, handoff, or further verification are needed.

---

## 8. Scope of Application

This knowledge base mainly applies to the following DOM patterns in openAN frontend e2e scenarios:
- dropdown selectors
- version switchers
- virtual lists
- popups / dialogs
- menus / tabs / rollback panels
- composite controls where hidden instances and active instances coexist

When the page structure clearly does not belong to the above patterns, fall back to general DOM/trace analysis; do not mechanically apply this knowledge base.
