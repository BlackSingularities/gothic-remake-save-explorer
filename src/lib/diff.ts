import type { DeepSaveDetails } from '../types'

export interface DiffEntry {
  id: string
  label: string
  before?: string
  after?: string
}

export interface SaveDiff {
  attributes: DiffEntry[]
  itemsAdded: DiffEntry[]
  itemsRemoved: DiffEntry[]
  itemsChanged: DiffEntry[]
  questsChanged: DiffEntry[]
  skillsLearned: DiffEntry[]
}

/** Structural diff between two save snapshots — modelled after the compare tool in the
 * community savegame editor (research/g1r-editor-ref/app/savediff.py), reimplemented here. */
export function diffSaveDetails(before: DeepSaveDetails, after: DeepSaveDetails): SaveDiff {
  const attributes: DiffEntry[] = []
  const afterAttributes = new Map(after.character.attributes.map((attribute) => [attribute.id, attribute]))
  for (const attribute of before.character.attributes) {
    const match = afterAttributes.get(attribute.id)
    if (match && match.current !== attribute.current) {
      attributes.push({ id: attribute.id, label: attribute.label, before: String(attribute.current), after: String(match.current) })
    }
  }

  const beforeItems = new Map(before.inventory.items.map((item) => [item.id, item]))
  const afterItems = new Map(after.inventory.items.map((item) => [item.id, item]))
  const itemsAdded: DiffEntry[] = []
  const itemsChanged: DiffEntry[] = []
  for (const [id, item] of afterItems) {
    const match = beforeItems.get(id)
    if (!match) itemsAdded.push({ id, label: item.name, after: String(item.count) })
    else if (match.count !== item.count) itemsChanged.push({ id, label: item.name, before: String(match.count), after: String(item.count) })
  }
  const itemsRemoved: DiffEntry[] = [...beforeItems.entries()]
    .filter(([id]) => !afterItems.has(id))
    .map(([id, item]) => ({ id, label: item.name, before: String(item.count) }))

  const beforeQuests = new Map(before.quests.entries.map((quest) => [quest.id, quest]))
  const questsChanged: DiffEntry[] = []
  for (const quest of after.quests.entries) {
    const match = beforeQuests.get(quest.id)
    if (!match || match.state !== quest.state) {
      questsChanged.push({ id: quest.id, label: quest.name, before: match?.state, after: quest.state })
    }
  }

  const beforeLearnedSkills = new Set(before.skills.filter((skill) => skill.learned).map((skill) => skill.id))
  const skillsLearned: DiffEntry[] = after.skills
    .filter((skill) => skill.learned && !beforeLearnedSkills.has(skill.id))
    .map((skill) => ({ id: skill.id, label: skill.label, after: skill.level }))

  return { attributes, itemsAdded, itemsRemoved, itemsChanged, questsChanged, skillsLearned }
}
