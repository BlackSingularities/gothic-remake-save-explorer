import electron from 'electron'
import { statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import koffi from 'koffi'

export type JsonRecord = Record<string, unknown>

interface CoreResponse {
  ok?: boolean
  data?: JsonRecord
  error?: unknown
}

// Outside a real Electron process (e.g. the `inspect:saves` dev script run via tsx),
// `electron` resolves to a plain string (the path to the Electron binary), not the API
// object — fall back to a path relative to this module instead of `app.getAppPath()`.
function dllPath(): string {
  const app = (electron as unknown as { app?: Electron.App }).app
  if (app) {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'goresave', 'gore_save.dll')
      : path.join(app.getAppPath(), 'vendor', 'goresave', 'gore_save.dll')
  }
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  return path.join(moduleDir, '..', '..', 'vendor', 'goresave', 'gore_save.dll')
}

let core: {
  execute: ((request: string) => unknown) & { async: (request: string, callback: (error: Error | null, result: unknown) => void) => void }
  free: (pointer: unknown) => void
} | null = null
let requestQueue = Promise.resolve()

function loadCore() {
  if (core) return core
  const library = koffi.load(dllPath())
  core = {
    execute: library.func('goresave_execute', 'void *', ['str']) as typeof core extends infer _T ? NonNullable<typeof core>['execute'] : never,
    free: library.func('goresave_free', 'void', ['void *']) as (pointer: unknown) => void,
  }
  return core
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

export function executeCore(command: string, payload: JsonRecord): Promise<JsonRecord> {
  const run = () => new Promise<JsonRecord>((resolve, reject) => {
    const loaded = loadCore()
    loaded.execute.async(JSON.stringify({ command, payload }), (error, pointer) => {
      if (error) return reject(error)
      if (!pointer) return reject(new Error('Parser nie zwrócił danych'))
      try {
        const raw = koffi.decode(pointer, 'char', -1) as string
        const response = JSON.parse(raw) as CoreResponse
        if (response.ok !== true) throw new Error(stringValue(response.error) || 'Rdzeń zapisu nie został rozpoznany')
        resolve(asRecord(response.data))
      } catch (decodeError) {
        reject(decodeError)
      } finally {
        loaded.free(pointer)
      }
    })
  })
  const queued = requestQueue.then(run, run)
  requestQueue = queued.then(() => undefined, () => undefined)
  return queued
}

export function cacheKey(filePath: string): string {
  const stats = statSync(filePath)
  return `${path.resolve(filePath)}:${stats.size}:${stats.mtimeMs}`
}
