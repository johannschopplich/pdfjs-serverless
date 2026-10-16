# pdfjs-serverless

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) as a single bundle for edge and serverless runtimes, like Cloudflare Workers. Use it as a drop-in replacement for `pdfjs-dist` to parse PDF documents and extract text content – no extra dependencies needed.

The whole export is about 1.7 MB (minified), ships the complete PDF.js type declarations, and is tested in Node.js 22+, Bun, and Cloudflare Workers.

## Installation

```bash
# pnpm
pnpm add pdfjs-serverless

# npm
npm install pdfjs-serverless
```

## Usage

> [!TIP]
> For common operations, such as extracting text content or images from PDF files, you can use the [`unpdf` package](https://github.com/unjs/unpdf). It is a wrapper around `pdfjs-serverless` and provides a simple API for common use cases.

`pdfjs-serverless` provides the same API as the original PDF.js library. To use any of the PDF.js exports, rename the import to `pdfjs-serverless` instead of `pdfjs-dist`:

```diff
- import { getDocument } from 'pdfjs-dist'
+ import { getDocument } from 'pdfjs-serverless'
```

Here's a full Cloudflare Workers example that accepts a PDF via POST and returns the extracted text as JSON:

```ts
import { getDocument } from 'pdfjs-serverless'

export default {
  async fetch(request) {
    if (request.method !== 'POST')
      return new Response('Method Not Allowed', { status: 405 })

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

Ready-to-run examples for Cloudflare Workers and Pages Functions live in [`examples/`](./examples).

### Rendering Pages

Rendering needs a canvas implementation, which serverless runtimes like Cloudflare Workers lack. In Node.js, hand [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) to the bundle through a well-known global symbol and expose its `Path2D`:

```ts
import { writeFile } from 'node:fs/promises'
import * as canvas from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-serverless'

globalThis[Symbol.for('pdfjs-serverless.canvasModule')] = canvas
globalThis.Path2D ??= canvas.Path2D

const document = await getDocument({ data }).promise
const page = await document.getPage(1)
const viewport = page.getViewport({ scale: 2 })
const target = canvas.createCanvas(viewport.width, viewport.height)

await page.render({ canvas: target, canvasContext: target.getContext('2d'), viewport }).promise
await writeFile('page-1.png', await target.encode('png'))
```

Without a canvas module, rendering throws a descriptive error.

## How It Works

> [!NOTE]
> `pdfjs-serverless` is built from PDF.js v6.4.299. It requires the global `Iterator` constructor (Safari 18.4+); without it, importing the bundle throws.

Heart and soul of this package is the [`rolldown.config.ts`](./rolldown.config.ts) file. It uses [Rolldown](https://rolldown.rs/) to bundle PDF.js into a single file for serverless environments. The key techniques:

- **String replacements** rewrite the environment detection: `isNodeJS` becomes `typeof window === "undefined"`, so serverless runtimes take the Node.js code paths – paradoxical, but it unlocks the right branches. The `@napi-rs/canvas` import is bridged to a global symbol (see [Rendering Pages](#rendering-pages)).
- **Worker inlining** embeds the PDF.js worker directly into the main bundle, since serverless runtimes can't load separate worker files.
- **Mocks and polyfills** provide missing globals: `DOMMatrix`, `navigator` and `FinalizationRegistry` are stubbed in [`src/mocks.mjs`](./src/mocks.mjs); `Promise.try`, `Map.prototype.getOrInsert`, `Uint8Array.prototype.toHex` and friends are polyfilled in [`src/polyfills.mjs`](./src/polyfills.mjs).

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs), a nodeless build of PDF.js v2.

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
