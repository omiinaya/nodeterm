// Git-history timestamp formatting: month/day via Intl; null/invalid -> ''.
import { describe, expect, it } from 'vitest'
import { formatGitHistoryTimestamp } from './git-history-format'

describe('formatGitHistoryTimestamp', () => {
  it('formats a valid timestamp as a short month/day', () => {
    // 2026-08-10T12:00:00Z — the formatter is locale-dependent, but the shape is "Mon DD".
    const out = formatGitHistoryTimestamp(Date.UTC(2026, 7, 10, 12))
    expect(out).toMatch(/^\w{3} \d{1,2}$/)
  })

  it('returns empty for undefined, null, or non-finite timestamps', () => {
    expect(formatGitHistoryTimestamp(undefined)).toBe('')
    expect(formatGitHistoryTimestamp(null as unknown as number)).toBe('')
    expect(formatGitHistoryTimestamp(Number.NaN)).toBe('')
    expect(formatGitHistoryTimestamp(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('returns empty for a timestamp that is finite but not a valid date', () => {
    // A value Number.isFinite accepts but Date rejects.
    expect(formatGitHistoryTimestamp(Number.MAX_SAFE_INTEGER * 1e6)).toBe('')
  })
})