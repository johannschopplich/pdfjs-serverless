import { writeFile } from 'node:fs/promises'
import { defineConfig } from 'rollup'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import inject from '@rollup/plugin-inject'
import * as unenv from 'unenv'

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
    sourcemapExcludeSources: true,
    sourcemapIgnoreList: relativePath => relativePath.includes('node_modules'),
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
        'exports.isNodeJS = isNodeJS': 'exports.isNodeJS = true',
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
    // Create `index.d.ts` file
    {
      name: 'pdfjs-serverless:types',
      async writeBundle() {
        await writeFile(
          'dist/index.d.ts',
          'export * from \'./types/src/pdf.d.ts\'\n',
          'utf-8',
        )
      },
    },
  ],
})

function resolveAliases(_aliases: Record<string, string>) {
  // Sort aliases from specific to general (ie. fs/promises before fs)
  const aliases = Object.fromEntries(
    Object.entries(_aliases).sort(
      ([a], [b]) =>
        b.split('/').length - a.split('/').length || b.length - a.length,
    ),
  )

  // Resolve alias values in relation to each other
  for (const key in aliases) {
    for (const alias in aliases) {
      if (aliases[key].startsWith(alias))
        aliases[key] = aliases[alias] + aliases[key].slice(alias.length)
    }
  }

  return aliases
}
