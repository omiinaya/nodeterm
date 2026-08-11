// @vitest-environment jsdom
// The settings sidebar glyphs: one small line icon per section id, rendered as svg.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { allSectionIds } from './nav'
import { SectionIcon } from './SettingsIcons'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('SectionIcon', () => {
  let host: HTMLElement
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
  })

  it('renders an svg glyph for every settings section id', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const ids = allSectionIds()
    act(() => {
      root!.render(
        <div>
          {ids.map((id) => (
            <SectionIcon key={id} id={id} />
          ))}
        </div>
      )
    })
    expect(host.querySelectorAll('svg')).toHaveLength(ids.length)
  })
})