/* eslint-disable import/first */
/* eslint-disable no-unused-vars */
// These imports are needed in order to let unenv provide
// shims before variable initialization.
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import url from 'node:url'

// Polyfill for `Promise.withResolvers`
Promise.withResolvers ??= function () {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Inline the PDF.js worker to avoid having to load it from a separate file.
import * as __pdfjsWorker__ from 'pdfjs-dist/build/pdf.worker.mjs'

// Wrap PDF.js exports to circumvent Cloudflare's top-level await limitation.
// eslint-disable-next-line perfectionist/sort-imports
import { __main__ } from 'pdfjs-dist/build/pdf.mjs'

export function resolvePDFJS() {
  return __main__()
}
