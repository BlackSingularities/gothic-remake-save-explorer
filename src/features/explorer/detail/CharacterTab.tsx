import { MapPinned } from 'lucide-react'
import type { DeepSaveDetails } from '../../../types'

export function CharacterTab({ details }: { details: DeepSaveDetails }) {
  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading">
          <div><p className="eyebrow">PARAMETRY BEZIMIENNEGO</p><h3>Atrybuty postaci</h3></div>
          <span className="section-caption">wartość bieżąca / bazowa</span>
        </div>
        <div className="attribute-grid">
          {details.character.attributes.map((attribute) => (
            <div key={attribute.id}>
              <span>{attribute.label}</span>
              <strong>{attribute.current}{attribute.current !== attribute.base && <small> / {attribute.base}</small>}</strong>
            </div>
          ))}
        </div>
      </section>
      {details.character.position && (
        <section className="drawer-section deep-section position-strip">
          <MapPinned size={18} />
          <div>
            <span>Pozycja w świecie</span>
            <code>
              X {Math.round(details.character.position.x)} · Y {Math.round(details.character.position.y)} · Z {Math.round(details.character.position.z)} · kierunek {Math.round(details.character.position.yaw)}°
            </code>
          </div>
        </section>
      )}
    </div>
  )
}
