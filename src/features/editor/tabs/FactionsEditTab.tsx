import { Check } from 'lucide-react'
import type { DeepSaveDetails } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'
import { tr } from '../../../i18n/tr'

export function FactionsEditTab({ details, controller }: { details: DeepSaveDetails; controller: PendingEditsController }) {
  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading"><div><p className="eyebrow">{tr('REPUTACJA')}</p><h3>{tr('Wybacz przewinienia wobec frakcji')}</h3></div></div>
        <div className="faction-list">
          {details.factions.map((faction) => {
            const targetKey = `faction:${faction.id}`
            const queued = controller.byTargetKey.get(targetKey)
            return (
              <div key={faction.id}>
                <div><strong>{tr(faction.label)}</strong><span>{tr('{0} niewybaczonych z {1}', faction.unforgiven, faction.total)}</span></div>
                <button
                  className="button button--secondary"
                  disabled={faction.unforgiven === 0 || Boolean(queued)}
                  onClick={() => controller.addEdit(targetKey, { kind: 'factionForgive', guild: faction.id, label: faction.label }, tr('Wybacz wszystko: {0}', tr(faction.label)))}
                >
                  <Check size={14} /> {queued ? tr('W kolejce') : tr('Wybacz wszystko')}
                </button>
              </div>
            )
          })}
          {!details.factions.length && <div className="inline-empty">{tr('Brak danych o frakcjach')}</div>}
        </div>
      </section>
    </div>
  )
}
