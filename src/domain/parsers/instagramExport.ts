import { ParseError, type InstagramAccount } from '../models/types'
import { normalizeUsername } from '../utils/username'

export type JsonObject = Record<string, unknown>

export function asObject(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : undefined
}

export function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

export function recordsFrom(data: unknown, keys: string[], label: string): unknown[] {
  if (Array.isArray(data)) return data
  const root = asObject(data)
  if (!root) throw new ParseError(`${label} JSON must contain an object or an array.`)
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key] as unknown[]
  }
  throw new ParseError(`Could not find a supported ${label} list in this Instagram export file.`)
}

export function accountFromRecord(record: unknown): InstagramAccount | undefined {
  const object = asObject(record)
  if (!object) return undefined

  const stringData = asArray(object.string_list_data) ?? []
  const firstLink = asObject(stringData[0])
  const usernameValue = typeof object.title === 'string' ? object.title : firstLink?.value
  if (typeof usernameValue !== 'string') return undefined
  const username = normalizeUsername(usernameValue)
  if (!username) return undefined

  const profileUrl = typeof firstLink?.href === 'string' && firstLink.href.trim()
    ? firstLink.href.trim()
    : undefined
  return profileUrl ? { username, profileUrl } : { username }
}

export function uniqueAccounts(records: unknown[], label: string): InstagramAccount[] {
  const unique = new Map<string, InstagramAccount>()
  for (const record of records) {
    const account = accountFromRecord(record)
    if (!account) continue
    const previous = unique.get(account.username)
    if (!previous || (!previous.profileUrl && account.profileUrl)) unique.set(account.username, account)
  }
  if (records.length > 0 && unique.size === 0) {
    throw new ParseError(`No usable usernames were found in the ${label} file.`)
  }
  return [...unique.values()]
}

export function timestampInMilliseconds(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined
  // Instagram uses seconds in many activity exports and milliseconds in message exports.
  return value < 1_000_000_000_000 ? value * 1000 : value
}
