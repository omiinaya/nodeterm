// Electron shell for the usage service: starts core with a focused-window poll gate, refreshes
// on focus, and tears BOTH the interval and the listener on close. Core is mocked — this module
// is the shell wiring, not the service.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initClaudeUsage } from './claude-usage'

const startUsageService = vi.fn()
const refreshIfStale = vi.fn()
const dispose = vi.fn()
const focusHandlers: Array<() => void> = []
const closedHandlers: Array<() => void> = []

const win = {
  isFocused: vi.fn(() => true),
  on: vi.fn((ev: string, fn: () => void) => {
    if (ev === 'focus') focusHandlers.push(fn)
    if (ev === 'closed') closedHandlers.push(fn)
  }),
  off: vi.fn()
}

vi.mock('../core/usage/usage-service', () => ({
  startUsageService: (...a: unknown[]) => startUsageService(...a)
}))

beforeEach(() => {
  vi.clearAllMocks()
  focusHandlers.length = 0
  closedHandlers.length = 0
  startUsageService.mockReturnValue({ refreshIfStale, dispose })
})

describe('initClaudeUsage', () => {
  it('starts the usage service gated on window focus and forwards the opts', () => {
    const opts = { localAccounts: () => ['a'], onCacheUpdate: () => {} }
    const service = initClaudeUsage(win as never, opts)
    expect(startUsageService).toHaveBeenCalledWith(
      expect.objectContaining({ shouldPoll: expect.any(Function), ...opts })
    )
    expect(win.on).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(win.on).toHaveBeenCalledWith('closed', expect.any(Function))
    expect(service).toBe(startUsageService.mock.results[0].value)
  })

  it('polls only while the window is focused', () => {
    initClaudeUsage(win as never)
    const shouldPoll = startUsageService.mock.calls[0][0].shouldPoll as () => boolean
    win.isFocused.mockReturnValue(true)
    expect(shouldPoll()).toBe(true)
    win.isFocused.mockReturnValue(false)
    expect(shouldPoll()).toBe(false)
  })

  it('refreshes on window focus', () => {
    initClaudeUsage(win as never)
    expect(focusHandlers).toHaveLength(1)
    focusHandlers[0]()
    expect(refreshIfStale).toHaveBeenCalled()
  })

  it('on close removes the focus listener and disposes the service (no dead-window leak)', () => {
    initClaudeUsage(win as never)
    expect(closedHandlers).toHaveLength(1)
    closedHandlers[0]()
    expect(win.off).toHaveBeenCalledWith('focus', focusHandlers[0])
    expect(dispose).toHaveBeenCalled()
  })
})