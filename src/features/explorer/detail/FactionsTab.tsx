import { BarChart } from '../../../components/Charts'
import type { DeepSaveDetails } from '../../../types'

export function FactionsTab({ details }: { details: DeepSaveDetails }) {
  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading">
          <div><p className="eyebrow">REPUTACJA W KOLONII</p><h3>Przewinienia wobec frakcji</h3></div>
        </div>
        <BarChart
          bars={details.factions.map((faction) => ({ label: faction.label, value: faction.total, color: faction.hostile ? '#c26852' : '#d3a14b' }))}
        />
        <div className="faction-list">
          {details.factions.map((faction) => (
            <div key={faction.id}>
              <div><strong>{faction.label}</strong><span>{faction.hostile ? 'Wrogo nastawieni' : `${faction.unforgiven} niewybaczonych`}</span></div>
              <b>{faction.total}</b>
              <p>Groźby {faction.crimes.threat} · napady {faction.crimes.assault} · kradzieże {faction.crimes.theft} · zabójstwa {faction.crimes.murder}</p>
            </div>
          ))}
          {!details.factions.length && <div className="inline-empty">Brak danych o frakcjach</div>}
        </div>
      </section>
    </div>
  )
}
