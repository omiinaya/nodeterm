// @vitest-environment jsdom
// Segmented control: radiogroup semantics, aria-checked per option, no onChange on reselect.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SegmentedPill } from './SegmentedPill'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' }
]

describe('SegmentedPill', () => {
  let host: HTMLElement
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
  })

  it('renders a radiogroup with aria-checked marking the active option', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root!.render(<SegmentedPill value="b" options={OPTIONS} onChange={() => {}} ariaLabel="view" />)
    })
    const group = host.querySelector('[role="radiogroup"]')!
    expect(group.getAttribute('aria-label')).toBe('view')
    const radios = [...host.querySelectorAll('[role="radio"]')]
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(radios.map((r) => r.className)).toEqual(['seg-pill-opt', 'seg-pill-opt active', 'seg-pill-opt'])
  })

  it('fires onChange with the picked value, but not on reselecting the active one', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    const onChange = vi.fn()
    root = createRoot(host)
    act(() => {
      root!.render(<SegmentedPill value="a" options={OPTIONS} onChange={onChange} />)
    })
    const radios = [...host.querySelectorAll('[role="radio"]')]
    act(() => radios[2].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onChange).toHaveBeenCalledWith('c')
    act(() => radios[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))) // already active
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})