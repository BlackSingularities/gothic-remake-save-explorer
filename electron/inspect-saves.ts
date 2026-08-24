import path from 'node:path'
import { scanSaveDirectory } from './save-parser'

const directory = process.argv[2]
  || path.join(process.env.LOCALAPPDATA || '', 'G1R', 'Saved', 'SaveGames')

const result = await scanSaveDirectory(directory)

console.log(JSON.stringify({
  directory: result.directory,
  detected: result.detected,
  saveCount: result.saves.length,
  profileCount: result.profiles.length,
  screenshotCount: result.saves.filter((save) => save.screenshot).length,
  errors: result.errors,
  saves: result.saves.map((save) => ({
    slot: save.slotName,
    profile: save.profileId,
    chapter: save.chapter,
    timePlayedSeconds: Math.round(save.timePlayedSeconds),
    kind: save.kind,
    gameDay: save.gameDay,
    gameClock: save.gameClock,
    hasScreenshot: Boolean(save.screenshot),
  })),
}, null, 2))
