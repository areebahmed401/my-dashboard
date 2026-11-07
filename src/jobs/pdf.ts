import { toHtml } from './markdown'

const PRINT_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { padding: 16mm; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.4; color: #111; }
h1 { font-size: 20pt; line-height: 1.2; margin: 0 0 4pt; }
h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.08em; margin: 12pt 0 5pt; padding-bottom: 2pt; border-bottom: 0.5pt solid #999; break-after: avoid; }
h3 { font-size: 10.5pt; font-weight: 700; margin: 8pt 0 1pt; break-after: avoid; }
h3 + p:has(> em:only-child) { color: #555; margin-top: 0; }
p { margin: 0 0 5pt; }
ul, ol { margin: 2pt 0 5pt; padding-left: 14pt; }
li { margin: 0 0 1.5pt; }
hr { border: 0; border-top: 0.5pt solid #999; margin: 8pt 0; }
a { color: inherit; text-decoration: none; }
a[href]::after { content: none; }
code { font-family: ui-monospace, Consolas, monospace; font-size: 9.5pt; }
li, p { orphans: 2; widows: 2; }
`

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// "Areeb_Ahmed_CV_Acme_Corp": non-alphanumerics collapse to underscores
export function fileTitle(kind: 'CV' | 'Letter', company?: string): string {
  const c = (company ?? '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return c ? `Areeb_Ahmed_${kind}_${c}` : `Areeb_Ahmed_${kind}`
}

// Opens the browser print dialog for the markdown, laid out for A4 ("Save as PDF" there)
export function printDoc(md: string, title: string): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.tabIndex = -1
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'

  const prevTitle = document.title
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    document.title = prevTitle
    iframe.remove()
  }

  iframe.onload = () => {
    const win = iframe.contentWindow
    if (!win) return cleanup()
    // Browsers name the PDF after the printed document or the page that opened the dialog
    document.title = title
    win.addEventListener('afterprint', cleanup)
    window.setTimeout(cleanup, 120_000) // fallback when afterprint never fires
    win.focus()
    win.print()
  }
  iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>${toHtml(md)}</body></html>`
  document.body.appendChild(iframe)
}
