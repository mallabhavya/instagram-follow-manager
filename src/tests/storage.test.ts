import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountAnalysis } from '../domain/models/types'
import { clearAppState, isValidPersistedState, loadAppState, saveAppState } from '../storage/storage'
import { APP_STATE_STORAGE_KEY } from '../storage/storageKeys'
import { StorageError, type PersistedAppState } from '../storage/storageTypes'

const account: AccountAnalysis = {
  username: 'alice',
  followsBack: false,
  interactionCount: 1,
  lastInteraction: 1_700_000_000_000,
  isDormant: true,
}

const validState: PersistedAppState = {
  version: 2,
  results: [account],
  followersCount: 3,
  whitelist: ['alice'],
  reviewedAccounts: [{ username: 'alice', reviewedAt: 1_760_000_000_100 }],
  settings: { inactivityMonths: 12 },
  analysisInactivityMonths: 6,
  lastAnalysisAt: 1_760_000_000_000,
}

let storedValue: unknown
let lastErrorMessage: string | undefined

const mockChrome = {
  runtime: {
    get lastError() {
      return lastErrorMessage ? { message: lastErrorMessage } : undefined
    },
  },
  storage: {
    local: {
      get(key: string, callback: (items: Record<string, unknown>) => void) {
        callback(storedValue === undefined ? {} : { [key]: storedValue })
      },
      set(items: Record<string, unknown>, callback: () => void) {
        if (!lastErrorMessage) storedValue = items[APP_STATE_STORAGE_KEY]
        callback()
      },
      remove(_key: string, callback: () => void) {
        if (!lastErrorMessage) storedValue = undefined
        callback()
      },
    },
  },
}

describe('Chrome local storage abstraction', () => {
  beforeEach(() => {
    storedValue = undefined
    lastErrorMessage = undefined
    vi.stubGlobal('chrome', mockChrome)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when storage has no application state', async () => {
    await expect(loadAppState()).resolves.toBeNull()
  })

  it('saves and restores the persisted analysis, whitelist, settings, and timestamp', async () => {
    await saveAppState(validState)
    await expect(loadAppState()).resolves.toEqual(validState)
    expect(storedValue).toMatchObject({
      whitelist: ['alice'],
      reviewedAccounts: [{ username: 'alice', reviewedAt: 1_760_000_000_100 }],
      settings: { inactivityMonths: 12 },
      results: [account],
    })
  })

  it('validates the schema instead of trusting a TypeScript cast', () => {
    expect(isValidPersistedState(validState)).toBe(true)
    expect(isValidPersistedState({ ...validState, version: 99 })).toBe(false)
    expect(isValidPersistedState({ ...validState, settings: { inactivityMonths: 9 } })).toBe(false)
    expect(isValidPersistedState({ ...validState, results: [{ username: 'alice' }] })).toBe(false)
    expect(isValidPersistedState({ ...validState, reviewedAccounts: [{ username: 'alice', reviewedAt: -1 }] })).toBe(false)
  })

  it('discards malformed or unsupported stored state safely', async () => {
    storedValue = { ...validState, results: 'not an array' }
    await expect(loadAppState()).resolves.toBeNull()
    expect(storedValue).toBeUndefined()

    storedValue = { ...validState, version: 99 }
    await expect(loadAppState()).resolves.toBeNull()
    expect(storedValue).toBeUndefined()
  })

  it('clears the application key', async () => {
    await saveAppState(validState)
    await clearAppState()
    await expect(loadAppState()).resolves.toBeNull()
  })

  it('migrates version 1 state while preserving existing data', async () => {
    const version1 = { ...validState, version: 1 }
    delete (version1 as Partial<PersistedAppState>).reviewedAccounts
    storedValue = version1
    await expect(loadAppState()).resolves.toEqual({ ...validState, reviewedAccounts: [] })
    expect(storedValue).toEqual({ ...validState, reviewedAccounts: [] })
  })

  it('surfaces load, save, and clear failures as storage errors', async () => {
    lastErrorMessage = 'read failed'
    await expect(loadAppState()).rejects.toThrow(StorageError)
    lastErrorMessage = undefined

    lastErrorMessage = 'write failed'
    await expect(saveAppState(validState)).rejects.toThrow(StorageError)
    lastErrorMessage = undefined

    lastErrorMessage = 'remove failed'
    await expect(clearAppState()).rejects.toThrow(StorageError)
  })
})
