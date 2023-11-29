export default new Proxy(
  {},
  {
    get(target, prop) {
      return () => {
        throw new Error(`[pdfjs-serverless] path2d-polyfill.${prop} is not implemented`)
      }
    },
  },
)
