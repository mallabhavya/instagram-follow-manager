export interface InstagramAccount {
  username: string
  profileUrl?: string
}

export type InteractionType = 'like' | 'comment' | 'story_like' | 'dm'

export interface InteractionRecord {
  username: string
  type: InteractionType
  timestamp: number
}

export interface AccountAnalysis {
  username: string
  profileUrl?: string
  followsBack: boolean
  interactionCount: number
  lastInteraction?: number
  isDormant: boolean
}

export type InactivityMonths = 6 | 12 | 24

export interface ReviewedAccount {
  username: string
  reviewedAt: number
}

export interface ApplicationSettings {
  inactivityMonths: InactivityMonths
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}
