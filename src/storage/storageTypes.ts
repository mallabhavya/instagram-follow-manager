import type { AccountAnalysis, ApplicationSettings, InactivityMonths, ReviewedAccount } from '../domain/models/types'

export interface PersistedAppState {
  version: 2
  results: AccountAnalysis[]
  followersCount: number
  whitelist: string[]
  reviewedAccounts: ReviewedAccount[]
  settings: ApplicationSettings
  /** The setting used to produce results; may differ from the next-analysis setting. */
  analysisInactivityMonths: InactivityMonths | null
  lastAnalysisAt: number | null
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageError'
  }
}
