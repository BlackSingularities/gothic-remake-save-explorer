import { ArrowRight, GitCompareArrows, Shield, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MultiLineChart, RadarChart } from '../../components/Charts'
import { TabPanelState } from '../../components/Tabs'
import { formatDuration } from '../../lib/format'
import { diffSaveDetails, type SaveDiff } from '../../lib/diff'
import type { DeepSaveDetails, ParsedSave } from '../../types'

const MAX_DEEP_SAMPLES = 25

function useLevelSeries(saves: ParsedSave[]) {
  const [points, setPoints] = useState<Array<{ x: number; y: number }> | null>(null)
  const sampleKey = saves.slice(0, MAX_DEEP_SAMPLES).map((save) => save.filePath).join('|')

  useEffect(() => {
    let active = true
    setPoints(null)
    if (!window.gothic || !saves.length) {
      setPoints([])
      return
    }
    const sample = [...saves].sort((a, b) => a.modifiedAtMs - b.modifiedAtMs).slice(-MAX_DEEP_SAMPLES)
    void Promise.all(sample.map((save) => window.gothic!.inspectDeepSave(save.filePath).then((result) => ({ save, result })))).then((results) => {
      if (!active) return
      const collected = results
        .filter((entry) => entry.result.success && entry.result.details)
        .map((entry) => {
          const level = entry.result.details!.character.attributes.find((attribute) => attribute.id === 'Level')?.current || 0
          return { x: entry.save.modifiedAtMs, y: level }
        })
      setPoints(collected)
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleKey])

  return points
}

function DiffList({ title, entries, emptyLabel }: { title: string; entries: SaveDiff[keyof SaveDiff]; emptyLabel: string }) {
  return (
    <div className="diff-column">
      <h4>{title}</h4>
      {entries.length === 0 && <p className="tab-note">{emptyLabel}</p>}
      <div className="diff-list">
        {entries.map((entry) => (
          <div key={entry.id}>
            <strong>{entry.label}</strong>
            <span>{entry.before ?? '—'} <ArrowRight size={12} /> {entry.after ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompareTool({ saves }: { saves: ParsedSave[] }) {
  const ordered = useMemo(() => [...saves].sort((a, b) => a.modifiedAtMs - b.modifiedAtMs), [saves])
  const [beforePath, setBeforePath] = useState(ordered[0]?.filePath || '')
  const [afterPath, setAfterPath] = useState(ordered.at(-1)?.filePath || '')
  const [diff, setDiff] = useState<SaveDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runCompare = async () => {
    if (!window.gothic || !beforePath || !afterPath) return
    setLoading(true)
    setError(null)
    setDiff(null)
    try {
      const [beforeResult, afterResult] = await Promise.all([
        window.gothic.inspectDeepSave(beforePath),
        window.gothic.inspectDeepSave(afterPath),
      ])
      if (!beforeResult.success || !beforeResult.details || !afterResult.success || !afterResult.details) {
        setError(beforeResult.error || afterResult.error || 'Nie udało się odczytać obu zapisów')
        return
      }
      setDiff(diffSaveDetails(beforeResult.details as DeepSaveDetails, afterResult.details as DeepSaveDetails))
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : 'Nie udało się porównać zapisów')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel compare-tool">
      <div className="section-heading">
        <div><p className="eyebrow">PORÓWNYWARKA</p><h3>Co się zmieniło między zapisami</h3></div>
        <GitCompareArrows size={20} />
      </div>
      <div className="compare-tool__pickers">
        <select value={beforePath} onChange={(event) => setBeforePath(event.target.value)}>
          {ordered.map((save) => <option key={save.filePath} value={save.filePath}>{save.slotName} · {save.displayName}</option>)}
        </select>
        <ArrowRight size={16} />
        <select value={afterPath} onChange={(event) => setAfterPath(event.target.value)}>
          {ordered.map((save) => <option key={save.filePath} value={save.filePath}>{save.slotName} · {save.displayName}</option>)}
        </select>
        <button className="button button--primary" onClick={() => void runCompare()} disabled={loading}>Porównaj</button>
      </div>
      <TabPanelState loading={loading} error={error} />
      {diff && (
        <div className="diff-grid">
          <DiffList title="Zmienione atrybuty" entries={diff.attributes} emptyLabel="Bez zmian" />
          <DiffList title="Nowe przedmioty" entries={diff.itemsAdded} emptyLabel="Brak nowych" />
          <DiffList title="Zmiana liczby przedmiotów" entries={diff.itemsChanged} emptyLabel="Bez zmian" />
          <DiffList title="Utracone przedmioty" entries={diff.itemsRemoved} emptyLabel="Nic nie utracono" />
          <DiffList title="Zmiana stanu zadań" entries={diff.questsChanged} emptyLabel="Bez zmian" />
          <DiffList title="Nowe umiejętności" entries={diff.skillsLearned} emptyLabel="Brak nowych" />
        </div>
      )}
    </section>
  )
}

export function StatsPage({ saves }: { saves: ParsedSave[] }) {
  const levelSeries = useLevelSeries(saves)
  const ordered = useMemo(() => [...saves].sort((a, b) => a.modifiedAtMs - b.modifiedAtMs), [saves])
  const playtimePoints = ordered.map((save) => ({ x: save.modifiedAtMs, y: save.timePlayedSeconds / 3600 }))
  const [latestFactions, setLatestFactions] = useState<DeepSaveDetails['factions'] | null>(null)

  useEffect(() => {
    let active = true
    setLatestFactions(null)
    const latest = [...saves].sort((a, b) => b.modifiedAtMs - a.modifiedAtMs)[0]
    if (!latest || !window.gothic) return
    void window.gothic.inspectDeepSave(latest.filePath).then((result) => {
      if (active && result.success && result.details) setLatestFactions(result.details.factions)
    })
    return () => { active = false }
  }, [saves])

  if (!saves.length) return null

  return (
    <div className="stats-page">
      <div className="dashboard-grid">
        <section className="panel panel--chart">
          <div className="section-heading">
            <div><p className="eyebrow">TEMPO ROZGRYWKI</p><h3>Czas gry między zapisami</h3></div>
            <TrendingUp size={20} />
          </div>
          <MultiLineChart series={[{ id: 'playtime', label: 'Godziny gry', color: '#d3a14b', points: playtimePoints }]} />
          <div className="progress-chart__legend"><span>{formatDuration(playtimePoints[0]?.y * 3600 || 0, true)}</span><span>{formatDuration((playtimePoints.at(-1)?.y || 0) * 3600, true)}</span></div>
        </section>

        <section className="panel panel--chart">
          <div className="section-heading">
            <div><p className="eyebrow">ROZWÓJ POSTACI</p><h3>Poziom w czasie</h3></div>
          </div>
          {levelSeries ? (
            <MultiLineChart series={[{ id: 'level', label: 'Poziom', color: '#7fae78', points: levelSeries }]} />
          ) : (
            <TabPanelState loading error={null} />
          )}
          {saves.length > MAX_DEEP_SAMPLES && <p className="tab-note">Pokazano ostatnie {MAX_DEEP_SAMPLES} zapisów.</p>}
        </section>
      </div>

      {latestFactions && latestFactions.length > 0 && (
        <section className="panel panel--radar">
          <div className="section-heading">
            <div><p className="eyebrow">REPUTACJA</p><h3>Przewinienia wobec frakcji (najnowszy zapis)</h3></div>
            <Shield size={20} />
          </div>
          <RadarChart axes={latestFactions.map((faction) => ({ label: faction.label, value: faction.total, max: Math.max(1, ...latestFactions.map((f) => f.total)) }))} />
        </section>
      )}

      <CompareTool saves={saves} />
    </div>
  )
}
