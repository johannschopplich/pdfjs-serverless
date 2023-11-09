# pdfjs-serverless

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) for serverless environments, like Deno Deploy and Cloudflare Workers with zero dependencies. The whole export is about 1.4 MB (minified).

## PDF.js Compatibility

> [!NOTE]
> This package is currently using PDF.js v4.0.189.

## Installation

Run the following command to add `pdfjs-serverless` to your project.

```bash
# pnpm
pnpm add pdfjs-serverless

# npm
npm install pdfjs-serverless

# yarn
yarn add pdfjs-serverless
```

## Usage

Since PDF.js v4, the library migrated to ESM. Which is great. However, it also uses a top-level await, which is not supported by Cloudflare workers yet. Therefore, we have to wrap all named exports in a function that resolves the PDF.js library:

```ts
declare function resolvePDFJS(): Promise<typeof PDFJS>
```

So, instead of importing the named exports directly:

```ts
// This will NOT work at the moment
import { getDocument } from 'pdfjs-serverless'
```

We have to use the `resolvePDFJS` function to get the named exports:

```ts
import { resolvePDFJS } from 'pdfjs-serverless'

const { getDocument } = await resolvePDFJS()
```

> [!NOTE]
> Once Cloudflare workers support top-level await, we can remove this wrapper and re-export all PDF.js named exports directly again.

### 🦕 Deno

```ts
import { resolvePDFJS } from 'https://esm.sh/pdfjs-serverless'

// Initialize PDF.js
const { getDocument } = await resolvePDFJS()
const data = Deno.readFileSync('sample.pdf')
const doc = await getDocument({
  data,
  useSystemFonts: true,
}).promise

console.log(await doc.getMetadata())

// Iterate through each page and fetch the text content
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i)
  const textContent = await page.getTextContent()
  const contents = textContent.items.map(item => item.str).join(' ')
  console.log(contents)
}
```

### 🌩 Cloudflare Workers

```ts
import { resolvePDFJS } from 'pdfjs-serverless'

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 })

  // Get the PDF file from the POST request body as a buffer
  const data = await request.arrayBuffer()

  // Initialize PDF.js
  const { getDocument } = await resolvePDFJS()
  const doc = await getDocument({
    data,
    useSystemFonts: true,
  }).promise

  // Get metadata and initialize output object
  const metadata = await doc.getMetadata()
  const output = {
    metadata,
    pages: []
  }

  // Iterate through each page and fetch the text content
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const textContent = await page.getTextContent()
    const contents = textContent.items.map(item => item.str).join(' ')

    // Add page content to output
    output.pages.push({
      pageNumber: i,
      content: contents
    })
  }

  // Return the results as JSON
  return new Response(JSON.stringify(output), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

## How It Works

First, some string replacements of the `PDF.js` library is necessary, i.e. removing browser context references and checks like `typeof window`. Additionally, we enforce Node.js compatibility (might sound paradox at first, bear with me), i.e. mocking the `canvas` module and setting the `isNodeJS` flag to `true`.

PDF.js uses a worker to parse and work with PDF documents. This worker is a separate file that is loaded by the main library. For the serverless build, we need to inline the worker code into the main library.

To achieve the final nodeless build, [`unenv`](https://github.com/unjs/unenv) does the heavy lifting by converting Node.js specific code to be platform-agnostic. This ensures that Node.js built-in modules like `fs` are mocked.

See the [`rollup.config.ts`](./rollup.config.ts) file for more information.

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs), a nodeless build of PDF.js v2.

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
