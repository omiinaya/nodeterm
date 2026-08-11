// Commit context-menu item builder: exact item set, order, separators, danger flag, and the
// per-item handler routing (each item calls the matching handler with the commit).
import { describe, expect, it, vi } from 'vitest'
import type { GitHistoryItem } from '@shared/git-history'
import { buildCommitMenuItems } from './git-history-menu'

const ITEM: GitHistoryItem = Object.assign(Object.create(null) as GitHistoryItem, {
  id: 'abc123',
  parentIds: [],
  subject: 'fix stuff',
  message: 'fix stuff\n'
})

describe('buildCommitMenuItems', () => {
  it('produces the full item set with separators and a danger revert', () => {
    const h = {
      openInBrowser: vi.fn(),
      copyHash: vi.fn(),
      copyMessage: vi.fn(),
      explain: vi.fn(),
      revert: vi.fn(),
      branchFrom: vi.fn(),
      checkout: vi.fn()
    }
    const items = buildCommitMenuItems(ITEM, h)
    expect(items.map((i) => ('label' in i ? i.label : undefined))).toEqual([
      'Open commit in browser',
      'Copy commit hash',
      'Copy commit message',
      undefined,
      'New branch from here…',
      'Checkout this commit',
      'Revert commit',
      undefined,
      'Explain changes with AI'
    ])
    const revert = items[6]
    expect(revert.type).toBeUndefined()
    expect('danger' in revert && (revert as { danger?: boolean }).danger).toBe(true)
  })

  it('routes each item click to the matching handler with the commit', () => {
    const h = {
      openInBrowser: vi.fn(),
      copyHash: vi.fn(),
      copyMessage: vi.fn(),
      explain: vi.fn(),
      revert: vi.fn(),
      branchFrom: vi.fn(),
      checkout: vi.fn()
    }
    const items = buildCommitMenuItems(ITEM, h)
    for (const item of items) {
      if (item.type === 'separator') continue
      ;(item as { onClick: () => void }).onClick()
    }
    expect(h.openInBrowser).toHaveBeenCalledWith(ITEM)
    expect(h.copyHash).toHaveBeenCalledWith(ITEM)
    expect(h.copyMessage).toHaveBeenCalledWith(ITEM)
    expect(h.branchFrom).toHaveBeenCalledWith(ITEM)
    expect(h.checkout).toHaveBeenCalledWith(ITEM)
    expect(h.revert).toHaveBeenCalledWith(ITEM)
    expect(h.explain).toHaveBeenCalledWith(ITEM)
  })
})