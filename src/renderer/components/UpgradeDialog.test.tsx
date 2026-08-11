// @vitest-environment jsdom
// Pro upgrade dialog: hidden when closed or when already premium; otherwise portals the
// feature prompt with Maybe-later (hide) and Upgrade ($10/mo → entitlement.upgrade).
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntitlement } from '../state/entitlement'
import { useUpgradeGate } from '../state/upgradeGate'
import { UpgradeDialog } from './UpgradeDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.hoisted(() => {
  ;(globalThis as { nodeTerminal?: unknown }).nodeTerminal = { license: { onChange: () => () => {} } }
})

const upgrade = vi.fn()

beforeEach(() => {
  useEntitlement.setState({ isPremium: false, upgrade: upgrade as never })
  useUpgradeGate.setState({ open: false, feature: '' })
})

afterEach(() => {
  document.body.innerHTML = ''
})

function renderDialog() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(<UpgradeDialog />))
  return { host, root }
}

describe('UpgradeDialog', () => {
  it('renders nothing when the gate is closed', () => {
    const { root } = renderDialog()
    expect(document.body.querySelector('.confirm-overlay')).toBeNull()
    act(() => root.unmount())
  })

  it('renders nothing when the user is already premium', () => {
    useEntitlement.setState({ isPremium: true })
    useUpgradeGate.setState({ open: true, feature: 'collab' })
    const { root } = renderDialog()
    expect(document.body.querySelector('.confirm-overlay')).toBeNull()
    act(() => root.unmount())
  })

  it('shows the feature prompt and Upgrade calls entitlement.upgrade', () => {
    useUpgradeGate.setState({ open: true, feature: 'collab' })
    const { root } = renderDialog()
    expect(document.body.textContent).toContain('collab is a Pro feature')
    expect(document.body.textContent).toContain('Upgrade to Pro — $10/mo')
    const upgradeBtn = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Upgrade to Pro'))!
    act(() => upgradeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(upgrade).toHaveBeenCalled()
    act(() => root.unmount())
  })

  it('Maybe later hides the gate', () => {
    useUpgradeGate.setState({ open: true, feature: 'collab' })
    const { root } = renderDialog()
    const later = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Maybe later'))!
    act(() => later.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(useUpgradeGate.getState().open).toBe(false)
    act(() => root.unmount())
  })
})