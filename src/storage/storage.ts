import type { AccountAnalysis, InactivityMonths } from '../domain/models/types'
import { APP_STATE_STORAGE_KEY, APP_STATE_VERSION } from './storageKeys'
import { StorageError, type PersistedAppState } from './storageTypes'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInactivityMonths(value: unknown): value is InactivityMonths {
  return value === 6 || value === 12 || value === 24
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
    && value <= 8_640_000_000_000_000
}

function isAccountAnalysis(value: unknown): value is AccountAnalysis {
  if (!isObject(value)) return false
  return typeof value.username === 'string'
    && value.username.trim().length > 0
    && (value.profileUrl === undefined || typeof value.profileUrl === 'string')
    && typeof value.followsBack === 'boolean'
    && Number.isInteger(value.interactionCount)
    && Number(value.interactionCount) >= 0
    && (value.lastInteraction === undefined || isValidTimestamp(value.lastInteraction))
    && typeof value.isDormant === 'boolean'
}

export function isValidPersistedState(value: unknown): value is PersistedAppState {
  if (!isObject(value) || value.version !== APP_STATE_VERSION) return false
  if (!Array.isArray(value.results) || !value.results.every(isAccountAnalysis)) return false
  if (!Array.isArray(value.whitelist) || !value.whitelist.every((username) => typeof username === 'string' && username.trim().length > 0)) return false
  if (!Array.isArray(value.reviewedAccounts) || !value.reviewedAccounts.every((entry) =>
    isObject(entry) && typeof entry.username === 'string' && entry.username.trim().length > 0 && isValidTimestamp(entry.reviewedAt))) return false
  if (!Number.isInteger(value.followersCount) || Number(value.followersCount) < 0) return false
  if (!isObject(value.settings) || !isInactivityMonths(value.settings.inactivityMonths)) return false
  if (value.analysisInactivityMonths !== null && !isInactivityMonths(value.analysisInactivityMonths)) return false
  const hasAnalysisTimestamp = isValidTimestamp(value.lastAnalysisAt)
  if (value.lastAnalysisAt !== null && !hasAnalysisTimestamp) return false
  if (value.lastAnalysisAt === null) {
    return value.analysisInactivityMonths === null && value.results.length === 0
  }
  return value.analysisInactivityMonths !== null
}

function storageArea(): ChromeStorageLocalArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new StorageError('Chrome local storage is unavailable in this context.')
  }
  return chrome.storage.local
}

function getStoredValue(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    try {
      storageArea().get(APP_STATE_STORAGE_KEY, (items) => {
        if (chrome.runtime.lastError) reject(new StorageError('Could not load saved data from local storage.'))
        else resolve(items[APP_STATE_STORAGE_KEY])
      })
    } catch {
      reject(new StorageError('Could not load saved data from local storage.'))
    }
  })
}

function writeStoredValue(state: PersistedAppState): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      storageArea().set({ [APP_STATE_STORAGE_KEY]: state }, () => {
        if (chrome.runtime.lastError) reject(new StorageError('Could not save your data to local storage.'))
        else resolve()
      })
    } catch {
      reject(new StorageError('Could not save your data to local storage.'))
    }
  })
}

function removeStoredValue(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      storageArea().remove(APP_STATE_STORAGE_KEY, () => {
        if (chrome.runtime.lastError) reject(new StorageError('Could not clear saved data from local storage.'))
        else resolve()
      })
    } catch {
      reject(new StorageError('Could not clear saved data from local storage.'))
    }
  })
}

let writeQueue: Promise<void> = Promise.resolve()

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const queued = writeQueue.then(operation)
  writeQueue = queued.catch(() => undefined)
  return queued
}

export async function loadAppState(): Promise<PersistedAppState | null> {
  const stored = await getStoredValue()
  if (stored === undefined) return null
  if (isValidPersistedState(stored)) return stored
  if (isValidV1PersistedState(stored)) {
    const migrated: PersistedAppState = { ...stored, version: APP_STATE_VERSION, reviewedAccounts: [] }
    await enqueueWrite(() => writeStoredValue(migrated))
    return migrated
  }
  // Malformed and unsupported versions are discarded safely.
  await enqueueWrite(removeStoredValue)
  return null
}

export function saveAppState(state: PersistedAppState): Promise<void> {
  const serializable: PersistedAppState = {
    version: APP_STATE_VERSION,
    results: state.results.map((account) => ({
      username: account.username,
      ...(account.profileUrl !== undefined ? { profileUrl: account.profileUrl } : {}),
      followsBack: account.followsBack,
      interactionCount: account.interactionCount,
      ...(account.lastInteraction !== undefined ? { lastInteraction: account.lastInteraction } : {}),
      isDormant: account.isDormant,
    })),
    followersCount: state.followersCount,
    whitelist: [...state.whitelist],
    reviewedAccounts: state.reviewedAccounts.map(({ username, reviewedAt }) => ({ username, reviewedAt })),
    settings: { inactivityMonths: state.settings.inactivityMonths },
    analysisInactivityMonths: state.analysisInactivityMonths,
    lastAnalysisAt: state.lastAnalysisAt,
  }
  if (!isValidPersistedState(serializable)) {
    return Promise.reject(new StorageError('The application state could not be saved because its data was invalid.'))
  }
  return enqueueWrite(() => writeStoredValue(serializable))
}

function isValidV1PersistedState(value: unknown): value is Omit<PersistedAppState, 'version' | 'reviewedAccounts'> & { version: 1 } {
  if (!isObject(value) || value.version !== 1) return false
  const v2Like = { ...value, version: APP_STATE_VERSION, reviewedAccounts: [] }
  return isValidPersistedState(v2Like)
}

export function clearAppState(): Promise<void> {
  return enqueueWrite(removeStoredValue)
}
