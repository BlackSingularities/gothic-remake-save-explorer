import { Archive, Clock3, Database, Eye, HardDrive, Save, ScrollText, Sword } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SearchField, SegmentedControl, ViewToggle } from '../../components/Controls'
import { MetricCard } from '../../components/MetricCard'
import { useAsyncResource, useViewMode } from '../../lib/hooks'
import { chapterLabel, formatBytes, formatDuration } from '../../lib/format'
import type { DeepSaveDetails, ParsedSave, SaveKind, ScanResult } from '../../types'
import { SaveCard, SaveListRow } from './SaveCard'

type SortMode = 'date' | 'playtime' | 'level' | 'chapter'

function attributeValue(details: DeepSaveDetails | null, id: string): number {
  return details?.character.attributes.find((attribute) => attribute.id === id)?.current || 0
}

export function ExplorerPage({ scan, saves, onOpenSave }: { scan: ScanResult; saves: ParsedSave[]; onOpenSave: (save: ParsedSave) => void }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | SaveKind>('all')
  const [sort, setSort] = useState<SortMode>('date')
  const [viewMode, setViewMode] = useViewMode('explorer.saves.view', 'grid')

  const latest = saves[0]
  const latestDetails = useAsyncResource<DeepSaveDetails>(
    latest && window.gothic ? () => window.gothic!.inspectDeepSave(latest.filePath).then((r) => ({ success: r.success, data: r.details, error: r.error })) : null,
    [latest?.filePath],
  )

  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase('pl')
    const list = saves.filter((save) => {
      const matchesQuery = `${save.slotName} ${save.displayName} ${save.mapName}`.toLocaleLowerCase('pl').includes(needle)
      return matchesQuery && (kind === 'all' || save.kind === kind)
    })
    const sorted = [...list]
    if (sort === 'playtime') sorted.sort((a, b) => b.timePlayedSeconds - a.timePlayedSeconds)
    else if (sort === 'chapter') sorted.sort((a, b) => b.chapter - a.chapter || b.modifiedAtMs - a.modifiedAtMs)
    else if (sort === 'level') sorted.sort((a, b) => b.modifiedAtMs - a.modifiedAtMs) // level requires deep data; date is the closest cheap proxy
    else sorted.sort((a, b) => b.modifiedAtMs - a.modifiedAtMs)
    return sorted
  }, [saves, query, kind, sort])

  const totalSize = saves.reduce((sum, save) => sum + save.sizeBytes, 0)
  const screenshots = saves.filter((save) => save.screenshot).length
  const maxTime = Math.max(0, ...saves.map((save) => save.timePlayedSeconds))

  if (!latest) return null

  return (
    <>
      <section className="hero-card">
        {latest.screenshot && <img className="hero-card__image" src={latest.screenshot} alt="" />}
        <div className="hero-card__noise" />
        <div className="hero-card__content">
          <p className="hero-card__slot">{latest.slotName} · PROFIL {latest.profileId + 1}</p>
          <h2>{latest.displayName}</h2>
          <div className="hero-card__facts">
            <span><ScrollText size={15} /> {chapterLabel(latest.chapter)}</span>
            <span><Clock3 size={15} /> {formatDuration(latest.timePlayedSeconds)}</span>
            {latest.gameDay !== undefined && <span>Dzień {latest.gameDay}, {latest.gameClock}</span>}
            {latestDetails.data && <span><Sword size={15} /> Poziom {attributeValue(latestDetails.data, 'Level')} · {attributeValue(latestDetails.data, 'Experience').toLocaleString('pl-PL')} XP</span>}
          </div>
          <div className="hero-card__actions">
            <button className="button button--primary" onClick={() => onOpenSave(latest)}><Eye size={17} /> Otwórz najnowszy zapis</button>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {latestDetails.data ? (
          <>
            <MetricCard icon={<Sword size={18} />} label="BEZIMIENNY" value={`Poz. ${attributeValue(latestDetails.data, 'Level')}`} detail={`${attributeValue(latestDetails.data, 'Health')}/${attributeValue(latestDetails.data, 'MaxHealth')} PŻ · ${attributeValue(latestDetails.data, 'Strength')} siły`} accent />
            <MetricCard icon={<Archive size={18} />} label="EKWIPUNEK" value={`${latestDetails.data.inventory.oreCount} rudy`} detail={`${latestDetails.data.inventory.stackCount} stosów`} />
            <MetricCard icon={<ScrollText size={18} />} label="ZADANIA" value={`${latestDetails.data.quests.running} aktywnych`} detail={`${latestDetails.data.quests.succeeded} ukończonych`} />
            <MetricCard icon={<Database size={18} />} label="STAN ŚWIATA" value={latestDetails.data.world.memoryEvents.toLocaleString('pl-PL')} detail={`${latestDetails.data.world.characters.toLocaleString('pl-PL')} postaci`} />
          </>
        ) : (
          <>
            <MetricCard icon={<Clock3 size={18} />} label="CZAS ROZGRYWKI" value={formatDuration(maxTime, true)} detail="Najdłuższa sesja w kolekcji" accent />
            <MetricCard icon={<Save size={18} />} label="ZAPISY" value={String(saves.length).padStart(2, '0')} detail={`${scan.profiles.length} ${scan.profiles.length === 1 ? 'profil' : 'profile'}`} />
            <MetricCard icon={<Eye size={18} />} label="MINIATURY" value={`${screenshots}/${saves.length}`} detail="Odzyskane z rejestru zapisów" />
            <MetricCard icon={<HardDrive size={18} />} label="ROZMIAR" value={formatBytes(totalSize)} detail={`${scan.ignoredFiles} plików pominięto`} />
          </>
        )}
      </section>

      <section className="archive-page">
        <div className="archive-toolbar">
          <SearchField value={query} onChange={setQuery} placeholder="Szukaj zapisu, dnia lub mapy…" />
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Wszystkie' },
              { value: 'manual', label: 'Ręczne' },
              { value: 'quick', label: 'Szybkie' },
              { value: 'auto', label: 'Auto' },
            ]}
          />
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: 'date', label: 'Data' },
              { value: 'playtime', label: 'Czas gry' },
              { value: 'chapter', label: 'Rozdział' },
            ]}
          />
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <span className="result-count">{filtered.length} {filtered.length === 1 ? 'zapis' : 'zapisów'}</span>
        </div>

        {viewMode === 'grid' ? (
          <div className="save-cards-grid save-cards-grid--full">
            {filtered.map((save) => <SaveCard key={`${save.fileName}-${save.modifiedAtMs}`} save={save} onOpen={() => onOpenSave(save)} />)}
          </div>
        ) : (
          <div className="archive-list">
            {filtered.map((save, index) => <SaveListRow key={`${save.fileName}-${save.modifiedAtMs}`} save={save} index={index} onOpen={() => onOpenSave(save)} />)}
          </div>
        )}
        {!filtered.length && <div className="no-results"><Save size={28} /><h3>Brak pasujących zapisów</h3><p>Zmień frazę lub wybrany rodzaj zapisu.</p></div>}
      </section>
    </>
  )
}
