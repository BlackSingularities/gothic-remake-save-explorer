import electron from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGameLocalization, pickLocalizedText } from './loc-decrypt'

interface ItemCatalogEntry {
  category: string
  id: string
  path: string
}

interface NpcCatalogEntry {
  category: string
  class: string
  id: string
}

interface LocationArea {
  id: string
  label: string
  locId: string
}

interface LocationSpot {
  n: string
  x: number
  y: number
  z: number
  w: number
  a: string
}

interface LocationCatalog {
  areas: LocationArea[]
  spots: LocationSpot[]
}

type BundledLocalization = Record<string, { en?: string; de?: string }>

// Outside a real Electron process (the `inspect:saves` dev script), fall back to a path
// relative to this module — mirrors the same fallback in ./client.ts.
function catalogsDir(): string {
  const app = (electron as unknown as { app?: Electron.App }).app
  if (app) {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'catalogs')
      : path.join(app.getAppPath(), 'electron', 'goresave', 'catalogs')
  }
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'catalogs')
}

async function readJson<T>(fileName: string): Promise<T> {
  const raw = await fs.readFile(path.join(catalogsDir(), fileName), 'utf8')
  return JSON.parse(raw) as T
}

function prettify(value: string): string {
  return value
    .replace(/^Quest_/, '')
    .replace(/^It(?:Mi|Mw|Fo|Ar|Am|Wr|Ms|Ke|At)_/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim()
}

let itemEntries: ItemCatalogEntry[] = []
let itemCategories: Map<string, string> | null = null
let npcCategories: Map<string, string> | null = null
let locationCatalog: LocationCatalog | null = null
let bundledLocalization: BundledLocalization | null = null
let loadingCatalogs: Promise<void> | null = null

function ensureCatalogs(): Promise<void> {
  if (!loadingCatalogs) {
    loadingCatalogs = Promise.all([
      readJson<ItemCatalogEntry[]>('item_catalog.json'),
      readJson<NpcCatalogEntry[]>('npc_catalog.json'),
      readJson<LocationCatalog>('location_catalog.json'),
      readJson<BundledLocalization>('g1r_editor_localization.json'),
    ]).then(([items, npcs, locations, bundled]) => {
      itemEntries = items
      itemCategories = new Map(items.map((item) => [item.id.toLowerCase(), item.category]))
      npcCategories = new Map(npcs.map((npc) => [npc.id.toLowerCase(), npc.category]))
      locationCatalog = locations
      bundledLocalization = bundled
    }).catch(() => {
      // A missing/corrupt bundled catalog should never block the app — resolvers fall back to raw IDs.
      itemEntries = itemEntries.length ? itemEntries : []
      itemCategories = itemCategories || new Map()
      npcCategories = npcCategories || new Map()
      locationCatalog = locationCatalog || { areas: [], spots: [] }
      bundledLocalization = bundledLocalization || {}
    })
  }
  return loadingCatalogs
}

async function resolveLocKey(key: string): Promise<string | undefined> {
  await ensureCatalogs()
  const live = await loadGameLocalization()
  const liveText = pickLocalizedText(live?.get(key), true)
  if (liveText) return liveText
  const bundled = bundledLocalization?.[key]
  return bundled?.en
}

export async function resolveItemName(id: string): Promise<string> {
  if (!id) return id
  const text = await resolveLocKey(id.toLowerCase())
  return text || prettify(id)
}

export async function itemCategoryFromCatalog(id: string): Promise<string | undefined> {
  await ensureCatalogs()
  return itemCategories?.get(id.toLowerCase())
}

export async function resolveNpcName(id: string): Promise<string> {
  const base = id.split('-')[0] || id
  const text = await resolveLocKey(base.toLowerCase())
  return text || prettify(base)
}

export async function npcCategoryFromCatalog(id: string): Promise<string | undefined> {
  await ensureCatalogs()
  const base = id.split('-')[0] || id
  return npcCategories?.get(base.toLowerCase())
}

export async function resolveQuestName(rawId: string): Promise<string> {
  const body = rawId.split('.').at(-1) || rawId
  let lower = body.toLowerCase()
  if (lower.startsWith('quest_')) lower = `quest-${lower.slice(6)}`
  const key = lower.endsWith('-name') ? lower : `${lower}-name`
  const text = await resolveLocKey(key)
  return text || prettify(body.replace(/^Tutorials_/, ''))
}

const skillLocKeyOverrides: Record<string, string> = {
  Picklock: 'skill_lockpicking',
  Pickpocket: 'skill_pickpocketing',
}

export async function resolveSkillName(base: string, fallback: string): Promise<string> {
  const key = skillLocKeyOverrides[base] || `skill_${base.toLowerCase()}`
  const text = await resolveLocKey(key)
  return text || fallback
}

export async function resolveAreaLabel(areaId: string): Promise<string | undefined> {
  await ensureCatalogs()
  const area = locationCatalog?.areas.find((entry) => entry.id === areaId)
  if (!area) return undefined
  const text = await resolveLocKey(area.locId.toLowerCase())
  return text || area.label
}

/** Nearest known freepoint to a world position, resolved to a human-readable area name. */
export async function resolveNearestArea(x: number, y: number, z: number): Promise<string | undefined> {
  await ensureCatalogs()
  const spots = locationCatalog?.spots
  if (!spots?.length) return undefined
  let nearest: LocationSpot | null = null
  let bestDistance = Infinity
  for (const spot of spots) {
    const distance = (spot.x - x) ** 2 + (spot.y - y) ** 2 + (spot.z - z) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      nearest = spot
    }
  }
  if (!nearest?.a) return undefined
  return resolveAreaLabel(nearest.a)
}

export interface CatalogItemOption {
  id: string
  path: string
  name: string
  category: string
}

/** Item classes the editor can offer for "add item" — the DLL only accepts the full class
 * `path` (e.g. `/Script/Angelscript.ItFo_Cheese`) for `private.inventory.addItem`, not the bare id. */
export async function searchItemCatalog(query: string, limit = 60): Promise<CatalogItemOption[]> {
  await ensureCatalogs()
  const needle = query.trim().toLowerCase()
  const matches = needle
    ? itemEntries.filter((item) => item.id.toLowerCase().includes(needle))
    : itemEntries.slice(0, limit)
  const limited = matches.slice(0, limit)
  return Promise.all(limited.map(async (item): Promise<CatalogItemOption> => ({
    id: item.id,
    path: item.path,
    name: await resolveItemName(item.id),
    category: item.category,
  })))
}
