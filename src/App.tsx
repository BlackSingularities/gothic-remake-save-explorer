import { Bug, Check, FolderOpen, LayoutGrid, Menu, RefreshCcw, ScrollText, Settings, Shield, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrandMark } from './components/Brand'
import { UpdateBanner } from './components/UpdateBanner'
import { demoScan } from './demo'
import { ExplorerPage } from './features/explorer/ExplorerPage'
import { SaveDetailView } from './features/explorer/SaveDetailView'
import { SettingsPage } from './features/settings/SettingsPage'
import { StatsPage } from './features/stats/StatsPage'
import { LanguageProvider, useT } from './i18n/LanguageContext'
import type { ParsedSave, ScanResult } from './types'
import { tr } from './i18n/tr'
import { openFeedback } from './lib/feedback.js'

type Page = 'explorer' | 'stats' | 'settings'
type ProfileFilter = 'all' | number

const pageTitleKey = {
  explorer: 'nav.explorer',
  stats: 'nav.stats',
  settings: 'nav.settings',
} as const

function EmptyState({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="empty-state">
      <BrandMark />
      <p className="eyebrow">{tr('ARCHIWUM NIEAKTYWNE')}</p>
      <h2>{tr('Nie znaleziono zapisów')}</h2>
      <p>{tr('Wskaż katalog zawierający pliki {0}. Domyślna lokalizacja zostanie zapamiętana.', 'G1R-*.sav')}</p>
      <button className="button button--primary" onClick={onChoose}><FolderOpen size={17} /> {tr('Wskaż katalog zapisów')}</button>
    </div>
  )
}

function AppShell() {
  const t = useT()
  const [page, setPage] = useState<Page>('explorer')
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [profile, setProfile] = useState<ProfileFilter>('all')
  const [selectedSave, setSelectedSave] = useState<ParsedSave | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; detail?: string; error?: boolean } | null>(null)

  const notify = useCallback((message: string, detail?: string, error = false) => {
    setToast({ message, detail, error })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const reload = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const result = window.gothic ? await window.gothic.scan() : demoScan
      setScan(result)
    } catch (error) {
      notify(tr('Nie udało się odświeżyć archiwum'), error instanceof Error ? tr(error.message) : undefined, true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [notify])

  useEffect(() => {
    void reload(true)
    if (!window.gothic) return
    return window.gothic.onSavesChanged(() => {
      void reload(true)
      notify(tr('Wykryto nowy zapis'), tr('Archiwum zostało automatycznie odświeżone'))
    })
  }, [reload, notify])

  const saves = useMemo(() => {
    const all = scan?.saves || []
    return profile === 'all' ? all : all.filter((save) => save.profileId === profile)
  }, [scan, profile])

  const chooseDirectory = async () => {
    if (!window.gothic) return notify(tr('Wybór katalogu jest dostępny w aplikacji desktopowej'))
    const result = await window.gothic.chooseDirectory(tr('Wskaż katalog zapisów Gothic 1 Remake'))
    if (result) {
      setScan(result)
      setProfile('all')
      notify(tr('Katalog zapisów podłączony'), tr('{0} plików GSAV', result.saves.length))
    }
  }

  const exportData = async (format: 'json' | 'csv') => {
    if (!window.gothic) return notify(tr('Eksport {0} jest gotowy w aplikacji desktopowej', format.toUpperCase()))
    const result = await window.gothic.exportData(format, tr('Eksportuj kronikę'))
    if (result.success) notify(tr('Dane wyeksportowane'), result.destination)
    else if (!result.cancelled) notify(tr('Eksport nie powiódł się'), result.error && tr(result.error), true)
  }

  const navigate = (nextPage: Page) => {
    setPage(nextPage)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return <div className="boot-screen"><BrandMark /><div className="boot-line"><span /></div><p>{tr('Wczytywanie archiwum…')}</p></div>
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="sidebar__brand"><BrandMark /><div><strong>SAVE</strong><span>EXPLORER</span></div></div>
        <p className="sidebar__caption">{t('app.tagline')}</p>
        <nav>
          <button className={page === 'explorer' ? 'is-active' : ''} onClick={() => navigate('explorer')}><LayoutGrid size={18} /><span>{t('nav.explorer')}</span><b>{scan?.saves.length || 0}</b><i /></button>
          <button className={page === 'stats' ? 'is-active' : ''} onClick={() => navigate('stats')}><ScrollText size={18} /><span>{t('nav.stats')}</span><i /></button>
          <button className={page === 'settings' ? 'is-active' : ''} onClick={() => navigate('settings')}><Settings size={18} /><span>{t('nav.settings')}</span><i /></button>
        </nav>
        <div className="sidebar__footer"><Shield size={14} /><span>{tr('TYLKO ODCZYT')}<br /><small>{tr('Pliki gry są bezpieczne')}</small></span></div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" aria-label={tr('Zamknij menu')} onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar__title">
            <button className="icon-button menu-button" aria-label="Menu" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button>
            <div><p className="eyebrow">{t(pageTitleKey[page])}</p><h1>{t('app.name')}</h1></div>
          </div>
          <div className="topbar__actions">
            {scan && scan.profiles.length > 1 && (
              <div className="segmented profile-switch">
                <button className={profile === 'all' ? 'is-active' : ''} onClick={() => setProfile('all')}>{t('common.all')}</button>
                {scan.profiles.map((item) => <button key={item.id} className={profile === item.id ? 'is-active' : ''} onClick={() => setProfile(item.id)}>{tr('Profil {0}', item.id + 1)}</button>)}
              </div>
            )}
            <div className="folder-chip" title={scan?.directory}><FolderOpen size={15} /><span>{scan?.directory.split(/[\\/]/).slice(-3).join(' / ')}</span></div>
            <button className="icon-button" aria-label={t('common.refresh')} onClick={() => void reload()} disabled={refreshing}><RefreshCcw size={17} className={refreshing ? 'is-spinning' : ''} /></button>
            <button className="icon-button" aria-label={tr('Zgłoś błąd lub sugestię')} title={tr('Zgłoś błąd lub sugestię')} onClick={() => openFeedback()}><Bug size={17} /></button>
          </div>
        </header>

        <div className="content-wrap">
          <UpdateBanner />
          {!scan?.detected || !scan.saves.length ? <EmptyState onChoose={() => void chooseDirectory()} /> : (
            <>
              {page === 'explorer' && <ExplorerPage scan={scan} saves={saves} onOpenSave={setSelectedSave} />}
              {page === 'stats' && <StatsPage saves={saves} />}
              {page === 'settings' && <SettingsPage scan={scan} onChoose={() => void chooseDirectory()} onOpenFolder={() => void window.gothic?.openDirectory()} onExport={(format) => void exportData(format)} />}
            </>
          )}
        </div>
      </main>

      {selectedSave && scan && (
        <SaveDetailView
          save={selectedSave}
          scan={scan}
          onClose={() => setSelectedSave(null)}
          onCommitted={(slotName) => notify(tr('Dodano nowy zapis'), slotName)}
        />
      )}
      {toast && (
        <div className={`toast${toast.error ? ' toast--error' : ''}`}>
          <span>{toast.error ? <X size={16} /> : <Check size={16} />}</span>
          <div><strong>{toast.message}</strong>{toast.detail && <p>{toast.detail}</p>}</div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  )
}
