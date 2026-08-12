import { beforeEach, describe, expect, it } from 'vitest'
import { useResizeGesture } from './resizeGesture'

const RECT = { x: 0, y: 0, width: 400, height: 200 }

beforeEach(() => {
  useResizeGesture.setState({ gesture: null })
})

describe('resizeGesture', () => {
  it('begins a gesture with flat prevRect and startRect (first frame == current)', () => {
    useResizeGesture.getState().begin('node-a', RECT)
    expect(useResizeGesture.getState().gesture).toEqual({
      nodeId: 'node-a',
      rect: RECT,
      prevRect: RECT,
      startRect: RECT
    })
  })

  it('advances rect and carries the previous frame as prevRect, keeping the start rect', () => {
    const s = useResizeGesture.getState()
    s.begin('node-a', RECT)
    useResizeGesture.getState().update({ x: 0, y: 0, width: 420, height: 200 })
    const g = useResizeGesture.getState().gesture
    expect(g?.rect.width).toBe(420)
    expect(g?.prevRect).toEqual(RECT)
    expect(g?.startRect).toEqual(RECT) // start rect must stay fixed for the whole drag
  })

  it('ignores an update with no active gesture', () => {
    useResizeGesture.getState().update({ x: 0, y: 0, width: 999, height: 999 })
    expect(useResizeGesture.getState().gesture).toBeNull()
  })

  it('clears on end', () => {
    useResizeGesture.getState().begin('node-a', RECT)
    useResizeGesture.getState().end()
    expect(useResizeGesture.getState().gesture).toBeNull()
  })
})
