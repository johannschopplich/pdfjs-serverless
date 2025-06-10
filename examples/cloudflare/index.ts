/* eslint-disable antfu/no-import-dist */
import type { PDFDocumentProxy } from '../../dist/index.mjs'
import type { TextItem } from '../../dist/types/src/display/api'

export default {
  async fetch() {
    // Remove this line for production. Only needed to test local PDF.js builds.
    const { getDocument } = await import('../../dist/index.mjs')

    const buffer = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
      .then(res => res.arrayBuffer())
    const document = await getDocument(new Uint8Array(buffer)).promise

    const texts = await Promise.all(
      Array.from({ length: document.numPages }, (_, i) =>
        getPageText(document, i + 1)),
    )

    // Reduce whitespace to single space
    const formattedTexts = texts.map(text => text.replace(/\s+/g, ' ')).join('\n')

    return new Response(formattedTexts, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    })
  },
}

async function getPageText(document: PDFDocumentProxy, pageNumber: number) {
  const page = await document.getPage(pageNumber)
  const content = await page.getTextContent()

  return content.items
    .filter(item => (item as TextItem).str != null)
    .map(item => (item as TextItem).str)
    .join(' ')
}
