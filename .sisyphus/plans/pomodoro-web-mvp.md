# Pomodoro Web MVP (Timer + Settings + Rounds)

## TL;DR
> **Summary**: Build a simple Pomodoro web app from scratch with focus/break durations and round count settings, persisted to localStorage.
> **Deliverables**:
> - React+TypeScript web app under `apps/pomodoro/`
> - Focus/Break timer with Start/Pause/Resume/Reset + Skip
> - Settings: focus minutes, break minutes, round count (persisted)
> - Round progress indicator and end-of-run completion state
> - Unit tests for timer state machine + persistence; Playwright smoke e2e
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Scaffold app -> implement timer machine -> wire UI + persistence -> tests -> build/e2e

## Context
### Original Request
- “뽀모도로 앱을 만들고 싶어. 굉장히 간단할거야.”

### Interview Summary
- Platform: web app
- MVP: timer + settings (focus time, break time, round count)
- Persistence: localStorage only (no accounts/cloud); no Notification API

### Repo/Env Findings
- Workspace has no application code yet (greenfield). No `package.json`, no tests, no CI.

### Metis Review (gaps addressed)
- Timer must be epoch-based (avoid tick counting; mitigate background throttling).
- Persistence needs explicit schema versioning (`pomodoro:v1`).
- Define catch-up semantics and end-of-run behavior explicitly; avoid ambiguous “skip ahead forever”.

## Work Objectives
### Core Objective
- Create a deterministic, accurate Pomodoro timer web app with configurable durations and round target, persisted locally.

### Deliverables
- App scaffold in `apps/pomodoro/` with dev/build/test scripts
- Pomodoro state machine (pure) + React UI
- localStorage persistence for settings + session snapshot
- Tests (unit + e2e) and runnable verification commands

### Definition of Done (verifiable)
- `npm --prefix apps/pomodoro install` succeeds
- `npm --prefix apps/pomodoro run lint` succeeds
- `npm --prefix apps/pomodoro run test` succeeds
- `npm --prefix apps/pomodoro run build` succeeds
- `npm --prefix apps/pomodoro run test:e2e` succeeds

### Must Have
- Controls: Start, Pause, Resume, Reset, Skip
- Settings: focusMinutes, breakMinutes, roundsTarget (all validated)
- Display: phase label (Focus/Break), mm:ss countdown, round progress `current/target`
- Persistence:
  - Settings always persisted
  - Session persisted with epoch end time; refresh restores without drift

### Must NOT Have (guardrails)
- No accounts/login, cloud sync, analytics, task lists, history
- No Notification API / push / service worker / PWA
- No long-break rules (only Focus <-> Break with round target)
- No reliance on decrementing “-1 per second” for correctness

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after using Vitest + React Testing Library; Playwright for e2e
- Evidence outputs (executor creates these): `.sisyphus/evidence/task-{N}-{slug}.*`

External references:
- Vite (React+TS): https://vite.dev/guide/
- Vitest: https://vitest.dev/
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Playwright: https://playwright.dev/

## Execution Strategy
### Parallel Execution Waves
Wave 1 (foundation)
- 1 Scaffold app + tooling
- 2 Define domain model + timer machine (pure)
- 3 UI layout + styling direction

Wave 2 (integration)
- 4 Wire timer machine into React
- 5 Add settings + validation + persistence
- 6 Add session persistence + resume semantics
- 7 Add sound + accessibility polish

Wave 3 (verification)
- 8 Unit tests + utilities (fake now)
- 9 Playwright e2e (clock/short durations)
- 10 Final cleanup + build verification

### Dependency Matrix (all tasks)
- 1 blocks all app code tasks (2-10)
- 2 blocks 4,6,8 (timer logic consumers)
- 3 blocks none (can proceed after 1)
- 4 depends on 1,2,3
- 5 depends on 1,3
- 6 depends on 1,2,5
- 7 depends on 1,4
- 8 depends on 1,2,5,6
- 9 depends on 1,4,5,6
- 10 depends on 1-9

### Agent Dispatch Summary
- Wave 1: 3 tasks (quick/unspecified-low)
- Wave 2: 4 tasks (unspecified-low)
- Wave 3: 3 tasks (unspecified-high for tests)

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Scaffold `apps/pomodoro/` (Vite React+TS) + scripts

  **What to do**:
- Scaffold the app (non-interactive):
  - `npm create vite@latest apps/pomodoro -- --template react-ts`
  - `npm --prefix apps/pomodoro install`
- Add test/lint tooling (pin as dev deps in `apps/pomodoro/package.json`):
  - Unit test: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`
  - E2E: `@playwright/test`
  - Lint (flat config): `eslint`, `typescript-eslint`, `globals`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Add scripts in `apps/pomodoro/package.json` (exact):
  - `lint`: `eslint .`
  - `test`: `vitest run`
  - `test:e2e`: `npm run build && playwright test`
  - Configure Vitest (exact):
    - In `apps/pomodoro/vite.config.ts`, set `test.environment = 'jsdom'` and `test.setupFiles = ['./src/setupTests.ts']`.
    - Create `apps/pomodoro/src/setupTests.ts` importing `@testing-library/jest-dom`.
    - Minimal `vite.config.ts` shape (merge with Vite template):
  ```ts
  /// <reference types="vitest" />
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      globals: true,
    },
  });
  ```
  - Configure ESLint (exact):
  - Create `apps/pomodoro/eslint.config.mjs` using TypeScript ESLint + React hooks + React refresh; lint TS/TSX.
    - Minimal `eslint.config.mjs` (flat config):
  ```js
  import js from '@eslint/js';
  import globals from 'globals';
  import reactHooks from 'eslint-plugin-react-hooks';
  import reactRefresh from 'eslint-plugin-react-refresh';
  import tseslint from 'typescript-eslint';

  export default tseslint.config(
    { ignores: ['dist'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: { ecmaVersion: 2020, globals: globals.browser },
      plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    },
  );
  ```
  - Configure Playwright (exact):
    - Create `apps/pomodoro/playwright.config.ts` with `use.baseURL = 'http://127.0.0.1:4173'` and `webServer.command = 'npm run preview -- --host 127.0.0.1 --port 4173'`.
    - Install browsers: `npm exec --prefix apps/pomodoro playwright install`.
    - Minimal `playwright.config.ts`:
  ```ts
  import { defineConfig } from '@playwright/test';

  export default defineConfig({
    testDir: './e2e',
    use: { baseURL: 'http://127.0.0.1:4173' },
    webServer: {
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
  });
  ```
- Add one trivial unit test to avoid empty-test ambiguity: `apps/pomodoro/src/smoke.test.ts`.
- Ensure all commands in Definition of Done exist and run.

  **Must NOT do**:
  - Do not initialize PWA/service-worker.
  - Do not add Next.js or SSR.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: straightforward scaffolding + config.
  - Skills: `[]`

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-10 | Blocked By: none

  **References**:
  - External: https://vite.dev/guide/ — Vite React+TS scaffolding
  - External: https://playwright.dev/docs/test-intro — Playwright test setup

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run lint` exits 0
  - [ ] `npm --prefix apps/pomodoro run test` exits 0
  - [ ] `npm --prefix apps/pomodoro run build` exits 0

  **QA Scenarios**:
  ```
  Scenario: Build succeeds
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run build
    Expected: Exit code 0
    Evidence: .sisyphus/evidence/task-1-build.txt

  Scenario: Playwright runner is ready
    Tool: Bash
    Steps: npm exec --prefix apps/pomodoro playwright --version
    Expected: Prints a version and exits 0
    Evidence: .sisyphus/evidence/task-1-playwright-version.txt
  ```

  **Commit**: NO | Message: `chore: scaffold pomodoro web app` | Files: `apps/pomodoro/**`

- [x] 2. Implement pomodoro timer state machine (pure, epoch-based)

  **What to do**:
  - Create a pure state machine / reducer module (no React) (e.g. `apps/pomodoro/src/lib/pomodoroMachine.ts`).
  - Define canonical types:
    - `Phase = 'focus' | 'break'`
    - `TimerStatus = 'idle' | 'running' | 'paused' | 'completed'`
    - `Settings { focusMinutes; breakMinutes; roundsTarget }`
    - `Session { phase; roundIndex (1-based); status; endAtEpochMs?; pausedRemainingMs? }`
  - Timing model:
    - When starting/resuming, compute `endAtEpochMs = now + remainingMs`.
    - “Tick” computes `remainingMs = max(0, endAtEpochMs - now)`.
    - No decrement-by-interval logic.
  - Transition rules:
    - `idle` -> Start => `running` Focus roundIndex=1.
    - When remaining hits 0:
      - If phase=focus and roundIndex < roundsTarget: advance to Break, status becomes `paused` with full break duration loaded.
      - If phase=break: advance to Focus (roundIndex+1), status `paused` with full focus duration loaded.
      - If phase=focus and roundIndex == roundsTarget: status `completed`.
    - “Catch-up” semantics on load: if session is `running` but `now >= endAtEpochMs`, apply at most ONE boundary transition and set to `paused` (or `completed`), never auto-chain multiple phases.
  - Export helpers:
    - `formatMsToMMSS(ms)`
    - `clampAndValidateSettings(input)` returning errors
  - Add unit tests in `apps/pomodoro/src/lib/pomodoroMachine.test.ts` (deterministic; no real waiting):
    - Start -> running computes `endAtEpochMs`
    - Pause freezes `pausedRemainingMs`
    - Resume recomputes `endAtEpochMs`
    - Focus end advances to Break and pauses (not auto-running)
    - Break end advances to next Focus and pauses
    - Final focus end sets `completed`
    - Catch-up rule: expired running session applies ONE boundary transition then pauses

  **Must NOT do**:
  - Do not implement long break.
  - Do not auto-start next phase when boundary hits; always pause at boundary.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: domain logic with types.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,6,8 | Blocked By: 1

  **References**:
  - External: https://developer.mozilla.org/en-US/docs/Web/API/setInterval — interval caveats (throttling)

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run test -- -t pomodoroMachine` exits 0

  **QA Scenarios**:
  ```
  Scenario: Focus completes -> break paused
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "Focus completes"
    Expected: Unit test passes deterministically without real waiting
    Evidence: .sisyphus/evidence/task-2-machine-transition.txt

  Scenario: Refresh after expiry applies one transition
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "Catch-up applies one"
    Expected: Status becomes paused (or completed) and does not skip multiple phases
    Evidence: .sisyphus/evidence/task-2-catch-up.txt
  ```

  **Commit**: NO | Message: `feat(timer): add epoch-based pomodoro state machine` | Files: `apps/pomodoro/src/lib/pomodoroMachine.ts`

- [x] 3. Create UI layout + visual styling direction

  **What to do**:
  - Build a single-page UI with sections:
    - Header (app name + subtle status)
    - Timer card (phase label, time, round progress)
    - Controls row
    - Settings panel (inline or modal)
  - Styling decisions (explicit; implement exactly):
    - Fonts: use `@fontsource/ibm-plex-sans` for body and `@fontsource/fraunces` for headings.
      - Install: `npm --prefix apps/pomodoro install @fontsource/ibm-plex-sans @fontsource/fraunces`
      - Import in `apps/pomodoro/src/main.tsx` (or a dedicated `src/styles/fonts.css` imported by `main.tsx`).
    - CSS variables in `:root`:
      - `--bg0 #f7f2ea`, `--bg1 #efe6d8`, `--ink #1f2328`, `--muted #5a6472`
      - `--focus #d04f2a`, `--break #1f7a8c`, `--card rgba(255,255,255,0.65)`
      - `--radius 18px`, `--shadow 0 18px 50px rgba(15,20,30,0.12)`
    - Background: `linear-gradient(135deg, var(--bg0), var(--bg1))`.
    - Motion: on phase change, animate accent color + subtle card glow with `transition: 180ms ease`.
  - Mobile: ensure layout works at 360px width.

  **Must NOT do**:
  - No complex component library.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: intentional UI design.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5 | Blocked By: 1

  **References**:
  - External: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run dev` renders timer UI skeleton on desktop and mobile widths

  **QA Scenarios**:
  ```
  Scenario: Responsive smoke check
    Tool: Playwright
    Steps: Open page; set viewport 390x844; verify controls visible without horizontal scroll
    Expected: No overflow-x; primary controls reachable
    Evidence: .sisyphus/evidence/task-3-responsive.png

  Scenario: Phase change animation does not shift layout
    Tool: Playwright
    Steps: Use Skip to go Focus->Break; take before/after screenshots
    Expected: No layout jump; only intended color/glow transition
    Evidence: .sisyphus/evidence/task-3-motion.png
  ```

  **Commit**: NO | Message: `feat(ui): add timer layout and styling` | Files: `apps/pomodoro/src/**`

- [x] 4. Wire timer machine into React (render + controls)

  **What to do**:
  - Create React state layer using `useReducer` with the machine reducer.
  - Add a single ticking mechanism that dispatches `TICK(now)` at ~250ms-1000ms cadence (cadence should not affect correctness).
  - Implement controls:
    - Start: start focus (or resume if paused with remaining)
    - Pause: freeze remaining into `pausedRemainingMs`
    - Resume: compute new `endAtEpochMs`
    - Reset: return to idle but keep settings
    - Skip: force boundary transition (Focus->Break paused; Break->Focus paused; if last focus -> completed)
  - Add component tests (Vitest + React Testing Library), e.g. `apps/pomodoro/src/App.controls.test.tsx`:
    - Start shows running state and decreasing time when `vi.setSystemTime()` advances
    - Pause freezes time; advancing system time does not change displayed remaining
    - Resume continues from paused remaining
    - Skip moves Focus->Break paused and updates phase label

  **Must NOT do**:
  - Do not store countdown in component state independent of machine.

  **Recommended Agent Profile**:
  - Category: `unspecified-low`
  - Skills: `[]`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7,9 | Blocked By: 1,2,3

  **References**:
  - To be created: `apps/pomodoro/src/lib/pomodoroMachine.ts` — reducer contract

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run test -- -t "controls"` exits 0

  **QA Scenarios**:
  ```
  Scenario: Start/Pause/Resume via component tests
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "controls"
    Expected: Tests advance time via vi.setSystemTime; pause freezes; resume continues
    Evidence: .sisyphus/evidence/task-4-controls.txt

  Scenario: Skip -> Break paused
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "Skip"
    Expected: Phase becomes Break and status is paused (not running)
    Evidence: .sisyphus/evidence/task-4-skip.txt
  ```

  **Commit**: NO | Message: `feat(timer): connect state machine to UI controls` | Files: `apps/pomodoro/src/**`

- [x] 5. Add settings UI + validation + localStorage persistence (settings)

  **What to do**:
  - Settings fields (minutes):
    - focusMinutes: integer, default 25, range 1..180
    - breakMinutes: integer, default 5, range 1..60
    - roundsTarget: integer, default 4, range 1..12
  - Validate with clear inline errors; prevent starting if invalid.
  - Persist settings to localStorage key `pomodoro:v1`.
  - Hydrate settings on load; fallback to defaults.
  - Add unit tests (Vitest) for:
    - Validation ranges (1..180 / 1..60 / 1..12)
    - localStorage round-trip of settings (write then read)

  **Must NOT do**:
  - Do not persist to cookies or remote.

  **Recommended Agent Profile**:
  - Category: `unspecified-low`
  - Skills: `[]`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,8,9 | Blocked By: 1,3

  **References**:
  - External: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run test -- -t "settings"` exits 0

  **QA Scenarios**:
  ```
  Scenario: Settings persist (unit)
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "settings persist"
    Expected: Reads back the same settings from localStorage
    Evidence: .sisyphus/evidence/task-5-settings-persist.txt

  Scenario: Validation blocks invalid values (unit)
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "settings validation"
    Expected: Invalid values produce errors and prevent Start action in reducer/UI
    Evidence: .sisyphus/evidence/task-5-validation.txt
  ```

  **Commit**: NO | Message: `feat(settings): persist validated timer settings` | Files: `apps/pomodoro/src/**`

- [x] 6. Persist session snapshot + restore (epoch-based; one-boundary catch-up)

  **What to do**:
  - Extend localStorage schema `pomodoro:v1`:
    - `settings`
    - `session` snapshot (phase, roundIndex, status, endAtEpochMs, pausedRemainingMs)
  - On every meaningful state change (start/pause/resume/skip/boundary), write session snapshot.
  - On load:
    - If session absent: idle
    - If session status=running:
      - If now < endAtEpochMs: restore running
      - Else: apply ONE boundary transition, set paused (or completed)
    - If paused: restore pausedRemainingMs
  - Ensure Reset clears session but keeps settings.
  - Add unit tests (Vitest) for:
    - Hydration of running session mid-run (remaining based on endAtEpochMs - now)
    - Expired on load applies ONE boundary transition then pauses
    - Reset clears session storage

  **Must NOT do**:
  - Do not attempt multi-tab sync.

  **Recommended Agent Profile**:
  - Category: `unspecified-low`
  - Skills: `[]`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8,9 | Blocked By: 1,2,5

  **References**:
  - To be created: `apps/pomodoro/src/lib/pomodoroMachine.ts` — catch-up rule

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run test -- -t "hydrate"` exits 0

  **QA Scenarios**:
  ```
  Scenario: Hydrate mid-run uses epoch math (unit)
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "hydrate mid-run"
    Expected: Remaining is computed from endAtEpochMs - now (no tick counting)
    Evidence: .sisyphus/evidence/task-6-resume.txt

  Scenario: Expired on load advances one boundary only (unit)
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "one-boundary"
    Expected: Advances to next phase and pauses; does not chain multiple phases
    Evidence: .sisyphus/evidence/task-6-expired-catchup.txt
  ```

  **Commit**: NO | Message: `feat(persistence): restore session via epoch timestamps` | Files: `apps/pomodoro/src/**`

- [ ] 7. Add end-of-phase sound + basic accessibility

  **What to do**:
  - Add a short sound on boundary completion (when remaining hits 0) using an HTMLAudioElement.
  - Ensure sound only plays after a user gesture has occurred (e.g. after first Start, set `audioEnabled=true`).
  - Add ARIA labels for controls and ensure focus styles visible.
  - Add `document.title` update with remaining time when running (optional but small).
  - Add unit tests (Vitest + RTL):
    - Mock/stub `Audio` (or your audio wrapper) and assert play is invoked exactly once on boundary completion.
    - Keyboard-only: Tab/Enter can Start then Pause (focus ring visible via class or style assertion if feasible).

  **Must NOT do**:
  - Do not request notification permission.

  **Recommended Agent Profile**:
  - Category: `unspecified-low`
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 1,4

  **References**:
  - External: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run test -- -t "audio"` exits 0

  **QA Scenarios**:
  ```
  Scenario: Sound cue triggers once (unit)
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "audio"
    Expected: Stubbed Audio.play called exactly once on boundary completion
    Evidence: .sisyphus/evidence/task-7-audio.txt

  Scenario: Keyboard-only start/pause (unit)
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "keyboard"
    Expected: Enter on focused buttons triggers start then pause; focus indicator present
    Evidence: .sisyphus/evidence/task-7-a11y.txt
  ```

  **Commit**: NO | Message: `feat(ux): add sound cue and a11y polish` | Files: `apps/pomodoro/src/**`

- [ ] 8. Add unit tests for timer machine + persistence helpers

  **What to do**:
  - Audit the test suite added in tasks 2,4,5,6,7 and harden it:
    - Ensure all timing tests use `vi.setSystemTime()` / injected `now` (no real waiting)
    - Add any missing edge cases:
      - RoundsTarget=1 completes at end of first Focus
      - Skip on final Focus results in `completed`
      - format function handles <10s and hour+ durations
      - Settings parsing trims and rejects NaN
    - Remove or keep `src/smoke.test.ts` based on whether other tests exist; keep total suite deterministic.

  **Must NOT do**:
  - No flaky timing tests with real waits.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: test determinism and edge cases.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: 1,2,5,6

  **References**:
  - External: https://vitest.dev/guide/

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run test` exits 0

  **QA Scenarios**:
  ```
  Scenario: Deterministic transitions
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test
    Expected: All tests pass; no test takes >1s due to waiting
    Evidence: .sisyphus/evidence/task-8-tests.txt

  Scenario: Drift prevention
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run test -- -t "epoch"
    Expected: Remaining computed from endAtEpochMs - now
    Evidence: .sisyphus/evidence/task-8-epoch.txt
  ```

  **Commit**: NO | Message: `test(timer): cover machine transitions and persistence` | Files: `apps/pomodoro/src/**`

- [ ] 9. Add Playwright e2e smoke tests (settings + resume)

  **What to do**:
  - Configure Playwright to run against dev server or preview.
  - Write deterministic tests:
    - Settings persist across reload
    - Start focus -> advance time -> reload -> remaining correct
    - Boundary transition ends in paused next phase
  - Use `page.addInitScript` to stub `Date.now()` and advance time deterministically (no real waiting).
    - Use this exact approach in tests:
  ```ts
  // In the test file
  async function installFakeNow(page: import('@playwright/test').Page, startMs = 1_700_000_000_000) {
    await page.addInitScript((ms) => {
      // @ts-expect-error test-only
      window.__FAKE_NOW__ = ms;
      // @ts-expect-error test-only
      window.__advanceNow__ = (delta: number) => (window.__FAKE_NOW__ += delta);
      Date.now = () => {
        // @ts-expect-error test-only
        return window.__FAKE_NOW__;
      };
    }, startMs);
  }

  async function advanceNow(page: import('@playwright/test').Page, deltaMs: number) {
    await page.evaluate((delta) => {
      // @ts-expect-error test-only
      window.__advanceNow__(delta);
    }, deltaMs);
    // Allow one real tick to render (keep this short)
    await page.waitForTimeout(350);
  }
  ```

  **Must NOT do**:
  - Do not rely on long `waitForTimeout`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: e2e reliability.
  - Skills: [`playwright`] — Reason: browser automation patterns.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: 1,4,5,6

  **References**:
  - External: https://playwright.dev/docs/test-intro

  **Acceptance Criteria**:
  - [ ] `npm --prefix apps/pomodoro run test:e2e` exits 0

  **QA Scenarios**:
  ```
  Scenario: Settings persist
    Tool: Playwright
    Steps: Set settings; reload; assert values
    Expected: Values persisted
    Evidence: .sisyphus/evidence/task-9-e2e-settings.txt

  Scenario: Resume after reload
    Tool: Playwright
    Steps: Stub Date.now; Start; advance fake now; reload; assert remaining reduced
    Expected: Remaining reflects elapsed based on epoch end time
    Evidence: .sisyphus/evidence/task-9-e2e-resume.txt
  ```

  **Commit**: NO | Message: `test(e2e): add playwright smoke coverage` | Files: `apps/pomodoro/**`

- [ ] 10. Final verification + polish pass

  **What to do**:
  - Run full command set (install/lint/test/build/e2e).
  - Ensure no console errors in normal use.
  - Confirm “completed” state UX: show completion message and allow Reset.

  **Recommended Agent Profile**:
  - Category: `unspecified-low`
  - Skills: `[]`

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: 1-9

  **Acceptance Criteria**:
  - [ ] All Definition-of-Done commands succeed

  **QA Scenarios**:
  ```
  Scenario: Full verification run
    Tool: Bash
    Steps: npm --prefix apps/pomodoro run lint && npm --prefix apps/pomodoro run test && npm --prefix apps/pomodoro run build && npm --prefix apps/pomodoro run test:e2e
    Expected: Exit code 0
    Evidence: .sisyphus/evidence/task-10-verify.txt

  Scenario: Completion UX
    Tool: Playwright
    Steps: Set focus=1, break=1, rounds=1; Start; advance to end; verify completed UI and Reset works
    Expected: Completed message; timer stops; Reset returns to idle
    Evidence: .sisyphus/evidence/task-10-complete.png
  ```

  **Commit**: NO | Message: `chore: verify and polish pomodoro mvp` | Files: `apps/pomodoro/**`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Repository is currently not a git repo; plan assumes NO commits. If you want commits, initialize git and commit per task messages.

## Success Criteria
- Pomodoro web app runs locally (`npm --prefix apps/pomodoro run dev`), settings persist via localStorage, timer transitions are correct, and all verification commands pass.
