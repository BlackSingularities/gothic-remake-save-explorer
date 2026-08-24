import { useCallback, useMemo, useState } from 'react'
import type { EditOperation, PendingEdit } from '../../types'

let counter = 0
function nextEditId(): string {
  counter += 1
  return `edit-${Date.now()}-${counter}`
}

export function usePendingEdits() {
  const [pending, setPending] = useState<PendingEdit[]>([])

  /** Queues an edit. A second edit for the same `targetKey` (e.g. re-adjusting the same
   * attribute) replaces the earlier one instead of stacking a redundant write. */
  const addEdit = useCallback((targetKey: string, operation: EditOperation, summary: string) => {
    setPending((prev) => [...prev.filter((edit) => edit.targetKey !== targetKey), { editId: nextEditId(), targetKey, summary, operation }])
  }, [])

  const removeEdit = useCallback((editId: string) => {
    setPending((prev) => prev.filter((edit) => edit.editId !== editId))
  }, [])

  const clear = useCallback(() => setPending([]), [])

  const byTargetKey = useMemo(() => new Map(pending.map((edit) => [edit.targetKey, edit])), [pending])

  return { pending, addEdit, removeEdit, clear, byTargetKey }
}

export type PendingEditsController = ReturnType<typeof usePendingEdits>
