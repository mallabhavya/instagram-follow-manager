import { normalizeUsername } from './username'

const INSTAGRAM_USERNAME_PATTERN = /^[a-z0-9._]{1,30}$/

/** Returns a canonical Instagram profile URL, or null for an invalid username. */
export function buildInstagramProfileUrl(username: string): string | null {
  const normalized = normalizeUsername(username)
  if (!INSTAGRAM_USERNAME_PATTERN.test(normalized)) return null
  return `https://www.instagram.com/${normalized}/`
}

/** Accepts only an Instagram profile URL for the account's own username. */
export function validateInstagramProfileUrl(profileUrl: string, username: string): string | null {
  const normalized = normalizeUsername(username)
  if (!INSTAGRAM_USERNAME_PATTERN.test(normalized)) return null
  try {
    const parsed = new URL(profileUrl)
    if (parsed.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(parsed.hostname)) return null
    if (parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null
    const pathUsername = parsed.pathname.replace(/^\//, '').replace(/\/$/, '')
    if (normalizeUsername(pathUsername) !== normalized || pathUsername.includes('/')) return null
    return `https://www.instagram.com/${normalized}/`
  } catch {
    return null
  }
}

/** Prefer a validated imported URL, and otherwise build one from the username. */
export function getInstagramProfileUrl(account: { username: string; profileUrl?: string }): string | null {
  if (account.profileUrl) {
    const validated = validateInstagramProfileUrl(account.profileUrl, account.username)
    if (validated) return validated
  }
  return buildInstagramProfileUrl(account.username)
}
