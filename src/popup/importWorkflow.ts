import { analyzeAccounts } from '../domain/analyzers/accountAnalyzer'
import type { AccountAnalysis, InactivityMonths, InteractionRecord } from '../domain/models/types'
import { ParseError } from '../domain/models/types'
import { parseFollowers } from '../domain/parsers/followerParser'
import { parseFollowing } from '../domain/parsers/followingParser'
import { parseComments, parseLikes, parseMessages, parseStoryLikes } from '../domain/parsers/interactionParser'
import { readJsonFile } from './fileReader'

export interface ImportAnalysis {
  followersCount: number
  followingCount: number
  accounts: AccountAnalysis[]
}

function parseInteractionFile(data: unknown, fileName: string): InteractionRecord[] {
  const name = fileName.toLocaleLowerCase('en-US')
  if (name.includes('message') || name.includes('inbox')) return parseMessages(data)
  if (name.includes('story')) return parseStoryLikes(data)
  if (name.includes('comment')) return parseComments(data)
  if (name.includes('like')) return parseLikes(data)

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const keys = Object.keys(data)
    if (keys.includes('participants') && keys.includes('messages')) return parseMessages(data)
    if (keys.some((key) => ['comments_media_comments', 'comments', 'commented_posts'].includes(key))) {
      return parseComments(data)
    }
    if (keys.some((key) => ['story_activities', 'story_likes'].includes(key))) return parseStoryLikes(data)
    if (keys.some((key) => ['likes_media_likes', 'likes', 'recently_liked'].includes(key))) return parseLikes(data)
  }
  throw new ParseError(`Could not identify the interaction data in ${fileName}. Choose a likes, comments, story likes, or message export.`)
}

export async function analyzeImportedFiles(
  followersFile: File,
  followingFile: File,
  interactionFiles: File[],
  inactivityMonths: InactivityMonths,
  now = Date.now(),
): Promise<ImportAnalysis> {
  const [followersData, followingData] = await Promise.all([
    readJsonFile(followersFile),
    readJsonFile(followingFile),
  ])
  const followers = parseFollowers(followersData)
  const following = parseFollowing(followingData)
  const interactions = (await Promise.all(interactionFiles.map(async (file) =>
    parseInteractionFile(await readJsonFile(file), file.name),
  ))).flat()

  return {
    followersCount: followers.length,
    followingCount: following.length,
    accounts: analyzeAccounts(following, followers, interactions, inactivityMonths, now),
  }
}
