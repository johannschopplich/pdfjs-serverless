import type { Plugin } from 'vitest/config'
import * as fsp from 'node:fs/promises'
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
    async resolveId(source, importer) {
      if (!BYTES_QUERY_PATTERN.test(source) || !importer)
        return
      const resolvedFixture = await this.resolve(source.replace(/[?#].*$/, ''), importer, { skipSelf: true })
      if (resolvedFixture)
        return `${resolvedFixture.id}?bytes`
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
