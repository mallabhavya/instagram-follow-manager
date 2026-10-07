import type { AccountAnalysis } from '../../domain/models/types'

interface AnalysisSummaryProps {
  accounts: AccountAnalysis[]
  followersCount: number
  whitelist: ReadonlySet<string>
}

export default function AnalysisSummary({ accounts, followersCount, whitelist }: AnalysisSummaryProps) {
  const notFollowingBack = accounts.filter((account) => !account.followsBack).length
  const dormant = accounts.filter((account) => account.isDormant).length
  const both = accounts.filter((account) => !account.followsBack && account.isDormant).length
  const protectedCount = accounts.filter((account) => whitelist.has(account.username)).length
  const summaries = [
    { label: 'Following', count: accounts.length },
    { label: 'Followers', count: followersCount },
    { label: "Don't follow back", count: notFollowingBack },
    { label: 'No recent interaction', count: dormant },
    { label: 'Both', count: both },
    { label: 'Protected', count: protectedCount },
  ]

  return (
    <section aria-labelledby="summary-title" className="results-section">
      <h2 id="summary-title">Analysis complete</h2>
      <dl className="summary-grid">
        {summaries.map(({ label, count }) => (
          <div className="summary-item" key={label}>
            <dt>{label}</dt>
            <dd>{count.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
