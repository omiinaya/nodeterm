// @vitest-environment jsdom
// Presentational consent line; the load-bearing grant logic lives in the pure describeGrant
// (src/shared/remote/consent.ts, unit-tested). Here we pin the surface that delegates to it.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ConsentNotice } from './ConsentNotice'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ConsentNotice', () => {
  it('renders the peer label-driven grant description', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(<ConsentNotice peerLabel="Omar's iPhone" />)
    })
    expect(host.querySelector('p.remote-consent')).toBeTruthy()
    expect(host.querySelector('[role="note"]')).toBeTruthy()
    expect(host.textContent).toContain("Omar's iPhone") // labelled
    expect(host.textContent).toContain('run commands on this Mac')
    act(() => root.unmount())
    host.remove()
  })

  it('falls back to the anonymous consent sentence for a blank label', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(<ConsentNotice peerLabel="   " />)
    })
    expect(host.textContent).toContain('This device will be able to run commands')
    act(() => root.unmount())
    host.remove()
  })
})