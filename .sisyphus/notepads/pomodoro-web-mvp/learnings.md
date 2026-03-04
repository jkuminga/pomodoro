# Learnings

## Repo State
- Repo started greenfield: no app code, no package manifests.

## Timer Accuracy
- Use epoch-based `endAtEpochMs - now` math; never count ticks.
Intent: No app scaffolds detected in workspace.
Date: 2026-03-03
Notes: Root scanned with: package.json, index.html, src/, dotfiles. No Node/JS tooling or timer related code found in this workspace.

## Time Control for Testing (Vitest + Playwright)

### Vitest: Fake Timers

**Official Documentation**: https://vitest.dev/api/vi.html#vi-usefaketimers

**Required Setup**:
- `test.environment = 'jsdom'` in vite.config.ts (for React component tests)
- `globals: true` is OPTIONAL - `vi` is available via import: `import { vi } from 'vitest'`
- If globals enabled: `vi` available globally; otherwise import explicitly

**APIs**:
```typescript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()  // Enable fake timers
})

afterEach(() => {
  vi.useRealTimers()  // CRITICAL: restore real timers
})

// Set system time (Date.now, new Date, performance.now)
vi.setSystemTime(new Date('2024-01-15T12:00:00'))
vi.setSystemTime(1705329600000)  // epoch ms

// Advance timers (for setTimeout/setInterval)
vi.advanceTimersByTime(1000)           // sync
await vi.advanceTimersByTimeAsync(1000) // async
vi.advanceTimersToNextTimer()
vi.runAllTimers()

// Get real time while fake timers active
vi.getRealSystemTime()
```

**Evidence**: https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking/dates.md

**Common Pitfalls**:
1. **FORGETTING `vi.useRealTimers()`** - causes test pollution; always pair with afterEach
2. **MSW v2 conflict** - fake timers mock queueMicrotask which breaks MSW; use `vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'Date'] })` to only fake what's needed
3. **Not calling `useFakeTimers` first** - `setSystemTime` requires fake timers to be active
4. **Timezone issues** - use UTC or explicit timezones; prefer ISO strings

---

### Playwright: Clock Emulation (Recommended over addInitScript)

**Official Documentation**: https://playwright.dev/docs/api/class-clock

**Modern Approach (v1.45+)**: Use native Clock API
```typescript
import { test } from '@playwright/test'

test('timer countdown', async ({ page }) => {
  // Install clock with initial time
  await page.clock.install({ time: new Date('2024-02-02T10:00:00') })
  
  await page.goto('/')
  
  // Pause at specific time
  await page.clock.pauseAt(new Date('2024-02-02T10:05:00'))
  
  // Fast-forward time
  await page.clock.fastForward('30:00')  // or milliseconds
  
  // Resume normal time flow
  await page.clock.resume()
})
```

**Clock Methods**:
- `page.clock.setFixedTime(time)` - Fixed time, timers keep running
- `page.clock.install({ time })` - Full fake timers with control
- `page.clock.pauseAt(time)` - Pause at specific time
- `page.clock.fastForward(duration)` - Jump forward
- `page.clock.runFor(ms)` - Run for duration
- `page.clock.resume()` - Resume normal time

**Evidence**: https://github.com/microsoft/playwright/blob/main/docs/src/clock.md

**Tradeoffs vs addInitScript**:
| Aspect | Clock API | addInitScript |
|--------|-----------|---------------|
| Timer control | Native (pause/resume/ff) | Manual implementation |
| Cross-browser | Consistent | May vary |
| Performance | Optimized | Custom overhead |
| Complexity | Low | Higher |

**Legacy addInitScript Approach** (from plan - still valid):
```typescript
async function installFakeNow(page: Page, startMs = 1_700_000_000_000) {
  await page.addInitScript((ms) => {
    window.__FAKE_NOW__ = ms
    window.__advanceNow__ = (delta: number) => (window.__FAKE_NOW__ += delta)
    Date.now = () => window.__FAKE_NOW__
  }, startMs)
}

async function advanceNow(page: Page, deltaMs: number) {
  await page.evaluate((delta) => window.__advanceNow__(delta), deltaMs)
  await page.waitForTimeout(350)  // Allow render
}
```

---

### Vitest Config for Pomodoro (from plan)

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',      // REQUIRED for React
    setupFiles: ['./src/setupTests.ts'],
    globals: true,             // Optional - enables global `vi`
  },
})
```

### References
- Vitest fake timers: https://vitest.dev/api/vi.html#vi-usefaketimers
- Vitest date mocking: https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking/dates.md
- Playwright Clock: https://playwright.dev/docs/api/class-clock
- Playwright clock guide: https://github.com/microsoft/playwright/blob/main/docs/src/clock.md

Date: 2026-03-03

---

## Epoch-Based Countdown Timer: Research Findings

### Implementation Notes

1. **Epoch timestamps over tick counting**
   - Use `endAtEpochMs - Date.now()` for display calculation, not decrementing counters
   - This ensures accuracy even when tab is backgrounded/throttled
   - React's `useEffect` with `setInterval` at ~100ms for UI updates is acceptable; the math stays correct

2. **Pause/Resume with epoch math**
   - On pause: store `remainingMs = endAtEpochMs - Date.now()`
   - On resume: compute new `endAtEpochMs = Date.now() + remainingMs`
   - This naturally handles the "resume from paused time" semantics

3. **localStorage persistence**
   - Store `endAtEpochMs` (not remaining time) to survive clock adjustments
   - On load: if `endAtEpochMs` exists and > now, compute remaining and resume
   - Also store `pausedAtMs` flag to detect paused state on reload

4. **Catch-up semantics on reload (one-boundary approach)**
   - On mount: read `endAtEpochMs` from localStorage
   - If `endAtEpochMs` < Date.now(): timer completed → set to 0, clear storage
   - If paused flag set: show paused remaining time, don't auto-resume
   - If running: resume countdown from computed remaining

5. **Background throttling mitigation**
   - Browser throttles `setInterval` to 1sec (or worse, 1min after 5min)
   - Epoch math compensates automatically on next tick
   - Optional: use Page Visibility API to pause when hidden, recalc on visible
   - Ref: Chrome timer throttling documented at https://www.chrome.com/blog/timer-throttling-in-chrome-88

6. **State structure for MVP**
   ```typescript
   interface TimerState {
     endAtEpochMs: number | null;  // null = not started
     pausedRemainingMs: number | null;  // null = running
   }
   ```

---

### Citations

1. **React Documentation - Separating Events from Effects**
   - URL: https://react.dev/learn/separating-events-from-effects
   - Topic: Correct useEffect patterns for timers, useEffectEvent

2. **MDN - Page Visibility API**
   - URL: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
   - Topic: Browser timer throttling behavior in background tabs

3. **Chrome Blog - Timer Throttling in Chrome 88**
   - URL: https://www.chrome.com/blog/timer-throttling-in-chrome-88
   - Topic: Detailed explanation of background tab timer throttling

4. **Pontis Technology - Fix JavaScript Timer Drift in Background Tabs**
   - URL: https://pontistechnology.com/learn-why-setinterval-javascript-breaks-when-throttled/
   - Topic: Web Workers as solution for background timer accuracy

5. **Josh W. Comeau - Persisting React State in localStorage**
   - URL: https://www.joshwcomeau.com/react/persisting-react-state-into-localstorage/
   - Topic: useStickyState pattern for localStorage persistence

6. **Stack Overflow - Pause and Resume Counting from localStorage**
   - URL: https://stackoverflow.com/questions/52553438/pause-and-resume-the-counting-values-from-localstorage
   - Topic: Concrete pause/resume with localStorage pattern

---

### GitHub Example References

1. **PeterT11/PersistantTimer**
   - URL: https://github.com/PeterT11/PersistantTimer
   - File: `src/ptimer.ts`
   - Pattern: Uses `new Date().getTime() - cu.start + cu.lastSavedElapsedTime` (epoch-based)
   - Features: localStorage persistence, pause on blur, configurable update frequency

2. **eagle-head/timekeeper-countdown**
   - URL: https://github.com/eagle-head/timekeeper-countdown
   - Package: `@timekeeper-countdown/react`
   - Pattern: Snapshot-driven timer API with epoch timestamps

3. **react-countdown (npm: react-countdown)**
   - URL: https://github.com/ndresx/react-countdown
   - Pattern: `date={Date.now() + 10000}` epoch-based, exposes pause/resume/stop API
   - File: Uses `calcTimeDelta` for epoch math

4. **bradgarropy/use-countdown**
   - URL: https://github.com/bradgarropy/use-countdown
   - Pattern: TypeScript hook with pause(), resume(), reset() methods


## Task 1: Scaffold apps/pomodoro/ (Vite React+TS) + scripts
- Scaffolded Vite React+TS app in `apps/pomodoro/`.
- Configured Vitest with `jsdom` and `setupTests.ts`.
- Configured Playwright for E2E testing against the preview server.
- Configured ESLint with flat config (`eslint.config.mjs`).
- Gotchas:
  - Vitest needs to exclude `e2e` directory to avoid running Playwright tests.
  - `vite.config.ts` should import `defineConfig` from `vitest/config` to avoid TS errors with the `test` property during `tsc -b`.
  - Default Vite template title is `pomodoro` (based on project name), updated E2E test to match.

## Pomodoro State Machine Implementation
- **Pure Reducer Pattern**: Implementing the timer as a pure reducer makes it highly testable and decoupled from React's lifecycle or system time.
- **Epoch-based Timing**: Using `endAtEpochMs` instead of a simple counter ensures accuracy even if `TICK` actions are throttled or delayed.
- **One-boundary Catch-up**: When hydrating an expired running timer, advancing only one boundary and then pausing prevents complex chaining logic and provides a predictable user experience.
- **Deterministic Testing**: Passing `nowMs` in every action allows for completely deterministic unit tests without relying on `vi.useFakeTimers()` or real-time waiting.

## Pomodoro Timer State Machine Implementation (2026-03-03)

- **Pure, Epoch-based Timing**: The core logic is now entirely pure, relying on  passed in via actions. This makes the machine deterministic and easy to test.
- **Canonical Types**: Implemented  and  types as requested.
- **Boundary Transitions**: Transitions between focus and break phases (and completion) are handled by a single  helper.
- **Catch-up Semantics**: The  action handles catch-up by advancing exactly one boundary if the current phase has expired. This prevents complex chaining and ensures predictable state transitions.
- **Helper Functions**:  and  provide consistent ways to derive and display time.
- **Settings Validation**:  ensures that user-provided settings are within reasonable bounds (1-60 minutes for timers, 1-12 rounds).

## Pomodoro Timer State Machine Implementation (2026-03-03)

- **Pure, Epoch-based Timing**: The core logic is now entirely pure, relying on `nowMs` passed in via actions. This makes the machine deterministic and easy to test.
- **Canonical Types**: Implemented `Settings` and `Session` types as requested.
- **Boundary Transitions**: Transitions between focus and break phases (and completion) are handled by a single `advanceBoundary` helper.
- **Catch-up Semantics**: The `TICK` action handles catch-up by advancing exactly one boundary if the current phase has expired. This prevents complex chaining and ensures predictable state transitions.
- **Helper Functions**: `getRemainingMs` and `formatMsToMMSS` provide consistent ways to derive and display time.
- **Settings Validation**: `clampAndValidateSettings` ensures that user-provided settings are within reasonable bounds (1-60 minutes for timers, 1-12 rounds).

## UI Layout & Visual Styling (2026-03-03)
- **Aesthetic Direction**: Implemented a "Refined Organic" aesthetic using a warm, paper-like palette (`#f7f2ea`, `#efe6d8`) and high-contrast ink (`#1f2328`).
- **Typography**: Paired `Fraunces` (serif) for display elements and `IBM Plex Sans` (sans-serif) for UI controls to create a sophisticated, editorial feel.
- **Glassmorphism**: Used `backdrop-filter: blur(10px)` and semi-transparent backgrounds (`rgba(255, 255, 255, 0.65)`) for the timer card to add depth and modern texture.
- **Responsive Design**: Implemented a centered column layout with a max-width of 720px, ensuring the interface remains focused and legible across devices.
- **Micro-interactions**: Added a subtle `accent-glow` transition (180ms) to primary actions to provide tactile feedback without visual clutter.

- Added .isFocus and .isBreak class hooks to .timer-card for phase-specific styling.
- Implemented 180ms ease transitions for smooth phase changes and button interactions.
- Enhanced accessibility with explicit focus-visible outlines for control buttons.

### Timer Wiring Pattern
- Used `useReducer` with a wrapper to capture dynamic `settings` for the machine logic.
- Implemented an epoch-based tick mechanism using `setInterval` and `Date.now()` to ensure accuracy regardless of tick cadence.
- Leveraged `vi.useFakeTimers()` and `vi.setSystemTime()` for deterministic testing of time-dependent UI states.
- Followed `verbatimModuleSyntax` requirements by using `import type` for TypeScript interfaces.

## Settings UI, Validation & Persistence (2026-03-03)
- **Raw Input State**: Stored user inputs as strings to allow for intermediate invalid states (empty, non-numeric) without auto-clamping.
- **Derived Validation**: Used `useMemo` to parse inputs and generate inline error messages, preventing the timer from starting if errors exist.
- **LocalStorage Persistence**: Implemented a dedicated `settingsStorage` helper to persist valid settings to `pomodoro:v1` and hydrate them on mount.
- **Safe Hydration**: Used `useState` initializers for hydration to avoid cascading renders and ensure settings are available on the first render.

## Session Persistence & Hydration (2026-03-03)
- **Schema**: Extended `localStorage` key `pomodoro:v1` to store `{ settings, session }`.
- **Persistence Strategy**: Persist `session` snapshot on every change except when `idle` (which clears the session).
- **Hydration Strategy**: On load, hydrate the session using `hydrateSession` helper. If a running session has expired, it advances exactly one boundary (e.g., Focus -> Break Paused) to prevent complex chaining and provide a predictable catch-up.
- **Test Isolation**: Added `localStorage.clear()` to `beforeEach` in component tests to prevent session hydration from polluting test cases.

## Task 7: Audio and Accessibility
- **Audio Gating**: Implemented `audioEnabled` state to ensure sound only plays after the first user gesture (Start click), complying with browser autoplay policies.
- **Double-play Prevention**: Used `prevSession` ref to track phase changes and `skipFlag` ref to prevent sound on manual Skip actions.
- **Accessibility**: Added `aria-label`, `aria-live`, and `role` attributes to improve screen reader support. Ensured buttons are keyboard-focusable and respond to Enter key.
- **Testing**: Mocked `Audio` constructor in Vitest using `vi.fn().mockImplementation(function() { ... })` to support `new Audio()`. Used `fireEvent` for keyboard simulation in JSDOM as `user-event` had timeout issues with fake timers in this environment.

## UI Layout & Visual Styling (2026-03-03)
- **Test Environment**: `jsdom` environment in Vitest provides `window` but not `global.Audio`. Use `window.Audio` or `vi.stubGlobal('Audio', ...)` for mocking audio in tests.
- **CSS Variables**: Centralizing colors and spacing in `:root` makes theming and maintenance much easier.
- **Typography**: Using `@fontsource` packages is a reliable way to manage fonts without relying on external CDNs.
- **Layout**: Flexbox and Grid are essential for responsive layouts, especially for the settings panel which needs to adapt to different screen sizes.

## Task 7: Audio and Keyboard Testing with Fake Timers
- **user-event vs fireEvent**: `@testing-library/user-event` (v14+) can cause timeouts when used with `vi.useFakeTimers()` in JSDOM because it relies on real-time delays for its internal state machine. For deterministic tests with fake timers, `fireEvent` is more reliable.
- **Keyboard Emulation in JSDOM**: To properly emulate a button press via keyboard in JSDOM, focusing the element and then triggering both `keyDown({ key: 'Enter' })` and `click()` is often necessary, as JSDOM does not automatically trigger a click on Enter key down like a real browser does.
- **Audio Mocking**: When mocking `Audio`, using a function/class mock that returns an object with `play: vi.fn().mockResolvedValue(undefined)` allows for testing both the constructor call and the `play()` method call count.
315: 
316: ## Task 8: Hardening Unit Tests & Edge Cases (2026-03-03)
317: - **Edge Case Coverage**: Added tests for `roundsTarget=1` completion, `SKIP` on final focus, and `formatMsToMMSS` with `<10s` and `1h+` durations.
318: - **Robust Settings Validation**: Updated `clampAndValidateSettings` to explicitly handle `NaN` by returning a validation error and falling back to default values, ensuring the machine state remains valid even with corrupt inputs.
319: - **Whitespace Handling**: Verified that `parseInt` in the UI layer correctly handles leading/trailing whitespace, and added a component-level test to ensure "  30  " is accepted as a valid input.
320: - **Test Reliability**: Maintained zero flaky timing by using injected `nowMs` in reducer tests and `vi.useFakeTimers()` in component tests, with `localStorage.clear()` in `beforeEach` to ensure test isolation.

## UI Layout & Visual Styling (Static Skeleton) (2026-03-03)
- **Static Regression**: Reverting a logic-heavy component to a static skeleton is sometimes necessary to strictly follow a "UI first" plan, even if it feels like a regression.
- **CSS Variables**: Centralizing colors and spacing in `:root` makes theming and maintenance much easier.
- **Font Management**: `@fontsource` packages are a convenient way to self-host fonts without manual asset management.
