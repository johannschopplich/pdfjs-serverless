# pdfjs-serverless

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) as a bundle for edge and serverless runtimes, like Cloudflare Workers. Use it as a drop-in replacement for `pdfjs-dist` to parse PDF documents and extract text content – no extra dependencies needed.

The main bundle is about 1.7 MB (minified), loads the image decoders on demand, ships the complete PDF.js type declarations, and is tested in Node.js 24+, Bun, and Cloudflare Workers.

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

Swap the import from `pdfjs-dist` to `pdfjs-serverless`:

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

    const data = new Uint8Array(await request.arrayBuffer())
    const document = await getDocument({ data, useSystemFonts: true }).promise

    const pages = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const { items } = await page.getTextContent()
      pages.push({ pageNumber, content: items.map(item => item.str).join(' ') })
    }

    return Response.json({ metadata: await document.getMetadata(), pages })
  },
}
```

A ready-to-run Cloudflare Workers example lives in [`examples/cloudflare`](./examples/cloudflare).

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

Heart and soul of this package is the [`rolldown.config.ts`](./rolldown.config.ts) file. It uses [Rolldown](https://rolldown.rs/) to bundle PDF.js for serverless environments. The key techniques:

- **String replacements** rewrite the environment detection: `isNodeJS` becomes `typeof window === "undefined"`, so serverless runtimes take the Node.js code paths – paradoxical, but it unlocks the right branches. The `@napi-rs/canvas` import is bridged to a global symbol (see [Rendering Pages](#rendering-pages)).
- **Worker inlining** embeds the PDF.js worker directly into the main bundle, since serverless runtimes can't load separate worker files.
- **Bundled image decoders** ship PDF.js' JBIG2 and OpenJPEG decoders, WASM and JS fallback, as lazy chunks, so CCITT, JBIG2, and JPEG 2000 images decode without `pdfjs-dist` or a `wasmUrl`. Where the runtime can't compile WASM, as in Cloudflare Workers, the bundle turns `useWasm` off and the JS decoders take over. Bundlers that resolve the `workerd` condition, like Wrangler, ship only the JS fallbacks.
- **Mocks and polyfills** provide missing globals: `DOMMatrix`, `navigator` and `FinalizationRegistry` are stubbed in [`src/mocks.mjs`](./src/mocks.mjs); `Promise.try`, `Map.prototype.getOrInsert`, `Uint8Array.prototype.toHex` and friends are polyfilled in [`src/polyfills.mjs`](./src/polyfills.mjs).

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs), a nodeless build of PDF.js v2.

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
