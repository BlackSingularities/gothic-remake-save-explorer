import { Check, Loader2, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { EditorCommitResult, ParsedSave, ScanResult } from '../../types'
import type { PendingEditsController } from './usePendingEdits'

export function PendingEditsPanel({
  save, scan, controller, onCommitted,
}: { save: ParsedSave; scan: ScanResult; controller: PendingEditsController; onCommitted: (slotName: string) => void }) {
  const [profileId, setProfileId] = useState(save.profileId)
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState<EditorCommitResult | null>(null)

  const commit = async () => {
    if (!window.gothic || !controller.pending.length) return
    setCommitting(true)
    setResult(null)
    try {
      const outcome = await window.gothic.editorCommit(save.filePath, controller.pending.map((edit) => edit.operation), profileId)
      setResult(outcome)
      if (outcome.success && outcome.slotName) {
        controller.clear()
        onCommitted(outcome.slotName)
      }
    } finally {
      setCommitting(false)
    }
  }

  return (
    <aside className="pending-edits">
      <div className="pending-edits__head">
        <h3>Kolejka zmian</h3>
        <span>{controller.pending.length}</span>
      </div>
      {!controller.pending.length && <p className="tab-note">Wybierz zmiany w zakładkach po lewej — pojawią się tutaj przed zapisaniem.</p>}
      <div className="pending-edits__list">
        {controller.pending.map((edit) => (
          <div key={edit.editId} className="pending-edits__item">
            <span>{edit.summary}</span>
            <button className="icon-button" onClick={() => controller.removeEdit(edit.editId)} aria-label="Usuń z kolejki"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {controller.pending.length > 0 && (
        <div className="pending-edits__commit">
          {scan.profiles.length > 1 && (
            <label className="pending-edits__profile">
              <span>Docelowy profil</span>
              <select value={profileId} onChange={(event) => setProfileId(Number(event.target.value))}>
                {scan.profiles.map((profile) => <option key={profile.id} value={profile.id}>Profil {profile.id + 1}</option>)}
              </select>
            </label>
          )}
          <button className="button button--primary button--full" onClick={() => void commit()} disabled={committing}>
            {committing ? <Loader2 size={16} className="is-spinning" /> : <Save size={16} />}
            Zapisz jako nowy zapis
          </button>
          <p className="pending-edits__note">Oryginalny plik nigdy nie jest modyfikowany — zmiany trafią do nowego slotu w katalogu zapisów.</p>
        </div>
      )}

      {result && (
        <div className={`pending-edits__result${result.success ? ' is-success' : ' is-error'}`}>
          {result.success ? <Check size={16} /> : <X size={16} />}
          <div>
            <strong>{result.success ? `Dodano nowy zapis ${result.slotName}` : 'Zapis nie powiódł się'}</strong>
            {result.error && <p>{result.error}</p>}
            <ul>
              {result.steps.map((step) => <li key={step.step} className={step.ok ? 'is-ok' : 'is-fail'}>{step.step}{step.detail ? ` — ${step.detail}` : ''}</li>)}
            </ul>
          </div>
        </div>
      )}
    </aside>
  )
}
