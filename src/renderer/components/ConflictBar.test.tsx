// @vitest-environment jsdom
// Presentational strip covering the two callbacks and the three static texts.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, describe, it, vi } from 'vitest'
import { ConflictBar } from './ConflictBar'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ConflictBar', () => {
  let root: Root | undefined
  let host: HTMLElement

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
  })

  it('renders the notice text and fires the correct callback on each button', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    const onReload = vi.fn()
    const onKeepMine = vi.fn()
    root = createRoot(host)
    act(() => {
      root!.render(<ConflictBar onReload={onReload} onKeepMine={onKeepMine} />)
    })
    expect(host.textContent).toContain('Project file changed on disk')
    const buttons = [...host.querySelectorAll('button')]
    expect(buttons).toHaveLength(2)
    act(() => buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onReload).toHaveBeenCalledTimes(1)
    act(() => buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onKeepMine).toHaveBeenCalledTimes(1)
  })
})