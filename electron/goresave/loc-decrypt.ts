import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Gothic 1 Remake stores every in-game text (item, NPC, quest, location names, dialogue…)
// in one AES-256-ECB encrypted file the game ships with itself. Format and key reverse-engineered
// and documented by the GORE project (github.com/dh0er/gore, MIT) — see crates/gore-loc/src/loc.rs
// in research/gore-ref. Reading it here is best-effort and read-only: if the game isn't installed,
// or the file can't be parsed, callers fall back to the bundled catalogs instead.
const AES_KEY = Buffer.from('8f93ff6fa254d9c536ad88c1ff1d812b', 'ascii')
const MAGIC = 'LCACHE'
const CACHE_RELATIVE_PATH = path.join('G1R', 'Story', 'Cache', 'AlkimiaLocalization_00000000.lcache')

/** Language keys preferred over the base "english" entry when it's a versioned re-translation. */
const ENGLISH_PRIORITY = ['english_newer', 'english_new', 'english']

export type LocalizationTable = Map<string, Map<string, string>>

function stripTrailingNullChar(text: string): string {
  return text.length > 0 && text.charCodeAt(text.length - 1) === 0 ? text.slice(0, -1) : text
}

function readRawString(buffer: Buffer, offset: number): { text: string; next: number } {
  const length = buffer.readInt32LE(offset)
  offset += 4
  const bytes = buffer.subarray(offset, offset + length)
  return { text: bytes.toString('latin1'), next: offset + length }
}

function readFString(buffer: Buffer, offset: number): { text: string; next: number } {
  const count = buffer.readInt32LE(offset)
  offset += 4
  if (count === 0) return { text: '', next: offset }
  if (count > 0) {
    const bytes = buffer.subarray(offset, offset + count)
    offset += count
    const trimmed = bytes.at(-1) === 0 ? bytes.subarray(0, bytes.length - 1) : bytes
    return { text: trimmed.toString('utf8'), next: offset }
  }
  const units = Math.abs(count)
  const byteLength = units * 2
  const slice = buffer.subarray(offset, offset + byteLength)
  offset += byteLength
  return { text: stripTrailingNullChar(slice.toString('utf16le')), next: offset }
}

function readRecordKeyAndPairs(buffer: Buffer, offset: number): { key: string; pairs: Array<[string, string]>; next: number } {
  const key = readFString(buffer, offset)
  offset = key.next
  const pairCount = buffer.readInt32LE(offset)
  offset += 4
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < pairCount; i += 1) {
    const lang = readFString(buffer, offset)
    offset = lang.next
    const value = readFString(buffer, offset)
    offset = value.next
    pairs.push([lang.text.toLowerCase(), value.text])
  }
  return { key: key.text, pairs, next: offset }
}

function decodeLcache(encrypted: Buffer): LocalizationTable {
  const decipher = crypto.createDecipheriv('aes-256-ecb', AES_KEY, null)
  decipher.setAutoPadding(false)
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()])

  let offset = 1 // one reserved prefix byte before the magic
  const magic = readRawString(plain, offset)
  if (magic.text !== MAGIC) throw new Error('Nieprawidłowy plik lokalizacji gry (zły nagłówek)')
  offset = magic.next

  const languageCount = plain.readInt32LE(offset)
  offset += 4
  for (let i = 0; i < languageCount; i += 1) {
    offset = readFString(plain, offset).next
  }

  const groupCount = plain.readInt32LE(offset)
  offset += 4
  const table: LocalizationTable = new Map()
  for (let i = 0; i < groupCount; i += 1) {
    const main = readRecordKeyAndPairs(plain, offset)
    offset = main.next
    const meta = readRecordKeyAndPairs(plain, offset)
    offset = meta.next
    table.set(main.key.toLowerCase(), new Map(main.pairs))
  }
  return table
}

async function readRegistryValue(keyPath: string, valueName: string): Promise<string | null> {
  const { execFile } = await import('node:child_process')
  return new Promise((resolve) => {
    execFile('reg', ['query', keyPath, '/v', valueName], (error, stdout) => {
      if (error) return resolve(null)
      const match = stdout.match(/REG_SZ\s+(.+)\r?\n/)
      resolve(match ? match[1].trim() : null)
    })
  })
}

async function steamLibraryFolders(): Promise<string[]> {
  const steamPath = await readRegistryValue('HKCU\\Software\\Valve\\Steam', 'SteamPath')
  if (!steamPath) return []
  const normalizedRoot = steamPath.replaceAll('/', path.sep)
  const folders = new Set<string>([normalizedRoot])
  try {
    const vdf = await fs.readFile(path.join(normalizedRoot, 'steamapps', 'libraryfolders.vdf'), 'utf8')
    for (const match of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
      folders.add(match[1].replaceAll('\\\\', '\\'))
    }
  } catch {
    // A single-library Steam install has no libraryfolders.vdf entries beyond the root — fine.
  }
  return [...folders]
}

async function findLcacheFile(): Promise<string | null> {
  const libraries = await steamLibraryFolders()
  for (const library of libraries) {
    const candidate = path.join(library, 'steamapps', 'common', 'Gothic 1 Remake', CACHE_RELATIVE_PATH)
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // Try the next Steam library.
    }
  }
  return null
}

let loading: Promise<LocalizationTable | null> | null = null

async function loadGameLocalizationOnce(): Promise<LocalizationTable | null> {
  try {
    const filePath = await findLcacheFile()
    if (!filePath) return null
    const encrypted = await fs.readFile(filePath)
    return decodeLcache(encrypted)
  } catch {
    return null
  }
}

/**
 * Best-effort: locates and decrypts the game's own localization file. Returns `null` (never
 * throws) when the game isn't installed locally or the file can't be parsed — callers must
 * treat this as an optional enhancement, not a dependency. Concurrent callers (e.g. resolving
 * hundreds of NPC names at once) share the same in-flight lookup instead of each re-running
 * Steam discovery and the AES decrypt.
 */
export function loadGameLocalization(): Promise<LocalizationTable | null> {
  if (!loading) loading = loadGameLocalizationOnce()
  return loading
}

export function pickLocalizedText(entry: Map<string, string> | undefined, preferPolish: boolean): string | undefined {
  if (!entry) return undefined
  if (preferPolish) {
    const polish = entry.get('polish')
    if (polish) return polish
  }
  for (const key of ENGLISH_PRIORITY) {
    const value = entry.get(key)
    if (value) return value
  }
  return entry.values().next().value
}
