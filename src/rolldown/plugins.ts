import type { Plugin } from 'rolldown'
import { writeFile } from 'node:fs/promises'

// PDF.js' unused `NodeCanvasFactory` requires `@napi-rs/canvas`, which is not
// available in serverless environments. Replace the require with a proxy that
// throws a descriptive error should any of its members ever be accessed.
const canvasMock = `
new Proxy({}, {
  get(target, prop) {
    return () => {
      throw new Error("@napi-rs/canvas is not available in this environment")
    }
  },
})
`.trim()

// Raw literal substitutions applied to the PDF.js source before bundling –
// matched verbatim, every occurrence replaced. The worker anchor carries its
// exact multi-line indentation on purpose.
const patches: Record<string, string> = {
  // Mimick Node.js environment.
  'const isNodeJS = typeof': 'const isNodeJS = typeof window === "undefined" // typeof',
  // Force inlining the PDF.js worker.
  'await import(\n      /*webpackIgnore: true*/\n      /*@vite-ignore*/\n      this.workerSrc)': '__pdfjsWorker__',
  // Force setting up fake PDF.js worker.
  '#isWorkerDisabled = false': '#isWorkerDisabled = true',
  // Remove WASM code from the worker.
  'wasmExports = await createWasm': 'wasmExports = {}',
  'if (!this.#modulePromise)': 'if (false)',
  '#instantiateWasm(fallbackCallback, imports, successCallback) {': '#instantiateWasm(fallbackCallback, imports, successCallback) { return;',
  '#getJsModule(fallbackCallback) {': '#getJsModule(fallbackCallback) { return;',
  // Mock the `@napi-rs/canvas` module import from the unused `NodeCanvasFactory` class.
  'require("@napi-rs/canvas")': canvasMock,
  // Remove the legacy build warning.
  'warn("Please use the `legacy` build in Node.js environments.")': '',
}

/**
 * Applies the PDF.js source patches as raw literal substitutions and asserts
 * that every anchor matched at least once. A missed anchor means the upstream
 * PDF.js source drifted, so the build fails loudly instead of silently
 * shipping an unpatched bundle.
 */
export function patchPDFJSSource(): Plugin {
  const hitCounts = new Map<string, number>(
    Object.keys(patches).map(anchor => [anchor, 0]),
  )

  return {
    name: 'pdfjs-serverless:patch-source',
    transform(code) {
      let patched = code
      let hasChanged = false

      for (const [anchor, replacement] of Object.entries(patches)) {
        const occurrences = code.split(anchor).length - 1
        if (occurrences === 0)
          continue

        hitCounts.set(anchor, hitCounts.get(anchor)! + occurrences)
        patched = patched.replaceAll(anchor, replacement)
        hasChanged = true
      }

      return hasChanged ? { code: patched, map: null } : null
    },
    buildEnd() {
      const missedAnchors = [...hitCounts]
        .filter(([, count]) => count === 0)
        .map(([anchor]) => anchor)

      if (missedAnchors.length > 0) {
        throw new Error(
          `[pdfjs-serverless] The following source anchors never matched, `
          + `so the PDF.js source has likely drifted:\n${
            missedAnchors.map(anchor => `  - ${JSON.stringify(anchor)}`).join('\n')}`,
        )
      }
    },
  }
}

export function pdfjsTypes(): Plugin {
  return {
    name: 'pdfjs-serverless:types',
    async writeBundle() {
      const typeExports = `
import * as PDFJS from './types/src/pdf'

/**
 * @deprecated Import from \`pdfjs-serverless\` instead. Will be removed in v2.
 * @example
 * import { getDocument } from 'pdfjs-serverless'
 *
 * const buffer = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
 *   .then(res => res.arrayBuffer())
 *
 * const document = await getDocument({
 *   data: new Uint8Array(buffer),
 *   useSystemFonts: true,
 * }).promise
 *
 * console.log(await document.getMetadata())
 */
declare function resolvePDFJS(): Promise<typeof PDFJS>

export { resolvePDFJS }
export * from './types/src/pdf'
export type { TextContent, TextItem, TextMarkedContent, TextStyle } from './types/src/display/api'
`.trimStart()

      await writeFile('dist/index.d.mts', typeExports, 'utf8')
    },
  }
}
