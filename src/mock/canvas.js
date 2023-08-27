export const canvas = `
new Proxy({}, {
  get(target, prop) {
    return () => {
      throw new Error(\`\${prop} is not implemented\`)
    }
  }
})
`.trimStart()
