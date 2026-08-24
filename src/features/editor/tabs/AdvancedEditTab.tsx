import { Check, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SegmentedControl } from '../../../components/Controls'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { TypedPropertyMatch, TypedPropertySearchResult } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

type Source = 'all' | 'metadata' | 'public' | 'private'

function EditableRow({ match, controller }: { match: TypedPropertyMatch; controller: PendingEditsController }) {
  const targetKey = `raw:${match.id}`
  const queued = controller.byTargetKey.get(targetKey)
  const queuedValue = queued?.operation.kind === 'rawTyped' ? queued.operation.value : undefined
  const [value, setValue] = useState(queuedValue ?? match.value ?? '')
  useEffect(() => setValue(queuedValue ?? match.value ?? ''), [queuedValue, match.value])

  return (
    <div className={`property-row property-row--depth-${Math.min(match.depth ?? 0, 6)}`}>
      <span className="property-row__type">{match.type}</span>
      <span className="property-row__display">{match.display}</span>
      {match.editable ? (
        <form
          className="editor-field__row"
          onSubmit={(event) => {
            event.preventDefault()
            controller.addEdit(targetKey, { kind: 'rawTyped', path: match.path, display: match.display, value, valueType: match.type }, `${match.display} → ${value}`)
          }}
        >
          <input value={value} onChange={(event) => setValue(event.target.value)} />
          <button className="icon-button" type="submit" title="Zastosuj"><Check size={14} /></button>
        </form>
      ) : (
        <span className="property-row__value">{match.value ?? '—'}</span>
      )}
      {queued && <small className="editor-field__queued">w kolejce: {queued.operation.kind === 'rawTyped' ? queued.operation.value : ''}</small>}
    </div>
  )
}

export function AdvancedEditTab({ filePath, controller }: { filePath: string; controller: PendingEditsController }) {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [source, setSource] = useState<Source>('private')

  const result = useAsyncResource<TypedPropertySearchResult>(
    submittedQuery && window.gothic ? () => window.gothic!.searchProperties(filePath, submittedQuery, source) : null,
    [filePath, submittedQuery, source],
  )

  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading"><div><p className="eyebrow">TRYB ZAAWANSOWANY</p><h3>Edycja surowej właściwości</h3></div></div>
        <p className="tab-note">Omija całą wiedzę domenową pozostałych zakładek — pozwala wpisać dowolną wartość zgodną z typem pola. Używaj świadomie: appka nie sprawdza, czy wartość ma sens w grze, tylko czy pasuje do typu (liczba/tekst/prawda-fałsz).</p>
        <form
          className="advanced-search-form"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmittedQuery(query.trim())
          }}
        >
          <label className="search-field">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fragment nazwy właściwości…" />
          </label>
          <SegmentedControl
            value={source}
            onChange={setSource}
            options={[
              { value: 'private', label: 'Prywatne' },
              { value: 'public', label: 'Publiczne' },
              { value: 'all', label: 'Wszystko' },
            ]}
          />
          <button className="button button--secondary" type="submit">Szukaj</button>
        </form>
        {submittedQuery && <TabPanelState loading={result.loading} error={result.error} empty={!result.loading && !result.data?.results.length} emptyLabel="Brak trafień" />}
        {result.data && result.data.results.length > 0 && (
          <div className="property-list">
            {result.data.results.map((match) => <EditableRow key={match.id} match={match} controller={controller} />)}
            {result.data.total > result.data.results.length && (
              <p className="tab-note">Pokazano {result.data.results.length} z {result.data.total} dopasowań — zawęź zapytanie, aby zobaczyć więcej.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
