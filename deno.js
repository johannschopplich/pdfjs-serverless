import { getDocument } from './dist/index.mjs'

const data = Deno.readFileSync('./dummy.pdf')
const doc = await getDocument({
  data,
  useWorkerFetch: false,
  isEvalSupported: false,
}).promise

console.log(await doc.getMetadata())
