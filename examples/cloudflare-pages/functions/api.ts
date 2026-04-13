import type { PDFDocumentProxy, TextItem } from 'pdfjs-serverless'
import { getDocument } from 'pdfjs-serverless'

export async function onRequest(): Promise<Response> {
  const buffer = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
    .then(res => res.arrayBuffer())
  const document = await getDocument(new Uint8Array(buffer)).promise

  const texts = await Promise.all(
    Array.from({ length: document.numPages }, (_, i) =>
      getPageText(document, i + 1)),
  )

  const formattedTexts = texts.map(text => text.replace(/\s+/g, ' ')).join('\n')

  return new Response(formattedTexts, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store',
    },
  })
}

async function getPageText(document: PDFDocumentProxy, pageNumber: number) {
  const page = await document.getPage(pageNumber)
  const content = await page.getTextContent()

  return content.items
    .filter(item => (item as TextItem).str != null)
    .map(item => (item as TextItem).str)
    .join(' ')
}
