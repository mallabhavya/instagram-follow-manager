import { useEffect, useMemo, useState } from 'react'
import type { AccountAnalysis, InactivityMonths } from '../../domain/models/types'
import { ParseError } from '../../domain/models/types'
import { normalizeUsername } from '../../domain/utils/username'
import { clearAppState, loadAppState, saveAppState } from '../../storage/storage'
import { APP_STATE_VERSION } from '../../storage/storageKeys'
import type { PersistedAppState } from '../../storage/storageTypes'
import AnalysisSettings from '../components/AnalysisSettings'
import FileUpload from '../components/FileUpload'
import { JsonFileReadError } from '../fileReader'
import { analyzeImportedFiles } from '../importWorkflow'
import ReviewPage from './ReviewPage'

interface CompletedAnalysis {
  accounts: AccountAnalysis[]
  followersCount: number
}

export default function Popup() {
  const [followersFiles, setFollowersFiles] = useState<File[]>([])
  const [followingFiles, setFollowingFiles] = useState<File[]>([])
  const [interactionFiles, setInteractionFiles] = useState<File[]>([])
  const [inactivityMonths, setInactivityMonths] = useState<InactivityMonths>(6)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [storageSaved, setStorageSaved] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<CompletedAnalysis | null>(null)
  const [whitelist, setWhitelist] = useState<Set<string>>(() => new Set())
  const [reviewedAccounts, setReviewedAccounts] = useState<Map<string, number>>(() => new Map())
  const [analysisInactivityMonths, setAnalysisInactivityMonths] = useState<InactivityMonths | null>(null)
  const [lastAnalysisAt, setLastAnalysisAt] = useState<number | null>(null)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [fileInputVersion, setFileInputVersion] = useState(0)

  const canAnalyze = followersFiles.length === 1 && followingFiles.length === 1 && !isAnalyzing
  const reviewedUsernames = useMemo(() => new Set(reviewedAccounts.keys()), [reviewedAccounts])

  useEffect(() => {
    let cancelled = false
    loadAppState()
      .then((saved) => {
        if (!saved || cancelled) return
        setWhitelist(new Set(saved.whitelist))
        setReviewedAccounts(new Map(saved.reviewedAccounts.map(({ username, reviewedAt }) => [normalizeUsername(username), reviewedAt])))
        setInactivityMonths(saved.settings.inactivityMonths)
        setAnalysisInactivityMonths(saved.analysisInactivityMonths)
        setLastAnalysisAt(saved.lastAnalysisAt)
        if (saved.lastAnalysisAt !== null) {
          setAnalysis({ accounts: saved.results, followersCount: saved.followersCount })
        }
        setStorageSaved(true)
      })
      .catch(() => {
        if (!cancelled) setStorageWarning("We couldn't load saved data from this extension. You can continue with a new analysis.")
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })
    return () => { cancelled = true }
  }, [])

  async function persistState(state: PersistedAppState) {
    try {
      await saveAppState(state)
      setStorageSaved(true)
      setStorageWarning(null)
    } catch {
      setStorageSaved(false)
      setStorageWarning("We couldn't save your latest changes locally. Your current session is still active, but the changes may not survive closing the extension.")
    }
  }

  function currentPersistedState(overrides: Partial<PersistedAppState> = {}): PersistedAppState {
    return {
      version: APP_STATE_VERSION,
      results: analysis?.accounts ?? [],
      followersCount: analysis?.followersCount ?? 0,
      whitelist: [...whitelist],
      reviewedAccounts: [...reviewedAccounts].map(([username, reviewedAt]) => ({ username, reviewedAt })),
      settings: { inactivityMonths },
      analysisInactivityMonths,
      lastAnalysisAt,
      ...overrides,
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze || isRestoring) return
    setError(null)
    setIsAnalyzing(true)
    try {
      const result = await analyzeImportedFiles(
        followersFiles[0],
        followingFiles[0],
        interactionFiles,
        inactivityMonths,
      )
      const completedAt = Date.now()
      const completedAnalysis = { accounts: result.accounts, followersCount: result.followersCount }
      setAnalysis(completedAnalysis)
      setAnalysisInactivityMonths(inactivityMonths)
      setLastAnalysisAt(completedAt)
      void persistState(currentPersistedState({
        results: result.accounts,
        followersCount: result.followersCount,
        analysisInactivityMonths: inactivityMonths,
        lastAnalysisAt: completedAt,
      }))
    } catch (cause) {
      if (cause instanceof JsonFileReadError) setError(cause.message)
      else if (cause instanceof ParseError) setError("We couldn't find the expected account or interaction data in one of these files. Check that you selected supported Instagram export JSON files.")
      else setError('Analysis could not be completed. Check that the selected files are readable Instagram export JSON files, then try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function toggleProtection(username: string) {
    const next = new Set(whitelist)
    if (next.has(username)) next.delete(username)
    else next.add(username)
    setWhitelist(next)
    if (!isRestoring) void persistState(currentPersistedState({ whitelist: [...next] }))
  }

  function toggleReviewed(username: string) {
    const normalized = normalizeUsername(username)
    const next = new Map(reviewedAccounts)
    if (next.has(normalized)) next.delete(normalized)
    else next.set(normalized, Date.now())
    setReviewedAccounts(next)
    if (!isRestoring) {
      void persistState(currentPersistedState({
        reviewedAccounts: [...next].map(([reviewedUsername, reviewedAt]) => ({ username: reviewedUsername, reviewedAt })),
      }))
    }
  }

  function handleInactivityChange(value: InactivityMonths) {
    setInactivityMonths(value)
    if (!isRestoring) {
      void persistState(currentPersistedState({ settings: { inactivityMonths: value } }))
    }
  }

  async function handleClearSavedData() {
    setIsClearing(true)
    try {
      await clearAppState()
      setFollowersFiles([])
      setFollowingFiles([])
      setInteractionFiles([])
      setFileInputVersion((version) => version + 1)
      setAnalysis(null)
      setWhitelist(new Set())
      setReviewedAccounts(new Map())
      setInactivityMonths(6)
      setAnalysisInactivityMonths(null)
      setLastAnalysisAt(null)
      setStorageSaved(false)
      setStorageWarning(null)
      setClearError(null)
      setError(null)
      setShowClearConfirmation(false)
    } catch {
      setStorageWarning("We couldn't clear saved data. Your current session is still active.")
      setClearError("Saved data could not be cleared. Please try again.")
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <main className="popup-shell">
      <header className="app-header">
        <div className="app-mark" aria-hidden="true">IM</div>
        <div>
          <h1>Instagram Cleanup</h1>
          <p>Analyze your exported data</p>
        </div>
      </header>

      {isRestoring ? (
        <p className="loading-message" role="status">Loading saved analysis…</p>
      ) : <>
      <section aria-labelledby="import-title" className="import-section">
        <h2 id="import-title">Import data</h2>
        <p className="privacy-note">Your files are processed locally in this extension. They are not uploaded to a server.</p>
        <FileUpload
          key={`followers-${fileInputVersion}`}
          id="followers-file"
          label="Followers"
          hint="JSON file"
          files={followersFiles}
          onFilesSelected={(files) => { setFollowersFiles(files.slice(0, 1)); setError(null) }}
        />
        <FileUpload
          key={`following-${fileInputVersion}`}
          id="following-file"
          label="Following"
          hint="JSON file"
          files={followingFiles}
          onFilesSelected={(files) => { setFollowingFiles(files.slice(0, 1)); setError(null) }}
        />
        <FileUpload
          key={`interactions-${fileInputVersion}`}
          id="interactions-files"
          label="Interactions"
          hint="Optional · select multiple"
          files={interactionFiles}
          multiple
          onFilesSelected={(files) => { setInteractionFiles(files); setError(null) }}
        />
        <AnalysisSettings value={inactivityMonths} onChange={handleInactivityChange} />
        <button className="primary-button" type="button" disabled={!canAnalyze || isRestoring} onClick={handleAnalyze}>
          {isAnalyzing ? 'Analyzing…' : 'Analyze accounts'}
        </button>
        {isAnalyzing && <p className="loading-message" role="status">Reading and analyzing files…</p>}
        {error && <p className="error-message" role="alert">⚠ {error}</p>}
        {followersFiles.length === 0 && followingFiles.length === 0
          ? <p className="empty-message">Import your Instagram export to begin.</p>
          : (!followersFiles.length || !followingFiles.length)
            && <p className="empty-message">Select both followers and following JSON files to enable analysis.</p>}
      </section>

      {analysis && (
        <ReviewPage
          accounts={analysis.accounts}
          followersCount={analysis.followersCount}
          whitelist={whitelist}
          onToggleProtection={toggleProtection}
          reviewed={reviewedUsernames}
          onToggleReviewed={toggleReviewed}
        />
      )}
      <section className="data-section" aria-labelledby="data-title">
        <h2 id="data-title">Saved data</h2>
        {lastAnalysisAt !== null ? (
          <p className="data-copy">
            Last analyzed: <time dateTime={new Date(lastAnalysisAt).toISOString()}>
              {new Date(lastAnalysisAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </time>. This review is based on the previously imported export.
          </p>
        ) : <p className="data-copy">No saved analysis. Import your Instagram data to begin.</p>}
        {analysis && analysisInactivityMonths !== null && analysisInactivityMonths !== inactivityMonths && (
          <p className="data-copy stale-setting">This analysis used {analysisInactivityMonths} months. Run analysis again to apply {inactivityMonths} months.</p>
        )}
        {storageSaved && !storageWarning && <p className="storage-success" role="status">Saved locally</p>}
        {storageWarning && <p className="error-message" role="alert">⚠ {storageWarning}</p>}
        <button className="text-button clear-button" type="button" onClick={() => { setClearError(null); setShowClearConfirmation(true) }}>
          Clear saved data
        </button>
      </section>

      {showClearConfirmation && (
        <div className="confirmation-backdrop">
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-description">
            <h2 id="clear-title">Clear saved data?</h2>
            <p id="clear-description">This will remove your saved analysis, settings, protected accounts, and reviewed statuses from this extension.</p>
            <div className="confirmation-actions">
              <button type="button" className="secondary-button" onClick={() => { setClearError(null); setShowClearConfirmation(false) }} disabled={isClearing}>Cancel</button>
              <button type="button" className="danger-button" onClick={handleClearSavedData} disabled={isClearing}>
                {isClearing ? 'Clearing…' : 'Clear data'}
              </button>
            </div>
            {clearError && <p className="error-message" role="alert">⚠ {clearError}</p>}
          </section>
        </div>
      )}
      </>}
    </main>
  )
}
