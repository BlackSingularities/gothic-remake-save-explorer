import { Check } from 'lucide-react'
import { useState } from 'react'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { StoryData } from '../../../types'
import type { PendingEditsController } from '../usePendingEdits'

const chapterRoman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI']

export function StoryEditTab({ filePath, controller }: { filePath: string; controller: PendingEditsController }) {
  const story = useAsyncResource<StoryData>(window.gothic ? () => window.gothic!.story(filePath) : null, [filePath])
  const queued = controller.byTargetKey.get('chapter')
  const queuedValue = queued?.operation.kind === 'chapter' ? queued.operation.value : undefined
  const [value, setValue] = useState<number | null>(null)

  return (
    <div className="deep-tab-panel">
      <TabPanelState loading={story.loading} error={story.error} />
      {story.data && (
        <section className="drawer-section deep-section">
          <div className="section-heading"><div><p className="eyebrow">FABUŁA</p><h3>Rozdział</h3></div></div>
          <p className="tab-note">Zmiana rozdziału ustawia tylko główny licznik fabuły — nie odblokowuje ani nie cofa poszczególnych zadań i flag scenariusza powiązanych z danym etapem.</p>
          <div className="editor-field">
            <span>Obecny rozdział: {chapterRoman[story.data.chapter] || story.data.chapter}</span>
            <div className="editor-field__row">
              <select value={value ?? queuedValue ?? story.data.chapter} onChange={(event) => setValue(Number(event.target.value))}>
                {chapterRoman.map((label, index) => <option key={index} value={index}>{index === 0 ? 'Prolog' : `Rozdział ${label}`}</option>)}
              </select>
              <button
                className="button button--secondary"
                onClick={() => {
                  const next = value ?? story.data!.chapter
                  controller.addEdit('chapter', { kind: 'chapter', value: next, previous: story.data!.chapter }, `Rozdział: ${story.data!.chapter} → ${next}`)
                }}
              >
                <Check size={14} /> Zastosuj
              </button>
            </div>
            {queuedValue !== undefined && <small className="editor-field__queued">w kolejce: {chapterRoman[queuedValue] || queuedValue}</small>}
          </div>
        </section>
      )}
    </div>
  )
}
