import { ParseError, type InteractionRecord, type InteractionType } from '../models/types'
import { normalizeUsername } from '../utils/username'
import { asArray, asObject, recordsFrom, timestampInMilliseconds } from './instagramExport'

function parseActivityList(data: unknown, type: Exclude<InteractionType, 'dm'>): InteractionRecord[] {
  const aliases: Record<typeof type, string[]> = {
    like: ['likes_media_likes', 'likes', 'recently_liked'],
    comment: ['comments_media_comments', 'comments', 'commented_posts'],
    story_like: ['story_activities', 'story_likes'],
  }
  const records = recordsFrom(data, aliases[type], type)
  const interactions: InteractionRecord[] = []
  for (const rawRecord of records) {
    const record = asObject(rawRecord)
    if (!record) continue
    const details = asArray(record.string_list_data) ?? []
    for (const rawDetail of details) {
      const detail = asObject(rawDetail)
      if (!detail) continue
      const rawUsername = typeof record.title === 'string' ? record.title : detail.value
      if (typeof rawUsername !== 'string') continue
      const username = normalizeUsername(rawUsername)
      const timestamp = timestampInMilliseconds(detail.timestamp ?? record.timestamp)
      if (username && timestamp) interactions.push({ username, type, timestamp })
    }
  }
  if (records.length > 0 && interactions.length === 0) {
    throw new ParseError(`No usable ${type} interaction records were found in this file.`)
  }
  return interactions
}

export function parseLikes(data: unknown): InteractionRecord[] {
  return parseActivityList(data, 'like')
}

export function parseComments(data: unknown): InteractionRecord[] {
  return parseActivityList(data, 'comment')
}

export function parseStoryLikes(data: unknown): InteractionRecord[] {
  return parseActivityList(data, 'story_like')
}

/**
 * Supports one exported message thread at a time. It creates at most one DM record per
 * participant username for that thread, using the thread's latest valid message timestamp.
 */
export function parseMessages(data: unknown): InteractionRecord[] {
  const thread = asObject(data)
  if (!thread) throw new ParseError('The message thread JSON must contain an object.')
  const participants = asArray(thread.participants)
  const messages = asArray(thread.messages)
  if (!participants || !messages) {
    throw new ParseError('Could not find participants and messages in this Instagram message thread.')
  }

  const usernames = new Set<string>()
  for (const rawParticipant of participants) {
    const participant = asObject(rawParticipant)
    if (typeof participant?.name === 'string') {
      const username = normalizeUsername(participant.name)
      if (username) usernames.add(username)
    }
  }
  let latestTimestamp: number | undefined
  for (const rawMessage of messages) {
    const message = asObject(rawMessage)
    const timestamp = timestampInMilliseconds(message?.timestamp_ms ?? message?.timestamp)
    if (timestamp) latestTimestamp = Math.max(latestTimestamp ?? 0, timestamp)
  }
  if (!latestTimestamp) {
    if (messages.length === 0) return []
    throw new ParseError('No usable timestamps were found in this Instagram message thread.')
  }
  if (usernames.size === 0) throw new ParseError('No participant usernames were found in this message thread.')
  return [...usernames].map((username) => ({ username, type: 'dm', timestamp: latestTimestamp }))
}
