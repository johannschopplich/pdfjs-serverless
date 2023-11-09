/* eslint-disable no-console */
import { resolvePDFJS } from '../dist/index.mjs'

const { getDocument } = await resolvePDFJS()
const data = Deno.readFileSync('fixtures/sample.pdf')
const doc = await getDocument(data).promise

console.log(await doc.getMetadata())

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i)
  const textContent = await page.getTextContent()
  const contents = textContent.items.map(item => (item as any).str).join(' ')
  console.log(contents)
}
