import { Check } from 'lucide-react'
import { useState } from 'react'
import type { DeepSaveDetails, QuestEntry } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

const states: QuestEntry['state'][] = ['available', 'running', 'succeeded', 'failed']
const stateLabels: Record<string, string> = { available: 'Available', running: 'Running', succeeded: 'Succeeded', failed: 'Failed' }

function QuestRow({ quest, controller }: { quest: QuestEntry; controller: PendingEditsController }) {
  const targetKey = `quest:${quest.id}`
  const queued = controller.byTargetKey.get(targetKey)
  const queuedState = queued?.operation.kind === 'questState' ? queued.operation.state : undefined
  const [state, setState] = useState(queuedState ?? stateLabels[quest.state] ?? 'Running')

  return (
    <div className="editor-item-row">
      <div>
        <strong>{quest.name}</strong>
        <span>{quest.group}</span>
      </div>
      <select value={state} onChange={(event) => setState(event.target.value)}>
        {states.map((value) => <option key={value} value={stateLabels[value]}>{stateLabels[value]}</option>)}
      </select>
      <button
        className="icon-button"
        title="Zastosuj"
        onClick={() => controller.addEdit(
          targetKey,
          { kind: 'questState', id: quest.id, statePath: quest.statePath, name: quest.name, state, previousState: quest.state },
          `${quest.name}: ${quest.state} → ${state}`,
        )}
        disabled={!quest.statePath.length}
      >
        <Check size={14} />
      </button>
      {queuedState && <small className="editor-field__queued">w kolejce: {queuedState}</small>}
    </div>
  )
}

export function QuestsEditTab({ details, controller }: { details: DeepSaveDetails; controller: PendingEditsController }) {
  return (
    <div className="deep-tab-panel">
      <p className="tab-note">Klasyczny przykład: zablokowana Próba Ognia (OBJ_WATERFALL / OBJ_SEA) na stanie „Running” — ustaw na „Succeeded”, żeby odblokować dalszy ciąg.</p>
      <section className="drawer-section deep-section">
        <div className="editor-item-list">
          {details.quests.entries.map((quest) => <QuestRow key={quest.id} quest={quest} controller={controller} />)}
          {!details.quests.entries.length && <div className="inline-empty">Brak aktywnych zadań w tym zapisie</div>}
        </div>
      </section>
    </div>
  )
}
