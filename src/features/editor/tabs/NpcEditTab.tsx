import { HeartPulse } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SearchField } from '../../../components/Controls'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { NpcRelationship, NpcSummary } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

const relationshipOptions: NpcRelationship[] = ['friend', 'neutral', 'enemy']
const relationshipLabels: Record<NpcRelationship, string> = { friend: 'Przyjazny', neutral: 'Neutralny', enemy: 'Wrogi' }

function NpcRow({ npc, controller }: { npc: NpcSummary; controller: PendingEditsController }) {
  const relKey = `npc-relationship:${npc.id}`
  const reviveKey = `npc-revive:${npc.id}`
  const queuedRel = controller.byTargetKey.get(relKey)
  const queuedRevive = controller.byTargetKey.get(reviveKey)
  const initialRel = queuedRel?.operation.kind === 'npcRelationship' ? queuedRel.operation.relationship : npc.relationship
  const [relationship, setRelationship] = useState<NpcRelationship>(initialRel)
  useEffect(() => setRelationship(initialRel), [initialRel])

  return (
    <div className="editor-item-row">
      <strong>{npc.name}</strong>
      <select value={relationship} onChange={(event) => setRelationship(event.target.value as NpcRelationship)}>
        {relationshipOptions.map((value) => <option key={value} value={value}>{relationshipLabels[value]}</option>)}
      </select>
      <button
        className="button button--secondary"
        onClick={() => controller.addEdit(relKey, { kind: 'npcRelationship', id: npc.id, name: npc.name, relationship }, `${npc.name}: relacja → ${relationshipLabels[relationship]}`)}
      >
        Zastosuj
      </button>
      {npc.isDead && (
        <button
          className="icon-button"
          title="Wskrześ"
          disabled={Boolean(queuedRevive)}
          onClick={() => controller.addEdit(reviveKey, { kind: 'npcRevive', id: npc.id, name: npc.name }, `Wskrześ: ${npc.name}`)}
        >
          <HeartPulse size={14} />
        </button>
      )}
      {queuedRel && <small className="editor-field__queued">w kolejce: {relationshipLabels[queuedRel.operation.kind === 'npcRelationship' ? queuedRel.operation.relationship : relationship]}</small>}
      {queuedRevive && <small className="editor-field__queued">w kolejce: wskrzeszenie</small>}
    </div>
  )
}

export function NpcEditTab({ filePath, controller }: { filePath: string; controller: PendingEditsController }) {
  const [query, setQuery] = useState('')
  const npcs = useAsyncResource<NpcSummary[]>(window.gothic ? () => window.gothic!.listNpcs(filePath) : null, [filePath])
  const filtered = (npcs.data || []).filter((npc) => `${npc.name} ${npc.id}`.toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl')))
  const relevant = filtered.filter((npc) => npc.isDead || npc.relationship !== 'neutral' || controller.byTargetKey.has(`npc-relationship:${npc.id}`)).slice(0, 200)

  return (
    <div className="deep-tab-panel">
      <p className="tab-note">Pokazujemy postacie martwe lub o zmienionej relacji — użyj wyszukiwania, żeby znaleźć dowolną inną.</p>
      <SearchField value={query} onChange={setQuery} placeholder="Szukaj postaci…" />
      <TabPanelState loading={npcs.loading} error={npcs.error} empty={!npcs.loading && !relevant.length && !query} emptyLabel="Brak martwych lub oznaczonych postaci — wyszukaj po imieniu" />
      <div className="editor-item-list">
        {(query ? filtered.slice(0, 200) : relevant).map((npc) => <NpcRow key={npc.id} npc={npc} controller={controller} />)}
      </div>
    </div>
  )
}
