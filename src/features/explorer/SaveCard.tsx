import { ChevronRight, Clock3, Eye, ScrollText } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import { chapterLabel, formatBytes, formatDuration, relativeDate } from '../../lib/format'
import type { ParsedSave, SaveKind } from '../../types'

const kindLabels: Record<'pl' | 'en', Record<SaveKind, string>> = {
  pl: { manual: 'Ręczny', quick: 'Szybki', auto: 'Autozapis' },
  en: { manual: 'Manual', quick: 'Quick', auto: 'Autosave' },
}

export function KindBadge({ kind }: { kind: SaveKind }) {
  const { language } = useLanguage()
  return <span className={`kind-badge kind-badge--${kind}`}>{kindLabels[language][kind]}</span>
}

export function SaveCard({ save, onOpen }: { save: ParsedSave; onOpen: () => void }) {
  const { language } = useLanguage()
  return (
    <button className="save-card" onClick={onOpen}>
      <div className="save-card__image">
        {save.screenshot ? <img src={save.screenshot} alt="" /> : <div className="save-card__placeholder"><Eye size={24} /><span>Brak miniatury</span></div>}
        <KindBadge kind={save.kind} />
      </div>
      <div className="save-card__body">
        <div className="save-card__top"><span>{save.slotName}</span><time>{relativeDate(save.modifiedAt, language)}</time></div>
        <h3>{save.displayName}</h3>
        <div className="save-card__meta">
          <span><ScrollText size={14} /> {chapterLabel(save.chapter, language)}</span>
          <span><Clock3 size={14} /> {formatDuration(save.timePlayedSeconds, true)}</span>
        </div>
      </div>
      <ChevronRight className="save-card__chevron" size={18} />
    </button>
  )
}

export function SaveListRow({ save, index, onOpen }: { save: ParsedSave; index: number; onOpen: () => void }) {
  const { language } = useLanguage()
  return (
    <div className="archive-row-wrap">
      <span className="archive-index">{String(index + 1).padStart(2, '0')}</span>
      <button className="save-card save-card--compact" onClick={onOpen}>
        <div className="save-card__image">
          {save.screenshot ? <img src={save.screenshot} alt="" /> : <div className="save-card__placeholder"><Eye size={24} /></div>}
          <KindBadge kind={save.kind} />
        </div>
        <div className="save-card__body">
          <div className="save-card__top"><span>{save.slotName}</span><time>{relativeDate(save.modifiedAt, language)}</time></div>
          <h3>{save.displayName}</h3>
          <div className="save-card__meta">
            <span><ScrollText size={14} /> {chapterLabel(save.chapter, language)}</span>
            <span><Clock3 size={14} /> {formatDuration(save.timePlayedSeconds, true)}</span>
          </div>
        </div>
      </button>
      <div className="archive-extra">
        <span>{formatBytes(save.sizeBytes)}</span>
        <span>{language === 'pl' ? 'Profil' : 'Profile'} {save.profileId + 1}</span>
        <span>{save.difficulty}</span>
      </div>
    </div>
  )
}
