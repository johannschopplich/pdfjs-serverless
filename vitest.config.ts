import type { Plugin } from 'vitest/config'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          inlineBytes(),
          cloudflareTest({
            wrangler: {
              configPath: './wrangler.jsonc',
            },
          }),
        ],
        test: {
          name: 'workerd',
          setupFiles: ['./test/setup.ts'],
        },
      },
      {
        plugins: [inlineBytes()],
        test: {
          name: 'node',
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
})

const BYTES_RE = /[?&]bytes\b/

function inlineBytes(): Plugin {
  return {
    name: 'vite-plugin-bytes',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!BYTES_RE.test(source) || !importer)
        return
      const file = source.replace(/[?#].*$/, '')
      const resolved = path.resolve(path.dirname(importer.replace(/[?#].*$/, '')), file)
      return `${resolved}?bytes`
    },
    async load(id) {
      if (!BYTES_RE.test(id))
        return
      const file = id.replace(/[?#].*$/, '')
      const base64 = (await fsp.readFile(file)).toString('base64')
      return `export default Uint8Array.from(atob("${base64}"), c => c.charCodeAt(0));`
    },
  }
}
