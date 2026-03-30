import { describe, it, expect } from 'vitest'
import { generateSlug } from './slug.js'

describe('generateSlug', () => {
  it('generates a slug from a description', () => {
    expect(generateSlug('Add dark mode toggle to the application settings'))
      .toBe('add-dark-mode-toggle-application')
  })

  it('strips punctuation and special characters', () => {
    expect(generateSlug('Fix bug #123: user login fails!')).toBe('fix-bug-123-user-login')
  })

  it('removes stop words', () => {
    expect(generateSlug('the quick brown fox jumps over the lazy dog'))
      .toBe('quick-brown-fox-jumps-over')
  })

  it('limits to 5 words', () => {
    expect(generateSlug('one two three four five six seven eight'))
      .toBe('one-two-three-four-five')
  })

  it('truncates to 40 chars at word boundary', () => {
    const slug = generateSlug('implement extraordinarily sophisticated authentication authorization')
    expect(slug.length).toBeLessThanOrEqual(40)
    expect(slug).not.toMatch(/-$/)
  })

  it('handles descriptions that are only stop words', () => {
    expect(generateSlug('the a an')).toBe('task')
  })

  it('handles empty description', () => {
    expect(generateSlug('')).toBe('task')
  })

  it('keeps numbers, strips punctuation', () => {
    expect(generateSlug('V2 migration: update 3 API endpoints'))
      .toBe('v2-migration-update-3-api')
  })
})
