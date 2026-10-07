import type { InstagramAccount } from '../models/types'
import { normalizeUsername } from '../utils/username'

export function findNotFollowingBack(
  following: InstagramAccount[],
  followers: InstagramAccount[],
): InstagramAccount[] {
  // Set membership keeps the comparison O(n + m), instead of scanning followers for every account.
  const followerUsernames = new Set(followers.map(({ username }) => normalizeUsername(username)))
  return following.filter(({ username }) => !followerUsernames.has(normalizeUsername(username)))
}
