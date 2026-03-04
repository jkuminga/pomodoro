import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSettings, loadSettings, saveSession, loadSession, clearSession } from './settingsStorage';
import type { Settings, Session } from './pomodoroMachine';

describe('settingsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save and load settings', () => {
    const settings: Settings = {
      focusMinutes: 30,
      breakMinutes: 10,
      roundsTarget: 5,
    };

    saveSettings(settings);
    const loaded = loadSettings();

    expect(loaded).toEqual(settings);
    expect(localStorage.getItem('pomodoro:v1')).toContain('"focusMinutes":30');
  });

  it('should save session and preserve settings', () => {
    const settings: Settings = {
      focusMinutes: 30,
      breakMinutes: 10,
      roundsTarget: 5,
    };
    saveSettings(settings);

    const session: Session = {
      phase: 'focus',
      roundIndex: 2,
      status: 'running',
      endAtEpochMs: 123456789,
    };
    saveSession(session);

    expect(loadSettings()).toEqual(settings);
    expect(loadSession()).toEqual(session);
  });

  it('should clear session and preserve settings', () => {
    const settings: Settings = {
      focusMinutes: 30,
      breakMinutes: 10,
      roundsTarget: 5,
    };
    saveSettings(settings);

    const session: Session = {
      phase: 'focus',
      roundIndex: 2,
      status: 'running',
      endAtEpochMs: 123456789,
    };
    saveSession(session);

    clearSession();

    expect(loadSettings()).toEqual(settings);
    expect(loadSession()).toBeNull();
  });

  it('should return null if no settings are stored', () => {
    const loaded = loadSettings();
    expect(loaded).toBeNull();
  });

  it('should return null if stored data is invalid', () => {
    localStorage.setItem('pomodoro:v1', 'invalid json');
    const loaded = loadSettings();
    expect(loaded).toBeNull();
  });

  it('should return null if stored data has wrong shape', () => {
    localStorage.setItem('pomodoro:v1', JSON.stringify({ settings: { focusMinutes: '30' } }));
    const loaded = loadSettings();
    expect(loaded).toBeNull();
  });
});
