# pdfjs-serverless

A nodeless/serverless redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) for serverless enviroments, like Deno Deploy and Cloudflare Workers with zero dependencies.

## How It Works

First, some string replacements of the `PDF.js` library is necessary, i.e. removing browser context references. Additionally, we enforce Node.js compatibility (might sound paradox at first, bear with me), i.e. mocking the `canvas` module and setting the `isNodeJS` flag to `true`.

To achieve a nodeless build, [`unenv`](https://github.com/unjs/unenv) does the heavy lifting by converting Node.js specific code to be platform-agnostic.

See the [`rollup.config.ts`](./rollup.config.ts) file for more information.

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

## Example Usage

### 🦕 Deno

```ts
import { getDocument } from 'https://esm.sh/pdfjs-serverless'

const data = Deno.readFileSync('./dummy.pdf')
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
