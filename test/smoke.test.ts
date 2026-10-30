import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line antfu/no-import-dist
import { getDocument } from '../dist/index.mjs'
import imageDecodersPdf from './fixtures/image-decoders.pdf?bytes'
import samplePdf from './fixtures/sample.pdf?bytes'
// eslint-disable-next-line antfu/no-import-dist
import '../dist/image-decoders.mjs'

describe('pdfjs-serverless', () => {
  it('loads and parses a PDF', async () => {
    const doc = await getDocument({ data: samplePdf }).promise
    expect(doc.numPages).toBe(1)

    const page = await doc.getPage(1)
    const { items } = await page.getTextContent()
    expect(items[0]).toHaveProperty('str', 'Dummy PDF file')
  })

  it('decodes CCITT and JPEG 2000 images without warnings', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn')
    const doc = await getDocument({ data: imageDecodersPdf }).promise
    const page = await doc.getPage(1)
    await page.getOperatorList()
    const images = await Promise.all(
      ['img_p0_1', 'img_p0_2'].map(name => new Promise<any>(resolve => page.objs.get(name, resolve))),
    )

    expect(consoleWarnSpy).not.toHaveBeenCalled()
    expect(images.map(({ width, height, data }) => ({ width, height, data: Array.from(data) }))).toEqual([
      // One bit per pixel: black on the left in the top two rows, on the right in the bottom two.
      { width: 16, height: 4, data: [0x00, 0xFF, 0x00, 0xFF, 0xFF, 0x00, 0xFF, 0x00] },
      // RGBA: red, blue.
      { width: 2, height: 1, data: [255, 0, 0, 255, 0, 0, 255, 255] },
    ])
  })

  it.runIf(globalThis.navigator?.userAgent === 'Cloudflare-Workers')('leaves jbig2.wasm and openjpeg.wasm out of #pdfjs-decoders under the workerd condition', async () => {
    // @ts-expect-error: Dynamic import from package build.
    const { loadDecoder } = await import('#pdfjs-decoders')

    await expect(loadDecoder('jbig2.wasm')).rejects.toThrow('No bundled decoder for jbig2.wasm')
    await expect(loadDecoder('openjpeg.wasm')).rejects.toThrow('No bundled decoder for openjpeg.wasm')
  })
})
