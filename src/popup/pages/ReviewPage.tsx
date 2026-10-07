import { useMemo, useState } from 'react'
import type { AccountAnalysis } from '../../domain/models/types'
import AccountRow from '../components/AccountRow'
import AnalysisSummary from '../components/AnalysisSummary'
import {
  filterAndSortAccounts,
  getReviewCounts,
  resetReviewViewState,
  type AccountFilter,
  type AccountSort,
} from '../utils/accountView'

type FilterCountKey = 'notFollowingBack' | 'dormant' | 'both' | 'protected' | 'reviewed' | 'notReviewed'

interface ReviewPageProps {
  accounts: AccountAnalysis[]
  followersCount: number
  whitelist: Set<string>
  onToggleProtection: (username: string) => void
  reviewed: ReadonlySet<string>
  onToggleReviewed: (username: string) => void
}

const filterOptions: { value: AccountFilter; label: string; countKey: FilterCountKey }[] = [
  { value: 'not_following_back', label: "Doesn't follow back", countKey: 'notFollowingBack' },
  { value: 'dormant', label: 'No recent interaction', countKey: 'dormant' },
  { value: 'both', label: 'Both', countKey: 'both' },
  { value: 'protected', label: 'Protected', countKey: 'protected' },
  { value: 'reviewed', label: 'Reviewed', countKey: 'reviewed' },
  { value: 'not_reviewed', label: 'Not reviewed', countKey: 'notReviewed' },
]

const sortOptions: { value: AccountSort; label: string }[] = [
  { value: 'username_asc', label: 'Username: A → Z' },
  { value: 'username_desc', label: 'Username: Z → A' },
  { value: 'last_interaction_newest', label: 'Last interaction: Newest' },
  { value: 'last_interaction_oldest', label: 'Last interaction: Oldest' },
  { value: 'interaction_count_high', label: 'Interaction count: Highest' },
  { value: 'interaction_count_low', label: 'Interaction count: Lowest' },
]

export default function ReviewPage({ accounts, followersCount, whitelist, onToggleProtection, reviewed, onToggleReviewed }: ReviewPageProps) {
  const [view, setView] = useState(resetReviewViewState)
  const counts = useMemo(() => getReviewCounts(accounts, whitelist, reviewed), [accounts, whitelist, reviewed])
  const visibleAccounts = useMemo(
    () => filterAndSortAccounts(accounts, view, whitelist, reviewed),
    [accounts, view, whitelist, reviewed],
  )

  function toggleFilter(filter: AccountFilter) {
    setView((current) => {
      const filters = new Set(current.filters)
      if (filters.has(filter)) filters.delete(filter)
      else filters.add(filter)
      return { ...current, filters }
    })
  }

  function resetFilters() {
    setView(resetReviewViewState())
  }

  function clearStatusFilters() {
    setView((current) => ({ ...current, filters: new Set() }))
  }

  const isDefaultView = view.search === '' && view.filters.size === 0 && view.sortBy === 'username_asc'

  let emptyMessage = 'No accounts match this filter.'
  if (view.filters.has('protected') && counts.protected === 0) emptyMessage = "You haven't protected any accounts yet."
  else if (view.filters.has('dormant') && counts.dormant === 0) emptyMessage = 'No accounts have been flagged for this inactivity period.'
  else if (view.search.trim()) emptyMessage = `No accounts match “${view.search.trim()}”.`

  return (
    <section className="review-section" aria-labelledby="review-title">
      <h2 id="review-title">Review accounts</h2>
      <AnalysisSummary accounts={accounts} followersCount={followersCount} whitelist={whitelist} />

      <div className="review-toolbar">
        <div className="search-field">
          <label htmlFor="account-search">Search accounts</label>
          <input
            id="account-search"
            type="search"
            value={view.search}
            placeholder="Search username"
            onChange={(event) => setView((current) => ({ ...current, search: event.currentTarget.value }))}
          />
        </div>
        <div className="sort-field">
          <label htmlFor="account-sort">Sort</label>
          <select
            id="account-sort"
            value={view.sortBy}
            onChange={(event) => setView((current) => ({ ...current, sortBy: event.currentTarget.value as AccountSort }))}
          >
            {sortOptions.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-heading">
        <h3>Filter accounts</h3>
        <button type="button" className="text-button" onClick={resetFilters} disabled={isDefaultView}>
          Reset filters
        </button>
      </div>
      <div className="filter-controls" role="group" aria-label="Account filters">
        <button type="button" className="filter-chip" aria-pressed={view.filters.size === 0} onClick={clearStatusFilters}>
          All <span>{counts.all}</span>
        </button>
        {filterOptions.map(({ value, label, countKey }) => (
          <button
            type="button"
            className="filter-chip"
            key={value}
            aria-pressed={view.filters.has(value)}
            onClick={() => toggleFilter(value)}
          >
            {label} <span>{counts[countKey]}</span>
          </button>
        ))}
      </div>

      <p className="result-count" aria-live="polite">Showing {visibleAccounts.length.toLocaleString()} of {accounts.length.toLocaleString()} accounts</p>
      {visibleAccounts.length === 0 ? (
        <p className="empty-message review-empty">{emptyMessage}</p>
      ) : (
        <ul className="account-list">
          {visibleAccounts.map((account) => (
            <AccountRow
              key={account.username}
              account={account}
              isProtected={whitelist.has(account.username)}
              onToggleProtection={onToggleProtection}
              isReviewed={reviewed.has(account.username.toLocaleLowerCase('en-US'))}
              onToggleReviewed={onToggleReviewed}
            />
          ))}
        </ul>
      )}
      <p className="candidate-count">
        Review candidates: {counts.candidates.toLocaleString()} · Protected: {counts.protectedCandidates.toLocaleString()} · Unprotected: {counts.unprotectedCandidates.toLocaleString()}
      </p>
    </section>
  )
}
