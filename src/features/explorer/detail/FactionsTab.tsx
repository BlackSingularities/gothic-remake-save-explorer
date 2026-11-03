import { BarChart } from '../../../components/Charts'
import type { DeepSaveDetails } from '../../../types'
import { tr } from '../../../i18n/tr'

export function FactionsTab({ details }: { details: DeepSaveDetails }) {
  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading">
          <div><p className="eyebrow">{tr('REPUTACJA W KOLONII')}</p><h3>{tr('Przewinienia wobec frakcji')}</h3></div>
        </div>
        <BarChart
          bars={details.factions.map((faction) => ({ label: tr(faction.label), value: faction.total, color: faction.hostile ? '#c26852' : '#d3a14b' }))}
        />
        <div className="faction-list">
          {details.factions.map((faction) => (
            <div key={faction.id}>
              <div><strong>{tr(faction.label)}</strong><span>{faction.hostile ? tr('Wrogo nastawieni') : tr('{0} niewybaczonych', faction.unforgiven)}</span></div>
              <b>{faction.total}</b>
              <p>{tr('Groźby {0} · napady {1} · kradzieże {2} · zabójstwa {3}', faction.crimes.threat, faction.crimes.assault, faction.crimes.theft, faction.crimes.murder)}</p>
            </div>
          ))}
          {!details.factions.length && <div className="inline-empty">{tr('Brak danych o frakcjach')}</div>}
        </div>
      </section>
    </div>
  )
}
