// @vitest-environment jsdom
// Settings search row: renders children only while the entry matches the current query.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { SettingsSearchEntry } from './search'
import { SettingsSearchContext } from './context'
import { SearchableRow } from './SearchableRow'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function renderRow(query: string, entry: SettingsSearchEntry) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      <SettingsSearchContext.Provider value={query}>
        <SearchableRow {...entry}>
          <span data-testid="child">child</span>
        </SearchableRow>
      </SettingsSearchContext.Provider>
    )
  })
  return { host, root, child: (): Element | null => host.querySelector('[data-testid="child"]') }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SearchableRow', () => {
  it('matches on the title case-insensitively', () => {
    const { root, child } = renderRow('Shell', { title: 'Default shell', keywords: [] })
    expect(child()).toBeTruthy()
    act(() => root.unmount())
  })

  it('matches on keywords when the title does not contain the query', () => {
    const { root, child } = renderRow('zsh', { title: 'Default shell', keywords: ['zsh'] })
    expect(child()).toBeTruthy()
    act(() => root.unmount())
  })

  it('renders null (children hidden) when nothing matches', () => {
    const { root, child } = renderRow('nonsense', { title: 'Default shell', keywords: [] })
    expect(child()).toBeNull()
    act(() => root.unmount())
  })

  it('an empty query matches everything', () => {
    const { root, child } = renderRow('', { title: 'Anything', keywords: [] })
    expect(child()).toBeTruthy()
    act(() => root.unmount())
  })
})