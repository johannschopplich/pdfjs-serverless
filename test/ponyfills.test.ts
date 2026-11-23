import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import samplePdf from './fixtures/sample.pdf?bytes'

describe('ponyfills', () => {
  const builtins = [
    [Uint8Array, 'fromBase64'],
    [Uint8Array.prototype, 'toBase64'],
    [Uint8Array.prototype, 'toHex'],
    [Math, 'sumPrecise'],
  ] as const
  const descriptors = builtins.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key))
  const bytes = new Uint8Array([0, 251, 255, 254, 104, 105])
  let ponyfills: {
    fromBase64: (string: string) => Uint8Array
    toBase64: (bytes: Uint8Array) => string
    toHex: (bytes: Uint8Array) => string
    sumPrecise: (items: number[]) => number
  }

  // A file of its own, so the modules first evaluate here, after the built-ins
  // are gone, and the fallbacks run instead of the natives.
  beforeAll(async () => {
    for (const [target, key] of builtins)
      Reflect.deleteProperty(target, key)
    // @ts-expect-error: The module has no declarations.
    ponyfills = await import('../src/ponyfills.mjs')
  })

  afterAll(() => {
    builtins.forEach(([target, key], index) => {
      if (descriptors[index])
        Object.defineProperty(target, key, descriptors[index])
    })
  })

  it('toBase64 encodes [0, 251, 255, 254, 104, 105] as APv//mhp', () => {
    expect(ponyfills.toBase64(bytes)).toBe('APv//mhp')
  })

  it('fromBase64 decodes APv//mhp to [0, 251, 255, 254, 104, 105]', () => {
    expect(ponyfills.fromBase64('APv//mhp')).toEqual(bytes)
  })

  it('toHex encodes [0, 251, 255, 254, 104, 105] as 00fbfffe6869', () => {
    expect(ponyfills.toHex(bytes)).toBe('00fbfffe6869')
  })

  it('sumPrecise sums [1, 2.5, 3] to 6.5', () => {
    expect(ponyfills.sumPrecise([1, 2.5, 3])).toBe(6.5)
  })

  it('importing the bundle leaves Uint8Array.fromBase64, Uint8Array.prototype.toBase64, Uint8Array.prototype.toHex and Math.sumPrecise unset', async () => {
    await import('../dist/index.mjs')

    expect(builtins.map(([target, key]) => Object.hasOwn(target, key))).toEqual([false, false, false, false])
  })

  // PDF.js fingerprints every document through `toHex`.
  it.each([
    [
      'sample.pdf',
      samplePdf,
      ['f7d77b3d22b9f92829d49ff5d78b8f28', null],
    ],
    [
      'sample.pdf with a changed second ID',
      withSecondID(samplePdf, '00112233445566778899AABBCCDDEEFF'),
      ['f7d77b3d22b9f92829d49ff5d78b8f28', '00112233445566778899aabbccddeeff'],
    ],
  ] as const)('getDocument fingerprints %s as %j', async (_name, data, fingerprints) => {
    const { getDocument } = await import('../dist/index.mjs')

    const doc = await getDocument({ data }).promise
    expect(doc.fingerprints).toEqual(fingerprints)
  })

  it('decompressSignature restores the outlines compressSignature encoded', async () => {
    const { SignatureExtractor } = await import('../dist/index.mjs')
    const signature = {
      outlines: [
        new Float32Array([0, 0, 10, 5, 20, 0]),
      ],
      areContours: false,
      thickness: 2,
      width: 30,
      height: 10,
    }

    // PDF.js encodes signatures through `toBase64` and decodes them through `fromBase64`.
    const compressedSignature = await SignatureExtractor.compressSignature(signature)
    expect(await SignatureExtractor.decompressSignature(compressedSignature)).toEqual(signature)
  })
})

/** Overwrites the second trailer ID in place, so the cross-reference offsets stay valid. */
function withSecondID(pdf: Uint8Array, hexID: string): Uint8Array {
  const copy = pdf.slice()
  const text = new TextDecoder('latin1').decode(copy)
  const idStart = text.indexOf('<', text.indexOf('>', text.indexOf('/ID')))
  copy.set(new TextEncoder().encode(hexID), idStart + 1)
  return copy
}
