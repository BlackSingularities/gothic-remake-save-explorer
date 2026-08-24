import { Heart, MapPinned, Skull, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SearchField, SegmentedControl, ViewToggle } from '../../../components/Controls'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource, useViewMode } from '../../../lib/hooks'
import type { NpcDetail, NpcRelationship, NpcSummary } from '../../../types'

const relationshipLabels: Record<NpcRelationship, string> = { friend: 'Przyjazny', neutral: 'Neutralny', enemy: 'Wrogi' }

function NpcDetailPanel({ npc, onClose }: { npc: NpcDetail; onClose: () => void }) {
  return (
    <div className="npc-detail-panel">
      <div className="npc-detail-panel__head">
        <h4>{npc.name}</h4>
        <button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={16} /></button>
      </div>
      {npc.position && (
        <p className="npc-detail-panel__position">
          <MapPinned size={14} /> {npc.position.nearestArea || 'Nieznana okolica'}
          <code>X {Math.round(npc.position.location.x)} · Y {Math.round(npc.position.location.y)} · Z {Math.round(npc.position.location.z)}</code>
        </p>
      )}
      {npc.attributes.length > 0 && (
        <div className="attribute-grid attribute-grid--compact">
          {npc.attributes.slice(0, 9).map((attribute) => (
            <div key={attribute.id}><span>{attribute.label}</span><strong>{attribute.current}</strong></div>
          ))}
        </div>
      )}
      {npc.inventory.length > 0 && (
        <div className="inventory-list inventory-list--compact">
          {npc.inventory.slice(0, 20).map((item, index) => (
            <div key={`${item.id}-${index}`} className={item.equipped ? 'is-equipped' : ''}>
              <span className="item-count">{item.count}</span>
              <div><strong>{item.name}</strong></div>
              {item.equipped && <b>UŻYWANE</b>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NpcsTab({ filePath }: { filePath: string }) {
  const [query, setQuery] = useState('')
  const [relationship, setRelationship] = useState<'all' | NpcRelationship>('all')
  const [viewMode, setViewMode] = useViewMode('explorer.npcs.view', 'grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const npcs = useAsyncResource<NpcSummary[]>(window.gothic ? () => window.gothic!.listNpcs(filePath) : null, [filePath])
  const detail = useAsyncResource<NpcDetail>(
    selectedId && window.gothic ? () => window.gothic!.npcDetail(filePath, selectedId) : null,
    [filePath, selectedId],
  )

  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase('pl')
    return (npcs.data || []).filter((npc) => {
      const matchesQuery = `${npc.name} ${npc.id}`.toLocaleLowerCase('pl').includes(needle)
      const matchesRelationship = relationship === 'all' || npc.relationship === relationship
      return matchesQuery && matchesRelationship
    })
  }, [npcs.data, query, relationship])

  return (
    <div className="deep-tab-panel">
      <div className="world-grid world-grid--compact">
        <div><span>Postacie w świecie</span><strong>{npcs.data?.length ?? '—'}</strong><small>{(npcs.data || []).filter((n) => n.isDead).length} martwych</small></div>
        <div><span>Przyjazne</span><strong>{(npcs.data || []).filter((n) => n.relationship === 'friend').length}</strong></div>
        <div><span>Wrogie</span><strong>{(npcs.data || []).filter((n) => n.relationship === 'enemy').length}</strong></div>
      </div>
      <div className="tab-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Szukaj postaci…" />
        <SegmentedControl
          value={relationship}
          onChange={setRelationship}
          options={[
            { value: 'all', label: 'Wszyscy' },
            { value: 'friend', label: 'Przyjaźni' },
            { value: 'neutral', label: 'Neutralni' },
            { value: 'enemy', label: 'Wrodzy' },
          ]}
        />
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>
      <TabPanelState loading={npcs.loading} error={npcs.error} empty={!npcs.loading && !filtered.length} emptyLabel="Brak pasujących postaci" />

      {selectedId && (
        <TabPanelState loading={detail.loading} error={detail.error} />
      )}
      {selectedId && detail.data && <NpcDetailPanel npc={detail.data} onClose={() => setSelectedId(null)} />}

      {!npcs.loading && filtered.length > 0 && viewMode === 'list' && (
        <div className="npc-list">
          {filtered.slice(0, 400).map((npc) => (
            <button key={npc.id} className={`npc-row npc-row--${npc.relationship}`} onClick={() => setSelectedId(npc.id)}>
              {npc.isDead ? <Skull size={14} /> : <Heart size={14} />}
              <strong>{npc.name}</strong>
              <span>{npc.hp}/{npc.maxHp} PŻ</span>
              <b>{relationshipLabels[npc.relationship]}</b>
            </button>
          ))}
        </div>
      )}
      {!npcs.loading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="tile-grid">
          {filtered.slice(0, 400).map((npc) => (
            <button key={npc.id} className={`npc-tile npc-tile--${npc.relationship}`} onClick={() => setSelectedId(npc.id)}>
              {npc.isDead ? <Skull size={16} /> : <Heart size={16} />}
              <strong>{npc.name}</strong>
              <span>{npc.hp}/{npc.maxHp} PŻ</span>
            </button>
          ))}
        </div>
      )}
      {filtered.length > 400 && <p className="tab-note">Pokazano pierwsze 400 z {filtered.length} dopasowań — zawęź wyszukiwanie.</p>}
    </div>
  )
}
