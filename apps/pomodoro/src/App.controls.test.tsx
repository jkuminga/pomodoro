import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from './App'

describe('App controls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T10:00:00Z'))
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const setup = () => {
    render(<App />)
    const focusInput = screen.getByLabelText(/Focus \(min\)/i)
    const breakInput = screen.getByLabelText(/Break \(min\)/i)
    
    fireEvent.change(focusInput, { target: { value: '1' } })
    fireEvent.change(breakInput, { target: { value: '1' } })
    
    return { focusInput, breakInput }
  }

  it('Start -> time decreases when system time advances', async () => {
    setup()
    const startBtn = screen.getByRole('button', { name: /Start/i })
    
    fireEvent.click(startBtn)
    
    expect(screen.getByText('01:00')).toBeInTheDocument()
    
    act(() => {
      vi.advanceTimersByTime(10000) // 10 seconds
    })
    
    expect(screen.getByText('00:50')).toBeInTheDocument()
  })

  it('Pause -> time freezes even when system time advances', async () => {
    setup()
    const startBtn = screen.getByRole('button', { name: /Start/i })
    fireEvent.click(startBtn)
    
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(screen.getByText('00:50')).toBeInTheDocument()
    
    const pauseBtn = screen.getByRole('button', { name: /Pause/i })
    fireEvent.click(pauseBtn)
    
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    
    expect(screen.getByText('00:50')).toBeInTheDocument()
  })

  it('Resume (via Start) -> time continues', async () => {
    setup()
    const startBtn = screen.getByRole('button', { name: /Start/i })
    fireEvent.click(startBtn)
    
    const pauseBtn = screen.getByRole('button', { name: /Pause/i })
    fireEvent.click(pauseBtn)
    
    // After pause, it should show the remaining time. 
    // In my setup, I didn't advance time before pausing in this specific test, 
    // but let's make it more robust.
    
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    // It was paused at 01:00, so it should still be 01:00
    expect(screen.getByText('01:00')).toBeInTheDocument()
    
    const resumeBtn = screen.getByRole('button', { name: /Resume/i })
    fireEvent.click(resumeBtn)
    
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    
    expect(screen.getByText('00:50')).toBeInTheDocument()
  })

  it('Skip -> phase becomes Break and status paused (verify label)', async () => {
    setup()
    const skipBtn = screen.getByRole('button', { name: /Skip/i })
    
    fireEvent.click(skipBtn)
    
    expect(screen.getByText('Break')).toBeInTheDocument()
    expect(screen.getByText('Time for a break!')).toBeInTheDocument()
    
    // Should show Resume when paused
    expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument()
    
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    
    expect(screen.getByText('01:00')).toBeInTheDocument() // Should not have decreased
  })
})
