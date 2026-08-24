import { Check, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SearchField } from '../../../components/Controls'
import type { CatalogItemOption, DeepSaveDetails } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

function ExistingItemRow({ id, name, count, controller }: { id: string; name: string; count: number; controller: PendingEditsController }) {
  const countKey = `item-count:${id}`
  const removeKey = `item-remove:${id}`
  const queuedCount = controller.byTargetKey.get(countKey)
  const queuedRemove = controller.byTargetKey.get(removeKey)
  const [value, setValue] = useState(String(queuedCount?.operation.kind === 'itemCount' ? queuedCount.operation.count : count))

  if (queuedRemove) {
    return (
      <div className="editor-item-row is-removed">
        <strong>{name}</strong>
        <span>oznaczono do usunięcia</span>
        <button className="icon-button" onClick={() => controller.removeEdit(queuedRemove.editId)} aria-label="Cofnij usunięcie">↺</button>
      </div>
    )
  }

  return (
    <div className="editor-item-row">
      <strong>{name}</strong>
      <code>{id}</code>
      <input type="number" min={0} value={value} onChange={(event) => setValue(event.target.value)} />
      <button
        className="icon-button"
        title="Zastosuj ilość"
        onClick={() => {
          const parsed = Math.max(0, Math.round(Number(value)))
          if (!Number.isFinite(parsed)) return
          controller.addEdit(countKey, { kind: 'itemCount', id, name, count: parsed, previous: count }, `${name}: ${count} → ${parsed}`)
        }}
      >
        <Check size={14} />
      </button>
      <button
        className="icon-button"
        title="Usuń przedmiot"
        onClick={() => controller.addEdit(removeKey, { kind: 'itemRemove', id, name }, `Usuń: ${name}`)}
      >
        <Trash2 size={14} />
      </button>
      {queuedCount && <small className="editor-field__queued">w kolejce: {queuedCount.operation.kind === 'itemCount' ? queuedCount.operation.count : ''}</small>}
    </div>
  )
}

function AddItemPanel({ controller }: { controller: PendingEditsController }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogItemOption[]>([])
  const [counts, setCounts] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    if (!window.gothic) return
    void window.gothic.editorItemCatalog(query).then((result) => {
      if (active && result.success && result.data) setResults(result.data)
    })
    return () => { active = false }
  }, [query])

  return (
    <div className="editor-add-item">
      <SearchField value={query} onChange={setQuery} placeholder="Szukaj klasy przedmiotu do dodania…" />
      <div className="editor-add-item__results">
        {results.map((item) => {
          const key = `item-add:${item.path}`
          const queued = controller.byTargetKey.get(key)
          const count = counts[item.id] ?? '1'
          return (
            <div key={item.path} className="editor-item-row">
              <strong>{item.name}</strong>
              <span>{item.category}</span>
              <input
                type="number"
                min={1}
                value={count}
                onChange={(event) => setCounts((prev) => ({ ...prev, [item.id]: event.target.value }))}
              />
              <button
                className="icon-button"
                title="Dodaj do ekwipunku"
                onClick={() => {
                  const parsed = Math.max(1, Math.round(Number(count)))
                  if (!Number.isFinite(parsed)) return
                  controller.addEdit(key, { kind: 'itemAdd', id: item.path, name: item.name, count: parsed }, `Dodaj: ${item.name} ×${parsed}`)
                }}
              >
                <Plus size={14} />
              </button>
              {queued && <b>w kolejce</b>}
            </div>
          )
        })}
        {!results.length && query && <div className="inline-empty">Brak wyników</div>}
      </div>
    </div>
  )
}

export function InventoryEditTab({ details, controller }: { details: DeepSaveDetails; controller: PendingEditsController }) {
  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading"><div><p className="eyebrow">EKWIPUNEK</p><h3>Zmień liczebność lub usuń przedmiot</h3></div></div>
        <div className="editor-item-list">
          {details.inventory.items.map((item, index) => (
            <ExistingItemRow key={`${item.id}-${index}`} id={item.id} name={item.name} count={item.count} controller={controller} />
          ))}
        </div>
      </section>
      <section className="drawer-section deep-section">
        <div className="section-heading"><div><p className="eyebrow">NOWY PRZEDMIOT</p><h3>Dodaj do ekwipunku</h3></div></div>
        <AddItemPanel controller={controller} />
      </section>
    </div>
  )
}
