// Platform display helpers: mac keeps canonical notation; non-mac rewrites ⌘⇧ chords.
import { describe, it, expect } from 'vitest'
import { hintLabel, isMacPlatform, keyLabel, modSymbol } from './platform-utils'

describe('isMacPlatform', () => {
  it('falls back to mac notation when navigator is absent', () => {
    const nav = globalThis.navigator
    const saved = { platform: nav?.platform, userAgent: nav?.userAgent }
    // @ts-expect-error simulate no navigator
    delete globalThis.navigator
    expect(isMacPlatform()).toBe(true)
    globalThis.navigator = nav as Navigator
    expect(isMacPlatform()).toBe(/Mac/i.test(saved.platform || saved.userAgent || ''))
  })
})

describe('hintLabel', () => {
  it('passes mac strings through untouched', () => {
    expect(hintLabel('Save (⌘S)', true)).toBe('Save (⌘S)')
    expect(hintLabel('Redo (⌘⇧Z)', true)).toBe('Redo (⌘⇧Z)')
  })

  it('rewrites plain chords on non-mac', () => {
    expect(hintLabel('Save (⌘S)', false)).toBe('Save (Ctrl+S)')
    expect(hintLabel('⌘K', false)).toBe('Ctrl+K')
    expect(hintLabel('Settings (⌘,)', false)).toBe('Settings (Ctrl+,)')
    expect(hintLabel('⌘/', false)).toBe('Ctrl+/')
  })

  it('rewrites shift chords on non-mac', () => {
    expect(hintLabel('Redo (⌘⇧Z)', false)).toBe('Redo (Ctrl+Shift+Z)')
    expect(hintLabel('Explorer (⌘⇧E)', false)).toBe('Explorer (Ctrl+Shift+E)')
    expect(hintLabel('⌘P', false)).toBe('Ctrl+P')
  })

  it('keeps the return symbol and rewrites the modifier', () => {
    expect(hintLabel('Message (⌘↵ to commit)', false)).toBe('Message (Ctrl+↵ to commit)')
  })

  it('handles a bare ⌘ with no trailing key', () => {
    expect(hintLabel('no ⌘', false)).toBe('no Ctrl')
    expect(hintLabel('Esc ⌘', false)).toBe('Esc Ctrl')
  })
})

describe('keyLabel / modSymbol', () => {
  it('maps the modifier tokens for non-mac and passes keys through', () => {
    expect(keyLabel('⌘', false)).toBe('Ctrl')
    expect(keyLabel('⇧', false)).toBe('Shift')
    expect(keyLabel('Z', false)).toBe('Z')
    expect(keyLabel('⌘', true)).toBe('⌘')
  })

  it('modSymbol is the platform primary modifier', () => {
    expect(modSymbol(true)).toBe('⌘')
    expect(modSymbol(false)).toBe('Ctrl')
  })
})