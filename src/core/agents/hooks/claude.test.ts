// Claude hook service: the four install/remove surfaces and the fullscreen-tui guard, with the
// shared helper and the CLI-cap probe mocked. The helper itself is unit-tested elsewhere; here
// we pin the wiring (config path, events, guardrails).
import { homedir } from 'os'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_HOOK_EVENTS } from '@shared/agents/hook-events'
import {
  ensureClaudeFullscreenTui,
  ensureClaudeFullscreenTuiInto,
  installClaudeHooks,
  installClaudeHooksInto,
  removeClaudeHooks
} from './claude'

const installHooksInto = vi.fn()
const removeHooksFrom = vi.fn()
const ensureFullscreenTuiInFile = vi.fn()
const claudeCliCaps = vi.fn(async () => ({ fullscreenTui: true }))

vi.mock('./install-helper', () => ({
  installHooksInto: (...a: unknown[]) => installHooksInto(...a),
  removeHooksFrom: (...a: unknown[]) => removeHooksFrom(...a)
}))
vi.mock('./claude-tui', () => ({
  ensureFullscreenTuiInFile: (configPath: string) => {
    ensureFullscreenTuiInFile(configPath)
    return configPath
  }
}))
vi.mock('../../claude-cli', () => ({
  claudeCliCaps: () => claudeCliCaps()
}))

beforeEach(() => {
  installHooksInto.mockClear()
  removeHooksFrom.mockClear()
  ensureFullscreenTuiInFile.mockClear()
  claudeCliCaps.mockClear()
  claudeCliCaps.mockResolvedValue({ fullscreenTui: true })
})

const SYSTEM_SETTINGS = path.join(homedir(), '.claude', 'settings.json')

describe('claude hooks', () => {
  it('installs the managed script into the system claude settings', () => {
    installClaudeHooks()
    expect(installHooksInto).toHaveBeenCalledWith({
      agentId: 'claude',
      scriptFileName: 'claude.sh',
      configPath: SYSTEM_SETTINGS,
      events: CLAUDE_HOOK_EVENTS
    })
  })

  it('installs into a managed account config dir', () => {
    installClaudeHooksInto('/acct/dir')
    expect(installHooksInto).toHaveBeenCalledWith(
      expect.objectContaining({ configPath: path.join('/acct/dir', 'settings.json') })
    )
  })

  it('removes the claude hooks', () => {
    removeClaudeHooks()
    expect(removeHooksFrom).toHaveBeenCalledWith({
      configPath: SYSTEM_SETTINGS,
      events: CLAUDE_HOOK_EVENTS,
      scriptFileName: 'claude.sh'
    })
  })

  it('ensureFullscreenTui writes the setting when the CLI supports it', async () => {
    await ensureClaudeFullscreenTui()
    expect(ensureFullscreenTuiInFile).toHaveBeenCalledWith(SYSTEM_SETTINGS)
  })

  it('ensureFullscreenTui skips the write when the CLI does not support it', async () => {
    claudeCliCaps.mockResolvedValue({ fullscreenTui: false })
    await ensureClaudeFullscreenTui()
    expect(ensureFullscreenTuiInFile).not.toHaveBeenCalled()
  })

  it('ensureFullscreenTuiInto writes to the managed account settings path', async () => {
    await ensureClaudeFullscreenTuiInto('/acct')
    expect(ensureFullscreenTuiInFile).toHaveBeenCalledWith(path.join('/acct', 'settings.json'))
  })
})