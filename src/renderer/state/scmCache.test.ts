// zustand store: last-known SCM data per cwd, written through on refresh, read for instant paint.
import { beforeEach, describe, expect, it } from 'vitest'
import { useScmCache } from './scmCache'

describe('useScmCache', () => {
  beforeEach(() => {
    useScmCache.setState({ status: {}, history: {} })
  })

  it('stores status and history keyed by cwd, replacing previous entries', () => {
    const st1 = { branch: 'main', clean: true } as never
    const st2 = { branch: 'dev', clean: false } as never
    useScmCache.getState().setStatus('/r', st1)
    useScmCache.getState().setStatus('/r', st2)
    useScmCache.getState().setHistory('/r', { commits: [] } as never)
    expect(useScmCache.getState().status['/r']).toBe(st2)
    expect(useScmCache.getState().history['/r']).toEqual({ commits: [] })
  })

  it('keys by cwd so different repos do not clobber each other', () => {
    useScmCache.getState().setStatus('/a', { branch: 'a' } as never)
    useScmCache.getState().setStatus('/b', { branch: 'b' } as never)
    expect(Object.keys(useScmCache.getState().status).sort()).toEqual(['/a', '/b'])
  })

  it('ignores an empty cwd (no key pollution)', () => {
    useScmCache.getState().setStatus('', { branch: 'x' } as never)
    useScmCache.getState().setHistory('', {} as never)
    expect(useScmCache.getState().status).toEqual({})
    expect(useScmCache.getState().history).toEqual({})
  })
})