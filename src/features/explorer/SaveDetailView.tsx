import {
  Archive, ArrowLeft, Coins, Database, Pencil, RefreshCcw, ScrollText, Shield, SlidersHorizontal, Sword, Users, X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { TabDef } from '../../components/Tabs'
import { TabBar } from '../../components/Tabs'
import { formatBytes, formatDate, formatDuration } from '../../lib/format'
import { AdvancedEditTab } from '../editor/tabs/AdvancedEditTab'
import { CharacterEditTab } from '../editor/tabs/CharacterEditTab'
import { FactionsEditTab } from '../editor/tabs/FactionsEditTab'
import { InventoryEditTab } from '../editor/tabs/InventoryEditTab'
import { NpcEditTab } from '../editor/tabs/NpcEditTab'
import { QuestsEditTab } from '../editor/tabs/QuestsEditTab'
import { SkillsEditTab } from '../editor/tabs/SkillsEditTab'
import { TradersEditTab } from '../editor/tabs/TradersEditTab'
import { PendingEditsPanel } from '../editor/PendingEditsPanel'
import { usePendingEdits } from '../editor/usePendingEdits'
import type { DeepSaveDetails, ParsedSave, ScanResult } from '../../types'
import { AdvancedTab } from './detail/AdvancedTab'
import { CharacterTab } from './detail/CharacterTab'
import { FactionsTab } from './detail/FactionsTab'
import { GlossaryTab } from './detail/GlossaryTab'
import { InventoryTab } from './detail/InventoryTab'
import { NpcsTab } from './detail/NpcsTab'
import { QuestsTab } from './detail/QuestsTab'
import { SkillsTab } from './detail/SkillsTab'
import { TradersTab } from './detail/TradersTab'
import { WorldTab } from './detail/WorldTab'
import { KindBadge } from './SaveCard'

type DetailTab = 'character' | 'inventory' | 'skills' | 'quests' | 'npcs' | 'traders' | 'factions' | 'glossary' | 'world' | 'advanced'

const SAFETY_BANNER_KEY = 'gothic-save-explorer.editor.safety-acknowledged'

function attributeValue(details: DeepSaveDetails | null, id: string): number {
  return details?.character.attributes.find((attribute) => attribute.id === id)?.current || 0
}

function tabForTargetKey(targetKey: string): DetailTab | null {
  if (targetKey.startsWith('attribute:') || targetKey === 'position' || targetKey === 'saveName') return 'character'
  if (targetKey.startsWith('item-')) return 'inventory'
  if (targetKey.startsWith('skill:')) return 'skills'
  if (targetKey.startsWith('quest:')) return 'quests'
  if (targetKey.startsWith('npc-')) return 'npcs'
  if (targetKey.startsWith('trader-')) return 'traders'
  if (targetKey.startsWith('faction:')) return 'factions'
  if (targetKey === 'chapter') return 'world'
  if (targetKey.startsWith('raw:')) return 'advanced'
  return null
}

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

export function SaveDetailView({
  save, scan, onClose, onCommitted,
}: { save: ParsedSave; scan: ScanResult; onClose: () => void; onCommitted?: (slotName: string) => void }) {
  const [details, setDetails] = useState<DeepSaveDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<DetailTab>('character')
  const [editMode, setEditMode] = useState(false)
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
    setTab('character')
    if (!window.gothic) {
      setLoading(false)
      setError('Głęboka telemetria działa w aplikacji desktopowej')
      return
    }
    void window.gothic.inspectDeepSave(save.filePath).then((result) => {
      if (!active) return
      if (result.success && result.details) setDetails(result.details)
      else setError(result.error || 'Nie udało się rozpakować rdzenia zapisu')
      setLoading(false)
    }).catch((fetchError) => {
      if (!active) return
      setError(fetchError instanceof Error ? fetchError.message : 'Nie udało się rozpakować rdzenia zapisu')
      setLoading(false)
    })
    return () => { active = false }
  }, [save.filePath])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const dismissBanner = () => {
    setShowBanner(false)
    try {
      window.localStorage.setItem(SAFETY_BANNER_KEY, 'true')
    } catch {
      // Ignore storage errors — the banner just reappears next session, which is fine.
    }
  }

  const toggleEditMode = () => {
    setEditMode((prev) => !prev)
  }

  const pendingCountByTab = useMemo(() => {
    const counts: Partial<Record<DetailTab, number>> = {}
    for (const edit of controller.pending) {
      const target = tabForTargetKey(edit.targetKey)
      if (!target) continue
      counts[target] = (counts[target] || 0) + 1
    }
    return counts
  }, [controller.pending])

  const tabs: Array<TabDef<DetailTab>> = [
    { id: 'character', label: 'Postać', icon: <Sword size={14} />, badge: editMode ? pendingCountByTab.character : undefined, badgePending: true },
    { id: 'inventory', label: 'Ekwipunek', icon: <Archive size={14} />, badge: editMode ? pendingCountByTab.inventory : details?.inventory.stackCount, badgePending: editMode },
    { id: 'skills', label: 'Umiejętności', icon: <SlidersHorizontal size={14} />, badge: editMode ? pendingCountByTab.skills : undefined, badgePending: true },
    { id: 'quests', label: 'Zadania', icon: <ScrollText size={14} />, badge: editMode ? pendingCountByTab.quests : details?.quests.running, badgePending: editMode },
    { id: 'npcs', label: 'NPC', icon: <Users size={14} />, badge: editMode ? pendingCountByTab.npcs : undefined, badgePending: true },
    { id: 'traders', label: 'Handlarze', icon: <Coins size={14} />, badge: editMode ? pendingCountByTab.traders : undefined, badgePending: true },
    { id: 'factions', label: 'Frakcje', icon: <Shield size={14} />, badge: editMode ? pendingCountByTab.factions : undefined, badgePending: true },
    { id: 'glossary', label: 'Kompendium', icon: <ScrollText size={14} /> },
    { id: 'world', label: 'Świat', icon: <Database size={14} />, badge: editMode ? pendingCountByTab.world : undefined, badgePending: true },
    { id: 'advanced', label: 'Zaawansowane', icon: <SlidersHorizontal size={14} />, badge: editMode ? pendingCountByTab.advanced : undefined, badgePending: true },
  ]

  return (
    <div className="save-view">
      <div className="save-view__hero">
        {save.screenshot && <img src={save.screenshot} alt="" />}
        <div className="save-view__shade" />
        <button className="save-view__back" onClick={onClose}><ArrowLeft size={16} /> Wróć do eksploratora</button>
        <div className="save-view__title">
          <KindBadge kind={save.kind} />
          <p>{save.slotName} · Profil {save.profileId + 1} · {formatDuration(save.timePlayedSeconds)}</p>
          <h2>{save.displayName}</h2>
        </div>
        {details && (
          <button className={`save-view__edit-toggle${editMode ? ' is-active' : ''}`} onClick={toggleEditMode}>
            <Pencil size={15} /> {editMode ? 'Zakończ edycję' : 'Tryb edycji'}
          </button>
        )}
      </div>

      <div className="save-view__body">
        {loading && <div className="inline-loading"><RefreshCcw size={16} className="is-spinning" /> Rozpakowuję zapis…</div>}

        {error && <div className="deep-error"><Shield size={17} /><div><strong>Nie udało się odczytać warstwy prywatnej</strong><p>{error}</p></div></div>}

        {editMode && showBanner && <SafetyBanner onDismiss={dismissBanner} />}

        {details && (
          <>
            <div className="deep-hero-stats">
              <div><span>Poziom</span><strong>{attributeValue(details, 'Level')}</strong></div>
              <div><span>Doświadczenie</span><strong>{attributeValue(details, 'Experience').toLocaleString('pl-PL')}</strong></div>
              <div><span>Życie</span><strong>{attributeValue(details, 'Health')} / {attributeValue(details, 'MaxHealth')}</strong></div>
              <div><span>Ruda</span><strong>{details.inventory.oreCount}</strong></div>
            </div>

            <TabBar tabs={tabs} active={tab} onChange={setTab} />

            <div className={editMode ? 'editor-layout' : undefined}>
              <div className={editMode ? 'editor-layout__main' : undefined}>
                <div className={`save-view__panel${editMode ? ' is-editing' : ''}`}>
                  {tab === 'character' && (editMode
                    ? <CharacterEditTab details={details} save={save} controller={controller} />
                    : <CharacterTab details={details} />)}
                  {tab === 'inventory' && (editMode
                    ? <InventoryEditTab details={details} controller={controller} />
                    : <InventoryTab details={details} />)}
                  {tab === 'skills' && (editMode
                    ? <SkillsEditTab details={details} controller={controller} />
                    : <SkillsTab details={details} />)}
                  {tab === 'quests' && (editMode
                    ? <QuestsEditTab details={details} controller={controller} />
                    : <QuestsTab details={details} filePath={save.filePath} />)}
                  {tab === 'npcs' && (editMode
                    ? <NpcEditTab filePath={save.filePath} controller={controller} />
                    : <NpcsTab filePath={save.filePath} />)}
                  {tab === 'traders' && (editMode
                    ? <TradersEditTab filePath={save.filePath} controller={controller} />
                    : <TradersTab filePath={save.filePath} />)}
                  {tab === 'factions' && (editMode
                    ? <FactionsEditTab details={details} controller={controller} />
                    : <FactionsTab details={details} />)}
                  {tab === 'glossary' && <GlossaryTab filePath={save.filePath} />}
                  {tab === 'world' && <WorldTab details={details} filePath={save.filePath} controller={editMode ? controller : undefined} />}
                  {tab === 'advanced' && (editMode
                    ? <AdvancedEditTab filePath={save.filePath} controller={controller} />
                    : <AdvancedTab filePath={save.filePath} />)}
                </div>
              </div>
              {editMode && (
                <PendingEditsPanel
                  save={save}
                  scan={scan}
                  controller={controller}
                  onCommitted={(slotName) => {
                    setEditMode(false)
                    onCommitted?.(slotName)
                  }}
                />
              )}
            </div>
          </>
        )}

        <section className="drawer-section drawer-section--file">
          <div className="section-heading"><p className="eyebrow">PLIK ŹRÓDŁOWY</p>{details && <span className="section-caption">odczyt {details.parseTimeMs} ms</span>}</div>
          <code>{save.filePath}</code>
          <div className="file-facts">
            <span>{formatBytes(save.sizeBytes)}</span>
            <span>{formatDate(save.modifiedAt)}</span>
            {save.sha1 && <span title={save.sha1}>SHA1 {save.sha1.slice(0, 10)}…</span>}
            {details && <span>rdzeń {formatBytes(details.decoder.decompressedBytes)}</span>}
          </div>
        </section>
      </div>
    </div>
  )
}
