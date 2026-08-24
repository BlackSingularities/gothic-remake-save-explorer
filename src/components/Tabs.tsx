import type { ReactNode } from 'react'

export interface TabDef<T extends string> {
  id: T
  label: string
  icon: ReactNode
  badge?: number
}

export function TabBar<T extends string>({
  tabs, active, onChange,
}: { tabs: Array<TabDef<T>>; active: T; onChange: (id: T) => void }) {
  return (
    <div className="detail-tabs detail-tabs--wide" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} className={active === tab.id ? 'is-active' : ''} onClick={() => onChange(tab.id)}>
          {tab.icon} {tab.label}
          {tab.badge !== undefined && <b>{tab.badge}</b>}
        </button>
      ))}
    </div>
  )
}

export function TabPanelState({ loading, error, empty, emptyLabel }: { loading: boolean; error: string | null; empty?: boolean; emptyLabel?: string }) {
  if (loading) return <div className="inline-empty"><span className="is-spinning tab-spinner" />Wczytywanie…</div>
  if (error) return <div className="inline-empty inline-empty--error">{error}</div>
  if (empty) return <div className="inline-empty">{emptyLabel || 'Brak danych'}</div>
  return null
}
