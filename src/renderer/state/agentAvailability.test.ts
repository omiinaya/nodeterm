// Agent availability rules: enable/disable, default reassignment, and making an agent default.
import { describe, expect, it } from 'vitest'
import {
  firstEnabledBuiltin,
  isAgentEnabled,
  setAgentEnabled,
  setDefaultAgent
} from './agentAvailability'
import type { AgentId } from '@shared/agents/config'

const base = { disabledAgents: [] as AgentId[] }

describe('isAgentEnabled', () => {
  it('true by default, false when the id is disabled', () => {
    expect(isAgentEnabled(base, 'claude')).toBe(true)
    expect(isAgentEnabled({ disabledAgents: ['claude'] }, 'claude')).toBe(false)
  })
})

describe('firstEnabledBuiltin', () => {
  it('skips each disabled builtin in order', () => {
    expect(firstEnabledBuiltin([])).toBe('claude')
    expect(firstEnabledBuiltin(['claude'])).toBe('codex')
    expect(firstEnabledBuiltin(['claude', 'codex'])).toBe('gemini')
    expect(firstEnabledBuiltin(['claude', 'codex', 'gemini'])).toBe('opencode')
    expect(firstEnabledBuiltin(['claude', 'codex', 'gemini', 'opencode'])).toBe('grok')
  })

  it('falls back to claude when every builtin is disabled', () => {
    expect(firstEnabledBuiltin(['claude', 'codex', 'gemini', 'opencode', 'grok'])).toBe('claude')
  })
})

describe('setAgentEnabled', () => {
  it('disabling appends the id and reassigns the default when it was the default', () => {
    const next = setAgentEnabled({ disabledAgents: [], defaultAgent: 'claude' }, 'claude', false)
    expect(next.disabledAgents).toEqual(['claude'])
    expect(next.defaultAgent).not.toBe('claude')
  })

  it('disabling a non-default agent does not move the default', () => {
    const next = setAgentEnabled({ disabledAgents: [], defaultAgent: 'claude' }, 'codex', false)
    expect(next.disabledAgents).toEqual(['codex'])
    expect(next.defaultAgent).toBe('claude')
  })

  it('enabling removes the id from the disabled list', () => {
    const next = setAgentEnabled({ disabledAgents: ['gemini'], defaultAgent: 'claude' }, 'gemini', true)
    expect(next.disabledAgents).toEqual([])
    expect(next.defaultAgent).toBe('claude')
  })

  it('passes through unchanged when disabling an already-disabled agent', () => {
    const next = setAgentEnabled({ disabledAgents: ['gemini'], defaultAgent: 'claude' }, 'gemini', false)
    expect(next.disabledAgents).toEqual(['gemini'])
  })
})

describe('setDefaultAgent', () => {
  it('makes the agent default and re-enables it if disabled', () => {
    const next = setDefaultAgent({ disabledAgents: ['gemini'], defaultAgent: 'claude' }, 'gemini')
    expect(next.defaultAgent).toBe('gemini')
    expect(next.disabledAgents).not.toContain('gemini')
  })
})