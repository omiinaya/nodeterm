// @vitest-environment jsdom
// Per-node error boundary: a throw inside one node renders a small error card instead of
// crashing the whole tree; healthy nodes pass through untouched.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NodeProps } from '@xyflow/react'
import { withNodeBoundary } from './NodeBoundary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

const props = (id: string) => ({ id, data: {} }) as NodeProps

afterEach(() => {
  document.body.innerHTML = ''
  errorSpy.mockClear()
})

describe('withNodeBoundary', () => {
  it('renders the inner node normally when it does not throw', () => {
    const Inner = (p: NodeProps) => <div data-testid="inner">{p.id}</div>
    const Wrapped = withNodeBoundary(Inner)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<Wrapped {...props('n1')} />))
    expect(host.querySelector('[data-testid="inner"]')?.textContent).toBe('n1')
    act(() => root.unmount())
    host.remove()
  })

  it('catches a throw and renders the error card with the message', () => {
    const Boom = () => {
      throw new Error('terminal exploded')
    }
    const Wrapped = withNodeBoundary(Boom)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    // React logs the boundary error to console.error — silence it, assert the card instead.
    act(() => root.render(<Wrapped {...props('n2')} />))
    expect(host.querySelector('.node-error__title')?.textContent).toBe('This node hit an error')
    expect(host.querySelector('.node-error__msg')?.textContent).toBe('terminal exploded')
    act(() => root.unmount())
    host.remove()
  })
})