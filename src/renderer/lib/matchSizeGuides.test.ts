import { describe, expect, it } from 'vitest'
import {
  MATCH_LOOKAHEAD_PX,
  OVERLAP_MIN_PX,
  movedEdges,
  pickMatchTarget,
  type MatchNode,
  type ResizeGesture
} from './matchSizeGuides'

const A = { id: 'a', x: 0, y: 0, width: 400, height: 200 }

function gesture(rect: ResizeGesture['rect'], prevRect: ResizeGesture['prevRect'] = rect): ResizeGesture {
  return { nodeId: 'a', rect, prevRect }
}

describe('movedEdges', () => {
  it('reports a left drag when x moved, right when only width changed', () => {
    expect(movedEdges({ x: 0, y: 0, width: 400, height: 200 }, { x: 0, y: 0, width: 420, height: 200 })).toEqual({
      activeH: 'right'
    })
    expect(movedEdges({ x: 0, y: 0, width: 400, height: 200 }, { x: -20, y: 0, width: 420, height: 200 })).toEqual({
      activeH: 'left'
    })
    expect(movedEdges({ x: 0, y: 0, width: 400, height: 200 }, { x: 0, y: 0, width: 400, height: 180 })).toEqual({
      activeV: 'bottom'
    })
    expect(movedEdges({ x: 0, y: 0, width: 400, height: 200 }, { x: 0, y: -30, width: 400, height: 230 })).toEqual({
      activeV: 'top'
    })
  })

  it('reports nothing on the first flat frame', () => {
    expect(movedEdges({ x: 0, y: 0, width: 400, height: 200 }, { x: 0, y: 0, width: 400, height: 200 })).toEqual({})
  })
})

describe('pickMatchTarget — width axis', () => {
  it('matches a same-band neighbor and reports the exact px to drag', () => {
    const b: MatchNode = { id: 'b', x: 500, y: 0, width: 320, height: 200 }
    const t = pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b])
    expect(t).toEqual({
      targetNodeId: 'b',
      axis: 'width',
      targetEdge: 320,
      currentEdge: 400,
      signedDelta: -80,
      spanStart: 0,
      spanEnd: 200
    })
  })

  it('anchors on the right edge when the LEFT edge is being dragged', () => {
    const b: MatchNode = { id: 'b', x: 500, y: 0, width: 320, height: 200 }
    const prev = { x: 0, y: 0, width: 400, height: 200 }
    const cur = { x: -5, y: 0, width: 405, height: 200 }
    const t = pickMatchTarget(gesture(cur, prev), [A, b])
    expect(t?.targetEdge).toBe(80) // 405 - 320, keeping the right edge fixed
    expect(t?.currentEdge).toBe(-5)
    expect(t?.signedDelta).toBe(85)
  })

  it('ignores nodes that do not share the vertical band', () => {
    const b: MatchNode = { id: 'b', x: 500, y: 600, width: 320, height: 200 } // no overlap with A's 0..200
    expect(pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b])).toBeNull()
  })

  it('ignores nodes whose size is beyond the lookahead', () => {
    const b: MatchNode = { id: 'b', x: 500, y: 0, width: 400 - MATCH_LOOKAHEAD_PX - 1, height: 200 }
    expect(pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b])).toBeNull()
  })

  it('never matches the resized node itself', () => {
    const self = { ...A }
    expect(pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [self])).toBeNull()
  })

  it('skips unmeasured nodes', () => {
    const b: MatchNode = { id: 'b', x: 500, y: 0, width: 0, height: 200 }
    expect(pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b])).toBeNull()
  })
})

describe('pickMatchTarget — height axis', () => {
  it('matches a same-column neighbor below', () => {
    const b: MatchNode = { id: 'b', x: 0, y: 500, width: 400, height: 150 }
    const t = pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b])
    expect(t).toMatchObject({ targetNodeId: 'b', axis: 'height', targetEdge: 150, currentEdge: 200, signedDelta: -50 })
  })

  it('anchors on the bottom edge when the TOP edge is dragged', () => {
    const b: MatchNode = { id: 'b', x: 0, y: 500, width: 400, height: 150 }
    const prev = { x: 0, y: 0, width: 400, height: 200 }
    const cur = { x: 0, y: -10, width: 400, height: 210 }
    const t = pickMatchTarget(gesture(cur, prev), [A, b])
    expect(t?.targetEdge).toBe(50) // 210 - 150, keeping the bottom edge fixed at -10+210=200
    expect(t?.currentEdge).toBe(-10)
    expect(t?.signedDelta).toBe(60)
  })
})

describe('pickMatchTarget — prioritization (many neighbors, show ONE)', () => {
  it('picks the nearest size match', () => {
    const b1: MatchNode = { id: 'b1', x: 500, y: 0, width: 380, height: 200 } // Δ 20
    const b2: MatchNode = { id: 'b2', x: 900, y: 0, width: 350, height: 200 } // Δ 50
    expect(pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b1, b2])?.targetNodeId).toBe('b1')
  })

  it('breaks an equal-delta tie by perpendicular center proximity', () => {
    const b1: MatchNode = { id: 'b1', x: 500, y: 0, width: 360, height: 100 } // center 50
    const b2: MatchNode = { id: 'b2', x: 500, y: 250, width: 360, height: 100 } // center 300, same as A's
    const t = pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 600 }), [A, b1, b2])
    expect(t?.targetNodeId).toBe('b2')
  })

  it('is deterministic on a full tie (id wins)', () => {
    const b1: MatchNode = { id: 'b1', x: 500, y: 0, width: 360, height: 200 }
    const b2: MatchNode = { id: 'b2', x: 900, y: 0, width: 360, height: 200 }
    const t = pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b2, b1])
    expect(t?.targetNodeId).toBe('b1')
  })
})

describe('pickMatchTarget — corner drags and first frame', () => {
  it('compares width AND height candidates on a corner drag and shows the best', () => {
    const bw: MatchNode = { id: 'bw', x: 500, y: 0, width: 370, height: 200 } // Δw 30
    const bh: MatchNode = { id: 'bh', x: 0, y: 500, width: 400, height: 190 } // Δh 10
    const prev = { x: 0, y: 0, width: 400, height: 200 }
    const cur = { x: 0, y: 0, width: 402, height: 202 } // both axes moving
    expect(pickMatchTarget(gesture(cur, prev), [A, bw, bh])?.axis).toBe('height')
  })

  it('considers both axes on the first flat frame with the default right/bottom edges', () => {
    const b: MatchNode = { id: 'b', x: 500, y: 0, width: 320, height: 200 }
    const t = pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b])
    expect(t?.axis).toBe('width')
    expect(t?.signedDelta).toBe(-80)
  })

  it('a zero-delta exact match is reported (guide confirms alignment)', () => {
    const b: MatchNode = { id: 'b', x: 500, y: 0, width: 400, height: 200 }
    const t = pickMatchTarget(gesture({ x: 0, y: 0, width: 400, height: 200 }), [A, b])
    expect(t?.signedDelta).toBe(0)
    expect(t?.targetEdge).toBe(400)
  })
})

describe('pickMatchTarget — hysteresis (corner-drag anti-flicker)', () => {
  const A = { id: 'a', x: 0, y: 0, width: 400, height: 200 }
  // bw is a width match (Δ 30), bh a height match (Δ 10).
  const bw: MatchNode = { id: 'bw', x: 500, y: 0, width: 370, height: 200 }
  const bh: MatchNode = { id: 'bh', x: 0, y: 500, width: 400, height: 190 }

  it('keeps the previous target when it is only slightly worse than a new best (no flip)', () => {
    // Last frame chose the height line at Δ 15; this frame a width match is only 2px away.
    // The 13px difference is inside the 14px margin, so stay on height — no flicker.
    const cur = { x: 0, y: 0, width: 405, height: 215 }
    const prev = { x: 0, y: 0, width: 400, height: 200 }
    const current = { targetNodeId: 'bh', axis: 'height' as const, signedDelta: 15 }
    const t = pickMatchTarget(gesture(cur, prev), [A, bw, bh], current)
    expect(t?.axis).toBe('height')
    expect(t?.targetNodeId).toBe('bh')
  })

  it('switches when a target is clearly better than the latched one', () => {
    const cur = { x: 0, y: 0, width: 405, height: 300 } // width Δ35 vs height Δ110 — clear winner
    const prev = { x: 0, y: 0, width: 400, height: 200 }
    const current = { targetNodeId: 'bh', axis: 'height' as const, signedDelta: 40 }
    const t = pickMatchTarget(gesture(cur, prev), [A, bw, bh], current)
    expect(t?.axis).toBe('width')
  })

  it('stays on the current target on an exact tie', () => {
    const cur = { x: 0, y: 0, width: 400, height: 200 }
    const current = { targetNodeId: 'bh', axis: 'height' as const, signedDelta: 10 }
    const t = pickMatchTarget(gesture(cur, cur), [A, bw, bh], current)
    expect(t).toMatchObject({ targetNodeId: 'bh', axis: 'height' })
  })

  it('drops the latch when the current target stops being a candidate', () => {
    const cur = { x: 0, y: 0, width: 700, height: 260 } // corner drag: bw's width (370) is past the lookahead
    const prev = { x: 0, y: 0, width: 400, height: 200 }
    const current = { targetNodeId: 'bw', axis: 'width' as const, signedDelta: 20 }
    const t = pickMatchTarget(gesture(cur, prev), [A, bw, bh], current)
    // The latched width guide is gone (bw's width is unreachable now), so the fresh
    // pick takes over — here bw itself reappears as a HEIGHT match, which is the point:
    // the old width latch was released, not re-shown.
    expect(t?.axis).toBe('height')
    expect(t?.targetNodeId).toBe('bw')
  })

  it('does not throw when no current is supplied (free pick still works)', () => {
    const cur = { x: 0, y: 0, width: 405, height: 215 }
    const prev = { x: 0, y: 0, width: 400, height: 200 }
    expect(pickMatchTarget(gesture(cur, prev), [A, bw, bh])?.axis).toBe('height')
  })
})

describe('constants sanity', () => {
  it('keeps the overlap threshold meaningful relative to typical node sizes', () => {
    expect(OVERLAP_MIN_PX).toBeLessThan(120)
    expect(MATCH_LOOKAHEAD_PX).toBeGreaterThan(OVERLAP_MIN_PX * 4)
  })
})
