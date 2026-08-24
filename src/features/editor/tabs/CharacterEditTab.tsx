import { Check } from 'lucide-react'
import { useState } from 'react'
import type { PendingEditsController } from '../usePendingEdits'
import type { DeepSaveDetails, ParsedSave } from '../../../types'

const editableAttributes = ['Health', 'MaxHealth', 'Mana', 'MaxMana', 'Strength', 'Dexterity', 'Level', 'Experience']

function AttributeField({ id, label, current, controller }: { id: string; label: string; current: number; controller: PendingEditsController }) {
  const targetKey = `attribute:${id}`
  const queued = controller.byTargetKey.get(targetKey)
  const queuedValue = queued?.operation.kind === 'attribute' ? queued.operation.value : undefined
  const [value, setValue] = useState(String(queuedValue ?? current))

  return (
    <div className="editor-field">
      <span>{label}</span>
      <div className="editor-field__row">
        <input type="number" value={value} onChange={(event) => setValue(event.target.value)} />
        <button
          className="button button--secondary"
          onClick={() => {
            const parsed = Number(value)
            if (!Number.isFinite(parsed)) return
            controller.addEdit(targetKey, { kind: 'attribute', id, label, value: parsed, previous: current }, `${label}: ${current} → ${parsed}`)
          }}
        >
          <Check size={14} /> Zastosuj
        </button>
      </div>
      {queuedValue !== undefined && <small className="editor-field__queued">w kolejce: {queuedValue}</small>}
    </div>
  )
}

export function CharacterEditTab({ details, save, controller }: { details: DeepSaveDetails; save: ParsedSave; controller: PendingEditsController }) {
  const [name, setName] = useState(save.displayName)
  const nameQueued = controller.byTargetKey.get('saveName')

  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading"><div><p className="eyebrow">TOŻSAMOŚĆ ZAPISU</p><h3>Nazwa nowej kopii</h3></div></div>
        <div className="editor-field">
          <div className="editor-field__row">
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
            <button
              className="button button--secondary"
              onClick={() => controller.addEdit('saveName', { kind: 'saveName', value: name, previous: save.displayName }, `Nazwa zapisu → ${name}`)}
            >
              <Check size={14} /> Zastosuj
            </button>
          </div>
          {nameQueued && <small className="editor-field__queued">w kolejce: {nameQueued.operation.kind === 'saveName' ? nameQueued.operation.value : ''}</small>}
        </div>
      </section>
      <section className="drawer-section deep-section">
        <div className="section-heading"><div><p className="eyebrow">PARAMETRY BEZIMIENNEGO</p><h3>Atrybuty postaci</h3></div></div>
        <div className="editor-field-grid">
          {editableAttributes.map((id) => {
            const attribute = details.character.attributes.find((entry) => entry.id === id)
            if (!attribute) return null
            return <AttributeField key={id} id={id} label={attribute.label} current={attribute.current} controller={controller} />
          })}
        </div>
      </section>
    </div>
  )
}
