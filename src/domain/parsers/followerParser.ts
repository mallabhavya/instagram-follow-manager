import type { InstagramAccount } from '../models/types'
import { recordsFrom, uniqueAccounts } from './instagramExport'

/** Supports followers_1.json arrays and wrapper objects with relationships_followers or followers. */
export function parseFollowers(data: unknown): InstagramAccount[] {
  return uniqueAccounts(recordsFrom(data, ['relationships_followers', 'followers', 'followers_1'], 'followers'), 'followers')
}
