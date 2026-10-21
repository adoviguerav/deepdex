import { describe, expect, it } from 'vitest'
import { grantCompletion } from '../src/main/game'
import { mergeGameData } from '../src/shared/merge'
import { importSummary, parseSave, serializeSave } from '../src/shared/saveFile'
import type { GameData } from '../src/shared/types'
import { emptyData, seeded } from './helpers'

const clone = (d: GameData): GameData => JSON.parse(JSON.stringify(d))

function complete(d: GameData, day: number, seed = day): void {
  const end = new Date(2026, 4, day, 12)
  grantCompletion(d, { durationMin: 50, eggTier: 'rare', topicId: null, startedAt: end.getTime() - 50 * 60000 }, end, seeded(seed))
}

describe('save files', () => {
  it('round-trips through export and import, and merging adds only what is new', () => {
    const work = emptyData()
    complete(work, 1)
    const home = clone(work)
    complete(work, 2, 11)
    complete(work, 3, 12)

    const incoming = parseSave(serializeSave(work, 'trabajo'), home)
    const merged = mergeGameData(home, incoming)
    expect(merged.sessionLog).toHaveLength(3)
    expect(merged.totalFocusMin).toBe(150)
    expect(importSummary(home, merged)).toMatchObject({ newSessions: 2, addedMin: 100 })

    const again = mergeGameData(merged, parseSave(serializeSave(work, 'trabajo'), merged))
    expect(importSummary(merged, again)).toEqual({ newSessions: 0, newSpecies: 0, addedMin: 0 })
  })

  it('accepts the app’s own data file copied by hand', () => {
    const d = emptyData()
    complete(d, 1)
    const raw = JSON.stringify({ data: d, activeSession: null })
    expect(parseSave(raw, emptyData()).sessionLog).toHaveLength(1)
  })

  it('keeps local settings unless the file says when its settings were edited', () => {
    const local = emptyData()
    local.settings.blocklistApps = ['WhatsApp']
    const other = emptyData()
    other.settings.blocklistApps = ['Slack']
    expect(mergeGameData(local, parseSave(serializeSave(other, 'x'), local)).settings.blocklistApps).toEqual(['WhatsApp'])
  })

  it('drops malformed entries and rejects files that are not progress', () => {
    const raw = JSON.stringify({ format: 'deepdex-save', data: { sessionLog: [{ startedAt: 1, durationMin: 25, completed: true }, { nope: 1 }] } })
    expect(parseSave(raw, emptyData()).sessionLog).toHaveLength(1)
    expect(() => parseSave('{"hello": 1}', emptyData())).toThrow('no es un progreso')
    expect(() => parseSave('not json', emptyData())).toThrow('no es un progreso')
  })
})
