import { NodeResizer, useNodeId, type NodeResizerProps } from '@xyflow/react'
import { useResizeGesture } from '../state/resizeGesture'

/**
 * `<NodeResizer>` wired into the match-size guide bus.
 *
 * Every resizable node kind renders one of these instead of a bare NodeResizer;
 * the extra work is three callbacks that publish the live gesture
 * ({nodeId, rect, prevRect}) to the resize-gesture store. Publishing is free
 * for the node: the store selectors here return stable action refs, so a node
 * never re-renders because of the gesture traffic — only the canvas-level
 * MatchSizeGuides overlay (which subscribes to `gesture`) does.
 *
 * nodeId comes from the same context NodeResizer itself uses, so this works
 * whether or not the caller passes an explicit `nodeId` prop. The gesture is
 * only active between onResizeStart and onResizeEnd; the guide vanishes the
 * instant the handle is released.
 */
export function MatchSizeNodeResizer(props: NodeResizerProps): JSX.Element {
  const contextNodeId = useNodeId()
  const nodeId = props.nodeId ?? contextNodeId ?? ''
  const begin = useResizeGesture((s) => s.begin)
  const update = useResizeGesture((s) => s.update)
  const end = useResizeGesture((s) => s.end)

  return (
    <NodeResizer
      {...props}
      onResizeStart={(event, params) => {
        props.onResizeStart?.(event, params)
        begin(nodeId, { x: params.x, y: params.y, width: params.width, height: params.height })
      }}
      onResize={(event, params) => {
        props.onResize?.(event, params)
        update({ x: params.x, y: params.y, width: params.width, height: params.height })
      }}
      onResizeEnd={(event, params) => {
        props.onResizeEnd?.(event, params)
        end()
      }}
    />
  )
}
