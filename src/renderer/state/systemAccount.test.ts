// @vitest-environment jsdom
// Lazy system-account identity: ensure() runs the usage lookup once per session and stores the
// email; fail-open on error; a second ensure() does not re-fetch.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSystemAccount } from './systemAccount'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ email: 'sys@example.com' })
  ;(window as unknown as { nodeTerminal: { usage: { fetch: typeof fetchMock } } }).nodeTerminal = {
    usage: { fetch: fetchMock }
  }
  useSystemAccount.setState({ email: null, loaded: false })
})

describe('useSystemAccount', () => {
  it('fetches the email once and stores it', async () => {
    useSystemAccount.getState().ensure()
    await vi.waitFor(() => expect(useSystemAccount.getState().loaded).toBe(true))
    expect(useSystemAccount.getState().email).toBe('sys@example.com')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('is guarded: a second ensure() does not re-fetch in the same session', async () => {
    useSystemAccount.getState().ensure()
    await vi.waitFor(() => expect(useSystemAccount.getState().loaded).toBe(true))
    useSystemAccount.getState().ensure()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails open to null email when the lookup rejects', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    useSystemAccount.getState().ensure()
    await vi.waitFor(() => expect(useSystemAccount.getState().loaded).toBe(true))
    expect(useSystemAccount.getState().email).toBeNull()
  })
})