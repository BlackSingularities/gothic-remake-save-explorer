import type {
  CharacterAttribute,
  CharacterSkill,
  DeepSaveDetails,
  FactionCrimeSummary,
  GlossaryEntry,
  GlossaryResult,
  GlossarySegment,
  InventoryItem,
  KnowledgeCharacterSummary,
  MemoryCharacterSummary,
  MemoryEvent,
  NpcDetail,
  NpcPosition,
  NpcRelationship,
  NpcSummary,
  QuestEntry,
  StoryData,
  StoryFlag,
  TraderDetail,
  TraderStockItem,
  TraderSummary,
  TutorialEntry,
  TypedPropertyMatch,
  TypedPropertySearchResult,
} from '../../src/types'
import { asRecord, cacheKey, executeCore, stringValue, type JsonRecord } from './client'
import { resolveItemName, resolveNearestArea, resolveNpcName, resolveQuestName, resolveSkillName } from './catalogs'

const attributeLabels: Record<string, string> = {
  Health: 'Punkty życia',
  MaxHealth: 'Maks. życie',
  Level: 'Poziom',
  Experience: 'Doświadczenie',
  Mana: 'Mana',
  MaxMana: 'Maks. mana',
  MagicianLevel: 'Krąg magii',
  Dexterity: 'Zręczność',
  Strength: 'Siła',
  LearningPoints: 'Punkty nauki',
}

const skillLabels: Record<string, string> = {
  Bow: 'Łuki',
  Crossbow: 'Kusze',
  Fists: 'Walka pięściami',
  'One-Handed': 'Broń jednoręczna',
  'Two-Handed': 'Broń dwuręczna',
  'Orc Weapons': 'Broń orków',
  Alchemy: 'Alchemia',
  Blacksmithing: 'Kowalstwo',
  Mining: 'Górnictwo',
  'Rune Inscription': 'Tworzenie run',
  Acrobatics: 'Akrobatyka',
  Diving: 'Nurkowanie',
  Riding: 'Jeździectwo',
  Sneaking: 'Skradanie',
  'Wall Climbing': 'Wspinaczka',
  Lockpicking: 'Otwieranie zamków',
  Pickpocketing: 'Kradzież kieszonkowa',
  'Magic Circle': 'Krąg magii',
  'Orcish Language': 'Język orków',
}

const skillCategoryLabels: Record<string, string> = {
  Combat: 'Walka',
  Crafting: 'Rzemiosło',
  Hunting: 'Łowiectwo',
  Language: 'Języki',
  Magic: 'Magia',
  Movement: 'Ruch',
  Thievery: 'Złodziejstwo',
}

const skillLevelLabels: Record<string, string> = {
  Untrained: 'Niewyuczona',
  Learned: 'Wyuczona',
  Trained: 'Wyszkolony',
  Skilled: 'Biegły',
  Master: 'Mistrz',
  Amateur: 'Nowicjusz',
}

const factionLabels: Record<string, string> = {
  OldCamp: 'Stary Obóz',
  NewCamp: 'Nowy Obóz',
  SwampCamp: 'Obóz na Bagnie',
  BanditsCamp: 'Obóz Bandytów',
  Shaman: 'Szamani orków',
  Other: 'Pozostali',
}

const itemNames: Record<string, string> = {
  ItMi_Orenugget: 'Bryłka magicznej rudy',
  ItMi_Oldcoin_01: 'Stara moneta',
  ItKe_Lockpick: 'Wytrych',
  ItAm_Arrow: 'Strzała',
  ItMi_Lute: 'Lutnia',
  ItFo_Potion_Beer: 'Piwo',
  ItFo_Potion_Water_01: 'Woda',
  ItFo_Muttonraw: 'Surowe mięso',
  ItFo_Whitemeat: 'Białe mięso',
  ItMw_2H_Axe_Pickaxe: 'Kilof',
  ItMw_1H_Mace_Club_01: 'Maczuga',
  ItMs_Glossary: 'Leksykon',
  ItWr_Scroll_Letter_01: 'List',
}

const categoryLabels: Array<[RegExp, string]> = [
  [/^ItMw_/, 'Broń'],
  [/^ItAr_/, 'Pancerz / magia'],
  [/^ItFo_Potion_/, 'Mikstury i napoje'],
  [/^ItFo_Plants_/, 'Rośliny'],
  [/^ItFo_/, 'Żywność'],
  [/^ItAm_/, 'Amunicja'],
  [/^ItWr_|^ItMs_/, 'Dokumenty'],
  [/^ItKe_/, 'Klucze i wytrychy'],
  [/^ItMi_/, 'Przedmioty'],
  [/^ItAt_/, 'Trofea'],
]

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function boolValue(value: unknown): boolean {
  return value === true
}

function prettifyIdentifier(value: string): string {
  return value
    .replace(/^Quest_/, '')
    .replace(/^It(?:Mi|Mw|Fo|Ar|Am|Wr|Ms|Ke|At)_/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim()
}

function itemCategory(id: string): string {
  return categoryLabels.find(([pattern]) => pattern.test(id))?.[1] || 'Inne'
}

function mapAttributes(player: JsonRecord): CharacterAttribute[] {
  return asArray(player.attributes).map((attribute) => {
    const id = stringValue(attribute.id)
    return {
      id,
      label: attributeLabels[id] || prettifyIdentifier(id),
      current: numberValue(attribute.currentValue),
      base: numberValue(attribute.baseValue),
    }
  })
}

async function mapInventory(privateData: JsonRecord): Promise<DeepSaveDetails['inventory']> {
  const inventory = asRecord(privateData.inventory)
  const rawItems = asArray(inventory.items).filter((item) => {
    const id = stringValue(item.id)
    return id && !id.startsWith('HumanFist_NoWeapon')
  })
  const items: InventoryItem[] = await Promise.all(rawItems.map(async (item): Promise<InventoryItem> => {
    const id = stringValue(item.id)
    return {
      id,
      name: itemNames[id] || await resolveItemName(id),
      category: itemCategory(id),
      count: Math.max(0, numberValue(item.count)),
      equipped: boolValue(item.equipped),
      removable: boolValue(item.removable),
      upgrades: Array.isArray(item.upgrades) ? item.upgrades.map(stringValue).filter(Boolean) : [],
    }
  }))
  items.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'))

  return {
    items,
    stackCount: items.length,
    totalItemCount: items.reduce((sum, item) => sum + item.count, 0),
    oreCount: items.filter((item) => item.id === 'ItMi_Orenugget').reduce((sum, item) => sum + item.count, 0),
    equippedCount: items.filter((item) => item.equipped).length,
  }
}

async function mapSkills(data: JsonRecord): Promise<CharacterSkill[]> {
  return Promise.all(asArray(data.skills).map(async (skill): Promise<CharacterSkill> => {
    const base = stringValue(skill.base)
    const label = stringValue(skill.label) || base
    const level = stringValue(skill.current)
    return {
      id: base,
      label: skillLabels[label] || await resolveSkillName(base, prettifyIdentifier(label)),
      category: skillCategoryLabels[stringValue(skill.category)] || stringValue(skill.category) || 'Inne',
      level: skillLevelLabels[level] || level || 'Nieznany',
      learned: boolValue(skill.learned) && level !== 'Untrained',
    }
  }))
}

function questState(value: string): QuestEntry['state'] {
  const normalized = value.replace(/^EQuestState::/, '').toLocaleLowerCase('en')
  if (normalized === 'available' || normalized === 'running' || normalized === 'succeeded' || normalized === 'failed' || normalized === 'none') return normalized
  return 'unknown'
}

async function mapQuests(data: JsonRecord): Promise<DeepSaveDetails['quests']> {
  const counts = asRecord(data.stateCounts)
  const relevant = asArray(data.quests).filter((quest) => {
    const state = questState(stringValue(quest.currentState))
    return state === 'running' || state === 'succeeded' || state === 'failed'
  })
  const entries: QuestEntry[] = await Promise.all(relevant.map(async (quest): Promise<QuestEntry> => {
    const id = stringValue(quest.id)
    const rawName = stringValue(quest.name)
    return {
      id,
      questClass: stringValue(quest.questClass),
      statePath: Array.isArray(quest.statePath) ? quest.statePath.map(stringValue) : [],
      name: await resolveQuestName(id || rawName),
      group: prettifyIdentifier(stringValue(quest.group)) || 'Pozostałe',
      state: questState(stringValue(quest.currentState)),
    }
  }))

  return {
    entries,
    total: numberValue(data.total),
    running: numberValue(counts.Running),
    succeeded: numberValue(counts.Succeeded),
    available: numberValue(counts.Available),
    failed: numberValue(counts.Failed),
  }
}

function mapFactions(privateData: JsonRecord): FactionCrimeSummary[] {
  const guilds = asArray(asRecord(privateData.factions).guilds)
  return guilds.map((guild) => {
    const label = stringValue(guild.label)
    const crimes = asRecord(guild.crimes)
    return {
      id: stringValue(guild.guild),
      label: factionLabels[label] || prettifyIdentifier(label),
      total: numberValue(guild.total),
      forgiven: numberValue(guild.forgiven),
      unforgiven: numberValue(guild.unforgiven),
      hostile: boolValue(guild.isHostile),
      crimes: {
        assault: numberValue(crimes.assault),
        murder: numberValue(crimes.murder),
        theft: numberValue(crimes.theft),
        threat: numberValue(crimes.threat),
        trespassing: numberValue(crimes.trespassing),
        other: numberValue(crimes.other),
      },
    }
  })
}

const glossaryCategoryLabels: Record<string, string> = {
  creatures: 'Stworzenia',
  locations: 'Lokacje',
}

function relationshipValue(raw: unknown): NpcRelationship {
  const value = stringValue(raw).toLowerCase()
  if (value === 'friend') return 'friend'
  if (value === 'enemy') return 'enemy'
  return 'neutral'
}

export async function listNpcs(filePath: string): Promise<NpcSummary[]> {
  const pageSize = 1000
  const raw: JsonRecord[] = []
  let offset = 0
  let total = Infinity
  for (; offset < total; offset += pageSize) {
    const page = await executeCore('private.npc.list', { path: filePath, offset, limit: pageSize })
    total = numberValue(page.total)
    const entries = asArray(page.npcs)
    raw.push(...entries)
    if (!entries.length) break
  }
  return Promise.all(raw.filter((entry) => stringValue(entry.id)).map(async (entry): Promise<NpcSummary> => {
    const id = stringValue(entry.id)
    return {
      id,
      name: await resolveNpcName(id),
      hp: numberValue(entry.hp),
      maxHp: numberValue(entry.maxHp),
      isDead: boolValue(entry.isDead),
      relationship: relationshipValue(entry.personalRelationship),
    }
  }))
}

function mapNpcAttributes(data: JsonRecord): CharacterAttribute[] {
  return asArray(data.attributes).map((attribute) => {
    const id = stringValue(attribute.key)
    return {
      id,
      label: attributeLabels[id] || prettifyIdentifier(id),
      current: numberValue(attribute.current),
      base: numberValue(attribute.base),
    }
  })
}

async function fetchNpcPosition(filePath: string, id: string): Promise<NpcPosition | undefined> {
  try {
    const result = await executeCore('private.npc.position', { path: filePath, id })
    const pose = asRecord(result.pose)
    const location = asRecord(pose.location)
    const rotation = asRecord(pose.rotation)
    const spawn = asRecord(pose.spawnLocation)
    if (!Object.keys(location).length) return undefined
    const x = numberValue(location.x)
    const y = numberValue(location.y)
    const z = numberValue(location.z)
    return {
      location: { x, y, z },
      yaw: numberValue(rotation.yaw),
      spawnLocation: Object.keys(spawn).length
        ? { x: numberValue(spawn.x), y: numberValue(spawn.y), z: numberValue(spawn.z) }
        : undefined,
      nearestArea: await resolveNearestArea(x, y, z),
    }
  } catch {
    return undefined
  }
}

async function mapActorInventory(data: JsonRecord): Promise<InventoryItem[]> {
  const rawItems = asArray(data.items).filter((item) => stringValue(item.id))
  return Promise.all(rawItems.map(async (item): Promise<InventoryItem> => {
    const id = stringValue(item.id)
    return {
      id,
      name: itemNames[id] || await resolveItemName(id),
      category: itemCategory(id),
      count: Math.max(0, numberValue(item.count)),
      equipped: stringValue(item.containerType) !== 'MainContainer' && stringValue(item.containerType) !== '',
      removable: boolValue(item.removable),
      upgrades: [],
    }
  }))
}

export async function npcDetail(filePath: string, id: string): Promise<NpcDetail> {
  const [attributesData, inventoryData, position, name] = await Promise.all([
    executeCore('private.npc.attributes', { path: filePath, id }),
    executeCore('private.npc.inventory', { path: filePath, id }),
    fetchNpcPosition(filePath, id),
    resolveNpcName(id),
  ])
  return {
    id,
    name,
    attributes: mapNpcAttributes(attributesData),
    position,
    inventory: await mapActorInventory(inventoryData),
  }
}

export async function listTraders(filePath: string): Promise<TraderSummary[]> {
  const result = await executeCore('private.traders.list', { path: filePath })
  const traders = asArray(result.traders).filter((trader) => !boolValue(trader.placeholder))
  return Promise.all(traders.map(async (trader): Promise<TraderSummary> => {
    const id = stringValue(trader.uniqueName)
    return {
      index: numberValue(trader.index),
      id,
      name: await resolveNpcName(id),
      ore: numberValue(trader.ore),
      itemCount: numberValue(trader.itemCount),
      traded: boolValue(trader.traded),
      placeholder: boolValue(trader.placeholder),
    }
  }))
}

async function mapTraderStock(items: JsonRecord[]): Promise<TraderStockItem[]> {
  const rawItems = items.filter((item) => stringValue(item.id))
  return Promise.all(rawItems.map(async (item): Promise<TraderStockItem> => {
    const id = stringValue(item.id)
    return {
      id,
      path: stringValue(item.path) || id,
      name: itemNames[id] || await resolveItemName(id),
      count: Math.max(0, numberValue(item.count)),
      defaultCount: 0,
    }
  }))
}

export async function traderDetail(filePath: string, index: number): Promise<TraderDetail> {
  const result = await executeCore('private.traders.detail', { path: filePath, index })
  const items = await mapTraderStock(asArray(result.items))
  const defaults = new Map(asArray(result.defaultItems).map((item) => [stringValue(item.id), Math.max(0, numberValue(item.count))]))
  for (const item of items) item.defaultCount = defaults.get(item.id) ?? 0
  const id = stringValue(result.uniqueName)
  return { index, id, name: await resolveNpcName(id), items }
}

export async function getGlossary(filePath: string): Promise<GlossaryResult> {
  const result = await executeCore('query_progression', { path: filePath, section: 'glossary', offset: 0, limit: 2000 })
  const rawEntries = asArray(result.categories).flatMap((category) => asArray(category.entries))
  const byCategory = new Map<string, GlossaryEntry[]>()
  for (const raw of rawEntries) {
    const segments: GlossarySegment[] = asArray(raw.segments).map((segment) => ({
      id: stringValue(segment.id),
      name: prettifyIdentifier(stringValue(segment.name)),
      unlocked: boolValue(segment.unlocked),
    }))
    const entry: GlossaryEntry = {
      id: stringValue(raw.id),
      name: prettifyIdentifier(stringValue(raw.name) || stringValue(raw.id)),
      category: stringValue(raw.category) || 'other',
      unlockedSegments: segments.filter((segment) => segment.unlocked).length,
      totalSegments: segments.length,
      segments,
    }
    const list = byCategory.get(entry.category) || []
    list.push(entry)
    byCategory.set(entry.category, list)
  }
  const categories = [...byCategory.entries()].map(([name, entries]) => ({
    name: glossaryCategoryLabels[name] || prettifyIdentifier(name),
    entries,
  }))
  const total = numberValue(result.total)
  const unlockedTotal = categories.reduce((sum, category) => sum + category.entries.reduce((s, entry) => s + entry.unlockedSegments, 0), 0)
  return { categories, unlockedTotal, total }
}

export async function getMemoryCharacters(filePath: string): Promise<MemoryCharacterSummary[]> {
  const result = await executeCore('query_progression', { path: filePath, section: 'events', offset: 0, limit: 2000 })
  const characters = asArray(result.characters).filter((entry) => stringValue(entry.id))
  return Promise.all(characters.map(async (entry): Promise<MemoryCharacterSummary> => {
    const character = stringValue(entry.id)
    return { character, name: await resolveNpcName(character), eventCount: numberValue(entry.eventCount) }
  }))
}

export async function getMemoryEvents(filePath: string, character: string): Promise<MemoryEvent[]> {
  const result = await executeCore('query_progression', { path: filePath, section: 'events', character, offset: 0, limit: 2000 })
  return asArray(result.events).map((event, index) => {
    const position = asRecord(event.position)
    return {
      index: numberValue(event.index) || index,
      tags: Array.isArray(event.tags) ? event.tags.map(stringValue).filter(Boolean) : [],
      instigator: typeof event.instigator === 'string' ? event.instigator : null,
      affected: typeof event.affected === 'string' ? event.affected : null,
      magnitude: numberValue(event.magnitude),
      timeSeconds: typeof event.timeSeconds === 'number' ? event.timeSeconds : null,
      position: Object.keys(position).length ? { x: numberValue(position.x), y: numberValue(position.y), z: numberValue(position.z) } : undefined,
    }
  })
}

export async function getKnowledgeCharacters(filePath: string): Promise<KnowledgeCharacterSummary[]> {
  const result = await executeCore('query_progression', { path: filePath, section: 'knowledge', offset: 0, limit: 2000 })
  const characters = asArray(result.characters).filter((entry) => stringValue(entry.name))
  return Promise.all(characters.map(async (entry): Promise<KnowledgeCharacterSummary> => {
    const character = stringValue(entry.name)
    return { character, name: await resolveNpcName(character), entryCount: numberValue(entry.entryCount) }
  }))
}

export async function getKnowledgeEntries(filePath: string, character: string): Promise<string[]> {
  const result = await executeCore('query_progression', { path: filePath, section: 'knowledge', character, offset: 0, limit: 5000 })
  return Array.isArray(result.entries) ? result.entries.map(stringValue).filter(Boolean) : []
}

export async function getTutorials(filePath: string): Promise<TutorialEntry[]> {
  const result = await executeCore('query_progression', { path: filePath, section: 'tutorials', offset: 0, limit: 1000 })
  return Promise.all(asArray(result.quests).map(async (quest): Promise<TutorialEntry> => {
    const id = stringValue(quest.id)
    return {
      id,
      name: await resolveQuestName(id || stringValue(quest.name)),
      group: prettifyIdentifier(stringValue(quest.group)),
      state: questState(stringValue(quest.currentState)),
    }
  }))
}

export async function getStory(filePath: string): Promise<StoryData> {
  const result = await executeCore('query_progression', { path: filePath, section: 'story', offset: 0, limit: 2000 })
  const flags: StoryFlag[] = []
  const timers: StoryFlag[] = []
  let chapter = 0
  for (const entry of asArray(result.entries)) {
    const id = stringValue(entry.id)
    const semantic = stringValue(entry.semanticType)
    const value = numberValue(entry.rawValue)
    if (semantic === 'chapter') {
      chapter = value
      continue
    }
    const flag: StoryFlag = { id, value, semanticType: semantic === 'timeMarker' ? 'timeMarker' : semantic === 'integer' ? 'integer' : 'unknown' }
    if (semantic === 'timeMarker') timers.push(flag)
    else flags.push(flag)
  }
  return { chapter, currentGameTimeSeconds: numberValue(result.currentGameTimeSeconds), flags, timers }
}

export async function searchProperties(
  filePath: string,
  query: string,
  source: 'all' | 'metadata' | 'public' | 'private' = 'all',
): Promise<TypedPropertySearchResult> {
  const result = await executeCore('search_typed_properties', { path: filePath, query, includeNodes: true, source, offset: 0, limit: 200 })
  const results: TypedPropertyMatch[] = asArray(result.results).map((match) => ({
    id: stringValue(match.id),
    path: Array.isArray(match.path) ? match.path.map(stringValue) : [],
    display: stringValue(match.display),
    kind: stringValue(match.kind),
    type: stringValue(match.type),
    structType: typeof match.structType === 'string' ? match.structType : null,
    value: typeof match.value === 'string' ? match.value : match.value === null || match.value === undefined ? null : String(match.value),
    editable: boolValue(match.editable),
    childCount: numberValue(match.childCount),
    source: stringValue(match.source),
    depth: numberValue(match.depth),
  }))
  return { query, total: numberValue(result.total), offset: numberValue(result.offset), limit: numberValue(result.limit), results }
}

const detailCache = new Map<string, DeepSaveDetails>()

export async function inspectDeepSave(filePath: string): Promise<DeepSaveDetails> {
  const key = cacheKey(filePath)
  const cached = detailCache.get(key)
  if (cached) return cached

  const startedAt = performance.now()
  const inspection = await executeCore('inspect_save', { path: filePath, includePrivate: true })
  const privateData = asRecord(inspection.private)
  if (stringValue(privateData.status) !== 'decoded') throw new Error('Prywatna warstwa zapisu nie została rozpakowana')

  const [skillsData, questData, characterData] = await Promise.all([
    executeCore('private.skills.list', { path: filePath, actor: 'Hero' }),
    executeCore('query_progression', { path: filePath, section: 'quests', offset: 0, limit: 1000 }),
    executeCore('private.characters.list', { path: filePath }),
  ])

  const player = asRecord(privateData.player)
  const progression = asRecord(privateData.progression)
  const transform = asRecord(player.transform)
  const location = asRecord(transform.location)
  const rotation = asRecord(transform.rotation)
  const characters = asArray(characterData.characters)
  const warnings: string[] = []
  if (stringValue(asRecord(privateData.typedParse).status) !== 'ok') warnings.push('Część typowanych pól świata mogła nie zostać rozpoznana')

  const [inventory, skills, quests] = await Promise.all([
    mapInventory(privateData),
    mapSkills(skillsData),
    mapQuests(questData),
  ])

  const details: DeepSaveDetails = {
    filePath,
    parsedAt: new Date().toISOString(),
    parseTimeMs: Math.round(performance.now() - startedAt),
    decoder: {
      method: stringValue(privateData.method) || 'Oodle Kraken',
      chunks: numberValue(privateData.decodedChunkCount || privateData.chunkCount),
      compressedBytes: numberValue(privateData.compressedSize),
      decompressedBytes: numberValue(privateData.decompressedSize || privateData.uncompressedSize),
    },
    character: {
      attributes: mapAttributes(player),
      position: Object.keys(location).length ? {
        x: numberValue(location.x),
        y: numberValue(location.y),
        z: numberValue(location.z),
        yaw: numberValue(rotation.yaw),
      } : undefined,
      saveVersion: numberValue(player.saveVersionNumber) || undefined,
    },
    inventory,
    skills,
    quests,
    factions: mapFactions(privateData),
    world: {
      characters: numberValue(characterData.total) || characters.length,
      deadCharacters: characters.filter((character) => boolValue(character.isDead)).length,
      traders: characters.filter((character) => boolValue(character.isTrader)).length,
      memoryCharacters: numberValue(progression.memoryCharacters),
      memoryEvents: numberValue(progression.memoryEvents),
      knowledgeCharacters: numberValue(progression.knowledgeCharacters),
      knowledgeEntries: numberValue(progression.knowledgeEntries),
    },
    warnings,
  }

  detailCache.clear()
  detailCache.set(key, details)
  return details
}

export function clearDeepSaveCache(): void {
  detailCache.clear()
}
