// The workspace-dirty seam: Canvas registers its markDirty; other surfaces trigger it; the
// returned unregister rewinds; no-op when nothing is registered (boot, tests).
import { describe, expect, it, vi } from 'vitest'
import { markWorkspaceDirty, registerWorkspaceDirty } from './workspaceDirty'

describe('workspaceDirty', () => {
  it('forwards markWorkspaceDirty to the registered callback', () => {
    const mark = vi.fn()
    registerWorkspaceDirty(mark)
    markWorkspaceDirty()
    expect(mark).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when no callback is registered (boot before Canvas, tests)', () => {
    expect(() => markWorkspaceDirty()).not.toThrow()
  })

  it('the unregister fn stops forwarding and only for the callback it registered', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unregA = registerWorkspaceDirty(a)
    registerWorkspaceDirty(b) // b replaces a
    markWorkspaceDirty()
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).not.toHaveBeenCalled()
    unregA() // no-op now: a is no longer the current cb
    markWorkspaceDirty()
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('unregistering the current callback makes the seam a no-op again', () => {
    const mark = vi.fn()
    const unreg = registerWorkspaceDirty(mark)
    unreg()
    markWorkspaceDirty()
    expect(mark).not.toHaveBeenCalled()
  })
})