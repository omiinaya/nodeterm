// The app-chrome theme resolution and Monaco theme mapping — pure, table-testable.
import { describe, expect, it } from 'vitest'
import { monacoTheme, resolveAppTheme } from './appTheme'

describe('resolveAppTheme', () => {
  it('explicit light/dark short-circuit the terminal theme', () => {
    expect(resolveAppTheme('light', false)).toBe('light')
    expect(resolveAppTheme('dark', false)).toBe('dark')
    expect(resolveAppTheme('light', true)).toBe('light')
    expect(resolveAppTheme('dark', true)).toBe('dark')
  })

  it('auto follows the terminal theme', () => {
    expect(resolveAppTheme('auto', true)).toBe('dark')
    expect(resolveAppTheme('auto', false)).toBe('light')
  })

  it('defaults to dark for any unrecognised hand-edited value', () => {
    // @ts-expect-error deliberate invalid hand-edited settings.json value
    expect(resolveAppTheme('neon', false)).toBe('dark')
    // undefined too (a settings.json key can be present-but-empty)
    expect(resolveAppTheme(undefined as unknown as 'auto' | 'dark' | 'light', false)).toBe('dark')
  })
})

describe('monacoTheme', () => {
  it('maps light -> vs and dark -> vs-dark', () => {
    expect(monacoTheme('light')).toBe('vs')
    expect(monacoTheme('dark')).toBe('vs-dark')
  })
})