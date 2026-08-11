// @vitest-environment jsdom
// Per-repo SCM draft store: commit message + inflight generate status survives panel close.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScmDraft } from './scmDraft'

const generateMessage = vi.fn()
const activeSessionApi = vi.fn(() => ({ git: { generateMessage } }))

vi.mock('../session/session', () => ({ activeSessionApi: () => activeSessionApi() }))

beforeEach(() => {
  vi.clearAllMocks()
  useScmDraft.setState({ messages: {}, generating: {}, errors: {} })
})

describe('useScmDraft', () => {
  it('setMessage and clearError update the per-cwd maps', () => {
    useScmDraft.getState().setMessage('/r', 'wip')
    useScmDraft.getState().clearError('/r')
    expect(useScmDraft.getState().messages).toEqual({ '/r': 'wip' })
    expect(useScmDraft.getState().errors).toEqual({ '/r': '' })
  })

  it('generate stores the message on ok and clears the inflight flag', async () => {
    generateMessage.mockResolvedValue({ ok: true, message: 'fix: thing' })
    await useScmDraft.getState().generate('/r')
    expect(useScmDraft.getState().messages['/r']).toBe('fix: thing')
    expect(useScmDraft.getState().generating['/r']).toBe(false)
  })

  it('generate stores an error when the message is not ok', async () => {
    generateMessage.mockResolvedValue({ ok: false, message: 'no diff' })
    await useScmDraft.getState().generate('/r')
    expect(useScmDraft.getState().errors['/r']).toBe('no diff')
    expect(useScmDraft.getState().messages['/r']).toBeUndefined()
  })

  it('generate surfaces a thrown error and clears the inflight flag', async () => {
    generateMessage.mockRejectedValue(new Error('boom'))
    await useScmDraft.getState().generate('/r')
    expect(useScmDraft.getState().errors['/r']).toBe('boom')
    expect(useScmDraft.getState().generating['/r']).toBe(false)
  })

  it('does not start a second generate while one is in flight, and ignores empty cwd', async () => {
    generateMessage.mockResolvedValue({ ok: true, message: 'm' })
    useScmDraft.setState({ generating: { '/r': true } })
    await useScmDraft.getState().generate('/r')
    expect(generateMessage).not.toHaveBeenCalled()
    await useScmDraft.getState().generate('')
    expect(generateMessage).not.toHaveBeenCalled()
  })
})