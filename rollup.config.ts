import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import inject from '@rollup/plugin-inject'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import { defineConfig } from 'rollup'
import * as unenv from 'unenv'
import { pdfjsTypes } from './src/rollup/plugins'
import { resolveAliases } from './src/rollup/utils'

const mockDir = fileURLToPath(new URL('src/mocks', import.meta.url))
const env = unenv.env(unenv.nodeless)

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
        'canvas': join(mockDir, 'canvas.mjs'),
        'path2d-polyfill': join(mockDir, 'path2d-polyfill.mjs'),
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
