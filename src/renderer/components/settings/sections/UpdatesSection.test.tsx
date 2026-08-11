// @vitest-environment jsdom
// Settings Updates section: loads the current version on mount, fires the update-checking
// event + check() on the button.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsSearchContext } from '../context'
import { UpdatesSection } from './UpdatesSection'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const getVersion = vi.fn(async () => '1.2.3')
const check = vi.fn()
const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

beforeEach(() => {
  getVersion.mockResolvedValue('1.2.3')
  ;(window as unknown as { nodeTerminal: { updates: { getVersion: typeof getVersion; check: typeof check } } }).nodeTerminal =
    { updates: { getVersion, check } }
})

afterEach(() => {
  document.body.innerHTML = ''
  dispatchSpy.mockClear()
})

describe('UpdatesSection', () => {
  it('loads and shows the current version', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<SettingsSearchContext.Provider value=""><UpdatesSection isActive /></SettingsSearchContext.Provider>))
    await act(async () => {})
    expect(host.textContent).toContain('1.2.3')
    act(() => root.unmount())
    host.remove()
  })

  it('check button fires the update-checking event and calls updates.check()', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<UpdatesSection isActive />))
    const btn = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Check for updates'))!
    act(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(check).toHaveBeenCalled()
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'nodeterm:update-checking' }))
    act(() => root.unmount())
    host.remove()
  })
})