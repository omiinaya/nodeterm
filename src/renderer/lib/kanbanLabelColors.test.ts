// Dark-UI label palette: swatch lookup (garbage -> default) and the picker-order options
// derived from the kanban color name set.
import { describe, expect, it } from 'vitest'
import { KANBAN_LABEL_COLORS } from './kanban'
import { LABEL_COLOR_OPTIONS, labelSwatch } from './kanbanLabelColors'

describe('labelSwatch', () => {
  it('returns the swatch for a known color', () => {
    expect(labelSwatch('red').title).toBe('Red')
    expect(labelSwatch('blue').title).toBe('Blue')
  })

  it('maps any garbage value to the default swatch', () => {
    expect(labelSwatch('not-a-color')).toEqual(labelSwatch('default'))
    expect(labelSwatch(undefined).title).toBe('Default')
  })
})

describe('LABEL_COLOR_OPTIONS', () => {
  it('produces one option per known label color, in picker order, each carrying its swatch', () => {
    expect(LABEL_COLOR_OPTIONS.map((o) => o.color)).toEqual(KANBAN_LABEL_COLORS)
    for (const opt of LABEL_COLOR_OPTIONS) {
      expect(opt.title).toBeTruthy()
      expect(opt.bg).toBeTruthy()
      expect(opt.fg).toBeTruthy()
    }
  })
})