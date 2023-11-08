import { defineConfig } from 'rollup'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import inject from '@rollup/plugin-inject'
import terser from '@rollup/plugin-terser'
import * as unenv from 'unenv'
import { resolveAliases } from './src/rollup/utils'
import { pdfjsTypes } from './src/rollup/plugins'

const env = unenv.env(unenv.nodeless)

export default defineConfig({
  input: 'src/index.mjs',
  output: {
    file: 'dist/index.mjs',
    format: 'esm',
    // exports: 'named',
    intro: '',
    outro: '',
    inlineDynamicImports: true,
    generatedCode: {
      constBindings: true,
    },
    sourcemap: false,
  },
  external: env.external,
  plugins: [
    replace({
      delimiters: ['', ''],
      preventAssignment: true,
      values: {
        // Disable the `window` check (for requestAnimationFrame)
        'typeof window': '"undefined"',
        // Imitate the Node.js environment for all serverless environments, unenv will
        // take care of the remaining Node.js polyfills. Keep support for browsers.
        'const isNodeJS = typeof': 'const isNodeJS = typeof document === "undefined" // typeof',
        // Force inlining the PDF.js worker
        'await import(/* webpackIgnore: true */ this.workerSrc)': '__pdfjsWorker__',
        // Tree-shake client worker initialization logic
        '!PDFWorkerUtil.isWorkerDisabled && !PDFWorker.#mainThreadWorkerMessageHandler': 'false',
      },
    }),
    alias({
      entries: resolveAliases({
        'canvas': 'src/mock/canvas.mjs',
        'path2d-polyfill': 'src/pdfjs-serverless/mock/path2d-polyfill.mjs',
        ...env.alias,
      }),
    }),
    nodeResolve(),
    commonjs({
      esmExternals: id => !id.startsWith('unenv/'),
      requireReturnsDefault: 'auto',
    }),
    inject(env.inject),
    pdfjsTypes(),
    terser({
      mangle: {
        keep_fnames: true,
        keep_classnames: true,
      },
      format: {
        comments: false,
      },
    }),
  ],
})
