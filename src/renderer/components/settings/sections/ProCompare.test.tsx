// @vitest-environment jsdom
// Static Core-vs-Pro comparison grid.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ProCompare } from './ProCompare'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ProCompare', () => {
  it('lists the core features and the pro additions', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<ProCompare />))
    expect(host.textContent).toContain('Unlimited local terminals & canvas')
    expect(host.textContent).toContain('Remote access from your phone')
    expect(host.textContent).toContain('3 team seats included')
    expect(host.textContent).toContain('Core — free forever')
    expect(host.querySelector('h4')!.textContent).toBe('Core — free forever')
    act(() => root.unmount())
    host.remove()
  })
})