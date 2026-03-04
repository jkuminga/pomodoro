import { describe, it, expect } from 'vitest';
import {
  pomodoroReducer,
  formatMsToMMSS,
  clampAndValidateSettings,
  getRemainingMs,
  type Session,
  type Settings,
} from './pomodoroMachine';

describe('pomodoroMachine', () => {
  const settings: Settings = {
    focusMinutes: 25,
    breakMinutes: 5,
    roundsTarget: 4,
  };

  const initialSession: Session = {
    phase: 'focus',
    roundIndex: 1,
    status: 'idle',
  };

  describe('formatMsToMMSS', () => {
    it('should format ms to MM:SS', () => {
      expect(formatMsToMMSS(0)).toBe('00:00');
      expect(formatMsToMMSS(1000)).toBe('00:01');
      expect(formatMsToMMSS(9000)).toBe('00:09');
      expect(formatMsToMMSS(60000)).toBe('01:00');
      expect(formatMsToMMSS(61000)).toBe('01:01');
      expect(formatMsToMMSS(3599000)).toBe('59:59');
      expect(formatMsToMMSS(3600000)).toBe('60:00');
      expect(formatMsToMMSS(3661000)).toBe('61:01');
    });
  });

  describe('clampAndValidateSettings', () => {
    it('should clamp settings to valid ranges', () => {
      const { settings: s1 } = clampAndValidateSettings({ focusMinutes: 0, breakMinutes: 100, roundsTarget: 20 });
      expect(s1.focusMinutes).toBe(1);
      expect(s1.breakMinutes).toBe(60);
      expect(s1.roundsTarget).toBe(12);

      const { settings: s2 } = clampAndValidateSettings({ focusMinutes: 200 });
      expect(s2.focusMinutes).toBe(180);
    });

    it('should return errors for invalid inputs', () => {
      const { errors } = clampAndValidateSettings({ focusMinutes: 0, breakMinutes: 100, roundsTarget: 20 });
      expect(errors.focusMinutes).toBeDefined();
      expect(errors.breakMinutes).toBeDefined();
      expect(errors.roundsTarget).toBeDefined();

      const { errors: e2 } = clampAndValidateSettings({ focusMinutes: 181 });
      expect(e2.focusMinutes).toBe('Must be between 1 and 180');
    });

    it('should handle NaN by returning errors', () => {
      const { errors } = clampAndValidateSettings({ focusMinutes: NaN });
      expect(errors.focusMinutes).toBeDefined();
    });
  });

  describe('getRemainingMs', () => {
    it('should return focus duration when idle', () => {
      expect(getRemainingMs(initialSession, settings, 1000)).toBe(25 * 60 * 1000);
    });

    it('should return remaining ms when running', () => {
      const session: Session = { ...initialSession, status: 'running', endAtEpochMs: 5000 };
      expect(getRemainingMs(session, settings, 1000)).toBe(4000);
      expect(getRemainingMs(session, settings, 6000)).toBe(0);
    });

    it('should return pausedRemainingMs when paused', () => {
      const session: Session = { ...initialSession, status: 'paused', pausedRemainingMs: 3000 };
      expect(getRemainingMs(session, settings, 1000)).toBe(3000);
    });
  });

  describe('pomodoroReducer', () => {
    it('should start the timer', () => {
      const nowMs = 1000;
      const state = pomodoroReducer(initialSession, { type: 'START', nowMs }, settings);

      expect(state.status).toBe('running');
      expect(state.endAtEpochMs).toBe(nowMs + settings.focusMinutes * 60 * 1000);
    });

    it('should pause the timer', () => {
      const startMs = 1000;
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: startMs }, settings);

      const pauseMs = 2000;
      const state2 = pomodoroReducer(state1, { type: 'PAUSE', nowMs: pauseMs }, settings);

      expect(state2.status).toBe('paused');
      expect(state2.pausedRemainingMs).toBe(settings.focusMinutes * 60 * 1000 - (pauseMs - startMs));
      expect(state2.endAtEpochMs).toBeUndefined();
    });

    it('should resume the timer', () => {
      const startMs = 1000;
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: startMs }, settings);

      const pauseMs = 2000;
      const state2 = pomodoroReducer(state1, { type: 'PAUSE', nowMs: pauseMs }, settings);

      const resumeMs = 5000;
      const state3 = pomodoroReducer(state2, { type: 'RESUME', nowMs: resumeMs }, settings);

      expect(state3.status).toBe('running');
      expect(state3.endAtEpochMs).toBe(resumeMs + (state2.pausedRemainingMs ?? 0));
      expect(state3.pausedRemainingMs).toBeUndefined();
    });

    it('should advance to break after focus', () => {
      const startMs = 1000;
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: startMs }, settings);

      const endMs = startMs + settings.focusMinutes * 60 * 1000;
      const state2 = pomodoroReducer(state1, { type: 'TICK', nowMs: endMs }, settings);

      expect(state2.phase).toBe('break');
      expect(state2.status).toBe('paused');
      expect(state2.pausedRemainingMs).toBe(settings.breakMinutes * 60 * 1000);
      expect(state2.roundIndex).toBe(1);
    });

    it('should advance to next focus after break', () => {
      let state = pomodoroReducer(initialSession, { type: 'START', nowMs: 0 }, settings);
      state = pomodoroReducer(state, { type: 'TICK', nowMs: settings.focusMinutes * 60 * 1000 }, settings);
      state = pomodoroReducer(state, { type: 'RESUME', nowMs: settings.focusMinutes * 60 * 1000 }, settings);
      state = pomodoroReducer(state, { type: 'TICK', nowMs: (settings.focusMinutes + settings.breakMinutes) * 60 * 1000 }, settings);

      expect(state.phase).toBe('focus');
      expect(state.status).toBe('paused');
      expect(state.roundIndex).toBe(2);
      expect(state.pausedRemainingMs).toBe(settings.focusMinutes * 60 * 1000);
    });

    it('should complete after final focus', () => {
      const customSettings = { ...settings, roundsTarget: 1 };
      const startMs = 0;
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: startMs }, customSettings);

      const endMs = settings.focusMinutes * 60 * 1000;
      const state2 = pomodoroReducer(state1, { type: 'TICK', nowMs: endMs }, customSettings);

      expect(state2.status).toBe('completed');
      expect(state2.pausedRemainingMs).toBe(0);
    });

    it('should handle catch-up on TICK (expired running)', () => {
      const startMs = 1000;
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: startMs }, settings);

      const futureMs = startMs + settings.focusMinutes * 60 * 1000 + 1000;
      const state2 = pomodoroReducer(state1, { type: 'TICK', nowMs: futureMs }, settings);

      expect(state2.phase).toBe('break');
      expect(state2.status).toBe('paused');
      expect(state2.pausedRemainingMs).toBe(settings.breakMinutes * 60 * 1000);
    });

    it('should reset the timer', () => {
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: 1000 }, settings);
      const state2 = pomodoroReducer(state1, { type: 'RESET' }, settings);

      expect(state2).toEqual(initialSession);
    });

    it('should skip the current phase', () => {
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: 1000 }, settings);
      const state2 = pomodoroReducer(state1, { type: 'SKIP', nowMs: 2000 }, settings);

      expect(state2.phase).toBe('break');
      expect(state2.status).toBe('paused');
    });

    it('should complete if skipping final focus', () => {
      const customSettings = { ...settings, roundsTarget: 1 };
      const state1 = pomodoroReducer(initialSession, { type: 'START', nowMs: 1000 }, customSettings);
      const state2 = pomodoroReducer(state1, { type: 'SKIP', nowMs: 2000 }, customSettings);

      expect(state2.status).toBe('completed');
    });
  });
});
