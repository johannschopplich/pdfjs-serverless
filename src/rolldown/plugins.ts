import type { OutputBundle, OutputChunk, Plugin } from 'rolldown'
import { cp, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// PDF.js' built-in `NodeCanvasFactory` requires `@napi-rs/canvas`, which is
// not available in serverless environments. Bridge the require to a module
// provided through a well-known global symbol, so consumers can opt into
// rendering with an API-compatible canvas implementation; without one, keep
// the descriptive error.
const canvasMock = `
new Proxy({}, {
  get(target, prop) {
    const canvasModule = globalThis[Symbol.for("pdfjs-serverless.canvasModule")]
    if (canvasModule)
      return canvasModule[prop]
    return () => {
      throw new Error("@napi-rs/canvas is not available in this environment")
    }
  },
})
`.trim()

const decodersModuleSpecifier = JSON.stringify(join(import.meta.dirname, '../decoders.mjs'))

// Anchors match verbatim, so multi-line anchors carry the exact indentation of
// the PDF.js source.
const patches: Record<string, string> = {
  // Take the Node.js code paths wherever `window` is missing.
  'const isNodeJS = typeof': 'const isNodeJS = typeof window === "undefined" // typeof',
  // Take the inlined worker from its global instead of importing it at runtime.
  'await import(\n      /*webpackIgnore: true*/\n      /*@vite-ignore*/\n      this.workerSrc)': 'globalThis.pdfjsWorker',
  // Force setting up fake PDF.js worker.
  '#isWorkerDisabled = false': '#isWorkerDisabled = true',
  // Load the image decoders and their JS fallbacks from the bundle instead of
  // `wasmUrl`.
  /* eslint-disable no-template-curly-in-string -- The anchors match template literals in the PDF.js source. */
  'if (WasmImage.#useWorkerFetch) {\n          this.#buffer = await fetchBinaryData(`${WasmImage.#wasmUrl}${this._filename}`);\n        } else {\n          this.#buffer = await WasmImage.#handler.sendWithPromise("FetchBinaryData", {\n            kind: "wasmUrl",\n            filename: this._filename\n          });\n        }': `this.#buffer = await (await import(${decodersModuleSpecifier})).loadDecoder(this._filename);`,
  'await import(\n      /*webpackIgnore: true*/\n      /*@vite-ignore*/\n      `${WasmImage.#wasmUrl}${this._noWasmFilename}`)': `{ default: await (await import(${decodersModuleSpecifier})).loadDecoder(this._noWasmFilename) }`,
  /* eslint-enable no-template-curly-in-string */
  // Where the runtime forbids compiling WASM, as workerd does, PDF.js would warn
  // once per image decoder before falling back to its JS decoders. The probe
  // compiles the smallest valid module: the magic number and version 1.
  'const useWasm = src.useWasm !== false;': 'const useWasm = src.useWasm !== false && (() => { try { new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00])); return true } catch { return false } })();',
  'require("@napi-rs/canvas")': canvasMock,
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

/**
 * Asserts that the modules patching the runtime are bundled and evaluated
 * before the first PDF.js module. They export nothing, so tree-shaking drops
 * them as soon as the side-effect rule stops matching, and their position in
 * the entry file is a convention nothing else enforces. Either failure leaves
 * PDF.js reaching for globals that are not there, so the build fails loudly
 * instead.
 */
export function assertRuntimePatchesFirst(): Plugin {
  const runtimePatches = ['mocks.mjs', 'polyfills.mjs']

  return {
    name: 'pdfjs-serverless:assert-runtime-patches-first',
    generateBundle(_options, bundle) {
      // Rolldown lists a chunk's modules in evaluation order, and the chunks
      // a chunk imports statically evaluate before it. The lazy decoder chunks
      // hold `pdfjs-dist` modules too, but never evaluate eagerly.
      const entryChunk = Object.values(bundle).find(output => output.type === 'chunk' && output.isEntry) as OutputChunk
      const moduleIds = collectStaticChunks(entryChunk, bundle)
        .flatMap(chunk => chunk.moduleIds)
        .map(id => id.replaceAll('\\', '/'))
      const firstPDFJSIndex = moduleIds.findIndex(id => id.includes('/pdfjs-dist/'))

      for (const filename of runtimePatches) {
        const index = moduleIds.findIndex(id => id.endsWith(`/src/${filename}`))

        if (index === -1) {
          throw new Error(
            `[pdfjs-serverless] ${filename} was tree-shaken out of the bundle, `
            + `so PDF.js runs against an unpatched runtime.`,
          )
        }

        if (firstPDFJSIndex !== -1 && index > firstPDFJSIndex) {
          throw new Error(
            `[pdfjs-serverless] ${filename} is evaluated after PDF.js, `
            + `so its globals land too late.`,
          )
        }
      }
    },
  }
}

export function pdfjsTypes(): Plugin {
  return {
    name: 'pdfjs-serverless:types',
    async writeBundle() {
      await cp('node_modules/pdfjs-dist/types', 'dist/types', { recursive: true })
      await explicitImportExtensions('dist/types')

      // The explicit `.js` extensions keep the declarations resolvable under
      // `moduleResolution: "nodenext"`.
      const typeExports = `
import * as PDFJS from './types/src/pdf.js'

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
export * from './types/src/pdf.js'
export type { TextContent, TextItem, TextMarkedContent, TextStyle } from './types/src/display/api.js'
`.trimStart()

      await writeFile('dist/index.d.mts', typeExports, 'utf8')
    },
  }
}

/**
 * Collects a chunk and every chunk it reaches through static imports, in
 * evaluation order. External imports have no chunk in the bundle and are
 * skipped.
 */
function collectStaticChunks(entryChunk: OutputChunk, bundle: OutputBundle): OutputChunk[] {
  const visitedChunks = new Set<OutputChunk>()
  const orderedChunks: OutputChunk[] = []

  const visit = (chunk: OutputChunk) => {
    visitedChunks.add(chunk)
    for (const fileName of chunk.imports) {
      const importedChunk = bundle[fileName]
      if (importedChunk?.type === 'chunk' && !visitedChunks.has(importedChunk))
        visit(importedChunk)
    }
    orderedChunks.push(chunk)
  }

  visit(entryChunk)
  return orderedChunks
}

/**
 * Appends the missing `.js` extensions to the relative imports of the
 * declarations copied from `pdfjs-dist`. They are generated from JSDoc and
 * partly reference sibling modules without extensions, which resolve to error
 * types under `moduleResolution: "nodenext"`.
 */
async function explicitImportExtensions(directory: string) {
  const filenames = await readdir(directory, { recursive: true })

  for (const filename of filenames) {
    if (!filename.endsWith('.d.ts'))
      continue

    const filePath = `${directory}/${filename}`
    const content = await readFile(filePath, 'utf8')
    const patchedContent = content.replace(
      /(from\s+|import\()(["'])(\.[^"']+?)(?:\.js)?\2/g,
      (_, importPrefix, quote, specifier) => `${importPrefix}${quote}${specifier}.js${quote}`,
    )

    if (patchedContent !== content)
      await writeFile(filePath, patchedContent, 'utf8')
  }
}
