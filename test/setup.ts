import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'

const MISSING_API_PATTERN = /is not a function|is not defined|is not a constructor/

let consoleWarnSpy: MockInstance<typeof console.warn>

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, 'warn')
})

afterEach(() => {
  const missingAPIWarnings = consoleWarnSpy.mock.calls
    .map(call => call.join(' '))
    .filter(message => MISSING_API_PATTERN.test(message))

  consoleWarnSpy.mockRestore()
  expect(missingAPIWarnings).toEqual([])
})
