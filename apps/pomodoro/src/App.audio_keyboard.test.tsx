import { render, screen, act, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from './App'

describe('App audio and keyboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T10:00:00Z'))
    localStorage.clear()

    window.Audio = vi.fn().mockImplementation(function() {
      return {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const setup = () => {
    render(<App />)
    const focusInput = screen.getByLabelText(/Focus \(min\)/i)
    const breakInput = screen.getByLabelText(/Break \(min\)/i)
    
    fireEvent.change(focusInput, { target: { value: '1' } })
    fireEvent.change(breakInput, { target: { value: '1' } })
    
    return { focusInput, breakInput }
  }

  it('audio: plays sound once on natural boundary completion', () => {
    setup()
    const startBtn = screen.getByRole('button', { name: /Start timer/i })
    
    fireEvent.click(startBtn)
    
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    
    expect(window.Audio).toHaveBeenCalledTimes(1)
    const audioInstance = vi.mocked(window.Audio).mock.results[0].value
    expect(audioInstance.play).toHaveBeenCalledTimes(1)
  })

  it('audio: does NOT play sound on Skip', () => {
    setup()
    const startBtn = screen.getByRole('button', { name: /Start timer/i })
    fireEvent.click(startBtn)
    
    const skipBtn = screen.getByRole('button', { name: /Skip current phase/i })
    fireEvent.click(skipBtn)
    
    expect(window.Audio).not.toHaveBeenCalled()
  })

  it('keyboard: start/pause works with Enter key', () => {
    setup()
    
    const startBtn = screen.getByRole('button', { name: /Start timer/i })
    
    act(() => {
      startBtn.focus()
    })
    expect(startBtn).toHaveFocus()
    
    fireEvent.keyDown(startBtn, { key: 'Enter', code: 'Enter' })
    fireEvent.click(startBtn)
    
    const pauseBtn = screen.getByRole('button', { name: /Pause timer/i })
    expect(pauseBtn).not.toBeDisabled()
    
    expect(screen.getByText('01:00')).toBeInTheDocument()
    
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('00:59')).toBeInTheDocument()
    
    act(() => {
      pauseBtn.focus()
    })
    expect(pauseBtn).toHaveFocus()
    
    fireEvent.keyDown(pauseBtn, { key: 'Enter', code: 'Enter' })
    fireEvent.click(pauseBtn)
    
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('00:59')).toBeInTheDocument()
  })

  it('accessibility: controls have accessible names', () => {
    setup()
    expect(screen.getByRole('button', { name: /Start timer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pause timer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset timer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Skip current phase/i })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: /Timer/i })).toBeInTheDocument()
  })
})
