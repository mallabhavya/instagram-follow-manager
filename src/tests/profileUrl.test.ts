import { describe, expect, it } from 'vitest'
import { buildInstagramProfileUrl, getInstagramProfileUrl, validateInstagramProfileUrl } from '../domain/utils/profileUrl'

describe('Instagram profile URL helpers', () => {
  it('builds normalized profile links and avoids duplicate slashes', () => {
    expect(buildInstagramProfileUrl('  @Some.User  ')).toBe('https://www.instagram.com/some.user/')
  })

  it('rejects malformed usernames', () => {
    for (const username of ['', '@', 'two words', 'a/b', 'a?b', 'x'.repeat(31)]) {
      expect(buildInstagramProfileUrl(username)).toBeNull()
    }
  })

  it('accepts only HTTPS Instagram URLs for the same username', () => {
    expect(validateInstagramProfileUrl('https://instagram.com/Alice/', 'alice'))
      .toBe('https://www.instagram.com/alice/')
    expect(validateInstagramProfileUrl('https://instagram.com.evil.test/alice', 'alice')).toBeNull()
    expect(validateInstagramProfileUrl('https://instagram.com/bob', 'alice')).toBeNull()
    expect(validateInstagramProfileUrl('http://instagram.com/alice', 'alice')).toBeNull()
    expect(validateInstagramProfileUrl('https://instagram.com/alice?next=evil', 'alice')).toBeNull()
  })

  it('falls back to a generated URL when imported profileUrl is unsafe', () => {
    expect(getInstagramProfileUrl({ username: 'alice', profileUrl: 'https://evil.test/alice' }))
      .toBe('https://www.instagram.com/alice/')
  })
})
