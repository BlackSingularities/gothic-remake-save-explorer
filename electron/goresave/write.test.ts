import { describe, expect, it } from 'vitest'
import { planBatches } from './write'
import type { EditOperation } from '../../src/types'

const attribute: EditOperation = { kind: 'attribute', id: 'Level', label: 'Poziom', value: 10, previous: 5 }
const itemCount: EditOperation = { kind: 'itemCount', id: 'ItMi_Orenugget', name: 'Ruda', count: 10, previous: 1 }
const revive: EditOperation = { kind: 'npcRevive', id: 'NPC-1', name: 'Test' }
const relationship: EditOperation = { kind: 'npcRelationship', id: 'NPC-2', name: 'Test 2', relationship: 'friend' }
const itemAdd: EditOperation = { kind: 'itemAdd', id: '/Script/Angelscript.ItFo_Cheese', name: 'Ser', count: 1 }

describe('planBatches', () => {
  it('combines value-only edits into a single batch', () => {
    const batches = planBatches([attribute, itemCount])
    expect(batches).toEqual([[attribute, itemCount]])
  })

  it('isolates structural edits into their own batch each', () => {
    const batches = planBatches([attribute, revive, relationship, itemAdd])
    expect(batches).toEqual([[attribute], [revive], [relationship], [itemAdd]])
  })

  it('returns nothing for an empty edit list', () => {
    expect(planBatches([])).toEqual([])
  })

  it('keeps a single structural edit as its own batch without an empty leading batch', () => {
    expect(planBatches([revive])).toEqual([[revive]])
  })
})
