import { pomodoroReducer } from './pomodoroMachine';
import type { Session, Settings } from './pomodoroMachine';

const initialSession: Session = {
  phase: 'focus',
  roundIndex: 1,
  status: 'idle',
};

export function hydrateSession(snapshot: Session | null, settings: Settings, nowMs: number): Session {
  if (!snapshot) return initialSession;

  // Basic validation
  if (
    typeof snapshot.phase !== 'string' ||
    typeof snapshot.roundIndex !== 'number' ||
    typeof snapshot.status !== 'string'
  ) {
    return initialSession;
  }

  if (snapshot.status === 'running' && snapshot.endAtEpochMs !== undefined) {
    if (nowMs >= snapshot.endAtEpochMs) {
      // One-boundary catch-up
      return pomodoroReducer(snapshot, { type: 'TICK', nowMs }, settings);
    }
  }

  return snapshot;
}
