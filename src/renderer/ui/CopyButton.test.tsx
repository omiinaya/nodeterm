// @vitest-environment jsdom
// Copy-to-clipboard button with transient "Copied!" feedback + cleanup of the reset timer.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from './CopyButton'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.useFakeTimers()

const writeText = vi.fn()

beforeEach(() => {
  ;(window as unknown as { nodeTerminal: { clipboard: { writeText: typeof writeText } } }).nodeTerminal = {
    clipboard: { writeText }
  }
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('CopyButton', () => {
  it('writes the text and shows Copied! briefly, then reverts', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<CopyButton text="secret" />))
    expect(host.textContent).toBe('Copy')
    act(() => host.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(writeText).toHaveBeenCalledWith('secret')
    expect(host.textContent).toBe('Copied!')
    act(() => vi.advanceTimersByTime(1500))
    expect(host.textContent).toBe('Copy')
    act(() => root.unmount())
    host.remove()
  })

  it('honours the label prop', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<CopyButton text="x" label="Duplicate" />))
    expect(host.textContent).toBe('Duplicate')
    act(() => root.unmount())
    host.remove()
  })
})