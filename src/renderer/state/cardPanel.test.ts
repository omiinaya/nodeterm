// @vitest-environment jsdom
// Personal per-machine kanban card-panel state, persisted to localStorage: parse rule, save on
// set, toggle, and the localStorage-absent guard (node-env vitest suites import this module).
import { beforeEach, describe, expect, it } from 'vitest'
import { CARD_PANEL_KEY, parseCardPanelOpen, useCardPanel } from './cardPanel'

beforeEach(() => {
  localStorage.clear()
  useCardPanel.setState({ open: true })
})

describe('parseCardPanelOpen', () => {
  it('anything missing or unparseable defaults to open', () => {
    expect(parseCardPanelOpen(null)).toBe(true)
    expect(parseCardPanelOpen('garbage')).toBe(true)
  })
  it('only the literal false string closes', () => {
    expect(parseCardPanelOpen('false')).toBe(false)
    expect(parseCardPanelOpen('true')).toBe(true)
  })
})

describe('useCardPanel', () => {
  it('persists setOpen to localStorage', () => {
    useCardPanel.getState().setOpen(false)
    expect(localStorage.getItem(CARD_PANEL_KEY)).toBe('false')
    expect(useCardPanel.getState().open).toBe(false)
  })

  it('toggle flips and persists', () => {
    useCardPanel.getState().toggle()
    expect(useCardPanel.getState().open).toBe(false)
    expect(localStorage.getItem(CARD_PANEL_KEY)).toBe('false')
    useCardPanel.getState().toggle()
    expect(useCardPanel.getState().open).toBe(true)
  })
})