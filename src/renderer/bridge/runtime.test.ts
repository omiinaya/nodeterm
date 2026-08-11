// Runtime-shell flag: browser (Server Edition) vs Electron. Boot switch sets it; the affordance
// gate reads it. Must default to the Electron/desktop path.
import { describe, expect, it } from 'vitest'
import { isBrowserRuntime, markBrowserRuntime } from './runtime'

describe('runtime flag', () => {
  it('defaults to the desktop (Electron) runtime', () => {
    expect(isBrowserRuntime()).toBe(false)
  })

  it('markBrowserRuntime flips it to the browser runtime', () => {
    markBrowserRuntime()
    expect(isBrowserRuntime()).toBe(true)
  })
})