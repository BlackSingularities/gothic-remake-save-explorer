import { contextBridge, ipcRenderer } from 'electron'
import type { CompanionApi } from '../src/types'

const api: CompanionApi = {
  appVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: (info) => ipcRenderer.invoke('update:download', info),
  installUpdate: (file) => ipcRenderer.invoke('update:install', file),
  onUpdateProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, fraction: number) => callback(fraction)
    ipcRenderer.on('update:progress', listener)
    return () => ipcRenderer.removeListener('update:progress', listener)
  },
  scan: () => ipcRenderer.invoke('saves:scan'),
  chooseDirectory: (title) => ipcRenderer.invoke('saves:choose-directory', title),
  openDirectory: () => ipcRenderer.invoke('saves:open-directory'),
  inspectDeepSave: (filePath) => ipcRenderer.invoke('saves:inspect-deep', filePath),
  exportData: (format, title) => ipcRenderer.invoke('saves:export', format, title),
  listNpcs: (filePath) => ipcRenderer.invoke('saves:npcs', filePath),
  npcDetail: (filePath, id) => ipcRenderer.invoke('saves:npc-detail', filePath, id),
  listTraders: (filePath) => ipcRenderer.invoke('saves:traders', filePath),
  traderDetail: (filePath, index) => ipcRenderer.invoke('saves:trader-detail', filePath, index),
  glossary: (filePath) => ipcRenderer.invoke('saves:glossary', filePath),
  memoryCharacters: (filePath) => ipcRenderer.invoke('saves:memory-characters', filePath),
  memoryEvents: (filePath, character) => ipcRenderer.invoke('saves:memory-events', filePath, character),
  knowledgeCharacters: (filePath) => ipcRenderer.invoke('saves:knowledge-characters', filePath),
  knowledgeEntries: (filePath, character) => ipcRenderer.invoke('saves:knowledge-entries', filePath, character),
  tutorials: (filePath) => ipcRenderer.invoke('saves:tutorials', filePath),
  story: (filePath) => ipcRenderer.invoke('saves:story', filePath),
  searchProperties: (filePath, query, source) => ipcRenderer.invoke('saves:search-properties', filePath, query, source),
  editorCheckCodec: () => ipcRenderer.invoke('editor:check-codec'),
  editorSkillCatalog: () => ipcRenderer.invoke('editor:skill-catalog'),
  editorItemCatalog: (query) => ipcRenderer.invoke('editor:item-catalog', query),
  editorLocationCatalog: (query) => ipcRenderer.invoke('editor:location-catalog', query),
  editorCommit: (filePath, edits, targetProfileId) => ipcRenderer.invoke('editor:commit', filePath, edits, targetProfileId),
  onSavesChanged: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('saves:changed', listener)
    return () => ipcRenderer.removeListener('saves:changed', listener)
  },
}

contextBridge.exposeInMainWorld('gothic', api)
