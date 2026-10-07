import type { AccountAnalysis } from '../../domain/models/types'
import { normalizeUsername } from '../../domain/utils/username'

export type AccountFilter = 'not_following_back' | 'dormant' | 'both' | 'protected' | 'reviewed' | 'not_reviewed'
export type AccountSort =
  | 'username_asc'
  | 'username_desc'
  | 'last_interaction_newest'
  | 'last_interaction_oldest'
  | 'interaction_count_high'
  | 'interaction_count_low'

export interface AccountViewState {
  search: string
  filters: Set<AccountFilter>
  sortBy: AccountSort
}

export interface ReviewCounts {
  all: number
  notFollowingBack: number
  dormant: number
  both: number
  protected: number
  reviewed: number
  notReviewed: number
  candidates: number
  protectedCandidates: number
  unprotectedCandidates: number
}

export function resetReviewViewState(): AccountViewState {
  return { search: '', filters: new Set(), sortBy: 'username_asc' }
}

export function getReviewCounts(
  accounts: AccountAnalysis[],
  whitelist: ReadonlySet<string>,
  reviewed: ReadonlySet<string> = new Set(),
): ReviewCounts {
  const protectedUsernames = new Set([...whitelist].map(normalizeUsername))
  let notFollowingBack = 0
  let dormant = 0
  let both = 0
  let protectedCount = 0
  let reviewedCount = 0
  let candidates = 0
  let protectedCandidates = 0

  for (const account of accounts) {
    const isProtected = protectedUsernames.has(normalizeUsername(account.username))
    const isCandidate = !account.followsBack || account.isDormant
    if (!account.followsBack) notFollowingBack += 1
    if (account.isDormant) dormant += 1
    if (!account.followsBack && account.isDormant) both += 1
    if (isProtected) protectedCount += 1
    if (reviewed.has(normalizeUsername(account.username))) reviewedCount += 1
    // A review candidate has either signal; protection is counted separately from the evidence.
    if (isCandidate) {
      candidates += 1
      if (isProtected) protectedCandidates += 1
    }
  }

  return {
    all: accounts.length,
    notFollowingBack,
    dormant,
    both,
    protected: protectedCount,
    reviewed: reviewedCount,
    notReviewed: accounts.length - reviewedCount,
    candidates,
    protectedCandidates,
    unprotectedCandidates: candidates - protectedCandidates,
  }
}

function compareUsername(left: AccountAnalysis, right: AccountAnalysis): number {
  const leftUsername = normalizeUsername(left.username)
  const rightUsername = normalizeUsername(right.username)
  if (leftUsername < rightUsername) return -1
  if (leftUsername > rightUsername) return 1
  return 0
}

function compareForSort(sortBy: AccountSort, left: AccountAnalysis, right: AccountAnalysis): number {
  switch (sortBy) {
    case 'username_asc':
      return compareUsername(left, right)
    case 'username_desc':
      return compareUsername(right, left)
    case 'last_interaction_newest':
    case 'last_interaction_oldest': {
      const leftDate = left.lastInteraction
      const rightDate = right.lastInteraction
      // Accounts with no recorded date always sort after dated accounts.
      if (leftDate === undefined && rightDate !== undefined) return 1
      if (leftDate !== undefined && rightDate === undefined) return -1
      if (leftDate === undefined || rightDate === undefined) return compareUsername(left, right)
      const dateOrder = sortBy === 'last_interaction_newest' ? rightDate - leftDate : leftDate - rightDate
      return dateOrder || compareUsername(left, right)
    }
    case 'interaction_count_high':
      return right.interactionCount - left.interactionCount || compareUsername(left, right)
    case 'interaction_count_low':
      return left.interactionCount - right.interactionCount || compareUsername(left, right)
  }
}

export function filterAndSortAccounts(
  accounts: AccountAnalysis[],
  view: AccountViewState,
  whitelist: ReadonlySet<string>,
  reviewed: ReadonlySet<string> = new Set(),
): AccountAnalysis[] {
  const query = view.search.trim().toLocaleLowerCase('en-US')
  const protectedUsernames = new Set([...whitelist].map(normalizeUsername))

  return accounts
    .filter((account) => {
      const username = normalizeUsername(account.username)
      if (query && !username.includes(query)) return false
      const isProtected = protectedUsernames.has(username)
      if (view.filters.has('not_following_back') && account.followsBack) return false
      if (view.filters.has('dormant') && !account.isDormant) return false
      if (view.filters.has('both') && (account.followsBack || !account.isDormant)) return false
      if (view.filters.has('protected') && !isProtected) return false
      const isReviewed = reviewed.has(username)
      if (view.filters.has('reviewed') && !isReviewed) return false
      if (view.filters.has('not_reviewed') && isReviewed) return false
      return true
    })
    .sort((left, right) => compareForSort(view.sortBy, left, right))
}
