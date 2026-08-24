import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { promises as fs, watch, type FSWatcher } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EditOperation, ParsedSave, ScanResult } from '../src/types'
import { searchItemCatalog } from './goresave/catalogs'
import {
  clearDeepSaveCache,
  getGlossary,
  getKnowledgeCharacters,
  getKnowledgeEntries,
  getMemoryCharacters,
  getMemoryEvents,
  getStory,
  getTutorials,
  inspectDeepSave,
  listNpcs,
  listTraders,
  npcDetail,
  searchProperties,
  traderDetail,
} from './goresave/read'
import { checkCodec, commitEditorSession, skillCatalog } from './goresave/write'
import { scanSaveDirectory } from './save-parser'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let saveWatcher: FSWatcher | null = null
let watcherDebounce: NodeJS.Timeout | null = null
let selectedDirectory = ''

function defaultSaveDirectory(): string {
  const localAppData = process.env.LOCALAPPDATA || app.getPath('appData')
  return path.join(localAppData, 'G1R', 'Saved', 'SaveGames')
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function loadDirectorySetting(): Promise<string> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8')
    const parsed = JSON.parse(raw) as { saveDirectory?: string }
    return parsed.saveDirectory || defaultSaveDirectory()
  } catch {
    return defaultSaveDirectory()
  }
}

async function persistDirectorySetting(directory: string): Promise<void> {
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true })
  await fs.writeFile(settingsPath(), JSON.stringify({ saveDirectory: directory }, null, 2), 'utf8')
}

function startWatcher(directory: string): void {
  saveWatcher?.close()
  saveWatcher = null
  try {
    saveWatcher = watch(directory, () => {
      clearDeepSaveCache()
      if (watcherDebounce) clearTimeout(watcherDebounce)
      watcherDebounce = setTimeout(() => mainWindow?.webContents.send('saves:changed'), 350)
    })
  } catch {
    // The scan result already communicates a missing directory to the renderer.
  }
}

async function currentScan(): Promise<ScanResult> {
  return scanSaveDirectory(selectedDirectory || defaultSaveDirectory())
}

function isSaveInsideSelectedDirectory(filePath: string): boolean {
  const relative = path.relative(path.resolve(selectedDirectory), path.resolve(filePath))
  return relative.length > 0
    && !relative.startsWith('..')
    && !path.isAbsolute(relative)
    && /^G1R-\d{3}\.sav$/i.test(path.basename(filePath))
}

function wrapReadHandler<Args extends unknown[], T>(fn: (filePath: string, ...args: Args) => Promise<T>) {
  return async (_event: Electron.IpcMainInvokeEvent, filePath: string, ...args: Args) => {
    if (!isSaveInsideSelectedDirectory(filePath)) return { success: false, error: 'Niedozwolona ścieżka pliku' }
    try {
      return { success: true, data: await fn(filePath, ...args) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Nie udało się odczytać danych zapisu' }
    }
  }
}

function csvCell(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function savesToCsv(saves: ParsedSave[]): string {
  const columns: Array<[string, keyof ParsedSave]> = [
    ['slot', 'slotName'],
    ['nazwa', 'displayName'],
    ['profil', 'profileId'],
    ['rozdzial', 'chapter'],
    ['mapa', 'mapName'],
    ['trudnosc', 'difficulty'],
    ['czas_gry_s', 'timePlayedSeconds'],
    ['typ', 'kind'],
    ['zmodyfikowano', 'modifiedAt'],
    ['rozmiar_b', 'sizeBytes'],
  ]
  return [
    columns.map(([label]) => csvCell(label)).join(','),
    ...saves.map((save) => columns.map(([, key]) => csvCell(save[key])).join(',')),
  ].join('\n')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#0b0e0c',
    show: false,
    title: 'Gothic Remake Save Explorer',
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(currentDirectory, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  selectedDirectory = await loadDirectorySetting()
  startWatcher(selectedDirectory)

  ipcMain.handle('saves:scan', currentScan)
  ipcMain.handle('saves:choose-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Wskaż katalog zapisów Gothic 1 Remake',
      defaultPath: selectedDirectory,
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    selectedDirectory = result.filePaths[0]
    await persistDirectorySetting(selectedDirectory)
    startWatcher(selectedDirectory)
    return currentScan()
  })
  ipcMain.handle('saves:open-directory', async () => {
    const error = await shell.openPath(selectedDirectory)
    return error.length === 0
  })
  ipcMain.handle('saves:inspect-deep', async (_event, filePath: string) => {
    if (!isSaveInsideSelectedDirectory(filePath)) return { success: false, error: 'Niedozwolona ścieżka pliku' }
    try {
      return { success: true, details: await inspectDeepSave(filePath) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Nie udało się odczytać rdzenia zapisu' }
    }
  })
  ipcMain.handle('saves:npcs', wrapReadHandler(listNpcs))
  ipcMain.handle('saves:npc-detail', wrapReadHandler((filePath: string, id: string) => npcDetail(filePath, id)))
  ipcMain.handle('saves:traders', wrapReadHandler(listTraders))
  ipcMain.handle('saves:trader-detail', wrapReadHandler((filePath: string, index: number) => traderDetail(filePath, index)))
  ipcMain.handle('saves:glossary', wrapReadHandler(getGlossary))
  ipcMain.handle('saves:memory-characters', wrapReadHandler(getMemoryCharacters))
  ipcMain.handle('saves:memory-events', wrapReadHandler((filePath: string, character: string) => getMemoryEvents(filePath, character)))
  ipcMain.handle('saves:knowledge-characters', wrapReadHandler(getKnowledgeCharacters))
  ipcMain.handle('saves:knowledge-entries', wrapReadHandler((filePath: string, character: string) => getKnowledgeEntries(filePath, character)))
  ipcMain.handle('saves:tutorials', wrapReadHandler(getTutorials))
  ipcMain.handle('saves:story', wrapReadHandler(getStory))
  ipcMain.handle('saves:search-properties', wrapReadHandler((filePath: string, query: string, source?: 'all' | 'metadata' | 'public' | 'private') => searchProperties(filePath, query, source)))

  ipcMain.handle('editor:check-codec', async () => {
    try {
      return { success: true, data: await checkCodec() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Nie udało się sprawdzić kodeka' }
    }
  })
  ipcMain.handle('editor:skill-catalog', async () => ({ success: true, data: skillCatalog() }))
  ipcMain.handle('editor:item-catalog', async (_event, query: string) => {
    try {
      return { success: true, data: await searchItemCatalog(query) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Nie udało się przeszukać katalogu przedmiotów' }
    }
  })
  ipcMain.handle('editor:commit', async (_event, filePath: string, edits: EditOperation[], targetProfileId: number) => {
    if (!isSaveInsideSelectedDirectory(filePath)) return { success: false, steps: [], error: 'Niedozwolona ścieżka pliku' }
    return commitEditorSession(filePath, edits, targetProfileId, selectedDirectory)
  })

  ipcMain.handle('saves:export', async (_event, format: 'json' | 'csv') => {
    const scan = await currentScan()
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Eksportuj kronikę',
      defaultPath: path.join(app.getPath('documents'), `kronika-kolonii.${format}`),
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    })
    if (result.canceled || !result.filePath) return { success: false, cancelled: true }
    try {
      const payload = format === 'json'
        ? JSON.stringify({ ...scan, saves: scan.saves.map(({ screenshot: _screenshot, ...save }) => save) }, null, 2)
        : savesToCsv(scan.saves)
      await fs.writeFile(result.filePath, payload, 'utf8')
      return { success: true, destination: result.filePath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Eksport nie powiódł się' }
    }
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  saveWatcher?.close()
  if (watcherDebounce) clearTimeout(watcherDebounce)
})
