import { defineConfig } from 'rolldown'
import { assertRuntimePatchesFirst, decodersModuleSpecifier, patchPDFJSSource, pdfjsTypes } from './src/rolldown/plugins'

export default defineConfig({
  input: {
    'index': 'src/index.mjs',
    'image-decoders': 'src/image-decoders.mjs',
    'pdfjs-decoders': 'src/decoders/default.mjs',
    'pdfjs-decoders-workerd': 'src/decoders/workerd.mjs',
  },
  external: [decodersModuleSpecifier],
  // The root `"sideEffects"` field marks the sources read here side-effect-free
  // too, which would drop the modules whose only job is to mutate globals. Only
  // an explicit rule outranks the manifest – a blanket `moduleSideEffects: true`
  // does not.
  treeshake: {
    moduleSideEffects: [
      { test: /[\\/]src[\\/](mocks|polyfills|image-decoders)\.mjs$/, sideEffects: true },
    ],
  },
  moduleTypes: {
    '.wasm': 'binary',
  },
  output: {
    dir: 'dist',
    entryFileNames: '[name].mjs',
    chunkFileNames: 'pdfjs-[name].mjs',
    format: 'esm',
    exports: 'auto',
    sourcemap: false,
    // PDF.js reads function and class names at runtime.
    minify: {
      compress: {
        target: 'es2022',
        keepNames: { function: true, class: true },
      },
      mangle: {
        keepNames: { function: true, class: true },
      },
      codegen: {
        legalComments: 'none',
      },
    },
  },
  plugins: [
    patchPDFJSSource(),
    assertRuntimePatchesFirst(),
    pdfjsTypes(),
  ],
})
