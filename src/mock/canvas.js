export const canvas = `
new Proxy({}, {
  get(target, prop) {
    return () => undefined
  }
})
`.trimStart()
