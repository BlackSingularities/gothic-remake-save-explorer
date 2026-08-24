export type SaveKind = 'manual' | 'quick' | 'auto'

export interface ParsedSave {
  fileName: string
  filePath: string
  slotName: string
  displayName: string
  profileId: number
  chapter: number
  mapName: string
  difficulty: string
  timePlayedSeconds: number
  timeLoadedSeconds: number
  modifiedAt: string
  modifiedAtMs: number
  sizeBytes: number
  kind: SaveKind
  isPermaDeath: boolean
  isSurvivalMode: boolean
  gameDay?: number
  gameClock?: string
  screenshot?: string
  sha1?: string
  parserWarnings: string[]
}

export interface CharacterAttribute {
  id: string
  label: string
  current: number
  base: number
}

export interface CharacterPosition {
  x: number
  y: number
  z: number
  yaw: number
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  count: number
  equipped: boolean
  removable: boolean
  upgrades: string[]
}

export interface CharacterSkill {
  id: string
  label: string
  category: string
  level: string
  learned: boolean
}

export interface QuestEntry {
  id: string
  questClass: string
  statePath: string[]
  name: string
  group: string
  state: 'available' | 'running' | 'succeeded' | 'failed' | 'none' | 'unknown'
}

export interface FactionCrimeSummary {
  id: string
  label: string
  total: number
  forgiven: number
  unforgiven: number
  hostile: boolean
  crimes: {
    assault: number
    murder: number
    theft: number
    threat: number
    trespassing: number
    other: number
  }
}

export interface DeepSaveDetails {
  filePath: string
  parsedAt: string
  parseTimeMs: number
  decoder: {
    method: string
    chunks: number
    compressedBytes: number
    decompressedBytes: number
  }
  character: {
    attributes: CharacterAttribute[]
    position?: CharacterPosition
    saveVersion?: number
  }
  inventory: {
    items: InventoryItem[]
    stackCount: number
    totalItemCount: number
    oreCount: number
    equippedCount: number
  }
  skills: CharacterSkill[]
  quests: {
    entries: QuestEntry[]
    total: number
    running: number
    succeeded: number
    available: number
    failed: number
  }
  factions: FactionCrimeSummary[]
  world: {
    characters: number
    deadCharacters: number
    traders: number
    memoryCharacters: number
    memoryEvents: number
    knowledgeCharacters: number
    knowledgeEntries: number
  }
  warnings: string[]
}

export interface DeepInspectResult {
  success: boolean
  details?: DeepSaveDetails
  error?: string
}

export interface ProfileSummary {
  id: number
  saveCount: number
  totalSizeBytes: number
  latestModifiedAt: string
  maxTimePlayedSeconds: number
  screenshotCount: number
  difficultyPreset: string
  survival: boolean
  permanentDeath: boolean
  permanentDeathGameOver: boolean
  maxAutoSaves: number
  maxQuickSaves: number
}

export type NpcRelationship = 'friend' | 'neutral' | 'enemy'

export interface NpcSummary {
  id: string
  name: string
  hp: number
  maxHp: number
  isDead: boolean
  relationship: NpcRelationship
}

export interface WorldVector {
  x: number
  y: number
  z: number
}

export interface NpcPosition {
  location: WorldVector
  yaw: number
  spawnLocation?: WorldVector
  nearestArea?: string
}

export interface NpcDetail {
  id: string
  name: string
  attributes: CharacterAttribute[]
  position?: NpcPosition
  inventory: InventoryItem[]
}

export interface TraderSummary {
  index: number
  id: string
  name: string
  ore: number
  itemCount: number
  traded: boolean
  placeholder: boolean
}

export interface TraderStockItem {
  id: string
  name: string
  count: number
  defaultCount: number
}

export interface TraderDetail {
  index: number
  id: string
  name: string
  items: TraderStockItem[]
}

export interface GlossarySegment {
  id: string
  name: string
  unlocked: boolean
}

export interface GlossaryEntry {
  id: string
  name: string
  category: string
  unlockedSegments: number
  totalSegments: number
  segments: GlossarySegment[]
}

export interface GlossaryResult {
  categories: Array<{ name: string; entries: GlossaryEntry[] }>
  unlockedTotal: number
  total: number
}

export interface MemoryEvent {
  index: number
  tags: string[]
  instigator: string | null
  affected: string | null
  magnitude: number
  timeSeconds: number | null
  position?: WorldVector
}

export interface MemoryCharacterSummary {
  character: string
  name: string
  eventCount: number
}

export interface KnowledgeCharacterSummary {
  character: string
  name: string
  entryCount: number
}

export interface TutorialEntry {
  id: string
  name: string
  group: string
  state: QuestEntry['state']
}

export interface StoryFlag {
  id: string
  value: number
  semanticType: 'chapter' | 'integer' | 'timeMarker' | 'unknown'
}

export interface StoryData {
  chapter: number
  currentGameTimeSeconds: number
  flags: StoryFlag[]
  timers: StoryFlag[]
}

export interface DifficultySettings {
  preset: string
  combat: string
  resources: string
  progression: string
  flowHelper: boolean
  permadeath: boolean
}

export interface TypedPropertyMatch {
  id: string
  path: string[]
  display: string
  kind: string
  type: string
  structType: string | null
  value: string | null
  editable: boolean
  childCount: number
  source: string
  depth: number
}

export interface TypedPropertySearchResult {
  query: string
  total: number
  offset: number
  limit: number
  results: TypedPropertyMatch[]
}

export interface ScanResult {
  directory: string
  detected: boolean
  scannedAt: string
  saves: ParsedSave[]
  profiles: ProfileSummary[]
  ignoredFiles: number
  errors: string[]
}

export interface ExportResult {
  success: boolean
  destination?: string
  cancelled?: boolean
  error?: string
}

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export type EditOperation =
  | { kind: 'attribute'; id: string; label: string; value: number; previous: number }
  | { kind: 'itemCount'; id: string; name: string; count: number; previous: number }
  | { kind: 'itemAdd'; id: string; name: string; count: number }
  | { kind: 'itemRemove'; id: string; name: string }
  | { kind: 'skill'; base: string; label: string; tier: string; previousTier: string }
  | { kind: 'questState'; id: string; statePath: string[]; name: string; state: string; previousState: string }
  | { kind: 'npcRevive'; id: string; name: string }
  | { kind: 'npcRelationship'; id: string; name: string; relationship: NpcRelationship }
  | { kind: 'factionForgive'; guild: string; label: string }
  | { kind: 'saveName'; value: string; previous: string }

export interface PendingEdit {
  editId: string
  targetKey: string
  summary: string
  operation: EditOperation
}

export interface EditorStepResult {
  step: string
  ok: boolean
  detail?: string
}

export interface EditorCommitResult {
  success: boolean
  slotName?: string
  destinationPath?: string
  steps: EditorStepResult[]
  error?: string
}

export interface CodecStatus {
  available: boolean
  backend: string
  details?: string
}

export interface SkillCatalogEntry {
  base: string
  label: string
  category: string
  kind: 'ladder' | 'circle' | 'hunting' | 'binary' | 'language'
  tiers: string[]
}

export interface CatalogItemOption {
  id: string
  path: string
  name: string
  category: string
}

export interface CompanionApi {
  scan: () => Promise<ScanResult>
  chooseDirectory: () => Promise<ScanResult | null>
  openDirectory: () => Promise<boolean>
  inspectDeepSave: (filePath: string) => Promise<DeepInspectResult>
  exportData: (format: 'json' | 'csv') => Promise<ExportResult>
  onSavesChanged: (callback: () => void) => () => void
  listNpcs: (filePath: string) => Promise<ApiResult<NpcSummary[]>>
  npcDetail: (filePath: string, id: string) => Promise<ApiResult<NpcDetail>>
  listTraders: (filePath: string) => Promise<ApiResult<TraderSummary[]>>
  traderDetail: (filePath: string, index: number) => Promise<ApiResult<TraderDetail>>
  glossary: (filePath: string) => Promise<ApiResult<GlossaryResult>>
  memoryCharacters: (filePath: string) => Promise<ApiResult<MemoryCharacterSummary[]>>
  memoryEvents: (filePath: string, character: string) => Promise<ApiResult<MemoryEvent[]>>
  knowledgeCharacters: (filePath: string) => Promise<ApiResult<KnowledgeCharacterSummary[]>>
  knowledgeEntries: (filePath: string, character: string) => Promise<ApiResult<string[]>>
  tutorials: (filePath: string) => Promise<ApiResult<TutorialEntry[]>>
  story: (filePath: string) => Promise<ApiResult<StoryData>>
  searchProperties: (filePath: string, query: string, source?: 'all' | 'metadata' | 'public' | 'private') => Promise<ApiResult<TypedPropertySearchResult>>
  editorCheckCodec: () => Promise<ApiResult<CodecStatus>>
  editorSkillCatalog: () => Promise<ApiResult<SkillCatalogEntry[]>>
  editorItemCatalog: (query: string) => Promise<ApiResult<CatalogItemOption[]>>
  editorCommit: (filePath: string, edits: EditOperation[], targetProfileId: number) => Promise<EditorCommitResult>
}
