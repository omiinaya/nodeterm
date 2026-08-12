import { create } from 'zustand'
import type { Rect, ResizeGesture } from '../lib/matchSizeGuides'

/**
 * The live node-resize gesture, bridged between the per-node NodeResizer
 * wrappers and the canvas-level guide overlay.
 *
 * Why a store instead of props drilling: the wrapper lives inside each node's
 * own render tree (TerminalNode, EditorNode, ...), while the overlay renders
 * once at the canvas level — the same reason presence/workspace state are
 * stores. The overlay subscribes to `gesture` (re-renders per resize frame,
 * ~60 Hz, i.e. the cost of the drag itself); the wrappers subscribe only to
 * the stable action refs, so publishing never re-renders a node.
 *
 * `prevRect` is kept here so the pure pickMatchTarget() can tell which edge is
 * being dragged (left/top moved = that edge, otherwise right/bottom), and
 * `startRect` records where the drag began so the same pure function can gate
 * axes by real movement (see MOVEMENT_DEAD_ZONE_PX in lib/matchSizeGuides).
 */
interface ResizeGestureState {
  gesture: ResizeGesture | null
  /** A resize drag started on `nodeId` at `rect`. */
  begin(nodeId: string, rect: Rect): void
  /** A resize frame: `rect` is the node's live rectangle (flow coordinates). */
  update(rect: Rect): void
  /** The drag ended (or the canvas blurred) — drop the guide. */
  end(): void
}

export const useResizeGesture = create<ResizeGestureState>((set, get) => ({
  gesture: null,

  begin(nodeId, rect) {
    set({ gesture: { nodeId, rect, prevRect: rect, startRect: rect } })
  },

  update(rect) {
    const g = get().gesture
    if (!g) return // no active gesture (defensive: NodeResizer only fires between start/end)
    set({ gesture: { ...g, rect, prevRect: g.rect } })
  },

  end() {
    set({ gesture: null })
  }
}))
