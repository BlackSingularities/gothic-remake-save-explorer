import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SearchField } from '../../../components/Controls'
import type { DeepSaveDetails, QuestEntry } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

const states: QuestEntry['state'][] = ['available', 'running', 'succeeded', 'failed']
const stateLabels: Record<string, string> = { available: 'Available', running: 'Running', succeeded: 'Succeeded', failed: 'Failed' }

function QuestRow({ quest, controller }: { quest: QuestEntry; controller: PendingEditsController }) {
  const targetKey = `quest:${quest.id}`
  const queued = controller.byTargetKey.get(targetKey)
  const queuedState = queued?.operation.kind === 'questState' ? queued.operation.state : undefined
  const fallbackState = stateLabels[quest.state] ?? 'Running'
  const [state, setState] = useState(queuedState ?? fallbackState)
  useEffect(() => setState(queuedState ?? fallbackState), [queuedState, fallbackState])

  const apply = () => controller.addEdit(
    targetKey,
    { kind: 'questState', id: quest.id, statePath: quest.statePath, name: quest.name, state, previousState: quest.state },
    `${quest.name}: ${quest.state} → ${state}`,
  )

  return (
    <form className="editor-item-row" onSubmit={(event) => { event.preventDefault(); apply() }}>
      <div>
        <strong>{quest.name}</strong>
        <span>{quest.group}</span>
      </div>
      <select value={state} onChange={(event) => setState(event.target.value)}>
        {states.map((value) => <option key={value} value={stateLabels[value]}>{stateLabels[value]}</option>)}
      </select>
      <button className="icon-button" type="submit" title="Zastosuj" disabled={!quest.statePath.length}><Check size={14} /></button>
      {queuedState && <small className="editor-field__queued">w kolejce: {queuedState}</small>}
    </form>
  )
}

export function QuestsEditTab({ details, controller }: { details: DeepSaveDetails; controller: PendingEditsController }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase('pl')
    return details.quests.entries.filter((quest) => `${quest.name} ${quest.group}`.toLocaleLowerCase('pl').includes(needle))
  }, [details.quests.entries, query])

  return (
    <div className="deep-tab-panel">
      <p className="tab-note">Klasyczny przykład: zablokowana Próba Ognia (OBJ_WATERFALL / OBJ_SEA) na stanie „Running” — ustaw na „Succeeded”, żeby odblokować dalszy ciąg.</p>
      <SearchField value={query} onChange={setQuery} placeholder="Filtruj zadania…" />
      <section className="drawer-section deep-section">
        <div className="editor-item-list">
          {filtered.map((quest) => <QuestRow key={quest.id} quest={quest} controller={controller} />)}
          {!filtered.length && <div className="inline-empty">Brak pasujących zadań</div>}
        </div>
      </section>
    </div>
  )
}
