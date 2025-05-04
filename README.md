# pdfjs-serverless

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) for edge environments, like Cloudflare Workers. It is especially useful for serverless AI applications, where you want to parse PDF documents and extract text content.

This package comes with zero dependencies. The whole export is about 1.4 MB (minified).

## PDF.js Compatibility

> [!NOTE]
> `pdfjs-serverless` is currently built from PDF.js v5.2.133.

## Installation

Run the following command to add `pdfjs-serverless` to your project.

```bash
# pnpm
pnpm add -D pdfjs-serverless

# npm
npm install -D pdfjs-serverless

# yarn
yarn add -D pdfjs-serverless
```

## Usage

> [!TIP]
> For common operations, such as extracting text content or images from PDF files, you can use the [`unpdf` package](https://github.com/unjs/unpdf). It is a wrapper around `pdfjs-serverless` and provides a simple API for common use cases.

`pdfjs-serverless` provides the same API as the original PDF.js library. To use any of the PDF.js exports, rename the import to `pdfjs-serverless` instead of `pdfjs-dist`:

```diff
- import { getDocument } from 'pdfjs-dist'
+ import { getDocument } from 'pdfjs-serverless'
```

## Examples

### 🌩 Cloudflare Workers

```ts
export default {
  async fetch(request) {
    if (request.method !== 'POST')
      return new Response('Method Not Allowed', { status: 405 })

    const { getDocument } = await import('pdfjs-serverless')

    // Get the PDF file from the POST request body as a buffer
    const data = await request.arrayBuffer()

    const document = await getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
    }).promise

    // Get metadata and initialize output object
    const metadata = await document.getMetadata()
    const output = {
      metadata,
      pages: []
    }

    // Iterate through each page and fetch the text content
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i)
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
}
```

### 🦕 Deno

```ts
import { getDocument } from 'https://esm.sh/pdfjs-serverless'

const data = Deno.readFileSync('sample.pdf')
const document = await getDocument({
  data,
  useSystemFonts: true,
}).promise

console.log(await document.getMetadata())

// Iterate through each page and fetch the text content
for (let i = 1; i <= document.numPages; i++) {
  const page = await document.getPage(i)
  const textContent = await page.getTextContent()
  const contents = textContent.items.map(item => item.str).join(' ')
  console.log(contents)
}
```

## How It Works

Heart and soul of this package is the [`rollup.config.ts`](./rollup.config.ts) file. It uses [`rollup`](https://rollupjs.org/) to bundle the PDF.js library into a single file that can be used in serverless environments.

The heavy lifting comes from string replacements of the `PDF.js` library, i.e. removing browser context references and checks such as `typeof window`. Additionally, we enforce Node.js compatibility (may sound paradoxical at first, bear with me), i.e. we mock the `@napi-rs/canvas` module and set the `isNodeJS` flag to `true`.

PDF.js uses a worker to parse PDF documents. This worker is a separate file that is loaded by the main library. For the serverless build, we need to inline the worker code into the main library.

Finally, some mocks are added to the global scope that are not available in serverless environments, such as `FinalizationRegistry` which is not available in Cloudflare Workers.

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs), a nodeless build of PDF.js v2.

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
