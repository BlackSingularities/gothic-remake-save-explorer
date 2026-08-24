import { Check } from 'lucide-react'
import type { DeepSaveDetails } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

export function FactionsEditTab({ details, controller }: { details: DeepSaveDetails; controller: PendingEditsController }) {
  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading"><div><p className="eyebrow">REPUTACJA</p><h3>Wybacz przewinienia wobec frakcji</h3></div></div>
        <div className="faction-list">
          {details.factions.map((faction) => {
            const targetKey = `faction:${faction.id}`
            const queued = controller.byTargetKey.get(targetKey)
            return (
              <div key={faction.id}>
                <div><strong>{faction.label}</strong><span>{faction.unforgiven} niewybaczonych z {faction.total}</span></div>
                <button
                  className="button button--secondary"
                  disabled={faction.unforgiven === 0 || Boolean(queued)}
                  onClick={() => controller.addEdit(targetKey, { kind: 'factionForgive', guild: faction.id, label: faction.label }, `Wybacz wszystko: ${faction.label}`)}
                >
                  <Check size={14} /> {queued ? 'W kolejce' : 'Wybacz wszystko'}
                </button>
              </div>
            )
          })}
          {!details.factions.length && <div className="inline-empty">Brak danych o frakcjach</div>}
        </div>
      </section>
    </div>
  )
}
