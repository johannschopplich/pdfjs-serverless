import { defineConfig } from 'rollup'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import inject from '@rollup/plugin-inject'
import * as unenv from 'unenv'
import { resolveAliases } from './src/rollup/utils'
import { pdfjsTypes } from './src/rollup/plugins'

const env = unenv.env(unenv.nodeless)

export default defineConfig({
  input: 'src/index.mjs',
  output: {
    file: 'dist/index.mjs',
    format: 'esm',
    exports: 'named',
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
        // Remove all references to the DOM
        'typeof window': '"undefined"',
        'typeof document': '"undefined"',
        // Imitate the Node.js environment, unenv will take care of the rest
        'const isNodeJS = typeof': 'const isNodeJS = true // typeof',
        // Replace the `isNodeJS` check to tree-shake some code
        '_util.isNodeJS': 'true',
        // Inline the PDF.js worker
        'eval("require")(this.workerSrc)': 'require("pdfjs-dist/build/pdf.worker.js")',
      },
    }),
    alias({
      entries: resolveAliases({
        canvas: 'src/mock/canvas.mjs',
        ...env.alias,
      }),
    }),
    nodeResolve({
      // `module` is intentionally not supported because of externals
      mainFields: ['main'],
    }),
    commonjs({
      esmExternals: id => !id.startsWith('unenv/'),
      requireReturnsDefault: 'auto',
    }),
    inject(env.inject),
    pdfjsTypes(),
  ],
})
