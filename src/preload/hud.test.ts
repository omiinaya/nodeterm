// HUD-only preload wiring test (docs/notch-hud.md). The Notch HUD is a SEPARATE BrowserWindow
// with its own minimal bridge (`window.hud`) exposing exactly five channels. A renamed channel
// here would silently break the macOS HUD while every other surface stays green — the same
// wiring-correctness argument as index.wiring.test.ts, scoped to the HUD's tiny surface.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc'
import type { HudApi } from './hud'

const h = vi.hoisted(() => ({
  invoke: vi.fn(async (..._args: unknown[]) => undefined),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  exposed: {} as Record<string, unknown>
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => {
      h.exposed[key] = value
    }
  },
  ipcRenderer: {
    invoke: h.invoke,
    send: h.send,
    on: h.on,
    removeListener: h.removeListener
  }
}))

import './hud'

const api = h.exposed.hud as HudApi

beforeEach(() => {
  h.send.mockClear()
  h.on.mockClear()
  h.removeListener.mockClear()
})

describe('hud preload bridge', () => {
  it('exposes the hud api under the window key the HUD renderer reads', () => {
    expect(h.exposed.hud).toBeDefined()
  })

  it('routes the four hud→main sends on their exact channels', () => {
    api.setIgnoreMouse(true)
    expect(h.send).toHaveBeenCalledWith(IPC.hudSetIgnoreMouse, true)
    api.focusNode('n1')
    expect(h.send).toHaveBeenCalledWith(IPC.hudFocusNode, 'n1')
    api.setExpanded(false)
    expect(h.send).toHaveBeenCalledWith(IPC.hudExpanded, false)
    api.dismiss('n1')
    expect(h.send).toHaveBeenCalledWith(IPC.hudDismiss, 'n1')
  })

  it('onRows subscribes hud:rows and forwards the push payload; unsub removes the same handler', () => {
    const got: unknown[] = []
    const unsub = api.onRows((push) => got.push(push))
    const call = h.on.mock.calls.find((c) => c[0] === IPC.hudRows)
    expect(call).toBeTruthy()
    const push = { rows: [], bar: 32, width: 1000, notchWidth: 200, notchCenterX: 500, hasNotch: true, hoverExpand: true }
    ;(call![1] as (e: unknown, p: unknown) => void)({}, push)
    expect(got).toEqual([push])
    unsub()
    expect(h.removeListener).toHaveBeenCalledWith(IPC.hudRows, call![1])
  })
})