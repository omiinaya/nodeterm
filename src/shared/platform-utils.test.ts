// Platform display helpers: mac keeps canonical notation; non-mac rewrites ⌘⇧ chords.
import { describe, expect, it } from 'vitest'
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
  it('leaves the text untouched on mac', () => {
    expect(hintLabel('⌘⇧Z', true)).toBe('⌘⇧Z')
  })

  it('rewrites chords for non-mac', () => {
    expect(hintLabel('⌘⇧Z', false)).toBe('Ctrl+Shift+Z')
    expect(hintLabel('⌘P', false)).toBe('Ctrl+P')
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