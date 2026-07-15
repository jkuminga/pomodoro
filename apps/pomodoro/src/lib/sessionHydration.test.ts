import { describe, it, expect } from 'vitest';
import { hydrateSession } from './sessionHydration';
import type { Session, Settings } from './pomodoroMachine';

describe('sessionHydration', () => {
  const settings: Settings = {
    focusMinutes: 25,
    breakMinutes: 5,
    roundsTarget: 4,
    autoStart: false,
  };

  it('should return initial session if snapshot is null (hydrate)', () => {
    const result = hydrateSession(null, settings, Date.now());
    expect(result).toEqual({
      phase: 'focus',
      roundIndex: 1,
      status: 'idle',
    });
  });

  it('should return snapshot if status is not running (hydrate)', () => {
    const snapshot: Session = {
      phase: 'focus',
      roundIndex: 1,
      status: 'paused',
      pausedRemainingMs: 1000,
    };
    const result = hydrateSession(snapshot, settings, Date.now());
    expect(result).toEqual(snapshot);
  });

  it('should return snapshot if running but not expired (hydrate mid-run)', () => {
    const now = 10000;
    const snapshot: Session = {
      phase: 'focus',
      roundIndex: 1,
      status: 'running',
      endAtEpochMs: 20000,
    };
    const result = hydrateSession(snapshot, settings, now);
    expect(result).toEqual(snapshot);
  });

  it('should advance session if expired (hydrate one-boundary)', () => {
    const now = 30000;
    const snapshot: Session = {
      phase: 'focus',
      roundIndex: 1,
      status: 'running',
      endAtEpochMs: 20000,
    };
    const result = hydrateSession(snapshot, settings, now);
    
    // Should advance to break paused
    expect(result.phase).toBe('break');
    expect(result.status).toBe('paused');
    expect(result.pausedRemainingMs).toBe(settings.breakMinutes * 60 * 1000);
  });

  it('should return initial session if snapshot is invalid (hydrate)', () => {
    const snapshot = { invalid: true } as unknown as Session;
    const result = hydrateSession(snapshot, settings, Date.now());
    expect(result.status).toBe('idle');
  });
});
