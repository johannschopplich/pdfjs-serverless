import * as canvas from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
// eslint-disable-next-line antfu/no-import-dist
import { getDocument } from '../dist/index.mjs'
import tilingPatternPdf from './fixtures/tiling-pattern.pdf?bytes'

describe('page.render', () => {
  it('paints a tiling pattern with only the canvas module registered', async () => {
    (globalThis as Record<PropertyKey, unknown>)[Symbol.for('pdfjs-serverless.canvasModule')] = canvas
    const doc = await getDocument({ data: tilingPatternPdf }).promise
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const target = canvas.createCanvas(viewport.width, viewport.height)

    await page.render({ canvas: target as unknown as HTMLCanvasElement, viewport }).promise

    expect(Array.from(target.getContext('2d').getImageData(10, 10, 1, 1).data)).toEqual([255, 0, 0, 255])
  })
})
