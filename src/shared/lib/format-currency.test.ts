import { describe, expect, it } from 'vitest'
import { formatVnd } from './format-currency'

describe('formatVnd', () => {
  it('formats an integer amount as Vietnamese dong', () => {
    expect(formatVnd(150_000)).toMatch(/150[.\s]000/)
    expect(formatVnd(150_000)).toContain('₫')
  })
})
