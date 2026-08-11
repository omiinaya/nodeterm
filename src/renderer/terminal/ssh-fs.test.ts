// @vitest-environment jsdom
// SSH-project filesystem adapter: proxies the renderer FsApi contract onto sshFs:* IPC with the
// projectId bound in — the same contract as window.nodeTerminal.fs, over the ControlMaster.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sshFs } from './ssh-fs'

const api = {
  list: vi.fn(),
  read: vi.fn(),
  readBinary: vi.fn(),
  write: vi.fn(),
  mkdir: vi.fn(),
  exists: vi.fn()
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as unknown as { nodeTerminal: { sshFs: typeof api } }).nodeTerminal = { sshFs: api }
})

describe('sshFs', () => {
  it('binds projectId into every call, keeping the FsApi argument order', async () => {
    const fs = sshFs('p1')
    await fs.list('/d')
    expect(api.list).toHaveBeenCalledWith('p1', '/d')
    await fs.read('/d/f')
    expect(api.read).toHaveBeenCalledWith('p1', '/d/f')
    await fs.readBinary('/d/f')
    expect(api.readBinary).toHaveBeenCalledWith('p1', '/d/f')
    await fs.write('/d/f', 'content')
    expect(api.write).toHaveBeenCalledWith('p1', '/d/f', 'content')
    await fs.mkdir('/d2')
    expect(api.mkdir).toHaveBeenCalledWith('p1', '/d2')
    await fs.exists('/d')
    expect(api.exists).toHaveBeenCalledWith('p1', '/d')
  })
})