import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const bytesRE = /[?&]bytes\b/

export default defineConfig({
  plugins: [
    {
      name: 'vite-plugin-bytes',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!bytesRE.test(source) || !importer)
          return
        const file = source.replace(/[?#].*$/, '')
        const resolved = path.resolve(path.dirname(importer.replace(/[?#].*$/, '')), file)
        return `${resolved}?bytes`
      },
      async load(id) {
        if (!bytesRE.test(id))
          return
        const file = id.replace(/[?#].*$/, '')
        const base64 = (await fsp.readFile(file)).toString('base64')
        return `export default Uint8Array.from(atob("${base64}"), c => c.charCodeAt(0));`
      },
    },
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.jsonc',
      },
    }),
  ],
})
