// This rollup config builds a PDF.js bundle for serverless environments

import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import { defineConfig } from 'rollup'
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
        'await import(/*webpackIgnore: true*/this.workerSrc)': '__pdfjsWorker__',
        // Force setting up fake PDF.js worker.
        '#isWorkerDisabled = false': '#isWorkerDisabled = true',
        // Remove WASM code from the worker.
        'wasmExports = await createWasm': 'wasmExports = {}',
        'if (!this.#modulePromise)': 'if (false)',
        '#instantiateWasm(fallbackCallback, imports, successCallback) {': '#instantiateWasm(fallbackCallback, imports, successCallback) { return;',
        '#getJsModule(fallbackCallback) {': '#getJsModule(fallbackCallback) { return;',
        // Mock the `@napi-rs/canvas` module import from the unused `NodeCanvasFactory` class.
        'require("@napi-rs/canvas")': canvasMock,
      },
    }),
    nodeResolve(),
    pdfjsTypes(),
    // terser({
    //   mangle: {
    //     keep_fnames: true,
    //     keep_classnames: true,
    //   },
    //   format: {
    //     comments: false,
    //   },
    // }),
  ],
})
