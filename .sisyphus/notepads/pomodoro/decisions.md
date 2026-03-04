## Decisions
- Used a `now` state to trigger re-renders and provide the current time for `getRemainingMs`.
- Updated `lastValidSettingsRef.current` during render to ensure the reducer always uses the most recent valid settings.
- Used `displaySettings` (derived from `effectiveSettings` or `lastValidSettingsRef`) in the render to avoid showing `NaN:NaN` when inputs are invalid.
## Syncing time on mount
Used `useLayoutEffect` to sync the current time and dispatch a `TICK` action on mount. This ensures that if a session is hydrated from storage, the remaining time is calculated correctly before the first paint, avoiding a flash of an incorrect (large) remaining time.
