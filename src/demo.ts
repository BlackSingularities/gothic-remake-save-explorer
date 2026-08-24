import type { ParsedSave, ScanResult, SaveKind } from './types'

const now = Date.now()

function demoSave(slot: number, profileId: number, hoursAgo: number, playedMinutes: number, kind: SaveKind, chapter = 1): ParsedSave {
  const modifiedAtMs = now - hoursAgo * 3_600_000
  return {
    fileName: `G1R-${String(slot).padStart(3, '0')}.sav`,
    filePath: `C:\\Users\\Gracz\\AppData\\Local\\G1R\\Saved\\SaveGames\\G1R-${String(slot).padStart(3, '0')}.sav`,
    slotName: `G1R-${String(slot).padStart(3, '0')}`,
    displayName: `Witamy w Kolonii, Dzień ${Math.max(1, Math.ceil(playedMinutes / 90))}, ${String(Math.floor((playedMinutes * 7) % 24)).padStart(2, '0')}:${String((playedMinutes * 11) % 60).padStart(2, '0')}`,
    profileId,
    chapter,
    mapName: 'MainMap',
    difficulty: 'Standard',
    timePlayedSeconds: playedMinutes * 60,
    timeLoadedSeconds: Math.max(0, playedMinutes * 60 - 240),
    modifiedAt: new Date(modifiedAtMs).toISOString(),
    modifiedAtMs,
    sizeBytes: 1_274_000 + slot * 391,
    kind,
    isPermaDeath: false,
    isSurvivalMode: false,
    gameDay: Math.max(1, Math.ceil(playedMinutes / 90)),
    gameClock: `${String(Math.floor((playedMinutes * 7) % 24)).padStart(2, '0')}:${String((playedMinutes * 11) % 60).padStart(2, '0')}`,
    parserWarnings: [],
  }
}

const saves = [
  demoSave(17, 2, 1, 94, 'quick'),
  demoSave(16, 2, 2, 88, 'manual'),
  demoSave(19, 2, 3, 82, 'auto'),
  demoSave(20, 2, 4, 77, 'manual'),
  demoSave(14, 2, 8, 61, 'manual'),
  demoSave(13, 1, 48, 238, 'quick', 2),
  demoSave(12, 1, 52, 225, 'manual', 2),
]

export const demoScan: ScanResult = {
  directory: '%LOCALAPPDATA%\\G1R\\Saved\\SaveGames',
  detected: true,
  scannedAt: new Date().toISOString(),
  saves,
  profiles: [
    { id: 1, saveCount: 2, totalSizeBytes: 2_700_000, latestModifiedAt: saves[5].modifiedAt, maxTimePlayedSeconds: saves[5].timePlayedSeconds, screenshotCount: 2, difficultyPreset: 'Standard', survival: false, permanentDeath: false, permanentDeathGameOver: false, maxAutoSaves: 3, maxQuickSaves: 3 },
    { id: 2, saveCount: 5, totalSizeBytes: 6_400_000, latestModifiedAt: saves[0].modifiedAt, maxTimePlayedSeconds: saves[0].timePlayedSeconds, screenshotCount: 5, difficultyPreset: 'Standard', survival: false, permanentDeath: false, permanentDeathGameOver: false, maxAutoSaves: 3, maxQuickSaves: 3 },
  ],
  ignoredFiles: 5,
  errors: [],
}
