// Size-guard sentinels for whole-file IPC reads + human byte formatting.
import { describe, expect, it } from 'vitest'
import { formatBytes, tooLargeSentinel, tooLargeSize } from './fsLimits'

describe('tooLargeSentinel / tooLargeSize', () => {
  it('round-trips a sentinel with its byte size', () => {
    const s = tooLargeSentinel(12345)
    expect(tooLargeSize(s)).toBe(12345)
  })

  it('returns null for a value that is not a sentinel', () => {
    expect(tooLargeSize('plain text')).toBeNull()
    expect(tooLargeSize('')).toBeNull()
  })

  it('returns null when the sentinel size is not a finite number', () => {
    expect(tooLargeSize('\u0000nodeterm:too-large:notanumber')).toBeNull()
  })
})

describe('formatBytes', () => {
  it('formats GB, MB, KB and bytes', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(1500)).toBe('1 KB')
    expect(formatBytes(512)).toBe('512 B')
  })
})