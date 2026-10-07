import type { AccountAnalysis } from '../../domain/models/types'
import { getInstagramProfileUrl } from '../../domain/utils/profileUrl'

interface AccountRowProps {
  account: AccountAnalysis
  isProtected: boolean
  onToggleProtection: (username: string) => void
  isReviewed: boolean
  onToggleReviewed: (username: string) => void
}

function formatTimeAgo(timestamp: number): string {
  const age = Math.max(0, Date.now() - timestamp)
  const day = 24 * 60 * 60 * 1000
  const month = 30.4375 * day
  const months = Math.floor(age / month)
  if (months === 0) {
    const days = Math.floor(age / day)
    return days === 0 ? 'less than a day ago' : `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  return remainingMonths === 0
    ? `${years} ${years === 1 ? 'year' : 'years'} ago`
    : `${years}y ${remainingMonths}mo ago`
}

export default function AccountRow({ account, isProtected, onToggleProtection, isReviewed, onToggleReviewed }: AccountRowProps) {
  const profileUrl = getInstagramProfileUrl(account)
  return (
    <li className="account-row">
      <div className="account-main">
        <strong>@{account.username}</strong>
        <div className="account-tags">
          <span className={account.followsBack ? 'status-tag positive' : 'status-tag flagged'}>
            {account.followsBack ? 'Follows you' : "Doesn't follow back"}
          </span>
          <span className={account.isDormant ? 'status-tag flagged' : 'status-tag positive'}>
            {account.interactionCount === 0
              ? 'No recorded interaction'
              : account.isDormant ? 'No recent interaction' : 'Recent interaction'}
          </span>
          {isProtected && <span className="status-tag protected">Protected</span>}
          {isReviewed && <span className="status-tag reviewed">Reviewed</span>}
        </div>
        <p className="last-interaction">
          {account.lastInteraction === undefined
            ? 'Last interaction: No recorded interaction'
            : `Last interaction: ${formatTimeAgo(account.lastInteraction)}`}
        </p>
      </div>
      <div className="account-actions">
        {profileUrl && <a className="profile-link" aria-label={`Open @${account.username} on Instagram`} href={profileUrl} target="_blank" rel="noopener noreferrer">Open profile</a>}
        <button type="button" className={isReviewed ? 'review-button is-reviewed' : 'review-button'} aria-label={isReviewed ? `Undo reviewed status for @${account.username}` : `Mark @${account.username} as reviewed`} aria-pressed={isReviewed} onClick={() => onToggleReviewed(account.username)}>
          {isReviewed ? 'Undo review' : 'Mark reviewed'}
        </button>
        <button
          type="button"
          className={isProtected ? 'protection-button is-protected' : 'protection-button'}
          aria-label={`${isProtected ? 'Remove protection from' : 'Protect'} @${account.username}`}
          aria-pressed={isProtected}
          onClick={() => onToggleProtection(account.username)}
        >
          {isProtected ? 'Unprotect' : 'Keep'}
        </button>
      </div>
    </li>
  )
}
