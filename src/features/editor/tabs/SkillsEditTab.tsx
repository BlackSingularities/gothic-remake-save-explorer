import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DeepSaveDetails, SkillCatalogEntry } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

function SkillRow({ entry, currentTier, controller }: { entry: SkillCatalogEntry; currentTier: string; controller: PendingEditsController }) {
  const targetKey = `skill:${entry.base}`
  const queued = controller.byTargetKey.get(targetKey)
  const queuedTier = queued?.operation.kind === 'skill' ? queued.operation.tier : undefined
  const fallbackTier = entry.tiers.includes(currentTier) ? currentTier : entry.tiers[0]
  const [tier, setTier] = useState(queuedTier ?? fallbackTier)
  useEffect(() => setTier(queuedTier ?? fallbackTier), [queuedTier, fallbackTier])

  return (
    <div className="editor-item-row">
      <strong>{entry.label}</strong>
      <span>{currentTier}</span>
      <select value={tier} onChange={(event) => setTier(event.target.value)}>
        {entry.tiers.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <button
        className="icon-button"
        title="Zastosuj"
        onClick={() => controller.addEdit(targetKey, { kind: 'skill', base: entry.base, label: entry.label, tier, previousTier: currentTier }, `${entry.label}: ${currentTier} → ${tier}`)}
      >
        <Check size={14} />
      </button>
      {queuedTier && <small className="editor-field__queued">w kolejce: {queuedTier}</small>}
    </div>
  )
}

export function SkillsEditTab({ details, controller }: { details: DeepSaveDetails; controller: PendingEditsController }) {
  const [catalog, setCatalog] = useState<SkillCatalogEntry[] | null>(null)

  useEffect(() => {
    let active = true
    if (!window.gothic) return
    void window.gothic.editorSkillCatalog().then((result) => {
      if (active && result.success && result.data) setCatalog(result.data)
    })
    return () => { active = false }
  }, [])

  if (!catalog) return <div className="inline-empty">Wczytywanie katalogu umiejętności…</div>

  const currentByBase = new Map(details.skills.map((skill) => [skill.id, skill]))
  const byCategory = new Map<string, SkillCatalogEntry[]>()
  for (const entry of catalog) {
    const list = byCategory.get(entry.category) || []
    list.push(entry)
    byCategory.set(entry.category, list)
  }

  return (
    <div className="deep-tab-panel">
      <p className="tab-note">Zmiana poziomu opiera się na katalogu umiejętności gry — nauczenie umiejętności, której postać jeszcze nie ma, jest oznaczone przez twórców jako eksperymentalne.</p>
      {[...byCategory.entries()].map(([category, entries]) => (
        <section className="drawer-section deep-section" key={category}>
          <div className="section-heading"><h3>{category}</h3></div>
          <div className="editor-item-list">
            {entries.map((entry) => (
              <SkillRow key={entry.base} entry={entry} currentTier={currentByBase.get(entry.base)?.level || 'Untrained'} controller={controller} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
