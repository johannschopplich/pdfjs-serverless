import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line antfu/no-import-dist
import { getDocument } from '../dist/index.mjs'
import imageDecodersPdf from './fixtures/image-decoders.pdf?bytes'

// Kept apart from `smoke.test.ts`, which imports the image decoders for its
// whole module.
describe('pdfjs-serverless', () => {
  it('skips CCITT and JPEG 2000 images with a warning until pdfjs-serverless/image-decoders is imported', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn')
    // The first document stays open, so PDF.js keeps its decoder state.
    const imagesWithoutDecoders = await decodeImages()

    expect(imagesWithoutDecoders).toEqual([null, null])
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Import "pdfjs-serverless/image-decoders"'))

    await import('../dist/image-decoders.mjs')
    const imagesWithDecoders = await decodeImages()

    expect(imagesWithDecoders.map(image => image?.width)).toEqual([16, 2])
  })
})

async function decodeImages(): Promise<any[]> {
  const doc = await getDocument({ data: imageDecodersPdf.slice() }).promise
  const page = await doc.getPage(1)
  await page.getOperatorList()

  return await Promise.all(
    ['img_p0_1', 'img_p0_2'].map(name => new Promise<any>(resolve => page.objs.get(name, resolve))),
  )
}
