// @vitest-environment jsdom
// Commit file list: loading/error/empty/entries states, meta line, and per-file click routing.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GitFileChange } from '@shared/types'
import { GitHistoryCommitFiles } from './GitHistoryCommitFiles'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(state: Parameters<typeof GitHistoryCommitFiles>[0]['state'], extra: Partial<Parameters<typeof GitHistoryCommitFiles>[0]> = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(<GitHistoryCommitFiles state={state} onOpenFile={vi.fn()} {...extra} />))
  return { host, root, text: (): string => host.textContent ?? '' }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GitHistoryCommitFiles', () => {
  it('shows loading while the status is loading', () => {
    const { root, text } = render({ status: 'loading' })
    expect(text()).toContain('Loading files')
    act(() => root.unmount())
  })

  it('shows the error message on error', () => {
    const { root, text } = render({ status: 'error', error: 'git died' })
    expect(text()).toContain('git died')
    act(() => root.unmount())
  })

  it('shows an empty notice when ready with no entries', () => {
    const { root, text } = render({ status: 'ready', entries: [] })
    expect(text()).toContain('No file changes')
    act(() => root.unmount())
  })

  it('renders each file with its status color, path split, and click routing', () => {
    const onOpenFile = vi.fn()
    const entries: GitFileChange[] = [
      { path: 'src/main.ts', status: 'M', added: 10, deleted: 0 },
      { path: 'README.md', status: 'A', added: 5, deleted: 0 }
    ]
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(<GitHistoryCommitFiles state={{ status: 'ready', entries }} onOpenFile={onOpenFile} />))
    const rows = [...host.querySelectorAll('.scm-history__file')]
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('main.ts')
    expect(rows[0].textContent).toContain('src')
    expect(rows[1].textContent).toContain('README.md')
    act(() => rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onOpenFile).toHaveBeenCalledWith(entries[0])
    act(() => root.unmount())
    host.remove()
  })

  it('joins author and formatted timestamp into the meta line', () => {
    const { root, text } = render({ status: 'ready', entries: [] }, { author: 'Omar', timestamp: Date.UTC(2026, 7, 10, 12) })
    expect(text()).toContain('Omar')
    expect(text()).toMatch(/Omar · \w{3} \d{1,2}/)
    act(() => root.unmount())
  })
})