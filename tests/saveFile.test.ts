import { describe, expect, it } from 'vitest'
import { grantCompletion, recordAbort } from '../src/main/game'
import { mergeGameData } from '../src/shared/merge'
import { importSummary, parseSave, serializeSave } from '../src/shared/saveFile'
import type { GameData } from '../src/shared/types'
import { advanceStreak, localDay } from '../src/shared/types'
import { emptyData, seeded } from './helpers'

const clone = (d: GameData): GameData => JSON.parse(JSON.stringify(d))
const importInto = (local: GameData, remote: GameData): GameData =>
  mergeGameData(local, parseSave(serializeSave(remote, 'otro-mac'), local))
const fileWith = (data: unknown): string => JSON.stringify({ format: 'deepdex-save', version: 1, data })

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

    const merged = importInto(home, work)
    expect(merged.sessionLog).toHaveLength(3)
    expect(merged.totalFocusMin).toBe(150)
    expect(importSummary(home, merged)).toMatchObject({ newSessions: 2, addedMin: 100, otherChanges: false })

    const again = importInto(merged, work)
    expect(importSummary(merged, again)).toEqual({ newSessions: 0, newAborted: 0, newSpecies: 0, addedMin: 0, otherChanges: false })
  })

  it('matches what one computer would have computed, over many random histories on two Macs', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rnd = seeded(seed)
      let a = emptyData()
      let b = emptyData()
      const completed: { end: number; min: number; pokemonId: number }[] = []
      let aborts = 0
      let t = new Date(2026, 2, 20, 9).getTime() // crosses the March DST change
      for (let step = 0; step < 60; step++) {
        t += Math.floor(rnd() * 30) * 3600000
        const d = rnd() < 0.5 ? a : b
        const r = rnd()
        if (r < 0.6) {
          const min = [25, 50, 90][Math.floor(rnd() * 3)]
          const res = grantCompletion(d, { durationMin: min, eggTier: 'rare', topicId: null, startedAt: t - min * 60000 }, new Date(t), seeded(seed * 1000 + step))
          completed.push({ end: t, min, pokemonId: res.hatch!.pokemonId })
        } else if (r < 0.75) {
          recordAbort(d, { startedAt: t - 600000, elapsedMin: 10, topicId: null }, new Date(t))
          aborts++
        } else if (r < 0.88) {
          a = importInto(a, b)
        } else {
          b = importInto(b, a)
        }
      }
      a = importInto(a, b)
      b = importInto(b, a)

      const streak = { current: 0, best: 0, lastDay: null as string | null, shields: 0 }
      for (const day of [...new Set(completed.map((c) => localDay(new Date(c.end))))].sort()) advanceStreak(streak, day)
      const counts: Record<number, number> = {}
      for (const c of completed) counts[c.pokemonId] = (counts[c.pokemonId] ?? 0) + 1
      for (const d of [a, b]) {
        expect(d.xp).toBe(completed.reduce((sum, c) => sum + c.min, 0))
        expect(d.sessionsCompleted).toBe(completed.length)
        expect(d.sessionsAborted).toBe(aborts)
        expect(d.streak).toEqual(streak)
        expect(Object.fromEntries(Object.entries(d.caught).map(([k, c]) => [k, c.count]))).toEqual(counts)
      }
    }
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
    expect(importInto(local, other).settings.blocklistApps).toEqual(['WhatsApp'])
    other.settingsUpdatedAt = Date.now()
    const merged = importInto(local, other)
    expect(merged.settings.blocklistApps).toEqual(['Slack'])
    expect(importSummary(local, merged).otherChanges).toBe(true)
  })

  it('rejects files that are not progress, or come from a newer version', () => {
    expect(() => parseSave('{"hello": 1}', emptyData())).toThrow('no es un progreso')
    expect(() => parseSave('not json', emptyData())).toThrow('no es un progreso')
    expect(() => parseSave('[1, 2]', emptyData())).toThrow('no es un progreso')
    const future = JSON.stringify({ format: 'deepdex-save', version: 2, data: { sessionLog: [] } })
    expect(() => parseSave(future, emptyData())).toThrow('versión más nueva')
  })
})

describe('a damaged or hand-edited file', () => {
  const day = new Date(2026, 4, 2, 12).getTime()
  const good = { id: 'ok', startedAt: day, endedAt: day + 3000000, durationMin: 50, topicId: null, completed: true, hatch: { pokemonId: 25, shiny: false } }

  it('cannot lower or corrupt what this Mac already caught', () => {
    const local = emptyData()
    local.caught[25] = { count: 3, shiny: true, firstCaughtAt: 1000 }
    const merged = mergeGameData(local, parseSave(fileWith({ sessionLog: [], caught: { 25: {}, 26: null, 9999: { count: 1, shiny: false, firstCaughtAt: 1 }, abc: { count: 1, shiny: false, firstCaughtAt: 1 } } }), local))
    expect(merged.caught).toEqual({ 25: { count: 3, shiny: true, firstCaughtAt: 1000 } })
  })

  it('drops sessions with impossible dates, durations or ids so the streak keeps working', () => {
    const local = emptyData()
    for (let d = 1; d <= 5; d++) complete(local, d)
    const bad = [
      { ...good, id: 'far-future', startedAt: 1e17 },
      { ...good, id: 'bad-end', endedAt: 'abc' },
      { ...good, id: 'too-long', durationMin: 5000 },
      { ...good, id: 42 },
      { ...good, id: 'no-completed', completed: 'yes' }
    ]
    const merged = mergeGameData(local, parseSave(fileWith({ sessionLog: [...bad, good] }), local))
    expect(merged.sessionLog.map((e) => e.id)).toContain('ok')
    expect(merged.sessionLog).toHaveLength(6)
    expect(merged.streak.current).toBe(5)
    expect(merged.streak.lastDay).toBe(localDay(new Date(2026, 4, 5)))
  })

  it('keeps a session but not an invented Pokémon', () => {
    const merged = mergeGameData(emptyData(), parseSave(fileWith({ sessionLog: [{ ...good, hatch: { pokemonId: 9999, shiny: false } }] }), emptyData()))
    expect(merged.totalFocusMin).toBe(50)
    expect(merged.caught).toEqual({})
  })

  it('never lets broken topics, badges or settings through', () => {
    const local = emptyData()
    local.settings.blocklistApps = ['WhatsApp']
    const parsed = parseSave(
      fileWith({
        sessionLog: [],
        topics: [{ id: 't1' }, { id: 't2', name: { a: 1 }, type: 'Fire', createdAt: 1 }, { id: 't3', name: 'Tesis', type: 'Fire', createdAt: 1 }],
        badges: ['first-session', 'fake'],
        settings: { blocklistApps: 'WhatsApp', blocklistDomains: ['x.com', 'not a domain', 7], customDurationMin: 9999 },
        settingsUpdatedAt: Date.now()
      }),
      local
    )
    expect(parsed.topics.map((t) => t.id)).toEqual(['t3'])
    expect(parsed.badges).toEqual(['first-session'])
    expect(parsed.settings).toEqual({ blocklistApps: ['WhatsApp'], blocklistDomains: ['x.com'], customDurationMin: 240 })
  })

  it('cannot make its settings win forever with a bad or future edit time', () => {
    const local = emptyData()
    local.settings.blocklistApps = ['WhatsApp']
    local.settingsUpdatedAt = 500
    for (const stamp of ['yes', Date.now() + 365 * 24 * 3600000]) {
      const merged = mergeGameData(local, parseSave(fileWith({ sessionLog: [], settings: { blocklistApps: ['Slack'] }, settingsUpdatedAt: stamp }), local))
      expect(merged.settings.blocklistApps).toEqual(['WhatsApp'])
      expect(merged.settingsUpdatedAt).toBe(500)
    }
  })
})
