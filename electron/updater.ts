import { app, net } from 'electron'
import { spawn } from 'node:child_process'
import { createWriteStream, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { UpdateInfo } from '../src/types'

// Kopia wydań w formacie API GitHuba – instalator pobierany jest z redzikowski.com.
const FEED = 'https://redzikowski.com/api/releases/repos/BlackSingularities/gothic-remake-save-explorer/releases/latest'

interface FeedAsset { name: string; size: number; browser_download_url: string }
interface FeedRelease { tag_name: string; name?: string; body?: string; html_url: string; published_at?: string; assets?: FeedAsset[] }

function parseVersion(text: string): number[] {
  return text.trim().replace(/^v/i, '').split(/[-+]/)[0].split('.').map((part) => Number(part) || 0)
}

export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate)
  const b = parseVersion(current)
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) > (b[index] || 0)
  }
  return false
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const response = await net.fetch(FEED, { headers: { Accept: 'application/json', 'User-Agent': `GothicRemakeSaveExplorer/${app.getVersion()}` } })
  if (!response.ok) throw new Error(`Serwer aktualizacji zwrócił kod ${response.status}`)
  const release = await response.json() as FeedRelease
  const version = release.tag_name.replace(/^v/i, '')
  if (!isNewer(version, app.getVersion())) return null
  const installer = release.assets?.find((asset) => /setup.*\.exe$/i.test(asset.name))
  return {
    version,
    notes: '',
    pageUrl: '',
    publishedAt: release.published_at || '',
    assetUrl: installer?.browser_download_url || '',
    assetName: installer?.name || '',
    size: installer?.size || 0,
  }
}

export async function downloadUpdate(info: UpdateInfo, onProgress: (fraction: number) => void): Promise<string> {
  if (!info.assetUrl) throw new Error('Wydanie nie zawiera instalatora')
  const directory = path.join(os.tmpdir(), 'GothicRemakeSaveExplorer-update')
  await fs.rm(directory, { recursive: true, force: true })
  await fs.mkdir(directory, { recursive: true })
  const target = path.join(directory, info.assetName.replace(/[^\w.-]/g, '_') || `setup-${info.version}.exe`)
  const response = await net.fetch(info.assetUrl)
  if (!response.ok || !response.body) throw new Error(`Pobieranie nie powiodło się (kod ${response.status})`)
  const total = Number(response.headers.get('content-length')) || info.size
  const file = createWriteStream(target)
  const reader = response.body.getReader()
  let done = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      done += chunk.value.length
      if (!file.write(chunk.value)) await new Promise<void>((resolve) => file.once('drain', () => resolve()))
      if (total) onProgress(done / total)
    }
  } finally {
    await new Promise((resolve) => file.end(resolve))
  }
  if (total && done !== total) throw new Error('Pobrany plik jest niekompletny')
  return target
}

/**
 * Instalator NSIS w trybie cichym. Prosimy o uprawnienia administratora przez okno UAC, bo
 * program instaluje się w Program Files. Instalator trafia do folderu poprzedniej instalacji,
 * zamyka tę wersję i uruchamia nową jako zwykły użytkownik (`--force-run`). Gdy okno UAC
 * zostanie odrzucone albo instalacja się nie powiedzie, aplikacja zostaje i pokazuje błąd.
 */
export function installUpdate(file: string): Promise<void> {
  const quoted = file.replaceAll("'", "''")
  const script = `$p = Start-Process -FilePath '${quoted}' -ArgumentList '/S','--updated','--force-run' -Verb RunAs -Wait -PassThru; exit $p.ExitCode`
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true })
    child.on('error', (error) => reject(new Error(`Nie można uruchomić instalatora: ${error.message}`)))
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Aktualizacja nie została zainstalowana – wymaga zgody administratora (kod ${code})`))
    })
  })
}
