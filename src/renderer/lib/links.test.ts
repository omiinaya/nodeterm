// Pure constant — pin the canonical mobile App Store URL so the welcome flow, Settings >
// Phone and the quick-pair popover can never drift apart (one home for the link).
import { expect, describe, it } from 'vitest'
import { IOS_APP_STORE_URL } from './links'

describe('links', () => {
  it('pins the one canonical nodeterm App Store URL', () => {
    expect(IOS_APP_STORE_URL).toBe('https://apps.apple.com/app/nodeterm/id6790581233')
  })
})