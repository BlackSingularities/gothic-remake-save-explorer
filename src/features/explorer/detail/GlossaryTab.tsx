import { Lock, Unlock } from 'lucide-react'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { GlossaryResult } from '../../../types'

export function GlossaryTab({ filePath }: { filePath: string }) {
  const glossary = useAsyncResource<GlossaryResult>(window.gothic ? () => window.gothic!.glossary(filePath) : null, [filePath])

  return (
    <div className="deep-tab-panel">
      <TabPanelState loading={glossary.loading} error={glossary.error} empty={!glossary.loading && !glossary.data?.categories.length} />
      {glossary.data && (
        <>
          <div className="quest-summary-grid quest-summary-grid--narrow">
            <div className="is-success"><span>Odblokowane</span><strong>{glossary.data.unlockedTotal}</strong></div>
            <div><span>Wpisy w kompendium</span><strong>{glossary.data.total}</strong></div>
          </div>
          {glossary.data.categories.map((category) => (
            <section className="drawer-section deep-section" key={category.name}>
              <div className="section-heading"><h3>{category.name}</h3><span className="section-caption">{category.entries.length} wpisów</span></div>
              <div className="glossary-grid">
                {category.entries.map((entry) => (
                  <div key={entry.id} className={entry.unlockedSegments > 0 ? 'is-unlocked' : ''}>
                    {entry.unlockedSegments > 0 ? <Unlock size={14} /> : <Lock size={14} />}
                    <strong>{entry.name}</strong>
                    <span>{entry.unlockedSegments}/{entry.totalSegments}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
