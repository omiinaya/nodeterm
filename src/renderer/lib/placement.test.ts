// Nearest-free-spot placement for new nodes: keeps preferred when clear, searches outward
// otherwise, and never hangs on a pathological canvas (bounded ring).
import { describe, expect, it } from 'vitest'
import { freeSpot } from './placement'

describe('freeSpot', () => {
  it('returns preferred unchanged when it is already clear', () => {
    expect(freeSpot([], { x: 100, y: 100 }, { w: 200, h: 80 })).toEqual({ x: 100, y: 100 })
    const existing = [{ x: 0, y: 0, w: 200, h: 80 }]
    const spot = freeSpot(existing, { x: 500, y: 500 }, { w: 200, h: 80 })
    expect(spot).toEqual({ x: 500, y: 500 }) // far from the existing box
  })

  it('moves to a nearby clear cell when preferred overlaps', () => {
    const existing = [{ x: 100, y: 100, w: 200, h: 80 }]
    const spot = freeSpot(existing, { x: 120, y: 120 }, { w: 200, h: 80 })
    // Must not overlap the existing box (with the default gap).
    const overlaps = spot.x < 100 + 200 + 28 && spot.x + 200 + 28 > 100 && spot.y < 100 + 80 + 28 && spot.y + 80 + 28 > 100
    expect(overlaps).toBe(false)
  })

  it('never returns a spot overlapping the existing box', () => {
    const existing = [{ x: 100, y: 100, w: 10000, h: 10000 }]
    const spot = freeSpot(existing, { x: 100, y: 100 }, { w: 20, h: 20 })
    const overlaps = spot.x < 100 + 10000 + 28 && spot.x + 20 + 28 > 100 && spot.y < 100 + 10000 + 28 && spot.y + 20 + 28 > 100
    expect(overlaps).toBe(false)
  })
})