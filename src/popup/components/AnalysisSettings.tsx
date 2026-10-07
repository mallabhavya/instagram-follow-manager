import type { InactivityMonths } from '../../domain/models/types'

interface AnalysisSettingsProps {
  value: InactivityMonths
  onChange: (value: InactivityMonths) => void
}

export default function AnalysisSettings({ value, onChange }: AnalysisSettingsProps) {
  return (
    <div className="settings-field">
      <label htmlFor="inactivity-period">No recent interaction after</label>
      <select
        id="inactivity-period"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value) as InactivityMonths)}
      >
        <option value={6}>6 months</option>
        <option value={12}>12 months</option>
        <option value={24}>24 months</option>
      </select>
    </div>
  )
}
