// Transient per-node AI-naming flag store: set/unset with no-op rewrites (the spinner survives
// row unmount by living in a store).
import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionNaming } from './sessionNaming'

beforeEach(() => {
  useSessionNaming.setState({ byId: {} })
})

describe('useSessionNaming', () => {
  it('set(id, true) flags the node; set(id, false) clears it', () => {
    useSessionNaming.getState().set('n1', true)
    expect(useSessionNaming.getState().byId['n1']).toBe(true)
    useSessionNaming.getState().set('n1', false)
    expect(useSessionNaming.getState().byId['n1']).toBeUndefined()
  })

  it('rewriting the same state is a no-op (no extra renders)', () => {
    useSessionNaming.getState().set('n1', true)
    const before = useSessionNaming.getState().byId
    useSessionNaming.getState().set('n1', true)
    expect(useSessionNaming.getState().byId).toBe(before)
  })

  it('names are tracked per node id concurrently', () => {
    useSessionNaming.getState().set('n1', true)
    useSessionNaming.getState().set('n2', false)
    useSessionNaming.getState().set('n1', true)
    useSessionNaming.getState().set('n1', false)
    useSessionNaming.getState().set('n2', true)
    expect(useSessionNaming.getState().byId).toEqual({ n2: true })
  })
})