import './mocks.mjs'
import './polyfills.mjs'
// Inlines the worker under `globalThis.pdfjsWorker`, where the patched loader finds it.
import 'pdfjs-dist/build/pdf.worker.mjs'

export * from 'pdfjs-dist/build/pdf.mjs'

export async function resolvePDFJS() {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
  return pdfjs
}
