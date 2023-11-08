# pdfjs-serverless

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) for serverless environments, like Deno Deploy and Cloudflare Workers with zero dependencies. All named exports of the `PDF.js` library are available at roughly 1.4 MB (minified).

## PDF.js Compatibility

> [!NOTE]
> This package is currently using PDF.js v4.0.189.

If you run into issues with the current version, please open an [issue](https://github.com/johannschopplich/pdfjs-serverless/issues/new/choose) or even better, open a [pull request](https://github.com/johannschopplich/pdfjs-serverless/compare).

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

## How It Works

First, some string replacements of the `PDF.js` library is necessary, i.e. removing browser context references and checks like `typeof window`. Additionally, we enforce Node.js compatibility (might sound paradox at first, bear with me), i.e. mocking the `canvas` module and setting the `isNodeJS` flag to `true`.

PDF.js uses a worker to parse and work with PDF documents. This worker is a separate file that is loaded by the main library. For the serverless build, we need to inline the worker code into the main library.

To achieve the final nodeless build, [`unenv`](https://github.com/unjs/unenv) does the heavy lifting by converting Node.js specific code to be platform-agnostic. This ensures that Node.js built-in modules like `fs` are mocked.

See the [`rollup.config.ts`](./rollup.config.ts) file for more information.

## Example Usage

### 🦕 Deno

```ts
import { getDocument } from 'https://esm.sh/pdfjs-serverless'

const data = Deno.readFileSync('dummy.pdf')
const doc = await getDocument(data).promise

console.log(await doc.getMetadata())

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i)
  const textContent = await page.getTextContent()
  const contents = textContent.items.map(item => item.str).join(' ')
  console.log(contents)
}
```

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs), a nodeless build of PDF.js v2.

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
