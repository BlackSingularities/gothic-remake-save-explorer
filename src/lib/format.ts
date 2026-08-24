import type { Language } from '../i18n/LanguageContext'

const dateLocale: Record<Language, string> = { pl: 'pl-PL', en: 'en-US' }

export function formatDuration(seconds: number, compact = false, lang: Language = 'pl'): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return compact ? '0 min' : lang === 'pl' ? '0 min' : '0 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (!hours) return `${minutes} min`
  if (compact) return `${hours}h ${minutes}m`
  return lang === 'pl' ? `${hours} godz. ${minutes} min` : `${hours} h ${minutes} min`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(iso: string, withTime = true, lang: Language = 'pl'): string {
  return new Intl.DateTimeFormat(dateLocale[lang], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

export function relativeDate(iso: string, lang: Language = 'pl'): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60_000))
  if (lang === 'en') {
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} h ago`
    const days = Math.floor(hours / 24)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  if (minutes < 1) return 'przed chwilą'
  if (minutes < 60) return `${minutes} min temu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} godz. temu`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'dzień' : 'dni'} temu`
}

const chapterRoman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI']

export function chapterLabel(chapter: number, lang: Language = 'pl'): string {
  if (chapter <= 0) return lang === 'pl' ? 'Prolog' : 'Prologue'
  const roman = chapterRoman[chapter] || String(chapter)
  return lang === 'pl' ? `Rozdział ${roman}` : `Chapter ${roman}`
}

export function formatNumber(value: number, lang: Language = 'pl'): string {
  return value.toLocaleString(dateLocale[lang])
}
