// @vitest-environment jsdom
// Display-only label pills: renders each resolved label as a colored chip; empty -> null.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { KanbanLabel } from '@shared/types'
import { LabelChips } from './LabelChips'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const LABELS: KanbanLabel[] = [
  { id: 'l1', name: 'Bug', color: 'red' },
  { id: 'l2', name: '', color: 'blue' }, // nameless -> 'Label' fallback
  { id: 'l3', name: 'Idea', color: 'nonsense' as never } // garbage color -> default swatch
]

describe('LabelChips', () => {
  let host: HTMLElement
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
  })

  it('renders one chip per label with its swatch colors and size class', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root!.render(<LabelChips labels={LABELS} size="md" />)
    })
    const chips = [...host.querySelectorAll('.kanban-label-chip')]
    expect(chips).toHaveLength(3)
    expect(chips[0].textContent).toBe('Bug')
    expect(chips[0].getAttribute('style')).toContain('background')
    expect(chips[1].textContent).toBe('Label') // nameless fallback
    expect(chips[2].textContent).toBe('Idea')
    expect(host.querySelector('.kanban-labels')!.className).toContain('kanban-labels--md')
  })

  it('renders null for no labels (the wrapper is absent)', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root!.render(<LabelChips labels={[]} />)
    })
    expect(host.querySelector('.kanban-labels')).toBeNull()
  })
})