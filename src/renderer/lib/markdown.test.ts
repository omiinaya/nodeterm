// @vitest-environment jsdom
// Sanitized markdown renderer (the dangerouslySetInnerHTML trust boundary). Pin that HTML
// comes back escaped and that a blank source yields empty HTML rather than throwing.
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders markdown to sanitized HTML', () => {
    const html = renderMarkdown('# Title\n\nsome **bold** text')
    expect(html).toContain('<h1>')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('strips script tags from the output (DOMPurify pass)', () => {
    const html = renderMarkdown('hello<script>alert(1)</script>')
    expect(html).not.toContain('<script')
  })

  it('returns empty HTML for a blank source instead of throwing', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(undefined as unknown as string)).toBe('')
  })
})