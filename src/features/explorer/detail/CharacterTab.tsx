import { MapPinned } from 'lucide-react'
import type { DeepSaveDetails } from '../../../types'
import { tr } from '../../../i18n/tr'

export function CharacterTab({ details }: { details: DeepSaveDetails }) {
  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading">
          <div><p className="eyebrow">{tr('PARAMETRY BEZIMIENNEGO')}</p><h3>{tr('Atrybuty postaci')}</h3></div>
          <span className="section-caption">{tr('wartość bieżąca / bazowa')}</span>
        </div>
        <div className="attribute-grid">
          {details.character.attributes.map((attribute) => (
            <div key={attribute.id}>
              <span>{tr(attribute.label)}</span>
              <strong>{attribute.current}{attribute.current !== attribute.base && <small> / {attribute.base}</small>}</strong>
            </div>
          ))}
        </div>
      </section>
      {details.character.position && (
        <section className="drawer-section deep-section position-strip">
          <MapPinned size={18} />
          <div>
            <span>{tr('Pozycja w świecie')}</span>
            <code>
              X {Math.round(details.character.position.x)} · Y {Math.round(details.character.position.y)} · Z {Math.round(details.character.position.z)} · {tr('kierunek {0}°', Math.round(details.character.position.yaw))}
            </code>
          </div>
        </section>
      )}
    </div>
  )
}
