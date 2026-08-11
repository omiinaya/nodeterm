// @vitest-environment jsdom
// Numeric input: min/max/step forwarded, change emits the parsed number.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NumberField } from './NumberField'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('NumberField', () => {
  let host: HTMLElement
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
  })

  it('forwards value/min/max/step to the input and emits the parsed number on change', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    const onChange = vi.fn()
    root = createRoot(host)
    act(() => {
      root!.render(<NumberField value={3} onChange={onChange} min={1} max={9} step={2} />)
    })
    const input = host.querySelector('input[type="number"]')!
    expect(input.getAttribute('value')).toBe('3')
    expect(input.getAttribute('min')).toBe('1')
    expect(input.getAttribute('max')).toBe('9')
    expect(input.getAttribute('step')).toBe('2')
    act(() => {
      input.dispatchEvent(
        new Event('change', { bubbles: true }) // input onChange in React maps to the change event
      )
    })
    // React's onChange for controlled inputs fires on input events; set the value first.
    act(() => {
      const proto = Object.getPrototypeOf(input) as HTMLInputElement
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, '7')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith(7)
  })
})