export type Phase = 'focus' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface Settings {
  focusMinutes: number;
  breakMinutes: number;
  roundsTarget: number;
  autoStart: boolean;
}

export interface Session {
  phase: Phase;
  roundIndex: number;
  status: TimerStatus;
  endAtEpochMs?: number;
  pausedRemainingMs?: number;
}

export type PomodoroAction =
  | { type: 'START'; nowMs: number }
  | { type: 'PAUSE'; nowMs: number }
  | { type: 'RESUME'; nowMs: number }
  | { type: 'RESET' }
  | { type: 'SKIP'; nowMs: number }
  | { type: 'TICK'; nowMs: number };

export function formatMsToMMSS(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function clampAndValidateSettings(input: Partial<Settings>): {
  settings: Settings;
  errors: Partial<Record<keyof Settings, string>>;
} {
  const errors: Partial<Record<keyof Settings, string>> = {};
  
  const focusVal = input.focusMinutes ?? 25;
  const breakVal = input.breakMinutes ?? 5;
  const roundsVal = input.roundsTarget ?? 4;

  const settings: Settings = {
    focusMinutes: isNaN(focusVal) ? 25 : Math.max(1, Math.min(180, focusVal)),
    breakMinutes: isNaN(breakVal) ? 5 : Math.max(1, Math.min(60, breakVal)),
    roundsTarget: isNaN(roundsVal) ? 4 : Math.max(1, Math.min(12, roundsVal)),
    autoStart: input.autoStart ?? false,
  };

  if (isNaN(focusVal)) {
    errors.focusMinutes = 'Must be a valid integer';
  } else if (input.focusMinutes !== undefined && (input.focusMinutes < 1 || input.focusMinutes > 180)) {
    errors.focusMinutes = 'Must be between 1 and 180';
  }

  if (isNaN(breakVal)) {
    errors.breakMinutes = 'Must be a valid integer';
  } else if (input.breakMinutes !== undefined && (input.breakMinutes < 1 || input.breakMinutes > 60)) {
    errors.breakMinutes = 'Must be between 1 and 60';
  }

  if (isNaN(roundsVal)) {
    errors.roundsTarget = 'Must be a valid integer';
  } else if (input.roundsTarget !== undefined && (input.roundsTarget < 1 || input.roundsTarget > 12)) {
    errors.roundsTarget = 'Must be between 1 and 12';
  }

  return { settings, errors };
}

export function getRemainingMs(session: Session, settings: Settings, nowMs: number): number {
  if (session.status === 'idle') {
    return settings.focusMinutes * 60 * 1000;
  }
  if (session.status === 'paused' || session.status === 'completed') {
    return session.pausedRemainingMs ?? 0;
  }
  if (session.status === 'running' && session.endAtEpochMs !== undefined) {
    return Math.max(0, session.endAtEpochMs - nowMs);
  }
  return 0;
}

export function pomodoroReducer(
  session: Session,
  action: PomodoroAction,
  settings: Settings
): Session {
  switch (action.type) {
    case 'START': {
      if (session.status !== 'idle') return session;
      const durationMs = settings.focusMinutes * 60 * 1000;
      return {
        ...session,
        status: 'running',
        endAtEpochMs: action.nowMs + durationMs,
        pausedRemainingMs: undefined,
      };
    }

    case 'PAUSE': {
      if (session.status !== 'running') return session;
      const remaining = getRemainingMs(session, settings, action.nowMs);
      return {
        ...session,
        status: 'paused',
        endAtEpochMs: undefined,
        pausedRemainingMs: remaining,
      };
    }

    case 'RESUME': {
      if (session.status !== 'paused') return session;
      return {
        ...session,
        status: 'running',
        endAtEpochMs: action.nowMs + (session.pausedRemainingMs ?? 0),
        pausedRemainingMs: undefined,
      };
    }

    case 'RESET': {
      return {
        phase: 'focus',
        roundIndex: 1,
        status: 'idle',
      };
    }

    case 'SKIP': {
      const next = advanceBoundary(session, settings);
      if (settings.autoStart && next.status === 'paused' && next.pausedRemainingMs !== undefined) {
        next.status = 'running';
        next.endAtEpochMs = action.nowMs + next.pausedRemainingMs;
        next.pausedRemainingMs = undefined;
      }
      return next;
    }

    case 'TICK': {
      if (session.status !== 'running') return session;
      const remaining = getRemainingMs(session, settings, action.nowMs);
      if (remaining === 0) {
        const next = advanceBoundary(session, settings);
        if (settings.autoStart && next.status === 'paused' && next.pausedRemainingMs !== undefined) {
          next.status = 'running';
          next.endAtEpochMs = action.nowMs + next.pausedRemainingMs;
          next.pausedRemainingMs = undefined;
        }
        return next;
      }
      return session;
    }

    default:
      return session;
  }
}

function advanceBoundary(session: Session, settings: Settings): Session {
  if (session.phase === 'focus') {
    if (session.roundIndex >= settings.roundsTarget) {
      return {
        ...session,
        status: 'completed',
        endAtEpochMs: undefined,
        pausedRemainingMs: 0,
      };
    }
    return {
      ...session,
      phase: 'break',
      status: 'paused',
      endAtEpochMs: undefined,
      pausedRemainingMs: settings.breakMinutes * 60 * 1000,
    };
  } else {
    return {
      ...session,
      phase: 'focus',
      roundIndex: session.roundIndex + 1,
      status: 'paused',
      endAtEpochMs: undefined,
      pausedRemainingMs: settings.focusMinutes * 60 * 1000,
    };
  }
}
