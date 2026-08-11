// @vitest-environment jsdom
// Zoom-modifier tracking: held is driven by capture-phase window key/blur listeners.
// The module lazily installs its listeners once (inited guard), so each test re-imports it.
import { afterEach, describe, expect, it, vi } from 'vitest'

async function freshModule() {
  vi.resetModules()
  return import('./zoomModifier')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isZoomModifierHeld', () => {
  it('tracks a held Meta key and clears on blur', async () => {
    const mod = await freshModule()
    const spy = vi.spyOn(window, 'addEventListener')
    expect(mod.isZoomModifierHeld()).toBe(false)
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function), true)

    const down = spy.mock.calls.find((c) => c[0] === 'keydown')![1] as (e: Event) => void
    down(new KeyboardEvent('keydown', { key: 'Meta' }))
    expect(mod.isZoomModifierHeld()).toBe(true)

    const blur = spy.mock.calls.find((c) => c[0] === 'blur')![1] as () => void
    blur()
    expect(mod.isZoomModifierHeld()).toBe(false)
  })

  it('releases when the Meta key is released', async () => {
    const mod = await freshModule()
    const spy = vi.spyOn(window, 'addEventListener')
    mod.isZoomModifierHeld() // ensure() installs the listeners
    const down = spy.mock.calls.find((c) => c[0] === 'keydown')![1] as (e: Event) => void
    const up = spy.mock.calls.find((c) => c[0] === 'keyup')![1] as (e: Event) => void
    down(new KeyboardEvent('keydown', { key: 'Meta' }))
    expect(mod.isZoomModifierHeld()).toBe(true)
    up(new KeyboardEvent('keyup', { key: 'Meta' }))
    expect(mod.isZoomModifierHeld()).toBe(false)
  })

  it('tracks a Ctrl press via metaKey/ctrlKey on a plain key event', async () => {
    const mod = await freshModule()
    const spy = vi.spyOn(window, 'addEventListener')
    mod.isZoomModifierHeld()
    const down = spy.mock.calls.find((c) => c[0] === 'keydown')![1] as (e: Event) => void
    down(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(mod.isZoomModifierHeld()).toBe(true)
  })
})