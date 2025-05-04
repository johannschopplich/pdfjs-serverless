import type { Plugin } from 'rollup'
import { writeFile } from 'node:fs/promises'

export function pdfjsTypes(): Plugin {
  return {
    name: 'pdfjs-serverless:types',
    async writeBundle() {
      const typeExports = `
import * as PDFJS from './types/src/pdf'

/**
 * @deprecated Import from \`pdfjs-serverless\` instead.
 * @example
 * import { getDocument } from 'pdfjs-serverless'
 *
 * const buffer = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
 *   .then(res => res.arrayBuffer())
 *
 * const document = await getDocument({
 *   data: new Uint8Array(buffer),
 *   useSystemFonts: true,
 * }).promise
 *
 * console.log(await document.getMetadata())
 */
declare function resolvePDFJS(): Promise<typeof PDFJS>

export { resolvePDFJS }
export * from './types/src/pdf'
`.trimStart()

      await writeFile('dist/index.d.mts', typeExports, 'utf8')
    },
  }
}
