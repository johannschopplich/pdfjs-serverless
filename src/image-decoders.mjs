// Hands PDF.js' JBIG2 and OpenJPEG decoders to the bundle, which loads them
// through this global symbol on the first CCITT, JBIG2, or JPEG 2000 image.
globalThis[Symbol.for('pdfjs-serverless.loadImageDecoder')] ??= async (fileName) => {
  const { loadDecoder } = await import('#pdfjs-decoders')
  return await loadDecoder(fileName)
}
