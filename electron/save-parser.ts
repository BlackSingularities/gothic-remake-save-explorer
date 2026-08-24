import { promises as fs } from 'node:fs'
import type { DifficultySettings, ParsedSave, ProfileSummary, SaveKind, ScanResult } from '../src/types'
import { asRecord, executeCore, stringValue, type JsonRecord } from './goresave/client'

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function boolValue(value: unknown): boolean {
  return value === true
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

export function cleanDifficulty(raw: string): string {
  const match = raw.match(/DifficultyPreset_([A-Za-z]+)/i)
  if (match) return match[1]
  const lastSegment = raw.split(/[./_]/).filter(Boolean).at(-1)
  return lastSegment || 'Standard'
}

function shortDifficultyName(raw: string): string {
  const lastSegment = raw.split(/[./_]/).filter(Boolean).at(-1)
  return lastSegment || raw
}

function mapDifficulty(raw: JsonRecord): DifficultySettings {
  return {
    preset: cleanDifficulty(stringValue(raw.preset)),
    combat: shortDifficultyName(stringValue(raw.combat)),
    resources: shortDifficultyName(stringValue(raw.resources)),
    progression: shortDifficultyName(stringValue(raw.progression)),
    flowHelper: boolValue(raw.flowHelper),
    permadeath: boolValue(raw.permadeath),
  }
}

export function parseGameMoment(displayName: string): { gameDay?: number; gameClock?: string } {
  const day = displayName.match(/(?:Dzień|Day)\s+(\d+)/i)
  const clock = displayName.match(/\b([0-2]?\d:[0-5]\d)\b/)
  return {
    gameDay: day ? Number(day[1]) : undefined,
    gameClock: clock?.[1],
  }
}

export function classifyKind(slot: string, profile: { autoSaveSlots?: unknown; quickSaveSlots?: unknown }): SaveKind {
  const autoSlots = Array.isArray(profile.autoSaveSlots) ? profile.autoSaveSlots.map(stringValue) : []
  const quickSlots = Array.isArray(profile.quickSaveSlots) ? profile.quickSaveSlots.map(stringValue) : []
  if (autoSlots.includes(slot)) return 'auto'
  if (quickSlots.includes(slot)) return 'quick'
  return 'manual'
}

function toDataUri(screenshot: JsonRecord | undefined): string | undefined {
  if (!screenshot) return undefined
  const base64 = stringValue(screenshot.bytesBase64)
  if (!base64) return undefined
  const mime = stringValue(screenshot.mimeType) || 'image/jpeg'
  return `data:${mime};base64,${base64}`
}

async function countFilesInDirectory(directory: string): Promise<number> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).length
  } catch {
    return 0
  }
}

async function statsFor(filePath: string): Promise<{ mtime: Date } | null> {
  try {
    return await fs.stat(filePath)
  } catch {
    return null
  }
}

export async function scanSaveDirectory(directory: string): Promise<ScanResult> {
  let scan: JsonRecord
  try {
    scan = await executeCore('scan_save_dir', { path: directory })
  } catch (error) {
    return {
      directory,
      detected: false,
      scannedAt: new Date().toISOString(),
      saves: [],
      profiles: [],
      ignoredFiles: 0,
      errors: [error instanceof Error ? error.message : 'Nie udało się odczytać katalogu zapisów'],
    }
  }

  const errors: string[] = []
  const profilesRaw = asArray(scan.profiles)
  const profileById = new Map(profilesRaw.map((profile) => [numberValue(profile.profileId), profile]))

  const saveEntries = asArray(scan.saves).filter((entry) => {
    if (stringValue(entry.status) === 'ok') return true
    errors.push(`${stringValue(entry.slot) || stringValue(entry.path)}: ${stringValue(entry.status) || 'błąd odczytu'}`)
    return false
  })

  const saves = (await Promise.all(saveEntries.map(async (entry): Promise<ParsedSave | null> => {
    const filePath = stringValue(entry.path).replaceAll('\\', '/')
    const stats = await statsFor(filePath)
    if (!stats) {
      errors.push(`${stringValue(entry.slot)}: plik zniknął podczas skanowania`)
      return null
    }
    const slot = stringValue(entry.slot) || stringValue(entry.slotName)
    const profileId = numberValue(entry.persistentProfileId)
    const profile = profileById.get(profileId) || {}
    const displayName = stringValue(entry.persistentPlayerSaveName) || stringValue(entry.playerSaveName) || slot
    const difficulty = mapDifficulty(asRecord(entry.difficulty))
    const parserWarnings: string[] = []
    if (!stringValue(entry.persistentPlayerSaveName)) parserWarnings.push('Brak nazwy zapisu z rejestru profilu')

    return {
      fileName: `${slot}.sav`,
      filePath,
      slotName: slot,
      displayName,
      profileId,
      chapter: Math.max(0, Math.trunc(numberValue(entry.chapterId))),
      mapName: stringValue(entry.mapName) || 'MainMap',
      difficulty: difficulty.preset,
      timePlayedSeconds: Math.max(0, numberValue(entry.timePlayedSeconds)),
      timeLoadedSeconds: Math.max(0, numberValue(entry.timeLoadedSeconds)),
      modifiedAt: stats.mtime.toISOString(),
      modifiedAtMs: stats.mtime.getTime(),
      sizeBytes: numberValue(entry.fileSize),
      kind: classifyKind(slot, profile),
      isPermaDeath: difficulty.permadeath,
      isSurvivalMode: boolValue(profile.survival),
      ...parseGameMoment(displayName),
      screenshot: toDataUri(asRecord(entry.screenshot)),
      sha1: stringValue(entry.sha1) || undefined,
      parserWarnings,
    }
  }))).filter((save): save is ParsedSave => save !== null)

  saves.sort((a, b) => b.modifiedAtMs - a.modifiedAtMs)

  const profileIds = [...new Set(saves.map((save) => save.profileId))].sort((a, b) => a - b)
  const profiles: ProfileSummary[] = profileIds.map((id) => {
    const profileSaves = saves.filter((save) => save.profileId === id)
    const raw = profileById.get(id) || {}
    return {
      id,
      saveCount: profileSaves.length,
      totalSizeBytes: profileSaves.reduce((sum, save) => sum + save.sizeBytes, 0),
      latestModifiedAt: profileSaves[0]?.modifiedAt || new Date(0).toISOString(),
      maxTimePlayedSeconds: Math.max(0, ...profileSaves.map((save) => save.timePlayedSeconds)),
      screenshotCount: profileSaves.filter((save) => Boolean(save.screenshot)).length,
      difficultyPreset: cleanDifficulty(stringValue(raw.difficultyPreset)),
      survival: boolValue(raw.survival),
      permanentDeath: boolValue(raw.permanentDeath),
      permanentDeathGameOver: boolValue(raw.permanentDeathGameOver),
      maxAutoSaves: numberValue(raw.maxAuto),
      maxQuickSaves: numberValue(raw.maxQuick),
    }
  })

  const totalFiles = await countFilesInDirectory(directory)

  return {
    directory,
    detected: true,
    scannedAt: new Date().toISOString(),
    saves,
    profiles,
    ignoredFiles: Math.max(0, totalFiles - saves.length - errors.length),
    errors,
  }
}
