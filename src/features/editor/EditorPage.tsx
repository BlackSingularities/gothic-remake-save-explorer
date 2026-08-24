import { Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SearchField, ViewToggle } from '../../components/Controls'
import { useViewMode } from '../../lib/hooks'
import type { ParsedSave, ScanResult } from '../../types'
import { SaveCard, SaveListRow } from '../explorer/SaveCard'
import { EditorSession } from './EditorSession'

export function EditorPage({ scan, saves }: { scan: ScanResult; saves: ParsedSave[] }) {
  const [selected, setSelected] = useState<ParsedSave | null>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useViewMode('editor.saves.view', 'grid')
  const [notice, setNotice] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase('pl')
    return saves.filter((save) => `${save.slotName} ${save.displayName}`.toLocaleLowerCase('pl').includes(needle))
  }, [saves, query])

  if (selected) {
    return (
      <EditorSession
        save={selected}
        scan={scan}
        onClose={() => setSelected(null)}
        onCommitted={(slotName) => {
          setSelected(null)
          setNotice(`Nowy zapis ${slotName} pojawi się na liście po odświeżeniu.`)
        }}
      />
    )
  }

  return (
    <section className="archive-page editor-picker">
      <div className="editor-picker__intro panel">
        <Wrench size={22} />
        <div>
          <p className="eyebrow">TRYB EDYTORA</p>
          <h3>Wybierz zapis do edycji</h3>
          <p>Wybrany zapis otwiera się w osobnym widoku edycji. Żadna zmiana nie trafia do oryginalnego pliku — edytor zawsze zapisuje kopię jako nowy slot.</p>
        </div>
      </div>
      {notice && <div className="editor-picker__notice">{notice}</div>}
      <div className="archive-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Szukaj zapisu do edycji…" />
        <ViewToggle value={viewMode} onChange={setViewMode} />
        <span className="result-count">{filtered.length} {filtered.length === 1 ? 'zapis' : 'zapisów'}</span>
      </div>
      {viewMode === 'grid' ? (
        <div className="save-cards-grid save-cards-grid--full">
          {filtered.map((save) => <SaveCard key={`${save.fileName}-${save.modifiedAtMs}`} save={save} onOpen={() => setSelected(save)} />)}
        </div>
      ) : (
        <div className="archive-list">
          {filtered.map((save, index) => <SaveListRow key={`${save.fileName}-${save.modifiedAtMs}`} save={save} index={index} onOpen={() => setSelected(save)} />)}
        </div>
      )}
    </section>
  )
}
