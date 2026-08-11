// Gemini hook service: thin wrappers over the shared install helper with the gemini config path.
// The helper itself is unit-tested; here we pin the wiring (agent id, script name, config path).
import { homedir } from 'os'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GEMINI_HOOK_EVENTS } from '@shared/agents/hook-events'
import { installGeminiHooks, removeGeminiHooks } from './gemini'

const installHooksInto = vi.fn()
const removeHooksFrom = vi.fn()

vi.mock('./install-helper', () => ({
  installHooksInto: (...a: unknown[]) => installHooksInto(...a),
  removeHooksFrom: (...a: unknown[]) => removeHooksFrom(...a)
}))

beforeEach(() => {
  installHooksInto.mockClear()
  removeHooksFrom.mockClear()
})

describe('gemini hooks', () => {
  it('installs the managed script under the gemini settings path', () => {
    installGeminiHooks()
    expect(installHooksInto).toHaveBeenCalledWith({
      agentId: 'gemini',
      scriptFileName: 'gemini.sh',
      configPath: path.join(homedir(), '.gemini', 'settings.json'),
      events: GEMINI_HOOK_EVENTS
    })
  })

  it('removes the gemini hooks on demand', () => {
    removeGeminiHooks()
    expect(removeHooksFrom).toHaveBeenCalledWith({
      configPath: path.join(homedir(), '.gemini', 'settings.json'),
      events: GEMINI_HOOK_EVENTS,
      scriptFileName: 'gemini.sh'
    })
  })
})