// @vitest-environment jsdom
// Middle-click paste guard: pure suppression rule + the both-events capture wiring, and the
// allow() read-at-event-time behavior.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guardMiddleClickPaste, suppressMiddleClickPaste } from './middle-click'

describe('suppressMiddleClickPaste', () => {
  it('suppresses only middle button while allow is off', () => {
    expect(suppressMiddleClickPaste(1, false)).toBe(true)
    expect(suppressMiddleClickPaste(1, true)).toBe(false)
    expect(suppressMiddleClickPaste(0, false)).toBe(false)
    expect(suppressMiddleClickPaste(2, false)).toBe(false)
  })
})

describe('guardMiddleClickPaste', () => {
  let host: HTMLElement

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('prevents default on middle auxclick when allow is off, and reads allow at event time', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    let allow = false
    guardMiddleClickPaste(host, () => allow)

    // auxclick with allow off -> the cancelable event is default-prevented (dispatch returns false)
    const blocked = new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true })
    expect(host.dispatchEvent(blocked)).toBe(false)

    // flipping allow takes effect on the next click (read at event time)
    allow = true
    const passed = new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true })
    expect(host.dispatchEvent(passed)).toBe(true)
  })

  it('prevents default on middle mouseup too, but never on left button', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    guardMiddleClickPaste(host, () => false)
    const mid = new MouseEvent('mouseup', { button: 1, bubbles: true, cancelable: true })
    expect(host.dispatchEvent(mid)).toBe(false)
    const left = new MouseEvent('mouseup', { button: 0, bubbles: true, cancelable: true })
    expect(host.dispatchEvent(left)).toBe(true)
  })

  it('the returned cleanup removes both listeners', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    const unguard = guardMiddleClickPaste(host, () => false)
    unguard()
    const mid = new MouseEvent('mouseup', { button: 1, bubbles: true, cancelable: true })
    expect(host.dispatchEvent(mid)).toBe(true) // no longer guarded
  })
})