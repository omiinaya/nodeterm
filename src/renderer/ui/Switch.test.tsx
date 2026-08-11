// @vitest-environment jsdom
// The accessible toggle: role=switch, aria-checked mirrors the value, click flips onChange.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Switch', () => {
  let host: HTMLElement
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
  })

  it('renders role=switch with aria-checked matching the value and flips onChange on click', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    const onChange = vi.fn()
    root = createRoot(host)

    act(() => {
      root!.render(<Switch checked={false} onChange={onChange} ariaLabel="mute" />)
    })
    const btn = host.querySelector('button[role="switch"]')!
    expect(btn.getAttribute('aria-checked')).toBe('false')
    expect(btn.getAttribute('aria-label')).toBe('mute')
    act(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onChange).toHaveBeenCalledWith(true)

    act(() => root!.render(<Switch checked onChange={onChange} />))
    expect(host.querySelector('button')!.getAttribute('aria-checked')).toBe('true')
  })
})