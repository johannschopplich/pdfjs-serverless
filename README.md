# pdfjs-serverless

> **Note**
>
> Work in progress.

A redistribution of Mozilla's [PDF.js](https://github.com/mozilla/pdf.js) for serverless enviroments, like Deno Deploy and Cloudflare Workers.

## How It Works

To achieve the custom library build, [`unenv`](https://github.com/unjs/unenv) does the heavy lifting by converting Node.js specific code to be platform agnostic.

Some necessary string replacements are done to make the library work in a serverless environment. See the [`rollup.config.js`](./rollup.config.js) file for more information.

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

### Deno

```ts
import { getDocument } from 'https://esm.sh/pdfjs-serverless'

const data = Deno.readFileSync('./dummy.pdf')
const doc = await getDocument(data).promise

console.log(await doc.getMetadata())
```

### In Combination With `unpdf`

The following example shows how to use `pdfjs-serverless` with [`unpdf`](https://github.com/johannschopplich/unpdf):

```ts
import { defineUnPDFConfig, extractPDFText } from 'unpdf'

// Use the serverless version of PDF.js
defineUnPDFConfig({
  pdfjs: () => import('pdfjs-serverless')
})

// Now, you can use the other methods provided by unpdf

// Fetch a PDF file from the web
const pdf = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
  .then(res => res.arrayBuffer())

// Pass the PDF buffer to the relevant method
const { totalPages, text } = await extractPDFText(
  new Uint8Array(pdf), { mergePages: true }
)
```

## Inspiration

- [`pdf.mjs`](https://github.com/bru02/pdf.mjs)

## License

[MIT](./LICENSE) License © 2023-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
