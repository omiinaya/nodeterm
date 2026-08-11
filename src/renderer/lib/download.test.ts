// Download-route selection: which transport (if any) the Explorer offers per shell/project.
import { describe, expect, it } from 'vitest'
import { canRevealLocally, downloadRoute } from './download'

describe('downloadRoute', () => {
  it('scp for desktop + SSH project (remote tree over the ControlMaster)', () => {
    expect(downloadRoute({ browser: false, ssh: true, source: 'local' })).toBe('scp')
  })

  it('http for browser + local project (Server Edition one-shot ticket)', () => {
    expect(downloadRoute({ browser: true, ssh: false, source: 'local' })).toBe('http')
  })

  it('none for desktop + local project (file already on this machine)', () => {
    expect(downloadRoute({ browser: false, ssh: false, source: 'local' })).toBe('none')
  })

  it('none for a relay tab (only the capped bridged fs.readBinary exists)', () => {
    expect(downloadRoute({ browser: true, ssh: false, source: 'relay' })).toBe('none')
    expect(downloadRoute({ browser: false, ssh: true, source: 'relay' })).toBe('none')
  })

  it('none for browser + ssh (Server Edition has no SSH projects to serve)', () => {
    expect(downloadRoute({ browser: true, ssh: true, source: 'local' })).toBe('none')
  })
})

describe('canRevealLocally', () => {
  it('only for an Electron shell showing local paths', () => {
    expect(canRevealLocally({ browser: false, ssh: false, source: 'local' })).toBe(true)
    expect(canRevealLocally({ browser: true, ssh: false, source: 'local' })).toBe(false)
    expect(canRevealLocally({ browser: false, ssh: true, source: 'local' })).toBe(false)
    expect(canRevealLocally({ browser: false, ssh: false, source: 'relay' })).toBe(false)
  })
})