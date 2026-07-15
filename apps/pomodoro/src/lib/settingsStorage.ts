import type { Settings, Session } from './pomodoroMachine';

const STORAGE_KEY = 'pomodoro:v1';

export interface StorageData {
  settings?: Settings;
  session?: Session;
}

export function saveSettings(settings: Settings): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existingData: StorageData = raw ? JSON.parse(raw) : {};
    const data: StorageData = { ...existingData, settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StorageData;
    if (data && data.settings && typeof data.settings === 'object') {
      const { focusMinutes, breakMinutes, roundsTarget, autoStart } = data.settings;
      if (
        typeof focusMinutes === 'number' &&
        typeof breakMinutes === 'number' &&
        typeof roundsTarget === 'number' &&
        typeof autoStart === 'boolean'
      ) {
        return { focusMinutes, breakMinutes, roundsTarget, autoStart };
      }
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  return null;
}

export function saveSession(session: Session): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existingData: StorageData = raw ? JSON.parse(raw) : {};
    const data: StorageData = { ...existingData, session };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save session to localStorage', e);
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StorageData;
    if (data && data.session && typeof data.session === 'object') {
      const { phase, roundIndex, status } = data.session;
      if (
        typeof phase === 'string' &&
        typeof roundIndex === 'number' &&
        typeof status === 'string'
      ) {
        return data.session;
      }
    }
  } catch (e) {
    console.error('Failed to load session from localStorage', e);
  }
  return null;
}

export function clearSession(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as StorageData;
    delete data.session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to clear session from localStorage', e);
  }
}
