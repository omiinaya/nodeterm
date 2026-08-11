// @vitest-environment jsdom
// Upgrade gate store + requireProOr: Pro runs the action, non-Pro opens the gate for the feature.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntitlement } from './entitlement'
import { requireProOr, useUpgradeGate } from './upgradeGate'

// entitlement's store creation subscribes to the license channel at MODULE LOAD, before any
// beforeEach runs — so window.nodeTerminal must exist before the import below is evaluated.
vi.hoisted(() => {
  ;(globalThis as { nodeTerminal?: unknown }).nodeTerminal = {
    license: { onChange: () => () => {} }
  }
})

beforeEach(() => {
  useUpgradeGate.setState({ open: false, feature: '' })
  useEntitlement.setState({ isPremium: false })
})

describe('useUpgradeGate', () => {
  it('show sets open + feature; hide closes', () => {
    useUpgradeGate.getState().show('collab')
    expect(useUpgradeGate.getState()).toMatchObject({ open: true, feature: 'collab' })
    useUpgradeGate.getState().hide()
    expect(useUpgradeGate.getState().open).toBe(false)
  })
})

describe('requireProOr', () => {
  it('runs the action when the user is Pro', () => {
    useEntitlement.setState({ isPremium: true })
    const run = vi.fn()
    requireProOr('collab', run)
    expect(run).toHaveBeenCalledTimes(1)
    expect(useUpgradeGate.getState().open).toBe(false)
  })

  it('opens the upgrade dialog for the feature when not Pro', () => {
    const run = vi.fn()
    requireProOr('collab', run)
    expect(run).not.toHaveBeenCalled()
    expect(useUpgradeGate.getState()).toMatchObject({ open: true, feature: 'collab' })
  })
})