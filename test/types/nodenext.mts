// Type-checks the shipped declarations as a `nodenext` consumer would – needs `build` first.
import type { PDFDocumentProxy, TextItem } from 'pdfjs-serverless'
import { getDocument } from 'pdfjs-serverless'

export async function consumeBuiltDeclarations(data: Uint8Array): Promise<string[]> {
  const pdf: PDFDocumentProxy = await getDocument({ data }).promise
  const { items } = await (await pdf.getPage(1)).getTextContent()

  return items.filter((item): item is TextItem => 'str' in item).map(item => item.str)
}
