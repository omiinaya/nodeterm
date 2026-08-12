/**
 * Match-size guides — the pure "which node, which size, how far" math behind
 * the resize-guide overlay.
 *
 * While a node A is resized, the overlay wants to answer: is there a neighboring
 * node B whose size A is close to, what edge would A's dragged edge land on to
 * equal B's size, and how far away is that edge (in px)? All of it is decided
 * here with plain numbers and no DOM — the repo's spacePan/snapHold pattern:
 * the testable "when/which/how" decisions live in lib, the wiring stays thin.
 *
 * "Adjacent" is deliberately a BAND overlap, not raw distance: B must overlap A
 * on the perpendicular axis by at least OVERLAP_MIN_PX (A and B share a visual
 * row / column), and its size must be within MATCH_LOOKAHEAD_PX of A's, so the
 * guide is always a short, meaningful drag away — never a line drawn across the
 * canvas for a far-away node that merely happens to be the same size.
 */

/** A resizable node A or a candidate B — a minimal, test-friendly rectangle. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** The live gesture NodeResizer reports while a node is dragged to resize. */
export interface ResizeGesture {
  nodeId: string
  /** The node's CURRENT live rectangle (flow coordinates). */
  rect: Rect
  /** The rectangle from the immediately previous resize frame (edge inference). */
  prevRect: Rect
  /** The rectangle the drag STARTED from (axis-movement gate, see MOVEMENT_DEAD_ZONE_PX). */
  startRect: Rect
}

/** The perpendicular edge of A that the user is dragging (per axis). */
export type ActiveEdge = 'left' | 'right' | 'top' | 'bottom'
export type MatchAxis = 'width' | 'height'

/** What the overlay draws for the single best match. */
export interface MatchTarget {
  /** The node whose size A would equal. */
  targetNodeId: string
  /** The axis being matched ('width' or 'height'). */
  axis: MatchAxis
  /** The guide line's flow coordinate — where the dragged edge must reach. */
  targetEdge: number
  /** The dragged edge's current flow coordinate. */
  currentEdge: number
  /** signedDelta = targetEdge - currentEdge, in px (sign = drag direction). */
  signedDelta: number
  /** The perpendicular span the guide straddles (union of A's and B's extents). */
  spanStart: number
  spanEnd: number
}

/** A candidate B supplied for matching — position flattened for easy tests. */
export interface MatchNode {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export const OVERLAP_MIN_PX = 40
export const MATCH_LOOKAHEAD_PX = 240
/**
 * Movement dead-zone for treating an axis as "being resized". Measured against
 * the rect the drag STARTED from, not the previous frame: a bottom-edge drag
 * can carry ±1-2px of width noise per frame, and comparing prev-to-curr made
 * that noise look like an active width resize — the width guide then won (or
 * latched) and the height guide never appeared. An axis only counts as moving
 * once it has really left the start rect by this many px, so a vertical drag
 * with jittered width is a height drag, period.
 */
export const MOVEMENT_DEAD_ZONE_PX = 4
/**
 * Hysteresis dead-zone for the shown target. A corner drag can straddle a width
 * match and a height match, and the cursor jitters by a few px per frame — with
 * no margin, the guide would flip between the vertical and horizontal line every
 * frame near the crossover. The shown target is kept while it is still a valid
 * candidate and not beaten by more than this many px; only a clearly-better
 * target switches the guide.
 */
export const MATCH_SWITCH_MARGIN_PX = 14

function overlapOfRanges(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
}

/**
 * Which edges a (prev, cur) rect pair reveals as moving. A changed x means the
 * LEFT edge was dragged (the right one stayed put), and so on; on the very
 * first frame prev == cur and nothing is reported.
 */
export function movedEdges(
  prev: Rect,
  cur: Rect
): { activeH?: 'left' | 'right'; activeV?: 'top' | 'bottom' } {
  const active: { activeH?: 'left' | 'right'; activeV?: 'top' | 'bottom' } = {}
  if (cur.width !== prev.width) active.activeH = cur.x !== prev.x ? 'left' : 'right'
  if (cur.height !== prev.height) active.activeV = cur.y !== prev.y ? 'top' : 'bottom'
  return active
}

/**
 * The guide a single node B implies for matching A's width, given which edge of
 * A is anchored (the edge opposite the one being dragged).
 */
function widthTarget(rect: Rect, b: MatchNode, anchor: 'left' | 'right'): MatchTarget {
  const currentEdge = anchor === 'left' ? rect.x + rect.width : rect.x
  const targetEdge = anchor === 'left' ? rect.x + b.width : rect.x + rect.width - b.width
  return {
    targetNodeId: b.id,
    axis: 'width',
    targetEdge,
    currentEdge,
    signedDelta: targetEdge - currentEdge,
    spanStart: Math.min(rect.y, b.y),
    spanEnd: Math.max(rect.y + rect.height, b.y + b.height)
  }
}

/** The same, for matching A's height against B's. */
function heightTarget(rect: Rect, b: MatchNode, anchor: 'top' | 'bottom'): MatchTarget {
  const currentEdge = anchor === 'top' ? rect.y + rect.height : rect.y
  const targetEdge = anchor === 'top' ? rect.y + b.height : rect.y + rect.height - b.height
  return {
    targetNodeId: b.id,
    axis: 'height',
    targetEdge,
    currentEdge,
    signedDelta: targetEdge - currentEdge,
    spanStart: Math.min(rect.x, b.x),
    spanEnd: Math.max(rect.x + rect.width, b.x + b.width)
  }
}

/**
 * The "too many neighbors, show ONE" prioritization: smallest |signedDelta|
 * (nearest match) wins; a tie goes to the node whose own center is closest on
 * the perpendicular axis; a final tie breaks on id for determinism.
 */
function bestOf(cands: MatchTarget[], rect: Rect, nodesById: Map<string, MatchNode>): MatchTarget | null {
  if (cands.length === 0) return null
  let best = cands[0]
  for (const c of cands.slice(1)) {
    if (Math.abs(c.signedDelta) < Math.abs(best.signedDelta)) {
      best = c
      continue
    }
    if (Math.abs(c.signedDelta) > Math.abs(best.signedDelta)) continue
    const perpCenter = (t: MatchTarget): number => {
      const b = nodesById.get(t.targetNodeId)!
      return t.axis === 'width'
        ? Math.abs(b.y + b.height / 2 - (rect.y + rect.height / 2))
        : Math.abs(b.x + b.width / 2 - (rect.x + rect.width / 2))
    }
    const cPerp = perpCenter(c)
    const bestPerp = perpCenter(best)
    if (cPerp < bestPerp || (cPerp === bestPerp && c.targetNodeId < best.targetNodeId)) best = c
  }
  return best
}

/**
 * The one match to show for a live resize gesture, or null.
 *
 * Only axes the user is actually resizing are considered (both for a corner
 * drag; both, with the default right/bottom edges, while the first frame is
 * still flat). The active edge from `prevRect` picks the anchor: a left-edge
 * drag keeps the RIGHT edge fixed, so the target edge is derived from it.
 *
 * `current` is the target shown last frame (or null). It acts as a hysteresis
 * latch: while it is still a valid candidate and not beaten by more than
 * MATCH_SWITCH_MARGIN_PX, it keeps showing — a corner drag flickering between
 * the width line and the height line is the failure mode this exists for.
 */
/** The fields the hysteresis latch reads from the target shown last frame. */
export type CurrentMatch = Pick<MatchTarget, 'targetNodeId' | 'axis' | 'signedDelta'>

export function pickMatchTarget(
  gesture: ResizeGesture,
  nodes: MatchNode[],
  current: CurrentMatch | null = null
): MatchTarget | null {
  const { rect, prevRect, startRect, nodeId } = gesture
  const edges = movedEdges(prevRect, rect)
  // An axis counts as "being resized" only when it has really moved away from
  // the drag's start rect (see MOVEMENT_DEAD_ZONE_PX) — NOT when its prev-frame
  // delta is non-zero, because ±1-2px of jitter on the perpendicular axis would
  // otherwise make a bottom-edge drag look like a width drag too.
  const widthMoved = Math.abs(rect.width - startRect.width) >= MOVEMENT_DEAD_ZONE_PX
  const heightMoved = Math.abs(rect.height - startRect.height) >= MOVEMENT_DEAD_ZONE_PX
  const flat = !widthMoved && !heightMoved
  const axes: MatchAxis[] = []
  if (widthMoved || flat) axes.push('width')
  if (heightMoved || flat) axes.push('height')

  const cands: MatchTarget[] = []
  for (const axis of axes) {
    for (const b of nodes) {
      if (b.id === nodeId || b.width <= 0 || b.height <= 0) continue // never match yourself or an unmeasured node
      if (axis === 'width') {
        if (overlapOfRanges(rect.y, rect.y + rect.height, b.y, b.y + b.height) < OVERLAP_MIN_PX) continue
        if (Math.abs(b.width - rect.width) > MATCH_LOOKAHEAD_PX) continue
        const anchor: 'left' | 'right' = edges.activeH === 'left' ? 'right' : 'left'
        cands.push(widthTarget(rect, b, anchor))
      } else {
        if (overlapOfRanges(rect.x, rect.x + rect.width, b.x, b.x + b.width) < OVERLAP_MIN_PX) continue
        if (Math.abs(b.height - rect.height) > MATCH_LOOKAHEAD_PX) continue
        const anchor: 'top' | 'bottom' = edges.activeV === 'top' ? 'bottom' : 'top'
        cands.push(heightTarget(rect, b, anchor))
      }
    }
  }
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const best = bestOf(cands, rect, nodesById)
  if (!best) return null
  if (current) {
    // Hysteresis: keep the previous target while it is still a valid candidate
    // THIS frame and not beaten by more than the switch margin — recomputed so
    // its geometry trails the live drag. Dropping out of the candidates (moved
    // out of band / beyond the lookahead) or falling more than the margin clear
    // the latch and let the clearly-better target take over.
    const latched = cands.find((c) => c.targetNodeId === current.targetNodeId && c.axis === current.axis)
    if (latched && Math.abs(latched.signedDelta) <= Math.abs(best.signedDelta) + MATCH_SWITCH_MARGIN_PX) {
      return latched
    }
  }
  return best
}
