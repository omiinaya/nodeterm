// @vitest-environment jsdom
// One-shot mobile-launch announcement flag: localStorage-backed, storage-failure-safe.
import { beforeEach, describe, expect, it } from 'vitest'
import { markMobileLaunchSeen, shouldShowMobileLaunch } from './mobileLaunch'

beforeEach(() => {
  localStorage.clear()
})

describe('mobileLaunch flag', () => {
  it('shows until marked seen, then hides', () => {
    expect(shouldShowMobileLaunch()).toBe(true)
    markMobileLaunchSeen()
    expect(shouldShowMobileLaunch()).toBe(false)
  })

  it('tolerates an unavailable storage (shows false rather than throwing)', () => {
    const orig = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('denied')
    }
    expect(shouldShowMobileLaunch()).toBe(false)
    Storage.prototype.getItem = orig
  })
})