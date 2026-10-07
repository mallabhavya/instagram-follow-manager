import { describe, expect, it } from 'vitest'
import type { AccountAnalysis } from '../domain/models/types'
import {
  filterAndSortAccounts,
  getReviewCounts,
  resetReviewViewState,
  type AccountFilter,
  type AccountSort,
  type AccountViewState,
} from '../popup/utils/accountView'

const accounts: AccountAnalysis[] = [
  { username: 'Alice', followsBack: true, interactionCount: 3, lastInteraction: 500, isDormant: false },
  { username: 'alice_dev', followsBack: false, interactionCount: 2, lastInteraction: 400, isDormant: false },
  { username: 'ALICE123', followsBack: true, interactionCount: 0, isDormant: true },
  { username: 'bob', followsBack: false, interactionCount: 0, isDormant: true },
  { username: 'dev_friend', followsBack: false, interactionCount: 5, lastInteraction: 600, isDormant: true },
]

function view(filters: AccountFilter[] = [], sortBy: AccountSort = 'username_asc', search = ''): AccountViewState {
  return { search, filters: new Set(filters), sortBy }
}

function usernames(result: AccountAnalysis[]): string[] {
  return result.map(({ username }) => username.toLocaleLowerCase('en-US'))
}

describe('filterAndSortAccounts', () => {
  it('searches case-insensitively after trimming whitespace', () => {
    expect(usernames(filterAndSortAccounts(accounts, view([], 'username_asc', ' ALICE '), new Set())))
      .toEqual(['alice', 'alice123', 'alice_dev'])
  })

  it('filters accounts that do not follow back, dormant accounts, and accounts matching both', () => {
    expect(usernames(filterAndSortAccounts(accounts, view(['not_following_back']), new Set())))
      .toEqual(['alice_dev', 'bob', 'dev_friend'])
    expect(usernames(filterAndSortAccounts(accounts, view(['dormant']), new Set())))
      .toEqual(['alice123', 'bob', 'dev_friend'])
    expect(usernames(filterAndSortAccounts(accounts, view(['both']), new Set())))
      .toEqual(['bob', 'dev_friend'])
  })

  it('combines status filters with AND semantics and search', () => {
    const protectedAccounts = new Set(['bob', 'dev_friend'])
    expect(usernames(filterAndSortAccounts(
      accounts,
      view(['dormant', 'protected'], 'username_asc', 'dev'),
      protectedAccounts,
    ))).toEqual(['dev_friend'])
  })

  it('shows protected accounts and preserves their analysis evidence', () => {
    const protectedNames = new Set(['bob'])
    const protectedView = filterAndSortAccounts(accounts, view(['protected']), protectedNames)
    expect(usernames(protectedView)).toEqual(['bob'])
    expect(protectedView[0]).toMatchObject({ followsBack: false, isDormant: true })
    expect(accounts.find(({ username }) => username === 'bob')).toMatchObject({ followsBack: false, isDormant: true })
  })

  it('filters reviewed and not-reviewed accounts and combines the filters', () => {
    const reviewed = new Set(['alice', 'bob'])
    expect(usernames(filterAndSortAccounts(accounts, view(['reviewed']), new Set(), reviewed)))
      .toEqual(['alice', 'bob'])
    expect(usernames(filterAndSortAccounts(accounts, view(['not_reviewed']), new Set(), reviewed)))
      .toEqual(['alice123', 'alice_dev', 'dev_friend'])
    expect(usernames(filterAndSortAccounts(accounts, view(['not_following_back', 'reviewed']), new Set(), reviewed)))
      .toEqual(['bob'])
  })

  it('sorts usernames in either direction', () => {
    expect(usernames(filterAndSortAccounts(accounts, view([], 'username_asc'), new Set())))
      .toEqual(['alice', 'alice123', 'alice_dev', 'bob', 'dev_friend'])
    expect(usernames(filterAndSortAccounts(accounts, view([], 'username_desc'), new Set())))
      .toEqual(['dev_friend', 'bob', 'alice_dev', 'alice123', 'alice'])
  })

  it('sorts dates and interaction counts with missing dates consistently last', () => {
    expect(usernames(filterAndSortAccounts(accounts, view([], 'last_interaction_newest'), new Set())))
      .toEqual(['dev_friend', 'alice', 'alice_dev', 'alice123', 'bob'])
    expect(usernames(filterAndSortAccounts(accounts, view([], 'last_interaction_oldest'), new Set())))
      .toEqual(['alice_dev', 'alice', 'dev_friend', 'alice123', 'bob'])
    expect(usernames(filterAndSortAccounts(accounts, view([], 'interaction_count_high'), new Set())))
      .toEqual(['dev_friend', 'alice', 'alice_dev', 'alice123', 'bob'])
    expect(usernames(filterAndSortAccounts(accounts, view([], 'interaction_count_low'), new Set())))
      .toEqual(['alice123', 'bob', 'alice_dev', 'alice', 'dev_friend'])
  })

  it('does not mutate source accounts or whitelist during filtering', () => {
    const originalAccounts = accounts.slice()
    const whitelist = new Set(['bob'])
    filterAndSortAccounts(accounts, view(['protected']), whitelist)
    expect(accounts).toEqual(originalAccounts)
    expect(whitelist).toEqual(new Set(['bob']))
  })

  it('handles a large local account list in one filtering pass', () => {
    const largeList = Array.from({ length: 5000 }, (_, index): AccountAnalysis => ({
      username: `user${index}`,
      followsBack: index % 2 === 0,
      interactionCount: 0,
      isDormant: true,
    }))
    const result = filterAndSortAccounts(largeList, view(['not_following_back']), new Set())
    expect(result).toHaveLength(2500)
  })
})

describe('getReviewCounts and resetReviewViewState', () => {
  it('calculates overlapping status counts and candidate protection counts', () => {
    expect(getReviewCounts(accounts, new Set(['bob', 'alice']))).toEqual({
      all: 5,
      notFollowingBack: 3,
      dormant: 3,
      both: 2,
      protected: 2,
      reviewed: 0,
      notReviewed: 5,
      candidates: 4,
      protectedCandidates: 1,
      unprotectedCandidates: 3,
    })
  })

  it('resets only view controls, leaving analysis and whitelist untouched', () => {
    const results = accounts.slice()
    const whitelist = new Set(['bob'])
    const initialView = view(['dormant', 'protected'], 'interaction_count_high', 'dev')
    expect(resetReviewViewState()).toEqual({ search: '', filters: new Set(), sortBy: 'username_asc' })
    expect(results).toEqual(accounts)
    expect(whitelist).toEqual(new Set(['bob']))
    expect(initialView.search).toBe('dev')
  })
})
