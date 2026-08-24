import { Check, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SearchField } from '../../../components/Controls'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { CatalogItemOption, TraderDetail, TraderSummary } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

function StockRow({ index, itemId, itemPath, name, count, controller }: { index: number; itemId: string; itemPath: string; name: string; count: number; controller: PendingEditsController }) {
  const stockKey = `trader-stock:${index}:${itemId}`
  const removeKey = `trader-remove:${index}:${itemId}`
  const queuedCount = controller.byTargetKey.get(stockKey)
  const queuedRemove = controller.byTargetKey.get(removeKey)
  const [value, setValue] = useState(String(queuedCount?.operation.kind === 'traderStock' ? queuedCount.operation.count : count))

  if (queuedRemove) {
    return (
      <div className="editor-item-row is-removed">
        <strong>{name}</strong>
        <span>oznaczono do usunięcia</span>
        <button className="icon-button" onClick={() => controller.removeEdit(queuedRemove.editId)} aria-label="Cofnij">↺</button>
      </div>
    )
  }

  return (
    <div className="editor-item-row">
      <strong>{name}</strong>
      <input type="number" min={1} value={value} onChange={(event) => setValue(event.target.value)} />
      <button
        className="icon-button"
        title="Zastosuj ilość"
        onClick={() => {
          const parsed = Math.max(1, Math.round(Number(value)))
          if (!Number.isFinite(parsed)) return
          controller.addEdit(stockKey, { kind: 'traderStock', index, itemId, itemPath, itemName: name, count: parsed, previous: count }, `${name} u handlarza: ${count} → ${parsed}`)
        }}
      >
        <Check size={14} />
      </button>
      <button
        className="icon-button"
        title="Usuń pozycję ze stoku"
        onClick={() => controller.addEdit(removeKey, { kind: 'traderItemRemove', index, itemPath, itemName: name }, `Usuń ze stoku: ${name}`)}
      >
        <Trash2 size={14} />
      </button>
      {queuedCount && <small className="editor-field__queued">w kolejce: {queuedCount.operation.kind === 'traderStock' ? queuedCount.operation.count : ''}</small>}
    </div>
  )
}

function AddStockPanel({ index, controller }: { index: number; controller: PendingEditsController }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogItemOption[]>([])

  useEffect(() => {
    let active = true
    if (!window.gothic || !query) {
      setResults([])
      return
    }
    void window.gothic.editorItemCatalog(query).then((result) => {
      if (active && result.success && result.data) setResults(result.data)
    })
    return () => { active = false }
  }, [query])

  return (
    <div className="editor-add-item">
      <SearchField value={query} onChange={setQuery} placeholder="Dodaj przedmiot do stoku…" />
      <div className="editor-add-item__results">
        {results.map((item) => {
          const key = `trader-add:${index}:${item.path}`
          const queued = controller.byTargetKey.has(key)
          return (
            <div key={item.path} className="editor-item-row">
              <strong>{item.name}</strong>
              <span>{item.category}</span>
              <button
                className="icon-button"
                disabled={queued}
                onClick={() => controller.addEdit(key, { kind: 'traderItemAdd', index, itemPath: item.path, itemName: item.name, count: 1 }, `Dodaj do stoku: ${item.name}`)}
              >
                <Plus size={14} />
              </button>
              {queued && <b>w kolejce</b>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TradersEditTab({ filePath, controller }: { filePath: string; controller: PendingEditsController }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const traders = useAsyncResource<TraderSummary[]>(window.gothic ? () => window.gothic!.listTraders(filePath) : null, [filePath])
  const detail = useAsyncResource<TraderDetail>(
    selectedIndex !== null && window.gothic ? () => window.gothic!.traderDetail(filePath, selectedIndex) : null,
    [filePath, selectedIndex],
  )

  return (
    <div className="deep-tab-panel">
      <TabPanelState loading={traders.loading} error={traders.error} empty={!traders.loading && !traders.data?.length} emptyLabel="Brak handlarzy w tym zapisie" />
      {traders.data && (
        <div className="trader-list">
          {traders.data.map((trader) => (
            <button key={trader.index} className={`trader-row${selectedIndex === trader.index ? ' is-active' : ''}`} onClick={() => setSelectedIndex(trader.index)}>
              <strong>{trader.name}</strong>
              <span>{trader.itemCount} pozycji</span>
            </button>
          ))}
        </div>
      )}
      {selectedIndex !== null && (
        <section className="drawer-section deep-section">
          <TabPanelState loading={detail.loading} error={detail.error} />
          {detail.data && (
            <>
              <div className="section-heading"><h3>{detail.data.name}</h3></div>
              <div className="editor-item-list">
                {detail.data.items.map((item) => (
                  <StockRow key={item.id} index={selectedIndex} itemId={item.id} itemPath={item.path} name={item.name} count={item.count} controller={controller} />
                ))}
              </div>
              <AddStockPanel index={selectedIndex} controller={controller} />
            </>
          )}
        </section>
      )}
    </div>
  )
}
