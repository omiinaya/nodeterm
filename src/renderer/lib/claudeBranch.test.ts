// Claude /branch driver: sends the slash command, polls the buffer for the parked original
// session id, and fails honestly when there is no tmux session or the id never appears.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { branchClaudeSession } from './claudeBranch'

const sendText = vi.fn()
const capture = vi.fn()
const api = { pty: { sendText, capture } } as never

beforeEach(() => {
  vi.clearAllMocks()
})

describe('branchClaudeSession', () => {
  it('returns an error when sendText reports no persistent session', async () => {
    sendText.mockResolvedValue(false)
    const res = await branchClaudeSession(api, 'n1')
    expect(res.ok).toBe(false)
    expect(res.error).toContain('persistent')
  })

  it('captures the parked original id from the /resume line', async () => {
    sendText.mockResolvedValue(true)
    capture.mockResolvedValue('...use /resume 12345678-aaaa to return...')
    const res = await branchClaudeSession(api, 'n1')
    expect(res).toEqual({ ok: true, originalId: '12345678-aaaa' })
  })

  it('captures the original id from the claude -r form', async () => {
    sendText.mockResolvedValue(true)
    capture.mockResolvedValue('run claude -r 9f8e7d6c5b4a in a new terminal')
    const res = await branchClaudeSession(api, 'n1')
    expect(res.ok).toBe(true)
    expect(res.originalId).toBe('9f8e7d6c5b4a')
  })

  it('gives up after polling when the id never appears', async () => {
    vi.useFakeTimers()
    sendText.mockResolvedValue(true)
    capture.mockResolvedValue('no branch output yet')
    const p = branchClaudeSession(api, 'n1')
    for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(300)
    const res = await p
    expect(res.ok).toBe(false)
    expect(res.error).toContain("Couldn't detect")
    vi.useRealTimers()
  })
})