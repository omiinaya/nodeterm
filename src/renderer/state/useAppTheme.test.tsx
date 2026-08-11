// @vitest-environment jsdom
// Live app appearance: resolves settings.appTheme through the terminal theme's darkness.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { useSettings } from './settings'
import { useAppTheme } from './useAppTheme'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function readTheme(): string {
  let out = ''
  function Probe() {
    out = useAppTheme()
    return null
  }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(<Probe />))
  act(() => root.unmount())
  host.remove()
  return out
}

afterEach(() => {
  // Restore defaults between tests (the store is a singleton).
  useSettings.setState({ settings: useSettings.getState().settings })
})

describe('useAppTheme', () => {
  it('resolves auto against the terminal theme darkness', () => {
    useSettings.setState((s) => ({ settings: { ...s.settings, appTheme: 'auto', terminalTheme: 'solarized-light' } }))
    expect(readTheme()).toBe('light')
    useSettings.setState((s) => ({ settings: { ...s.settings, terminalTheme: 'nord' } }))
    expect(readTheme()).toBe('dark')
  })

  it('honours an explicit dark/light regardless of the terminal theme', () => {
    useSettings.setState((s) => ({ settings: { ...s.settings, appTheme: 'dark', terminalTheme: 'solarized-light' } }))
    expect(readTheme()).toBe('dark')
    useSettings.setState((s) => ({ settings: { ...s.settings, appTheme: 'light', terminalTheme: 'nord' } }))
    expect(readTheme()).toBe('light')
  })
})