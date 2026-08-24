import { describe, expect, it } from 'vitest'
import { classifyKind, cleanDifficulty, parseGameMoment } from './save-parser'

describe('classifyKind', () => {
  it('recognizes auto and quick saves from the profile slot registry', () => {
    const profile = { autoSaveSlots: ['G1R-001'], quickSaveSlots: ['G1R-002'] }
    expect(classifyKind('G1R-001', profile)).toBe('auto')
    expect(classifyKind('G1R-002', profile)).toBe('quick')
    expect(classifyKind('G1R-003', profile)).toBe('manual')
  })
})

describe('cleanDifficulty', () => {
  it('extracts the readable suffix from a difficulty preset path', () => {
    expect(cleanDifficulty('/Script/Angelscript.DifficultyPreset_Hard')).toBe('Hard')
    expect(cleanDifficulty('')).toBe('Standard')
  })
})

describe('parseGameMoment', () => {
  it('reads the in-game day and clock from a Polish save name', () => {
    expect(parseGameMoment('Leże Śniącego, Dzień 26, 03:32')).toEqual({ gameDay: 26, gameClock: '03:32' })
  })

  it('returns undefined fields when the save name carries no game time', () => {
    expect(parseGameMoment('Custom slot name')).toEqual({ gameDay: undefined, gameClock: undefined })
  })
})
