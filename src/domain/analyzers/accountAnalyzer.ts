import type { AccountAnalysis, InactivityMonths, InstagramAccount, InteractionRecord } from '../models/types'
import { normalizeUsername } from '../utils/username'
import { findNotFollowingBack } from './followBackAnalyzer'
import { aggregateInteractions, getCutoffTimestamp, isDormant } from './interactionAnalyzer'

export function analyzeAccounts(
  following: InstagramAccount[],
  followers: InstagramAccount[],
  interactions: InteractionRecord[],
  inactivityMonths: InactivityMonths,
  now: number,
): AccountAnalysis[] {
  const notFollowingBack = new Set(findNotFollowingBack(following, followers).map(({ username }) => normalizeUsername(username)))
  const interactionSummaries = aggregateInteractions(interactions)
  const cutoff = getCutoffTimestamp(inactivityMonths, now)
  const seen = new Set<string>()

  return following.flatMap((account) => {
    const username = normalizeUsername(account.username)
    if (!username || seen.has(username)) return []
    seen.add(username)
    const summary = interactionSummaries.get(username)
    return [{
      username,
      ...(account.profileUrl ? { profileUrl: account.profileUrl } : {}),
      followsBack: !notFollowingBack.has(username),
      interactionCount: summary?.count ?? 0,
      ...(summary?.lastInteraction !== undefined ? { lastInteraction: summary.lastInteraction } : {}),
      isDormant: isDormant(summary?.lastInteraction, cutoff),
    }]
  })
}

export function getActionableAccounts(accounts: AccountAnalysis[], whitelist: string[]): AccountAnalysis[] {
  const protectedUsernames = new Set(whitelist.map(normalizeUsername))
  return accounts.filter(({ username }) => !protectedUsernames.has(normalizeUsername(username)))
}
