import { useMemo, useRef } from 'react'
import { ViewportPortal, useReactFlow, useStore } from '@xyflow/react'
import { pickMatchTarget, type MatchNode, type MatchTarget } from '../lib/matchSizeGuides'
import { useResizeGesture } from '../state/resizeGesture'
import { useSettings } from '../state/settings'

/** The badge hovers this far off the dragged edge (screen px), toward the target. */
const BADGE_GAP_PX = 12
/** Rough half-width of the pill, so `margin-left` can center it on the edge. */
const BADGE_HALF_WIDTH_PX = 22

/**
 * The match-size guide: one rule at the edge a resize must reach to equal a
 * neighbor's size, plus a "N px to drag" badge at the dragged edge.
 *
 * Rendered INSIDE <ReactFlow> via ViewportPortal — the same mechanism PresenceLayer
 * uses for peer cursors — so positions are flow coordinates and the viewport
 * maps them to screen. Only this overlay subscribes to the gesture store; it
 * re-renders per resize frame (~60 Hz), which is the drag itself, and renders
 * null the rest of the time. `enabled` is read live so flipping the setting
 * mid-drag hides the guide immediately.
 */
export function MatchSizeGuides(): JSX.Element | null {
  const enabled = useSettings((s) => s.settings.matchSizeGuides)
  const gesture = useResizeGesture((s) => s.gesture)
  const zoom = useStore((s) => s.transform[2])
  const { getNodes } = useReactFlow()
  // The target shown last frame, fed back as the hysteresis latch (see
  // pickMatchTarget). Reset when the resized node changes, so a fresh gesture
  // always starts from a free pick.
  const prevTargetRef = useRef<MatchTarget | null>(null)
  const prevNodeRef = useRef<string | null>(null)

  const target = useMemo(() => {
    if (!enabled || !gesture) return null
    if (prevNodeRef.current !== gesture.nodeId) {
      prevTargetRef.current = null
      prevNodeRef.current = gesture.nodeId
    }
    const nodes: MatchNode[] = getNodes().map((n) => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      width: n.measured?.width ?? 0,
      height: n.measured?.height ?? 0
    }))
    const next = pickMatchTarget(gesture, nodes, prevTargetRef.current)
    prevTargetRef.current = next
    return next
  }, [enabled, gesture, getNodes])

  if (!target) return null

  const vertical = target.axis === 'width' // a width match draws a VERTICAL guide line
  const length = Math.max(1, target.spanEnd - target.spanStart)
  const px = Math.abs(Math.round(target.signedDelta))
  const direction = Math.sign(target.signedDelta)
  const arrow = direction > 0 ? (vertical ? '→' : '↓') : direction < 0 ? (vertical ? '←' : '↑') : '='
  const anchor =
    vertical
      ? // hover the badge just off the dragged edge (a/left|b/right), at the band's vertical center
        { x: target.currentEdge, y: (target.spanStart + target.spanEnd) / 2 }
      : { x: (target.spanStart + target.spanEnd) / 2, y: target.currentEdge }

  return (
    <ViewportPortal>
      {/* Guide line: the edge the drag must reach to equal the match's size. */}
      <div
        className="match-guide-line"
        style={
          vertical
            ? { transform: `translate(${target.targetEdge}px, ${target.spanStart}px)`, width: 1, height: length }
            : { transform: `translate(${target.spanStart}px, ${target.targetEdge}px)`, width: length, height: 1 }
        }
      />
      {/* "How far" badge at the dragged edge, counter-scaled by 1/zoom so it stays
          the same screen size however far in or out the canvas is zoomed. */}
      <div
        className="match-guide-badge"
        style={{
          transform: `translate(${anchor.x}px, ${anchor.y}px) scale(${1 / zoom})`,
          marginLeft: `calc(-${BADGE_HALF_WIDTH_PX}px + ${direction * BADGE_GAP_PX}px)`,
          marginTop: '-9px'
        }}
      >
        <span>
          {arrow} {px}px
        </span>
      </div>
    </ViewportPortal>
  )
}