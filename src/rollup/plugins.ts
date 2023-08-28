import { writeFile } from 'node:fs/promises'
import type { Plugin } from 'rollup'

export function pdfjsTypes(): Plugin {
  return {
    name: 'pdfjs-serverless:types',
    async writeBundle() {
      const data = 'export * from \'./types/src/pdf.d.ts\'\n'

      for (const filename of ['index.d.ts', 'index.d.mts'])
        await writeFile(`dist/${filename}`, data, 'utf-8')
    },
  }
}
