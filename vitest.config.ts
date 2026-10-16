import type { Plugin } from 'vitest/config'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [inlineBytes()],
        test: {
          name: 'node',
          setupFiles: ['./test/setup.ts'],
        },
      },
      {
        plugins: [
          inlineBytes(),
          cloudflareTest({
            wrangler: {
              configPath: './test/wrangler.jsonc',
            },
          }),
        ],
        test: {
          name: 'workerd',
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
})

const BYTES_QUERY_PATTERN = /[?&]bytes(?:&|$)/

function inlineBytes(): Plugin {
  return {
    name: 'inline-bytes',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!BYTES_QUERY_PATTERN.test(source) || !importer)
        return
      const file = source.replace(/[?#].*$/, '')
      const resolved = path.resolve(path.dirname(importer.replace(/[?#].*$/, '')), file)
      return `${resolved}?bytes`
    },
    async load(id) {
      if (!BYTES_QUERY_PATTERN.test(id))
        return
      const file = id.replace(/[?#].*$/, '')
      const base64 = (await fsp.readFile(file)).toString('base64')
      return `export default Uint8Array.from(atob("${base64}"), c => c.charCodeAt(0));`
    },
  }
}
