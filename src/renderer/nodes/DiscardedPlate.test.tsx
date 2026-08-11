// @vitest-environment jsdom
// The memory-saver placeholder: two wordings (restoring vs not), one component shared by
// both hosts of a <webview> node so they cannot drift on the same quiet state.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { DiscardedPlate } from './DiscardedPlate'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('DiscardedPlate', () => {
  let host: HTMLElement
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
  })

  function render(restoring?: boolean) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root!.render(<DiscardedPlate restoring={restoring} />)
    })
  }

  it('defaults to the non-restoring wording when restoring is omitted', () => {
    render()
    expect(host.textContent).toContain('Page released to save memory')
  })

  it('shows the reopening wording while restoring=true', () => {
    render(true)
    expect(host.textContent).toContain('Reopening')
  })
})