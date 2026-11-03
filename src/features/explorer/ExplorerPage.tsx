import { Archive, Clock3, Database, Eye, HardDrive, Save, ScrollText, Sword } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SearchField, SegmentedControl, ViewToggle } from '../../components/Controls'
import { MetricCard } from '../../components/MetricCard'
import { useAsyncResource, useViewMode } from '../../lib/hooks'
import { chapterLabel, formatBytes, formatDuration, formatNumber } from '../../lib/format'
import type { DeepSaveDetails, ParsedSave, SaveKind, ScanResult } from '../../types'
import { SaveCard, SaveListRow } from './SaveCard'
import { tr } from '../../i18n/tr'

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
          <p className="hero-card__slot">{latest.slotName} · {tr('PROFIL {0}', latest.profileId + 1)}</p>
          <h2>{latest.displayName}</h2>
          <div className="hero-card__facts">
            <span><ScrollText size={15} /> {chapterLabel(latest.chapter)}</span>
            <span><Clock3 size={15} /> {formatDuration(latest.timePlayedSeconds)}</span>
            {latest.gameDay !== undefined && <span>{tr('Dzień {0}, {1}', latest.gameDay, latest.gameClock ?? '')}</span>}
            {latestDetails.data && <span><Sword size={15} /> {tr('Poziom {0}', attributeValue(latestDetails.data, 'Level'))} · {formatNumber(attributeValue(latestDetails.data, 'Experience'))} XP</span>}
          </div>
          <div className="hero-card__actions">
            <button className="button button--primary" onClick={() => onOpenSave(latest)}><Eye size={17} /> {tr('Otwórz najnowszy zapis')}</button>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {latestDetails.data ? (
          <>
            <MetricCard icon={<Sword size={18} />} label={tr('BEZIMIENNY')} value={tr('Poz. {0}', attributeValue(latestDetails.data, 'Level'))} detail={tr('{0}/{1} PŻ · {2} siły', attributeValue(latestDetails.data, 'Health'), attributeValue(latestDetails.data, 'MaxHealth'), attributeValue(latestDetails.data, 'Strength'))} accent />
            <MetricCard icon={<Archive size={18} />} label={tr('EKWIPUNEK')} value={tr('{0} rudy', latestDetails.data.inventory.oreCount)} detail={tr('{0} stosów', latestDetails.data.inventory.stackCount)} />
            <MetricCard icon={<ScrollText size={18} />} label={tr('ZADANIA')} value={tr('{0} aktywnych', latestDetails.data.quests.running)} detail={tr('{0} ukończonych', latestDetails.data.quests.succeeded)} />
            <MetricCard icon={<Database size={18} />} label={tr('STAN ŚWIATA')} value={formatNumber(latestDetails.data.world.memoryEvents)} detail={tr('{0} postaci', formatNumber(latestDetails.data.world.characters))} />
          </>
        ) : (
          <>
            <MetricCard icon={<Clock3 size={18} />} label={tr('CZAS ROZGRYWKI')} value={formatDuration(maxTime, true)} detail={tr('Najdłuższa sesja w kolekcji')} accent />
            <MetricCard icon={<Save size={18} />} label={tr('ZAPISY')} value={String(saves.length).padStart(2, '0')} detail={tr(scan.profiles.length === 1 ? '{0} profil' : '{0} profile', scan.profiles.length)} />
            <MetricCard icon={<Eye size={18} />} label={tr('MINIATURY')} value={`${screenshots}/${saves.length}`} detail={tr('Odzyskane z rejestru zapisów')} />
            <MetricCard icon={<HardDrive size={18} />} label={tr('ROZMIAR')} value={formatBytes(totalSize)} detail={tr('{0} plików pominięto', scan.ignoredFiles)} />
          </>
        )}
      </section>

      <section className="archive-page">
        <div className="archive-toolbar">
          <SearchField value={query} onChange={setQuery} placeholder={tr('Szukaj zapisu, dnia lub mapy…')} />
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: tr('Wszystkie') },
              { value: 'manual', label: tr('Ręczne') },
              { value: 'quick', label: tr('Szybkie') },
              { value: 'auto', label: tr('Auto') },
            ]}
          />
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: 'date', label: tr('Data') },
              { value: 'playtime', label: tr('Czas gry') },
              { value: 'chapter', label: tr('Rozdział') },
            ]}
          />
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <span className="result-count">{tr(filtered.length === 1 ? '{0} zapis' : '{0} zapisów', filtered.length)}</span>
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
        {!filtered.length && <div className="no-results"><Save size={28} /><h3>{tr('Brak pasujących zapisów')}</h3><p>{tr('Zmień frazę lub wybrany rodzaj zapisu.')}</p></div>}
      </section>
    </>
  )
}
