import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import electron from 'electron'
import type { EditOperation, EditorCommitResult, EditorStepResult, CodecStatus, SkillCatalogEntry } from '../../src/types'
import { asRecord, executeCore, stringValue, type JsonRecord } from './client'
import { clearDeepSaveCache } from './read'

// Structural edits (add/remove an inventory or trader item, revive an NPC, change a relationship)
// can shift array indices — the core refuses to combine them with anything else in the same
// `write_save` batch. `story.apply` must additionally be the ONLY edit in its batch (it CAS-checks
// every story id against the pre-batch snapshot). Everything else (attribute/skill/quest-state/
// faction/position edits) is a plain value overwrite and can safely share one batch. See research
// notes: gore-save write-path audit.
const SOLO_KINDS = new Set<EditOperation['kind']>(['itemAdd', 'itemRemove', 'npcRevive', 'npcRelationship', 'traderItemAdd', 'traderItemRemove', 'chapter'])

function coerceRawValue(valueType: string, raw: string): number | boolean | string {
  if (valueType === 'IntProperty' || valueType === 'Int64Property') return Math.trunc(Number(raw))
  if (valueType === 'FloatProperty' || valueType === 'DoubleProperty') return Number(raw)
  if (valueType === 'BoolProperty') return raw.trim().toLowerCase() === 'true'
  return raw
}

function toApiEdit(operation: EditOperation): { path: string; value: JsonRecord | string } {
  switch (operation.kind) {
    case 'attribute':
      return { path: 'private.player.setAttribute', value: { id: operation.id, baseValue: operation.value, currentValue: operation.value } }
    case 'itemCount':
      return { path: 'private.inventory.setItemCount', value: { id: operation.id, count: operation.count } }
    case 'itemAdd':
      return { path: 'private.inventory.addItem', value: { path: operation.id, count: operation.count } }
    case 'itemRemove':
      return { path: 'private.inventory.removeItem', value: { path: operation.id } }
    case 'skill':
      return { path: 'private.skills.set', value: { base: operation.base, tier: operation.tier } }
    case 'questState':
      return { path: 'private.typed.setValue', value: { path: operation.statePath, value: `EQuestState::${operation.state}` } }
    case 'npcRevive':
      return { path: 'private.npc.revive', value: { id: operation.id } }
    case 'npcRelationship':
      return { path: 'private.npc.setRelationship', value: { id: operation.id, relationship: operation.relationship[0].toUpperCase() + operation.relationship.slice(1) } }
    case 'factionForgive':
      return { path: 'private.factions.forgive', value: { guild: operation.guild } }
    case 'saveName':
      return { path: 'public.m_PlayerSaveName', value: operation.value }
    case 'position':
      return { path: 'private.player.setTransform', value: { location: { x: operation.x, y: operation.y, z: operation.z }, rotation: { pitch: 0, yaw: operation.yaw, roll: 0 } } }
    case 'chapter':
      return {
        path: 'private.story.apply',
        value: { changes: [{ id: 'Chapter', present: true, rawValue: operation.value, expected: { stored: true, rawValue: operation.previous } }] },
      }
    case 'traderStock':
      return { path: 'private.traders.setStock', value: { index: operation.index, path: operation.itemPath, count: operation.count } }
    case 'traderItemAdd':
      return { path: 'private.traders.addItem', value: { index: operation.index, path: operation.itemPath, count: operation.count } }
    case 'traderItemRemove':
      return { path: 'private.traders.removeItem', value: { index: operation.index, path: operation.itemPath } }
    case 'rawTyped':
      return { path: 'private.typed.setValue', value: { path: operation.path, value: coerceRawValue(operation.valueType, operation.value) } }
  }
}

export function planBatches(edits: EditOperation[]): EditOperation[][] {
  const batchable = edits.filter((edit) => !SOLO_KINDS.has(edit.kind))
  const solo = edits.filter((edit) => SOLO_KINDS.has(edit.kind))
  const batches: EditOperation[][] = []
  if (batchable.length) batches.push(batchable)
  for (const single of solo) batches.push([single])
  return batches
}

function workingFilePath(): string {
  const app = (electron as unknown as { app?: Electron.App }).app
  const tempDir = app ? app.getPath('temp') : os.tmpdir()
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  return path.join(tempDir, `gothic-save-explorer-edit-${unique}.sav`)
}

async function writeBatch(sourcePath: string, outputPath: string, edits: EditOperation[]): Promise<void> {
  await executeCore('write_save', {
    path: sourcePath,
    outputPath,
    backup: true,
    edits: edits.map(toApiEdit),
  })
}

async function validateRoundtrip(filePath: string): Promise<boolean> {
  const result = await executeCore('validate_roundtrip', { path: filePath })
  return result.identical === true
}

export async function checkCodec(): Promise<CodecStatus> {
  try {
    const result = await executeCore('check_codec', {})
    return {
      available: result.available === true,
      backend: stringValue(result.backend) || 'Kraken',
      details: typeof result.details === 'string' ? result.details : undefined,
    }
  } catch (error) {
    return { available: false, backend: 'Kraken', details: error instanceof Error ? error.message : 'Nie udało się sprawdzić kodeka' }
  }
}

async function findFreeSlotName(directory: string): Promise<string> {
  for (let n = 1; n <= 999; n += 1) {
    const slot = `G1R-${String(n).padStart(3, '0')}`
    try {
      await fs.access(path.join(directory, `${slot}.sav`))
    } catch {
      return slot
    }
  }
  throw new Error('Brak wolnego miejsca na nowy zapis (limit 999 slotów)')
}

async function assignToProfile(workingFile: string, directory: string, profileId: number): Promise<string> {
  const slot = await findFreeSlotName(directory)
  const destinationPath = path.join(directory, `${slot}.sav`)
  const persistentPath = path.join(directory, 'PersistentDataList.sav')
  await executeCore('assign_save_profile', {
    path: workingFile,
    destinationPath,
    persistentPath,
    profileId,
    backup: true,
  })
  return slot
}

/**
 * Applies `edits` to a COPY of `sourcePath` and, on success, registers that copy as a brand-new
 * save slot in `targetProfileId` — the original file is opened read-only throughout. Mirrors the
 * flow documented in the write-path audit: write_save(outputPath=<temp>) → validate_roundtrip →
 * assign_save_profile(destinationPath=<free G1R-XXX.sav>).
 */
export async function commitEditorSession(
  sourcePath: string,
  edits: EditOperation[],
  targetProfileId: number,
  saveDirectory: string,
): Promise<EditorCommitResult> {
  const steps: EditorStepResult[] = []
  if (!edits.length) return { success: false, steps, error: 'Brak zmian do zapisania' }

  const batches = planBatches(edits)
  const working = workingFilePath()
  let currentSource = sourcePath

  try {
    for (let i = 0; i < batches.length; i += 1) {
      await writeBatch(currentSource, working, batches[i])
      currentSource = working
      steps.push({ step: `Zapis partii ${i + 1}/${batches.length}`, ok: true })
    }

    const identical = await validateRoundtrip(working)
    steps.push({ step: 'Walidacja spójności pliku', ok: identical, detail: identical ? undefined : 'Plik zbudowano, ale niezależna walidacja round-trip nie potwierdziła pełnej spójności' })

    const slotName = await assignToProfile(working, saveDirectory, targetProfileId)
    steps.push({ step: `Dodano jako nowy slot ${slotName}`, ok: true })

    clearDeepSaveCache()
    return { success: true, slotName, destinationPath: path.join(saveDirectory, `${slotName}.sav`), steps }
  } catch (error) {
    steps.push({ step: 'Błąd zapisu', ok: false, detail: error instanceof Error ? error.message : String(error) })
    return { success: false, steps, error: error instanceof Error ? error.message : 'Zapis edycji nie powiódł się' }
  } finally {
    await fs.unlink(working).catch(() => {})
  }
}

interface SkillDef {
  base: string
  label: string
  category: string
  kind: SkillCatalogEntry['kind']
  ladder?: string[]
  hasUntrained?: boolean
}

const SKILL_DEFS: SkillDef[] = [
  { base: 'Melee_OneHanded', label: 'Broń jednoręczna', category: 'Walka', kind: 'ladder', ladder: ['Trained', 'Master'] },
  { base: 'Melee_TwoHanded', label: 'Broń dwuręczna', category: 'Walka', kind: 'ladder', ladder: ['Trained', 'Master'] },
  { base: 'Melee_Fists', label: 'Walka pięściami', category: 'Walka', kind: 'ladder', ladder: ['Trained', 'Master'] },
  { base: 'Ranged_Bow', label: 'Łuki', category: 'Walka', kind: 'ladder', ladder: ['Trained', 'Master'], hasUntrained: true },
  { base: 'Ranged_Crossbow', label: 'Kusze', category: 'Walka', kind: 'ladder', ladder: ['Trained', 'Master'], hasUntrained: true },
  { base: 'Picklock', label: 'Otwieranie zamków', category: 'Złodziejstwo', kind: 'ladder', ladder: ['Skilled', 'Master'], hasUntrained: true },
  { base: 'Pickpocket', label: 'Kradzież kieszonkowa', category: 'Złodziejstwo', kind: 'ladder', ladder: ['Skilled', 'Master'], hasUntrained: true },
  { base: 'Acrobatics', label: 'Akrobatyka', category: 'Ruch', kind: 'binary' },
  { base: 'Wallclimbing', label: 'Wspinaczka', category: 'Ruch', kind: 'binary' },
  { base: 'Riding', label: 'Jeździectwo', category: 'Ruch', kind: 'binary' },
  { base: 'Sneak', label: 'Skradanie', category: 'Ruch', kind: 'binary' },
  { base: 'Crafting_Alchemy', label: 'Alchemia', category: 'Rzemiosło', kind: 'binary' },
  { base: 'Crafting_Inscription', label: 'Tworzenie run', category: 'Rzemiosło', kind: 'binary' },
  { base: 'Crafting_Blacksmith', label: 'Kowalstwo', category: 'Rzemiosło', kind: 'ladder', ladder: ['Trained', 'Master'] },
  { base: 'Mage_Circle', label: 'Krąg magii', category: 'Magia', kind: 'circle', ladder: ['Amateur', '1', '2', '3', '4', '5', '6'] },
  { base: 'Orcish', label: 'Język orków', category: 'Języki', kind: 'ladder', ladder: ['Master'], hasUntrained: true },
]

export function skillCatalog(): SkillCatalogEntry[] {
  return SKILL_DEFS.map((def) => ({
    base: def.base,
    label: def.label,
    category: def.category,
    kind: def.kind,
    tiers: [
      ...(def.hasUntrained || def.kind === 'binary' || def.kind === 'hunting' ? ['Untrained'] : []),
      ...(def.kind === 'binary' ? ['Learned'] : def.ladder || []),
    ],
  }))
}
