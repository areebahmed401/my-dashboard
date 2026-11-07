import { Marked } from 'marked'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const UNSAFE_URL = /^\s*(javascript|vbscript|data):/i

// Raw HTML in the markdown is shown as text, never run; unsafe link targets are dropped
const marked = new Marked({
  async: false,
  gfm: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
  },
  walkTokens(token) {
    if ((token.type === 'link' || token.type === 'image') && UNSAFE_URL.test(token.href)) token.href = ''
  },
})

export function toHtml(md: string): string {
  return marked.parse(md, { async: false })
}
