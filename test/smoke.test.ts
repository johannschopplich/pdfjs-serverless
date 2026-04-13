import { describe, expect, it } from 'vitest'
// eslint-disable-next-line antfu/no-import-dist
import { getDocument } from '../dist/index.mjs'
import samplePdf from './fixtures/sample.pdf?bytes'

describe('pdfjs-serverless', () => {
  it('loads and parses a PDF in workerd', async () => {
    const doc = await getDocument(samplePdf).promise
    expect(doc.numPages).toBe(1)

    const page = await doc.getPage(1)
    const textContent = await page.getTextContent()
    expect(textContent.items.length).toBeGreaterThan(0)
  })
})
