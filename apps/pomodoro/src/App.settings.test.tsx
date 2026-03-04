import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App'

describe('App settings validation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T10:00:00Z'))
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not show NaN:NaN when Focus input is empty', async () => {
    render(<App />)
    const focusInput = screen.getByLabelText(/Focus \(min\)/i)
    
    // Initial state should be 25:00
    expect(screen.getByText('25:00')).toBeInTheDocument()
    
    // Clear the input
    fireEvent.change(focusInput, { target: { value: '' } })
    
    // Should show error message
    expect(screen.getByText(/Must be a valid integer/i)).toBeInTheDocument()
    
    // Time display should NOT be NaN:NaN
    const timeDisplay = screen.getByText(/(\d{2}):(\d{2})/)
    expect(timeDisplay.textContent).not.toBe('NaN:NaN')
    
    // It should remain at the last valid setting (25:00)
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('should handle whitespace in settings inputs', () => {
    render(<App />)
    const focusInput = screen.getByLabelText(/Focus \(min\)/i)
    
    fireEvent.change(focusInput, { target: { value: '  30  ' } })
    
    expect(screen.queryByText(/Must be a valid integer/i)).not.toBeInTheDocument()
    expect(screen.getByText('30:00')).toBeInTheDocument()
  })

  it('should disable Start button when there are validation errors', () => {
    render(<App />)
    const focusInput = screen.getByLabelText(/Focus \(min\)/i)
    const startBtn = screen.getByRole('button', { name: /Start/i })
    
    expect(startBtn).not.toBeDisabled()
    
    fireEvent.change(focusInput, { target: { value: '0' } }) // Assuming 0 is invalid or causes error
    
    expect(startBtn).toBeDisabled()
  })
})
