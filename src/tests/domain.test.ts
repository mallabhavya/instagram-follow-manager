import { describe, expect, it } from 'vitest'
import followersFixture from './fixtures/followers.json'
import followingFixture from './fixtures/following.json'
import interactionsFixture from './fixtures/interactions.json'
import { analyzeAccounts, getActionableAccounts } from '../domain/analyzers/accountAnalyzer'
import { findNotFollowingBack } from '../domain/analyzers/followBackAnalyzer'
import { aggregateInteractions, getCutoffTimestamp, isDormant } from '../domain/analyzers/interactionAnalyzer'
import { ParseError, type InstagramAccount, type InteractionRecord } from '../domain/models/types'
import { parseFollowers } from '../domain/parsers/followerParser'
import { parseFollowing } from '../domain/parsers/followingParser'
import { parseComments, parseLikes, parseMessages, parseStoryLikes } from '../domain/parsers/interactionParser'
import { normalizeUsername } from '../domain/utils/username'

const account = (username: string): InstagramAccount => ({ username })
const now = Date.UTC(2026, 0, 1)
const cutoff = getCutoffTimestamp(6, now)

describe('normalizeUsername', () => {
  it.each([
    ['Bhavya', 'bhavya'],
    [' BHAVYA ', 'bhavya'],
    ['bhavya', 'bhavya'],
    ['@User123', 'user123'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeUsername(input)).toBe(expected)
  })
})

describe('Instagram account parsers', () => {
  it('parses, normalizes, deduplicates, and skips malformed follower records', () => {
    expect(parseFollowers(followersFixture)).toEqual([
      { username: 'alice', profileUrl: 'https://www.instagram.com/alice/' },
      { username: 'charlie' },
    ])
  })

  it('parses the relationships_following wrapper and tolerates malformed records', () => {
    const withMalformedRecord = {
      ...followingFixture,
      relationships_following: [
        ...followingFixture.relationships_following,
        { title: 'ALICE', string_list_data: [] },
        null,
        { string_list_data: [] },
      ],
    }
    expect(parseFollowing(withMalformedRecord).map(({ username }) => username)).toEqual(['alice', 'bob', 'charlie'])
  })

  it('supports valid empty exports and rejects unsupported or wholly malformed input', () => {
    expect(parseFollowers({ relationships_followers: [] })).toEqual([])
    expect(() => parseFollowers('{not json}')).toThrow(ParseError)
    expect(() => parseFollowing({ unrelated: [] })).toThrow(ParseError)
    expect(() => parseFollowers([{ string_list_data: [{ timestamp: 1 }] }])).toThrow(ParseError)
  })
})

describe('findNotFollowingBack', () => {
  it('uses normalized follower membership to find only B', () => {
    expect(findNotFollowingBack(['A', 'B', 'C'].map(account), ['a', 'c'].map(account)))
      .toEqual([account('B')])
  })

  it('handles empty following and empty followers', () => {
    expect(findNotFollowingBack([], [account('friend')])).toEqual([])
    expect(findNotFollowingBack([account('friend')], [])).toEqual([account('friend')])
  })

  it('handles complete and zero overlap', () => {
    expect(findNotFollowingBack([account('a'), account('b')], [account('A'), account('B')])).toEqual([])
    expect(findNotFollowingBack([account('a'), account('b')], [])).toEqual([account('a'), account('b')])
  })
})

describe('interaction parsers', () => {
  it('normalizes supported like, comment, and story-like exports to milliseconds', () => {
    const timestamp = 1_700_000_000_000
    expect(parseLikes({ likes_media_likes: [{ title: ' Alice ', string_list_data: [{ timestamp: 1_700_000_000 }] }] }))
      .toEqual([{ username: 'alice', type: 'like', timestamp }])
    expect(parseComments({ comments_media_comments: [{ title: 'Bob', string_list_data: [{ timestamp: timestamp + 1 }] }] }))
      .toEqual([{ username: 'bob', type: 'comment', timestamp: timestamp + 1 }])
    expect(parseStoryLikes({ story_likes: [{ title: 'Charlie', string_list_data: [{ timestamp }] }] }))
      .toEqual([{ username: 'charlie', type: 'story_like', timestamp }])
  })

  it('records one DM interaction per participant username, regardless of message count', () => {
    expect(parseMessages({
      participants: [{ name: ' Alice ' }, { name: 'Bob' }, { name: 'ALICE' }],
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1_700_000_000_000 },
        { sender_name: 'Bob', timestamp_ms: 1_700_000_000_100 },
        { sender_name: 'Alice', timestamp_ms: 1_700_000_000_200 },
      ],
    })).toEqual([
      { username: 'alice', type: 'dm', timestamp: 1_700_000_000_200 },
      { username: 'bob', type: 'dm', timestamp: 1_700_000_000_200 },
    ])
  })

  it('rejects unsupported interaction structures with a useful error', () => {
    expect(() => parseLikes({ unsupported: [] })).toThrow(ParseError)
    expect(() => parseMessages({ participants: [] })).toThrow(ParseError)
  })
})

describe('interaction analysis', () => {
  it('aggregates counts and latest timestamps by normalized username', () => {
    const interactions: InteractionRecord[] = [
      { username: 'A', type: 'like', timestamp: Date.UTC(2025, 0, 1) },
      { username: 'a', type: 'comment', timestamp: Date.UTC(2025, 2, 1) },
      { username: 'A', type: 'story_like', timestamp: Date.UTC(2025, 5, 1) },
      { username: 'B', type: 'like', timestamp: Date.UTC(2025, 1, 1) },
    ]
    expect(aggregateInteractions(interactions)).toEqual(new Map([
      ['a', { count: 3, lastInteraction: Date.UTC(2025, 5, 1) }],
      ['b', { count: 1, lastInteraction: Date.UTC(2025, 1, 1) }],
    ]))
  })

  it('classifies missing, old, recent, and exact-cutoff interactions', () => {
    expect(isDormant(undefined, cutoff)).toBe(true)
    expect(isDormant(cutoff - 1, cutoff)).toBe(true)
    expect(isDormant(cutoff, cutoff)).toBe(false)
    expect(isDormant(cutoff + 1, cutoff)).toBe(false)
  })

  it('calculates the cutoff deterministically and clamps end-of-month dates', () => {
    expect(getCutoffTimestamp(6, now)).toBe(Date.UTC(2025, 6, 1))
    expect(getCutoffTimestamp(6, Date.UTC(2026, 7, 31))).toBe(Date.UTC(2026, 1, 28))
  })

  it.each([6, 12, 24] as const)('calculates the %i month cutoff', (months) => {
    expect(getCutoffTimestamp(months, Date.UTC(2026, 0, 15)))
      .toBe(Date.UTC(2026, -months, 15))
  })
})

describe('complete account analysis', () => {
  it('combines following, followers, interactions, and inactivity cutoff', () => {
    const interactions = interactionsFixture as InteractionRecord[]
    const results = analyzeAccounts(
      parseFollowing(followingFixture),
      parseFollowers(followersFixture),
      interactions,
      6,
      now,
    )
    expect(results.map(({ username, followsBack, isDormant }) => ({ username, followsBack, isDormant })))
      .toEqual([
        { username: 'alice', followsBack: true, isDormant: false },
        { username: 'bob', followsBack: false, isDormant: true },
        { username: 'charlie', followsBack: true, isDormant: false },
      ])
  })

  it('keeps whitelisted accounts out of the actionable list', () => {
    const results = analyzeAccounts([account('friend'), account('other')], [], [], 6, now)
    expect(getActionableAccounts(results, [' FRIEND ']).map(({ username }) => username)).toEqual(['other'])
  })
})
