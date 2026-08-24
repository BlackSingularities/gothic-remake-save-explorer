import { useState } from 'react'
import { StatusDot } from '../../../components/Brand'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { DeepSaveDetails, QuestEntry, TutorialEntry } from '../../../types'

const stateLabels: Record<QuestEntry['state'], string> = {
  available: 'DOSTĘPNE',
  running: 'AKTYWNE',
  succeeded: 'UKOŃCZONE',
  failed: 'NIEPOWODZENIE',
  none: 'BRAK',
  unknown: 'NIEZNANE',
}

function QuestRow({ id, name, group, state }: { id: string; name: string; group: string; state: QuestEntry['state'] }) {
  return (
    <div key={id}>
      <span className={`quest-state quest-state--${state}`}><StatusDot active={state === 'running' || state === 'succeeded'} /></span>
      <div><strong>{name}</strong><span>{group}</span><code>{id}</code></div>
      <b>{stateLabels[state]}</b>
    </div>
  )
}

export function QuestsTab({ details, filePath }: { details: DeepSaveDetails; filePath: string }) {
  const [showTutorials, setShowTutorials] = useState(false)
  const tutorials = useAsyncResource<TutorialEntry[]>(
    showTutorials && window.gothic ? () => window.gothic!.tutorials(filePath) : null,
    [filePath, showTutorials],
  )

  return (
    <div className="deep-tab-panel">
      <div className="quest-summary-grid">
        <div className="is-running"><span>Aktywne</span><strong>{details.quests.running}</strong></div>
        <div className="is-success"><span>Ukończone</span><strong>{details.quests.succeeded}</strong></div>
        <div><span>Dostępne</span><strong>{details.quests.available}</strong></div>
        <div><span>W rdzeniu</span><strong>{details.quests.total}</strong></div>
      </div>
      <div className="quest-list">
        {details.quests.entries.map((quest) => <QuestRow key={quest.id} {...quest} />)}
      </div>
      <details className="unlearned-skills" onToggle={(event) => setShowTutorials(event.currentTarget.open)}>
        <summary>Poradniki</summary>
        <TabPanelState loading={tutorials.loading} error={tutorials.error} empty={!tutorials.loading && !tutorials.data?.length} />
        {tutorials.data && (
          <div className="quest-list">
            {tutorials.data.map((tutorial) => <QuestRow key={tutorial.id} {...tutorial} />)}
          </div>
        )}
      </details>
    </div>
  )
}
