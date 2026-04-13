# pdfjs-serverless

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) as a single bundle for edge and serverless runtimes, like Cloudflare Workers. Use it as a drop-in replacement for `pdfjs-dist` to parse PDF documents and extract text content – no extra dependencies needed.

The whole export is about 1.6 MB (minified).

## Installation

Run the following command to add `pdfjs-serverless` to your project.

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

## How It Works

> [!NOTE]
> `pdfjs-serverless` is currently built from PDF.js v5.6.205.

Heart and soul of this package is the [`rollup.config.ts`](./rollup.config.ts) file. It uses [Rollup](https://rollupjs.org/) to bundle PDF.js into a single file for serverless environments. The key techniques:

- **String replacements** strip browser-specific references (e.g. `typeof window`) from the PDF.js source.
- **Node.js compatibility** is enforced by mocking `@napi-rs/canvas` and setting `isNodeJS` to `true` – paradoxical, but it unlocks the right code paths.
- **Worker inlining** embeds the PDF.js worker directly into the main bundle, since serverless runtimes can't load separate worker files.
- **Global polyfills** provide missing APIs like `FinalizationRegistry` (unavailable in Cloudflare Workers).

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs), a nodeless build of PDF.js v2.

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
