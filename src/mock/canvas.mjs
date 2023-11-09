export default new Proxy(
  {},
  {
    get(target, prop) {
      return () => {
        throw new Error(`[pdfjs-serverless] canvas.${prop} is not implemented`)
      }
    },
  },
)
