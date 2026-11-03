import { Check } from 'lucide-react'
import { useState } from 'react'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import { formatNumber } from '../../../lib/format'
import type { DeepSaveDetails, KnowledgeCharacterSummary, MemoryCharacterSummary, MemoryEvent, StoryData } from '../../../types'
import type { PendingEditsController } from '../../editor/usePendingEdits'
import { tr } from '../../../i18n/tr'

const chapterRoman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI']

function EventsBrowser({ filePath }: { filePath: string }) {
  const [character, setCharacter] = useState<string | null>(null)
  const characters = useAsyncResource<MemoryCharacterSummary[]>(window.gothic ? () => window.gothic!.memoryCharacters(filePath) : null, [filePath])
  const events = useAsyncResource<MemoryEvent[]>(
    character && window.gothic ? () => window.gothic!.memoryEvents(filePath, character) : null,
    [filePath, character],
  )
  const topCharacters = [...(characters.data || [])].sort((a, b) => b.eventCount - a.eventCount).slice(0, 30)

  return (
    <section className="drawer-section deep-section">
      <div className="section-heading"><div><p className="eyebrow">{tr('LOG ZDARZEŃ')}</p><h3>{tr('Dziennik pamięci postaci')}</h3></div></div>
      <TabPanelState loading={characters.loading} error={characters.error} />
      <div className="chip-row">
        {topCharacters.map((entry) => (
          <button key={entry.character} className={`chip${character === entry.character ? ' is-active' : ''}`} onClick={() => setCharacter(entry.character)}>
            {entry.name} <b>{entry.eventCount}</b>
          </button>
        ))}
      </div>
      {character && <TabPanelState loading={events.loading} error={events.error} empty={!events.loading && !events.data?.length} />}
      {events.data && (
        <div className="event-list">
          {events.data.slice(0, 100).map((event) => (
            <div key={event.index}>
              <code>{event.tags.join(', ') || '—'}</code>
              {event.instigator && <span>{event.instigator} → {event.affected || '?'}</span>}
              {typeof event.timeSeconds === 'number' && <small>{tr('{0} min gry', Math.round(event.timeSeconds / 60))}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function KnowledgeBrowser({ filePath }: { filePath: string }) {
  const [character, setCharacter] = useState<string | null>(null)
  const characters = useAsyncResource<KnowledgeCharacterSummary[]>(window.gothic ? () => window.gothic!.knowledgeCharacters(filePath) : null, [filePath])
  const entries = useAsyncResource<string[]>(
    character && window.gothic ? () => window.gothic!.knowledgeEntries(filePath, character) : null,
    [filePath, character],
  )
  const topCharacters = [...(characters.data || [])].sort((a, b) => b.entryCount - a.entryCount).slice(0, 30)

  return (
    <section className="drawer-section deep-section">
      <div className="section-heading"><div><p className="eyebrow">{tr('WIEDZA DIALOGOWA')}</p><h3>{tr('Rozmowy i wybory')}</h3></div></div>
      <TabPanelState loading={characters.loading} error={characters.error} />
      <div className="chip-row">
        {topCharacters.map((entry) => (
          <button key={entry.character} className={`chip${character === entry.character ? ' is-active' : ''}`} onClick={() => setCharacter(entry.character)}>
            {entry.name} <b>{entry.entryCount}</b>
          </button>
        ))}
      </div>
      {entries.data && (
        <div className="knowledge-entries">
          {entries.data.slice(0, 150).map((entry, index) => <code key={`${entry}-${index}`}>{entry}</code>)}
        </div>
      )}
    </section>
  )
}

function StorySummary({ filePath, controller }: { filePath: string; controller?: PendingEditsController }) {
  const story = useAsyncResource<StoryData>(window.gothic ? () => window.gothic!.story(filePath) : null, [filePath])
  const queued = controller?.byTargetKey.get('chapter')
  const queuedValue = queued?.operation.kind === 'chapter' ? queued.operation.value : undefined
  const [draft, setDraft] = useState<number | null>(null)

  if (!story.data) return <TabPanelState loading={story.loading} error={story.error} />
  return (
    <section className="drawer-section deep-section">
      <div className="section-heading"><div><p className="eyebrow">{tr('FABUŁA')}</p><h3>{tr('Stan świata')}</h3></div></div>
      <div className="world-grid world-grid--compact">
        <div>
          <span>{tr('Rozdział')}</span>
          {controller ? (
            <form
              className="editor-field__row"
              onSubmit={(event) => {
                event.preventDefault()
                const next = draft ?? story.data!.chapter
                controller.addEdit('chapter', { kind: 'chapter', value: next, previous: story.data!.chapter }, tr('Rozdział: {0} → {1}', story.data!.chapter, next))
              }}
            >
              <select value={draft ?? queuedValue ?? story.data.chapter} onChange={(event) => setDraft(Number(event.target.value))}>
                {chapterRoman.map((label, index) => <option key={index} value={index}>{index === 0 ? tr('Prolog') : tr('Rozdział {0}', label)}</option>)}
              </select>
              <button className="icon-button" type="submit" title={tr('Zastosuj')}><Check size={14} /></button>
            </form>
          ) : (
            <strong>{story.data.chapter}</strong>
          )}
          {queuedValue !== undefined && <small className="editor-field__queued">{tr('w kolejce: {0}', chapterRoman[queuedValue] || queuedValue)}</small>}
        </div>
        <div><span>{tr('Flagi fabularne')}</span><strong>{story.data.flags.length}</strong></div>
        <div><span>{tr('Timery scenariusza')}</span><strong>{story.data.timers.length}</strong></div>
        <div><span>{tr('Czas gry (silnik)')}</span><strong>{formatNumber(Math.round(story.data.currentGameTimeSeconds / 60))} min</strong></div>
      </div>
    </section>
  )
}

export function WorldTab({ details, filePath, controller }: { details: DeepSaveDetails; filePath: string; controller?: PendingEditsController }) {
  return (
    <div className="deep-tab-panel">
      <div className="world-grid">
        <div><span>{tr('Postacie w świecie')}</span><strong>{formatNumber(details.world.characters)}</strong><small>{tr('{0} martwych · {1} handlarzy', details.world.deadCharacters, details.world.traders)}</small></div>
        <div><span>{tr('Zdarzenia pamięci')}</span><strong>{formatNumber(details.world.memoryEvents)}</strong><small>{tr('dla {0} postaci', formatNumber(details.world.memoryCharacters))}</small></div>
        <div><span>{tr('Wpisy wiedzy')}</span><strong>{formatNumber(details.world.knowledgeEntries)}</strong><small>{tr('dla {0} postaci', details.world.knowledgeCharacters)}</small></div>
        <div><span>{tr('Rozpakowany świat')}</span><strong>{(details.decoder.decompressedBytes / 1024 / 1024).toFixed(1)} MB</strong><small>{tr('{0} bloków {1}', details.decoder.chunks, details.decoder.method)}</small></div>
      </div>
      <StorySummary filePath={filePath} controller={controller} />
      <EventsBrowser filePath={filePath} />
      <KnowledgeBrowser filePath={filePath} />
    </div>
  )
}
