import { useEffect, useLayoutEffect, useReducer, useRef, useState, useMemo } from 'react'
import './App.css'
import {
  pomodoroReducer,
  formatMsToMMSS,
  clampAndValidateSettings,
  getRemainingMs,
} from './lib/pomodoroMachine'
import type { Settings, Session, PomodoroAction } from './lib/pomodoroMachine'
import {
  loadSettings,
  saveSettings,
  loadSession,
  saveSession,
  clearSession,
} from './lib/settingsStorage'
import { hydrateSession } from './lib/sessionHydration'
import beepSound from './assets/freesound_community-start-sound-beep-102201.mp3'

const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  breakMinutes: 5,
  roundsTarget: 4,
  autoStart: false,
}

function App() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const initialSettings = useMemo(() => loadSettings() || DEFAULT_SETTINGS, [])
  const [focusInput, setFocusInput] = useState(initialSettings.focusMinutes.toString())
  const [breakInput, setBreakInput] = useState(initialSettings.breakMinutes.toString())
  const [roundsInput, setRoundsInput] = useState(initialSettings.roundsTarget.toString())
  const [autoStartInput, setAutoStartInput] = useState(initialSettings.autoStart ?? false)

  const { settings: effectiveSettings, errors } = useMemo(() => {
    return clampAndValidateSettings({
      focusMinutes: parseInt(focusInput.trim(), 10),
      breakMinutes: parseInt(breakInput.trim(), 10),
      roundsTarget: parseInt(roundsInput.trim(), 10),
      autoStart: autoStartInput,
    })
  }, [focusInput, breakInput, roundsInput, autoStartInput])

  const hasErrors = Object.keys(errors).length > 0
  const [lastValidSettings, setLastValidSettings] = useState<Settings>(initialSettings)

  const maybeUpdateLastValidSettings = (nextFocus: string, nextBreak: string, nextRounds: string, nextAutoStart: boolean) => {
    const next = clampAndValidateSettings({
      focusMinutes: parseInt(nextFocus.trim(), 10),
      breakMinutes: parseInt(nextBreak.trim(), 10),
      roundsTarget: parseInt(nextRounds.trim(), 10),
      autoStart: nextAutoStart,
    })

    if (Object.keys(next.errors).length === 0) {
      setLastValidSettings(next.settings)
    }
  }

  useEffect(() => {
    if (!hasErrors) {
      saveSettings(effectiveSettings)
    }
  }, [effectiveSettings, hasErrors])

  const [now, setNow] = useReducer((_: number, n: number) => n, 0)

  const [session, dispatch] = useReducer(
    (state: Session, action: PomodoroAction) => pomodoroReducer(state, action, lastValidSettings),
    null,
    () => hydrateSession(loadSession(), initialSettings, 0)
  )

  useLayoutEffect(() => {
    const n = Date.now()
    setNow(n)
    dispatch({ type: 'TICK', nowMs: n })
  }, [])

  const prevSessionRef = useRef<Session>(session)
  const audioEnabledRef = useRef(false)
  const skipFlagRef = useRef(false)

  useEffect(() => {
    if (session.status === 'idle') {
      clearSession()
    } else {
      saveSession(session)
    }

    const prev = prevSessionRef.current
    const boundaryChanged = 
      prev.phase !== session.phase || 
      prev.roundIndex !== session.roundIndex || 
      (prev.status !== 'completed' && session.status === 'completed')

    if (boundaryChanged && audioEnabledRef.current && !skipFlagRef.current) {
      new Audio(beepSound).play().catch(() => {})
    }

    skipFlagRef.current = false
    prevSessionRef.current = session
  }, [session])

  useEffect(() => {
    if (session.status !== 'running') return

    const interval = setInterval(() => {
      const currentNow = Date.now()
      setNow(currentNow)
      dispatch({ type: 'TICK', nowMs: currentNow })
    }, 250)

    return () => clearInterval(interval)
  }, [session.status])

  const handleStart = () => {
    audioEnabledRef.current = true
    const currentNow = Date.now()
    setNow(currentNow)
    if (session.status === 'paused') {
      dispatch({ type: 'RESUME', nowMs: currentNow })
    } else {
      dispatch({ type: 'START', nowMs: currentNow })
    }
  }

  const handlePause = () => {
    const currentNow = Date.now()
    setNow(currentNow)
    dispatch({ type: 'PAUSE', nowMs: currentNow })
  }

  const handleReset = () => {
    setNow(Date.now())
    dispatch({ type: 'RESET' })
  }

  const handleSkip = () => {
    skipFlagRef.current = true
    const currentNow = Date.now()
    setNow(currentNow)
    dispatch({ type: 'SKIP', nowMs: currentNow })
  }

  const handlePrevious = () => {
    skipFlagRef.current = true
    const currentNow = Date.now()
    setNow(currentNow)
    dispatch({ type: 'PREVIOUS', nowMs: currentNow })
  }

  const displaySettings = hasErrors ? lastValidSettings : effectiveSettings
  const remainingMs = getRemainingMs(session, displaySettings, now)
  const timeDisplay = formatMsToMMSS(remainingMs)
  
  const isFocus = session.phase === 'focus'
  const statusText = session.status === 'completed' 
    ? 'All rounds complete!' 
    : isFocus 
      ? 'Ready to focus?' 
      : 'Time for a break!'

  return (
    <div className={`app-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <header className="header">
        <h1>Pomodoro</h1>
        <span className="status-text">{statusText}</span>
      </header>

      <main 
        className={`timer-card ${isFocus ? 'isFocus' : 'isBreak'}`}
        aria-label="Timer"
      >
        <button 
          className="fullscreen-toggle" 
          onClick={() => setIsFullscreen(prev => !prev)}
          aria-label="Toggle fullscreen"
          title="Toggle fullscreen"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? (
              <>
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </>
            ) : (
              <>
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </>
            )}
          </svg>
        </button>
        <span className="phase-label">
          {isFocus ? 'Focus' : 'Break'}
        </span>
        <div className="time-display">{timeDisplay}</div>
        <div className="rounds-display">
          Round {session.roundIndex}/{displaySettings.roundsTarget}
        </div>

        
        <div className="controls">
          {session.status === 'paused' ? (
            <button 
              className="btn btn-primary accent-glow" 
              onClick={handleStart}
              aria-label="Resume timer"
              disabled={hasErrors}
            >
              Resume
            </button>
          ) : (
            <button 
              className="btn btn-primary accent-glow" 
              onClick={handleStart}
              aria-label="Start timer"
              disabled={session.status === 'running' || session.status === 'completed' || hasErrors}
            >
              Start
            </button>
          )}
          
          <button 
            className="btn btn-secondary" 
            onClick={handlePause} 
            disabled={session.status !== 'running'}
            aria-label="Pause timer"
          >
            Pause
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleReset}
            aria-label="Reset timer"
          >
            Reset
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handlePrevious}
            disabled={session.phase === 'focus' && session.roundIndex === 1 && session.status === 'idle'}
            aria-label="Previous phase"
          >
            Previous
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleSkip}
            disabled={session.status === 'completed' || hasErrors}
            aria-label="Skip current phase"
          >
            Skip
          </button>
        </div>
      </main>

      <section className="settings-panel">
        <div className="setting-group">
          <label htmlFor="focus">Focus (min)</label>
          <input 
            id="focus" 
            type="text" 
            value={focusInput}
            onChange={(e) => {
              const v = e.target.value
              setFocusInput(v)
              maybeUpdateLastValidSettings(v, breakInput, roundsInput, autoStartInput)
            }}
          />
          {errors.focusMinutes && <span className="error-text">{errors.focusMinutes}</span>}
          <span className="helper-text">Standard is 25</span>
        </div>
        <div className="setting-group">
          <label htmlFor="break">Break (min)</label>
          <input 
            id="break" 
            type="text" 
            value={breakInput}
            onChange={(e) => {
              const v = e.target.value
              setBreakInput(v)
              maybeUpdateLastValidSettings(focusInput, v, roundsInput, autoStartInput)
            }}
          />
          {errors.breakMinutes && <span className="error-text">{errors.breakMinutes}</span>}
          <span className="helper-text">Standard is 5</span>
        </div>
        <div className="setting-group">
          <label htmlFor="rounds">Rounds</label>
          <input 
            id="rounds" 
            type="text" 
            value={roundsInput}
            onChange={(e) => {
              const v = e.target.value
              setRoundsInput(v)
              maybeUpdateLastValidSettings(focusInput, breakInput, v, autoStartInput)
            }}
          />
          {errors.roundsTarget && <span className="error-text">{errors.roundsTarget}</span>}
          <span className="helper-text">Standard is 4</span>
        </div>
        <div className="setting-group">
          <label>Auto-Start</label>
          <div className="pill-toggle">
            <button 
              type="button"
              className={`pill-btn ${autoStartInput === true ? 'active' : ''}`}
              onClick={() => {
                setAutoStartInput(true)
                maybeUpdateLastValidSettings(focusInput, breakInput, roundsInput, true)
              }}
            >
              On
            </button>
            <button 
              type="button"
              className={`pill-btn ${autoStartInput === false ? 'active' : ''}`}
              onClick={() => {
                setAutoStartInput(false)
                maybeUpdateLastValidSettings(focusInput, breakInput, roundsInput, false)
              }}
            >
              Off
            </button>
          </div>
          <span className="helper-text">Start next phase automatically</span>
        </div>
      </section>
    </div>
  )
}

export default App
