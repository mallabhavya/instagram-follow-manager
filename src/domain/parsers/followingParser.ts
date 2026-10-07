import type { InstagramAccount } from '../models/types'
import { recordsFrom, uniqueAccounts } from './instagramExport'

/** Supports following.json wrapper objects with relationships_following or following, and raw arrays. */
export function parseFollowing(data: unknown): InstagramAccount[] {
  return uniqueAccounts(recordsFrom(data, ['relationships_following', 'following'], 'following'), 'following')
}
