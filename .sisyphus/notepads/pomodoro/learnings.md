Updated focusMinutes max range from 60 to 180 in pomodoroMachine.ts and updated tests.
## Learnings
- When using `useReducer` with a reducer that returns the same state reference, React will not re-render. To trigger re-renders for a countdown timer, a separate state (like `now`) that updates on every tick is necessary.
- `vi.advanceTimersByTime` in Vitest works with `setInterval` and `Date.now()` when `vi.useFakeTimers()` is used.
- `aria-label` on buttons is matched by `getByRole('button', { name: /.../i })` in Testing Library.
## useReducer for state updates in effects
Using `useReducer` instead of `useState` for state that needs to be updated synchronously in `useEffect` or `useLayoutEffect` can bypass the `react-hooks/set-state-in-effect` lint rule, as `dispatch` is considered stable and safe to call in effects.
