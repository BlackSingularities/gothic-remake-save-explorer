import { useEffect, useRef, useState } from 'react'
import type { ApiResult } from '../types'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Lazily fetches an `ApiResult<T>` whenever `deps` changes; a `null` fetcher clears the state. */
export function useAsyncResource<T>(
  fetcher: (() => Promise<ApiResult<T>>) | null,
  deps: unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: Boolean(fetcher), error: null })
  const requestId = useRef(0)

  useEffect(() => {
    if (!fetcher) {
      setState({ data: null, loading: false, error: null })
      return
    }
    const id = ++requestId.current
    setState({ data: null, loading: true, error: null })
    fetcher()
      .then((result) => {
        if (requestId.current !== id) return
        if (result.success && result.data !== undefined) setState({ data: result.data, loading: false, error: null })
        else setState({ data: null, loading: false, error: result.error || 'Nie udało się wczytać danych' })
      })
      .catch((error: unknown) => {
        if (requestId.current !== id) return
        setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'Nie udało się wczytać danych' })
      })
    // deps intentionally drive refetching; fetcher is expected to close over the same identity per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

export type ViewMode = 'list' | 'grid'

export function useViewMode(storageKey: string, defaultMode: ViewMode = 'grid'): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return stored === 'list' || stored === 'grid' ? stored : defaultMode
    } catch {
      return defaultMode
    }
  })

  const update = (next: ViewMode) => {
    setMode(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Private/incognito contexts may block storage — the toggle still works for the session.
    }
  }

  return [mode, update]
}
