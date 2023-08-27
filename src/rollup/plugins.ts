import { writeFile } from 'node:fs/promises'
import type { Plugin } from 'rollup'

export function typesPlugin(): Plugin {
  return {
    name: 'pdfjs-serverless:types',
    async writeBundle() {
      await writeFile(
        'dist/index.d.ts',
        'export * from \'./types/src/pdf.d.ts\'\n',
        'utf-8',
      )
    },
  }
}
