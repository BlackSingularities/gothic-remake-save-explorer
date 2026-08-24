import type { ReactNode } from 'react'

export function MetricCard({
  icon, label, value, detail, accent = false,
}: { icon: ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <article className={`metric-card${accent ? ' metric-card--accent' : ''}`}>
      <div className="metric-card__head"><span className="metric-card__icon">{icon}</span><span>{label}</span></div>
      <strong>{value}</strong>
      <p>{detail}</p>
      <span className="metric-card__cut" />
    </article>
  )
}
