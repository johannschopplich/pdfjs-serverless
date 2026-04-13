// This rollup config builds a PDF.js bundle for serverless environments

import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import { pdfjsTypes } from './src/rollup/plugins'

const canvasMock = `
new Proxy({}, {
  get(target, prop) {
    return () => {
      throw new Error("@napi-rs/canvas is not available in this environment")
    }
  },
})
`
  .replaceAll('\n', '')
  .trim()

export default defineConfig({
  input: 'src/index.mjs',
  output: {
    file: 'dist/index.mjs',
    format: 'esm',
    exports: 'auto',
    inlineDynamicImports: true,
    generatedCode: {
      constBindings: true,
    },
    sourcemap: false,
  },
  plugins: [
    replace({
      delimiters: ['', ''],
      preventAssignment: true,
      values: {
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
      },
    }),
    nodeResolve(),
    pdfjsTypes(),
    esbuild({
      target: 'es2021',
      minify: true,
      keepNames: true,
      legalComments: 'none',
    }),
  ],
})
