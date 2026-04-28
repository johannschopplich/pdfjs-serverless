if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

if (typeof Promise.try === 'undefined') {
  Promise.try = function (fn, ...args) {
    return new Promise(resolve => resolve(fn(...args)))
  }
}

if (typeof Map.prototype.getOrInsertComputed === 'undefined') {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    value(key, callbackFn) {
      if (this.has(key)) {
        return this.get(key)
      }
      const value = callbackFn(key)
      this.set(key, value)
      return value
    },
    writable: true,
    configurable: true,
  })
}

if (typeof Uint8Array.prototype.toHex === 'undefined') {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Uint8Array.prototype, 'toHex', {
    value() {
      let hex = ''
      for (let i = 0; i < this.length; i++) {
        hex += this[i].toString(16).padStart(2, '0')
      }
      return hex
    },
    writable: true,
    configurable: true,
  })
}

export const polyfills = true
