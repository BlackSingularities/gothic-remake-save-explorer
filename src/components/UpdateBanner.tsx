import { Download, RefreshCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { UpdateInfo } from '../types'
import { tr } from '../i18n/tr'

type Phase =
  | { kind: 'available' }
  | { kind: 'downloading'; fraction: number }
  | { kind: 'installing' }
  | { kind: 'failed'; message: string }

export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'available' })
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const api = window.gothic
    if (!api) return
    void api.checkForUpdate().then((result) => {
      if (result.success && result.data) setInfo(result.data)
    })
    return api.onUpdateProgress((fraction) => setPhase({ kind: 'downloading', fraction }))
  }, [])

  if (!info || hidden || !window.gothic) return null

  const install = async () => {
    const api = window.gothic!
    setPhase({ kind: 'downloading', fraction: 0 })
    const downloaded = await api.downloadUpdate(info)
    if (!downloaded.success || !downloaded.data) return setPhase({ kind: 'failed', message: tr(downloaded.error || 'Pobieranie nie powiodło się') })
    setPhase({ kind: 'installing' })
    // Po udanej instalacji instalator zamyka aplikację i uruchamia nową wersję.
    const installed = await api.installUpdate(downloaded.data)
    if (!installed.success) setPhase({ kind: 'failed', message: tr(installed.error || 'Instalacja nie powiodła się') })
  }

  const busy = phase.kind === 'downloading' || phase.kind === 'installing'
  const sizeMb = info.size ? ` (${(info.size / 1e6).toFixed(1)} MB)` : ''

  return (
    <div className="update-banner" role="status">
      <Sparkles size={18} />
      <div className="update-banner__text">
        <strong>{tr('Dostępna nowa wersja {0}', info.version)}</strong>
        {phase.kind === 'available' && <p>{tr('Aktualizacja zainstaluje się w tym samym folderze. Windows poprosi o zgodę administratora.')}</p>}
        {phase.kind === 'downloading' && <p>{tr('Pobieranie… {0}%', Math.round(phase.fraction * 100))}</p>}
        {phase.kind === 'installing' && <p>{tr('Instalowanie… Potwierdź zgodę administratora, jeśli Windows o nią poprosi. Aplikacja uruchomi się ponownie.')}</p>}
        {phase.kind === 'failed' && <p className="update-banner__error">{phase.message}</p>}
        {phase.kind === 'downloading' && <div className="update-banner__bar"><span style={{ width: `${Math.round(phase.fraction * 100)}%` }} /></div>}
      </div>
      {!busy && (
        <button className="button button--primary" onClick={() => void install()}>
          {phase.kind === 'failed' ? <><RefreshCcw size={16} /> {tr('Spróbuj ponownie')}</> : <><Download size={16} /> {tr('Zainstaluj')}{sizeMb}</>}
        </button>
      )}
      {!busy && <button className="icon-button" aria-label={tr('Później')} onClick={() => setHidden(true)}><X size={16} /></button>}
    </div>
  )
}
