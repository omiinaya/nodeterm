// @vitest-environment jsdom
// The xterm appearance slice as ONE shallow subscription: returns the exact visual keys, and
// re-renders only when one of those keys actually changes (useShallow), not on unrelated edits.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { useSettings } from '../state/settings'
import { XTERM_VISUAL_KEYS } from './terminal-config'
import { useXtermVisualSettings } from './useXtermVisualSettings'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function readVisual(): Record<string, unknown> {
  let out: Record<string, unknown> = {}
  function Probe() {
    out = useXtermVisualSettings() as unknown as Record<string, unknown>
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
  useSettings.setState({ settings: useSettings.getState().settings })
})

describe('useXtermVisualSettings', () => {
  it('returns exactly the XTERM_VISUAL_KEYS, shallowly', () => {
    const v = readVisual()
    expect(Object.keys(v).sort()).toEqual([...XTERM_VISUAL_KEYS].sort())
  })

  it('reflects a changed visual key', () => {
    useSettings.setState((s) => ({
      settings: { ...s.settings, fontSize: 17, notifyOnClaudeDone: !s.settings.notifyOnClaudeDone }
    }))
    const v = readVisual()
    expect(v.fontSize).toBe(17)
  })
})