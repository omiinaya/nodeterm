// @vitest-environment jsdom
// zustand store: the SSH server list behind the connect dialog; hydrate/save/remove all route
// through window.nodeTerminal.ssh and replace the servers array from the response.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SshServer } from '@shared/ssh'
import { useSshServers } from './sshServers'

const api = {
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn()
}

beforeEach(() => {
  vi.resetAllMocks()
  ;(window as unknown as { nodeTerminal: { ssh: typeof api } }).nodeTerminal = { ssh: api }
  useSshServers.setState({ servers: [] })
})

const SERVER: SshServer = { id: 's1', label: 'testbox', host: 'h', user: 'u' }

describe('useSshServers', () => {
  it('hydrate() replaces servers from ssh.list()', async () => {
    api.list.mockResolvedValue([SERVER])
    await useSshServers.getState().hydrate()
    expect(useSshServers.getState().servers).toEqual([SERVER])
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('save() writes through and stores the returned list', async () => {
    api.save.mockResolvedValue([SERVER])
    await useSshServers.getState().save(SERVER)
    expect(api.save).toHaveBeenCalledWith(SERVER)
    expect(useSshServers.getState().servers).toEqual([SERVER])
  })

  it('remove() deletes and stores the returned list', async () => {
    useSshServers.setState({ servers: [SERVER] })
    api.remove.mockResolvedValue([])
    await useSshServers.getState().remove('s1')
    expect(api.remove).toHaveBeenCalledWith('s1')
    expect(useSshServers.getState().servers).toEqual([])
  })
})