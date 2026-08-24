import {
  Archive, ArrowLeft, Check, Coins, Database, RefreshCcw, ScrollText, Shield, SlidersHorizontal, Sword, Users, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TabDef } from '../../components/Tabs'
import { TabBar } from '../../components/Tabs'
import { formatBytes, formatDate, formatDuration } from '../../lib/format'
import type { DeepSaveDetails, ParsedSave } from '../../types'
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

function attributeValue(details: DeepSaveDetails | null, id: string): number {
  return details?.character.attributes.find((attribute) => attribute.id === id)?.current || 0
}

export function SaveDetailView({ save, onClose }: { save: ParsedSave; onClose: () => void }) {
  const [details, setDetails] = useState<DeepSaveDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<DetailTab>('character')

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

  const tabs: Array<TabDef<DetailTab>> = [
    { id: 'character', label: 'Postać', icon: <Sword size={14} /> },
    { id: 'inventory', label: 'Ekwipunek', icon: <Archive size={14} />, badge: details?.inventory.stackCount },
    { id: 'skills', label: 'Umiejętności', icon: <SlidersHorizontal size={14} /> },
    { id: 'quests', label: 'Zadania', icon: <ScrollText size={14} />, badge: details?.quests.running },
    { id: 'npcs', label: 'NPC', icon: <Users size={14} /> },
    { id: 'traders', label: 'Handlarze', icon: <Coins size={14} /> },
    { id: 'factions', label: 'Frakcje', icon: <Shield size={14} /> },
    { id: 'glossary', label: 'Kompendium', icon: <ScrollText size={14} /> },
    { id: 'world', label: 'Świat', icon: <Database size={14} /> },
    { id: 'advanced', label: 'Zaawansowane', icon: <SlidersHorizontal size={14} /> },
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
      </div>

      <div className="save-view__body">
        <div className="deep-status">
          <div><p className="eyebrow">RDZEŃ GSAV</p><strong>{loading ? 'Rozpakowuję zapis…' : error ? 'Odczyt niepełny' : 'Głęboka telemetria aktywna'}</strong></div>
          {loading ? <RefreshCcw size={17} className="is-spinning" /> : error ? <X size={17} /> : <span className="success-pill"><Check size={13} /> Odczytano</span>}
        </div>

        {error && <div className="deep-error"><Shield size={17} /><div><strong>Nie udało się odczytać warstwy prywatnej</strong><p>{error}</p></div></div>}

        {details && (
          <>
            <div className="deep-hero-stats">
              <div><span>Poziom</span><strong>{attributeValue(details, 'Level')}</strong></div>
              <div><span>Doświadczenie</span><strong>{attributeValue(details, 'Experience').toLocaleString('pl-PL')}</strong></div>
              <div><span>Życie</span><strong>{attributeValue(details, 'Health')} / {attributeValue(details, 'MaxHealth')}</strong></div>
              <div><span>Ruda</span><strong>{details.inventory.oreCount}</strong></div>
            </div>

            <TabBar tabs={tabs} active={tab} onChange={setTab} />

            <div className="save-view__panel">
              {tab === 'character' && <CharacterTab details={details} />}
              {tab === 'inventory' && <InventoryTab details={details} />}
              {tab === 'skills' && <SkillsTab details={details} />}
              {tab === 'quests' && <QuestsTab details={details} filePath={save.filePath} />}
              {tab === 'npcs' && <NpcsTab filePath={save.filePath} />}
              {tab === 'traders' && <TradersTab filePath={save.filePath} />}
              {tab === 'factions' && <FactionsTab details={details} />}
              {tab === 'glossary' && <GlossaryTab filePath={save.filePath} />}
              {tab === 'world' && <WorldTab details={details} filePath={save.filePath} />}
              {tab === 'advanced' && <AdvancedTab filePath={save.filePath} />}
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
