// A bridged phone's presence slot: join is idempotent, leave is exactly-once, and the id is
// null before join and after leave. The hub and the id allocator are mocked — this module is
// the bookkeeping contract, not the hub.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClientId } from '../../shared/presence'
import { createPhonePresence } from './phone-presence'

const allocateRelayClientId = vi.fn()
const hubJoin = vi.fn()
const hubLeave = vi.fn()

vi.mock('../../core/presence/hub', () => ({
  allocateRelayClientId: (...a: unknown[]) => allocateRelayClientId(...a),
  presenceHub: { join: (...a: unknown[]) => hubJoin(...a), leave: (...a: unknown[]) => hubLeave(...a) }
}))

beforeEach(() => {
  allocateRelayClientId.mockClear()
  hubJoin.mockClear()
  hubLeave.mockClear()
  allocateRelayClientId.mockReturnValue('relay-peer-1')
})

describe('createPhonePresence', () => {
  it('is unjoined before join()', () => {
    expect(createPhonePresence().id()).toBeNull()
  })

  it('join() allocates an id and joins the hub with the phone kind', () => {
    const p = createPhonePresence()
    p.join()
    expect(allocateRelayClientId).toHaveBeenCalledTimes(1)
    expect(hubJoin).toHaveBeenCalledWith('relay-peer-1', 'phone')
    expect(p.id()).toBe('relay-peer-1')
  })

  it('join() is idempotent: repeated calls allocate and join exactly once', () => {
    const p = createPhonePresence()
    p.join()
    p.join()
    p.join()
    expect(allocateRelayClientId).toHaveBeenCalledTimes(1)
    expect(hubJoin).toHaveBeenCalledTimes(1)
  })

  it('leave() drops the peer and nulls the id — exactly once even across plural end paths', () => {
    const p = createPhonePresence()
    p.join()
    p.leave()
    expect(hubLeave).toHaveBeenCalledWith('relay-peer-1')
    expect(p.id()).toBeNull()
    p.leave()
    p.leave()
    expect(hubLeave).toHaveBeenCalledTimes(1) // the second/third calls are no-ops
  })

  it('leave() before join() is a harmless no-op', () => {
    const p = createPhonePresence()
    expect(() => p.leave()).not.toThrow()
    expect(hubLeave).not.toHaveBeenCalled()
  })
})