import { Search } from 'lucide-react'
import { useState } from 'react'
import { SegmentedControl } from '../../../components/Controls'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { TypedPropertySearchResult } from '../../../types'

type Source = 'all' | 'metadata' | 'public' | 'private'

export function AdvancedTab({ filePath }: { filePath: string }) {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [source, setSource] = useState<Source>('all')

  const result = useAsyncResource<TypedPropertySearchResult>(
    submittedQuery && window.gothic ? () => window.gothic!.searchProperties(filePath, submittedQuery, source) : null,
    [filePath, submittedQuery, source],
  )

  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading">
          <div><p className="eyebrow">TRYB ZAAWANSOWANY</p><h3>Przeszukaj surowe właściwości zapisu</h3></div>
        </div>
        <p className="tab-note">Generyczna przeglądarka drzewa właściwości — dociera do wszystkiego, czego nie pokrywa żadna wyspecjalizowana zakładka. Szukaj po fragmencie nazwy pola (np. „ActiveEffects”, „Chapter”, „Reputation”).</p>
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
              { value: 'all', label: 'Wszystko' },
              { value: 'public', label: 'Publiczne' },
              { value: 'private', label: 'Prywatne' },
              { value: 'metadata', label: 'Metadane' },
            ]}
          />
          <button className="button button--secondary" type="submit">Szukaj</button>
        </form>
        {submittedQuery && <TabPanelState loading={result.loading} error={result.error} empty={!result.loading && !result.data?.results.length} emptyLabel="Brak trafień" />}
        {result.data && result.data.results.length > 0 && (
          <div className="property-list">
            {result.data.results.map((match) => (
              <div key={match.id} className={`property-row property-row--depth-${Math.min(match.depth ?? 0, 6)}`}>
                <span className="property-row__type">{match.type}</span>
                <span className="property-row__display">{match.display}</span>
                <span className="property-row__value">{match.value ?? '—'}</span>
              </div>
            ))}
            {result.data.total > result.data.results.length && (
              <p className="tab-note">Pokazano {result.data.results.length} z {result.data.total} dopasowań — zawęź zapytanie, aby zobaczyć więcej.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
