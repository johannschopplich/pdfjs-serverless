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

if (
  typeof ReadableStream !== 'undefined'
  && typeof ReadableStream.prototype[Symbol.asyncIterator] === 'undefined'
) {
  const asyncIterator = function ({ preventCancel = false } = {}) {
    const reader = this.getReader()
    let isFinished = false
    let ongoing = Promise.resolve()
    const next = () => {
      if (isFinished)
        return Promise.resolve({ value: undefined, done: true })
      return reader.read().then(
        (result) => {
          if (result.done) {
            isFinished = true
            reader.releaseLock()
          }
          return result
        },
        (error) => {
          isFinished = true
          reader.releaseLock()
          throw error
        },
      )
    }
    const doReturn = (value) => {
      if (isFinished)
        return Promise.resolve({ value, done: true })
      isFinished = true
      if (preventCancel) {
        reader.releaseLock()
        return Promise.resolve({ value, done: true })
      }
      const cancelPromise = reader.cancel(value)
      reader.releaseLock()
      return cancelPromise.then(() => ({ value, done: true }))
    }
    return {
      next() {
        return (ongoing = ongoing.then(next, next))
      },
      return(value) {
        return (ongoing = ongoing.then(() => doReturn(value), () => doReturn(value)))
      },
      [Symbol.asyncIterator]() {
        return this
      },
    }
  }
  for (const key of [Symbol.asyncIterator, 'values']) {
    Object.defineProperty(ReadableStream.prototype, key, {
      value: asyncIterator,
      writable: true,
      configurable: true,
    })
  }
}

export const polyfills = true
