import { useMemo, useState } from 'react'
import { SearchField, ViewToggle } from '../../../components/Controls'
import { useViewMode } from '../../../lib/hooks'
import type { DeepSaveDetails } from '../../../types'

export function InventoryTab({ details }: { details: DeepSaveDetails }) {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useViewMode('explorer.inventory.view', 'list')

  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase('pl')
    return details.inventory.items.filter((item) => `${item.name} ${item.id} ${item.category}`.toLocaleLowerCase('pl').includes(needle))
  }, [details.inventory.items, query])

  return (
    <div className="deep-tab-panel">
      <div className="inventory-summary">
        <div><span>Stosy</span><strong>{details.inventory.stackCount}</strong></div>
        <div><span>Sztuki łącznie</span><strong>{details.inventory.totalItemCount}</strong></div>
        <div><span>Wyposażone</span><strong>{details.inventory.equippedCount}</strong></div>
      </div>
      <div className="tab-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Szukaj przedmiotu lub identyfikatora…" className="inventory-search" />
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>
      {viewMode === 'list' ? (
        <div className="inventory-list">
          {filtered.map((item, index) => (
            <div key={`${item.id}-${item.count}-${index}`} className={item.equipped ? 'is-equipped' : ''}>
              <span className="item-count">{item.count}</span>
              <div><strong>{item.name}</strong><code>{item.id}</code></div>
              <span className="item-category">{item.category}</span>
              {item.equipped && <b>UŻYWANE</b>}
            </div>
          ))}
          {!filtered.length && <div className="inline-empty">Brak pasujących przedmiotów</div>}
        </div>
      ) : (
        <div className="tile-grid">
          {filtered.map((item, index) => (
            <div key={`${item.id}-${item.count}-${index}`} className={`item-tile${item.equipped ? ' is-equipped' : ''}`}>
              <span className="item-tile__count">{item.count}</span>
              <strong>{item.name}</strong>
              <span>{item.category}</span>
              {item.equipped && <b>UŻYWANE</b>}
            </div>
          ))}
          {!filtered.length && <div className="inline-empty">Brak pasujących przedmiotów</div>}
        </div>
      )}
    </div>
  )
}
