import type { InteractionRecord } from '../models/types'
import { normalizeUsername } from '../utils/username'

export interface InteractionSummary {
  count: number
  lastInteraction?: number
}

export function aggregateInteractions(
  interactions: InteractionRecord[],
): Map<string, InteractionSummary> {
  const summaries = new Map<string, InteractionSummary>()
  for (const interaction of interactions) {
    const username = normalizeUsername(interaction.username)
    if (!username) continue
    const summary = summaries.get(username) ?? { count: 0 }
    summary.count += 1
    summary.lastInteraction = Math.max(summary.lastInteraction ?? 0, interaction.timestamp)
    summaries.set(username, summary)
  }
  return summaries
}

export function isDormant(lastInteraction: number | undefined, cutoffTimestamp: number): boolean {
  return lastInteraction === undefined || lastInteraction < cutoffTimestamp
}

export function getCutoffTimestamp(months: 6 | 12 | 24, now: number): number {
  const date = new Date(now)
  const originalDay = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() - months)
  const lastDayInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(originalDay, lastDayInTargetMonth))
  return date.getTime()
}
