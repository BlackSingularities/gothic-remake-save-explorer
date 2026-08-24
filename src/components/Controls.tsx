import { LayoutGrid, List, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../i18n/LanguageContext'
import type { ViewMode } from '../lib/hooks'

export function IconButton({
  children, label, onClick, className = '', disabled = false,
}: { children: ReactNode; label: string; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button className={`icon-button ${className}`} title={label} aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function SegmentedControl<T extends string>({
  value, options, onChange, className = '',
}: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void; className?: string }) {
  return (
    <div className={`segmented ${className}`}>
      {options.map((option) => (
        <button key={option.value} className={value === option.value ? 'is-active' : ''} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const t = useT()
  return (
    <div className="segmented view-toggle">
      <button className={value === 'grid' ? 'is-active' : ''} onClick={() => onChange('grid')} title={t('common.grid')} aria-label={t('common.grid')}>
        <LayoutGrid size={14} />
      </button>
      <button className={value === 'list' ? 'is-active' : ''} onClick={() => onChange('list')} title={t('common.list')} aria-label={t('common.list')}>
        <List size={14} />
      </button>
    </div>
  )
}

export function SearchField({
  value, onChange, placeholder, className = '',
}: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={`search-field ${className}`}>
      <Search size={15} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}
