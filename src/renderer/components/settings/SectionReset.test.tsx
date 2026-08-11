// @vitest-environment jsdom
// Per-section reset-to-defaults: disabled when pristine, confirm dialog -> resetPatch via update.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettings } from '../../state/settings'
import { DEFAULT_SETTINGS } from '@shared/types'
import { SectionReset } from './SectionReset'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const update = vi.fn()

beforeEach(() => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS }, update: update as never })
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SectionReset', () => {
  it('disables the button and says at-defaults when every key is pristine', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<SectionReset keys={['fontSize', 'fontFamily']} label="Reset" what="font size" />))
    expect((host.querySelector('button')! as HTMLButtonElement).disabled).toBe(true)
    expect(host.textContent).toContain('Font size are at their defaults')
    act(() => root.unmount())
    host.remove()
  })

  it('enables reset when a key is non-pristine and applies resetPatch after confirm', () => {
    // fontSize off-default (17 vs the default 13); fontFamily stays pristine.
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, fontSize: 17 } })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<SectionReset keys={['fontSize']} label="Reset font" what="font size" />))
    const btn = host.querySelector('button')! as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(host.textContent).toContain('Put font size back the way they shipped')
    act(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    // Confirm dialog portals to document.body — query the document, not the host.
    const resetBtn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Reset'
    )
    expect(resetBtn).toBeTruthy()
    act(() => resetBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(update).toHaveBeenCalledWith({ fontSize: DEFAULT_SETTINGS.fontSize })
    act(() => root.unmount())
    host.remove()
  })
})