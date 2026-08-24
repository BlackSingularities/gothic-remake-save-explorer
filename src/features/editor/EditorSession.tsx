import { Archive, ArrowLeft, ScrollText, Shield, SlidersHorizontal, Sword, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TabDef } from '../../components/Tabs'
import { TabBar } from '../../components/Tabs'
import type { DeepSaveDetails, ParsedSave, ScanResult } from '../../types'
import { CharacterEditTab } from './tabs/CharacterEditTab'
import { FactionsEditTab } from './tabs/FactionsEditTab'
import { InventoryEditTab } from './tabs/InventoryEditTab'
import { NpcEditTab } from './tabs/NpcEditTab'
import { QuestsEditTab } from './tabs/QuestsEditTab'
import { SkillsEditTab } from './tabs/SkillsEditTab'
import { PendingEditsPanel } from './PendingEditsPanel'
import { usePendingEdits } from './usePendingEdits'

type EditorTab = 'character' | 'inventory' | 'skills' | 'quests' | 'npcs' | 'factions'

const SAFETY_BANNER_KEY = 'gothic-save-explorer.editor.safety-acknowledged'

function SafetyBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="editor-safety-banner">
      <Shield size={22} />
      <div>
        <strong>Edytujesz kopię, nie oryginał</strong>
        <p>Każda zmiana zapisywana jest do nowego pliku i dokładana jako osobny slot w katalogu zapisów — oryginalny plik nigdy nie jest modyfikowany. Mimo to trzymaj własne kopie ważnych zapisów. Jeśli grasz przez Steam Cloud, edytuj przy uruchomionej grze i wczytaj nowy slot z menu, zamiast restartować grę — inaczej chmura może nadpisać zmiany.</p>
      </div>
      <button className="icon-button" onClick={onDismiss} aria-label="Zamknij"><X size={16} /></button>
    </div>
  )
}

export function EditorSession({ save, scan, onClose, onCommitted }: { save: ParsedSave; scan: ScanResult; onClose: () => void; onCommitted: (slotName: string) => void }) {
  const [details, setDetails] = useState<DeepSaveDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<EditorTab>('character')
  const [showBanner, setShowBanner] = useState(() => {
    try {
      return window.localStorage.getItem(SAFETY_BANNER_KEY) !== 'true'
    } catch {
      return true
    }
  })
  const controller = usePendingEdits()

  useEffect(() => {
    let active = true
    setDetails(null)
    setError('')
    setLoading(true)
    if (!window.gothic) {
      setLoading(false)
      setError('Edytor działa w aplikacji desktopowej')
      return
    }
    void window.gothic.inspectDeepSave(save.filePath).then((result) => {
      if (!active) return
      if (result.success && result.details) setDetails(result.details)
      else setError(result.error || 'Nie udało się rozpakować rdzenia zapisu')
      setLoading(false)
    })
    return () => { active = false }
  }, [save.filePath])

  const dismissBanner = () => {
    setShowBanner(false)
    try {
      window.localStorage.setItem(SAFETY_BANNER_KEY, 'true')
    } catch {
      // Ignore storage errors — the banner just reappears next session, which is fine.
    }
  }

  const tabs: Array<TabDef<EditorTab>> = [
    { id: 'character', label: 'Postać', icon: <Sword size={14} /> },
    { id: 'inventory', label: 'Ekwipunek', icon: <Archive size={14} /> },
    { id: 'skills', label: 'Umiejętności', icon: <SlidersHorizontal size={14} /> },
    { id: 'quests', label: 'Zadania', icon: <ScrollText size={14} /> },
    { id: 'npcs', label: 'NPC', icon: <Users size={14} /> },
    { id: 'factions', label: 'Frakcje', icon: <Shield size={14} /> },
  ]

  return (
    <div className="save-view editor-view">
      <div className="save-view__hero editor-view__hero">
        {save.screenshot && <img src={save.screenshot} alt="" />}
        <div className="save-view__shade" />
        <button className="save-view__back" onClick={onClose}><ArrowLeft size={16} /> Wróć do edytora</button>
        <div className="save-view__title">
          <p>EDYTOR · {save.slotName} · Profil {save.profileId + 1}</p>
          <h2>{save.displayName}</h2>
        </div>
      </div>
      <div className="save-view__body editor-view__body">
        {showBanner && <SafetyBanner onDismiss={dismissBanner} />}
        {loading && <div className="inline-empty">Rozpakowuję zapis…</div>}
        {error && <div className="deep-error"><Shield size={17} /><div><strong>Nie udało się otworzyć zapisu do edycji</strong><p>{error}</p></div></div>}
        {details && (
          <div className="editor-layout">
            <div className="editor-layout__main">
              <TabBar tabs={tabs} active={tab} onChange={setTab} />
              {tab === 'character' && <CharacterEditTab details={details} save={save} controller={controller} />}
              {tab === 'inventory' && <InventoryEditTab details={details} controller={controller} />}
              {tab === 'skills' && <SkillsEditTab details={details} controller={controller} />}
              {tab === 'quests' && <QuestsEditTab details={details} controller={controller} />}
              {tab === 'npcs' && <NpcEditTab filePath={save.filePath} controller={controller} />}
              {tab === 'factions' && <FactionsEditTab details={details} controller={controller} />}
            </div>
            <PendingEditsPanel save={save} scan={scan} controller={controller} onCommitted={onCommitted} />
          </div>
        )}
      </div>
    </div>
  )
}
