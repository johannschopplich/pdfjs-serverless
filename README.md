# pdfjs-serverless

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) as a bundle for edge and serverless runtimes, like Cloudflare Workers. Use it as a drop-in replacement for `pdfjs-dist` to parse PDF documents and extract text content – no extra dependencies needed.

The main bundle is about 1.7 MB (minified) and leaves the image decoders to an [opt-in import](#decode-ccitt-jbig2-and-jpeg-2000-images). It ships the complete PDF.js type declarations and is tested in Node.js 24+, Bun, and Cloudflare Workers.

## Installation

```bash
# pnpm
pnpm add pdfjs-serverless

# npm
npm install pdfjs-serverless
```

## Quick Start

> [!TIP]
> For common tasks, such as extracting text or images, use [`unpdf`](https://github.com/unjs/unpdf). It ships its own serverless build of PDF.js and wraps it in functions like `extractText` and `extractImages`.

Swap the import from `pdfjs-dist` to `pdfjs-serverless`:

```diff
- import { getDocument } from 'pdfjs-dist'
+ import { getDocument } from 'pdfjs-serverless'
```

This Cloudflare Worker accepts a PDF via POST and returns the extracted text as JSON:

```ts
import { getDocument } from 'pdfjs-serverless'

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST')
      return new Response('Method Not Allowed', { status: 405 })

    const data = new Uint8Array(await request.arrayBuffer())
    const document = await getDocument({ data, useSystemFonts: true }).promise

    const pages = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const { items } = await page.getTextContent()
      pages.push({ pageNumber, content: items.map(item => 'str' in item ? item.str : '').join(' ') })
    }

    return Response.json({ metadata: await document.getMetadata(), pages })
  },
}
```

A ready-to-run Cloudflare Workers example lives in [`examples/cloudflare`](./examples/cloudflare).

## Use Cases

### Render Pages

Rendering needs a canvas implementation, which serverless runtimes like Cloudflare Workers lack. In Node.js, hand [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) to the bundle through a well-known global symbol and expose its `DOMMatrix` and `Path2D`:

```ts
import { readFile, writeFile } from 'node:fs/promises'
import * as canvas from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-serverless'
import 'pdfjs-serverless/image-decoders'

const globals = globalThis as Record<PropertyKey, unknown>
globals[Symbol.for('pdfjs-serverless.canvasModule')] = canvas
globals.DOMMatrix = canvas.DOMMatrix // Replaces the bundle's stub, so not `??=`
globals.Path2D ??= canvas.Path2D

const data = new Uint8Array(await readFile('document.pdf'))
const document = await getDocument({ data }).promise
const page = await document.getPage(1)
const viewport = page.getViewport({ scale: 2 })
const target = canvas.createCanvas(viewport.width, viewport.height)

await page.render({ canvas: target as unknown as HTMLCanvasElement, viewport }).promise
await writeFile('page-1.png', await target.encode('png'))
```

Without a canvas module, rendering a page with an image or a pattern throws a descriptive error.

### Decode CCITT, JBIG2, and JPEG 2000 Images

Rendering a page or reading its image data needs PDF.js' JBIG2 and OpenJPEG decoders for images in these formats. Text extraction doesn't, so your bundle leaves them out unless you import them once:

```ts
import 'pdfjs-serverless/image-decoders'
```

The decoders then load on the first such image. Without the import, PDF.js skips these images and warns that the import is missing.

### Load CMaps and Standard Fonts

The bundle ships neither the CMaps nor the standard fonts of PDF.js. Without CMaps, text in a CJK font that relies on a predefined character map comes back empty. Point `cMapUrl` at the `cmaps` directory of `pdfjs-dist`:

```ts
const document = await getDocument({
  data,
  cMapUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/cmaps/',
  cMapPacked: true,
  useWorkerFetch: true,
}).promise
```

`useWorkerFetch: true` makes PDF.js fetch the URL. Without it, PDF.js reads `cMapUrl` as a file path, which works in Node.js with a local directory such as `node_modules/pdfjs-dist/cmaps/`. For rendering, `standardFontDataUrl` takes the `standard_fonts` directory in the same way, in place of `useSystemFonts: true`.

## How It Works

> [!NOTE]
> `pdfjs-serverless` is built from PDF.js v6.4.299. It requires the global `Iterator` constructor (Safari 18.4+); without it, importing the bundle throws.

Heart and soul of this package is the [`rolldown.config.ts`](./rolldown.config.ts) file. It uses [Rolldown](https://rolldown.rs/) to bundle PDF.js for serverless environments. The key techniques:

- **String replacements** in [`src/rolldown/plugins.ts`](./src/rolldown/plugins.ts) rewrite the environment detection: `isNodeJS` becomes `typeof window === "undefined"`, so serverless runtimes take the Node.js code paths – paradoxical, but it unlocks the right branches. The `@napi-rs/canvas` import is bridged to a global symbol (see [Render Pages](#render-pages)).
- **Worker inlining** embeds the PDF.js worker directly into the main bundle, since serverless runtimes can't load separate worker files.
- **Bundled image decoders** ship PDF.js' JBIG2 and OpenJPEG decoders, WASM and JS fallback, as lazy chunks behind [`pdfjs-serverless/image-decoders`](#decode-ccitt-jbig2-and-jpeg-2000-images), so CCITT, JBIG2, and JPEG 2000 images decode without `pdfjs-dist` or a `wasmUrl`. Where the runtime can't compile WASM, as in Cloudflare Workers, the bundle turns `useWasm` off and the JS decoders take over. Bundlers that resolve the `workerd` condition, like Wrangler, ship only the JS fallbacks.
- **Mocks and polyfills** provide missing globals: `DOMMatrix`, `navigator` and `FinalizationRegistry` are stubbed in [`src/mocks.mjs`](./src/mocks.mjs); `Promise.try`, `Map.prototype.getOrInsert`, `Uint8Array.prototype.toHex` and friends are polyfilled in [`src/polyfills.mjs`](./src/polyfills.mjs).

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs), a nodeless build of PDF.js v2.

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
