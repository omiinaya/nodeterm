// @vitest-environment jsdom
// The local session is built once at boot from window.nodeTerminal by identity — pin that the
// module captures the preload object as the session api and activates itself.
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as session from './session'

// Must be set BEFORE the module under test is imported (it reads at module load).
const fakeApi = { pty: { create: vi.fn() } } as never
Object.defineProperty(window, 'nodeTerminal', { value: fakeApi, configurable: true })

describe('localSession', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('builds the session from the window.nodeTerminal api by identity', async () => {
    const mod = await import('./localSession')
    expect(mod.localSession.api).toBe(fakeApi)
    expect(mod.localSession.label).toBe('This Mac')
    expect(mod.localSession.id).toBeTruthy()
  })

  it('registers itself as the active session at module load', async () => {
    const mod = await import('./localSession')
    expect(session.getActiveSession()?.id).toBe(mod.localSession.id)
  })
})