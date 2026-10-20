import { describe, expect, it } from 'vitest'
import { grantCompletion, recordAbort } from '../src/main/game'
import { mergeGameData, rebuildFromLog } from '../src/shared/merge'
import type { GameData } from '../src/shared/types'
import { emptyData, seeded } from './helpers'

const clone = (d: GameData): GameData => JSON.parse(JSON.stringify(d))

function complete(d: GameData, day: number, minutes = 50, topicId: string | null = null, seed = day): void {
  const end = new Date(2026, 4, day, 12)
  grantCompletion(
    d,
    { durationMin: minutes, eggTier: 'rare', topicId, startedAt: end.getTime() - minutes * 60000 },
    end,
    seeded(seed)
  )
}

function aggregates(d: GameData): unknown {
  return {
    xp: d.xp,
    totalFocusMin: d.totalFocusMin,
    sessionsCompleted: d.sessionsCompleted,
    sessionsAborted: d.sessionsAborted,
    streak: d.streak,
    caught: d.caught,
    badges: [...d.badges].sort(),
    topics: d.topics.map((t) => [t.id, t.totalMin])
  }
}

describe('rebuildFromLog', () => {
  it('reproduces exactly what the incremental rewards computed', () => {
    const d = emptyData()
    d.topics.push({ id: 't', name: 'Tesis', type: 'Dark', totalMin: 0, createdAt: 0 })
    for (let day = 1; day <= 9; day++) complete(d, day, 50, day % 2 ? 't' : null)
    complete(d, 12)
    recordAbort(d, { startedAt: new Date(2026, 4, 13).getTime(), elapsedMin: 7, topicId: null })
    const before = aggregates(d)
    expect(aggregates(rebuildFromLog(clone(d)))).toEqual(before)
  })
})

describe('mergeGameData', () => {
  function shared(): GameData {
    const d = emptyData()
    d.topics.push({ id: 't', name: 'Tesis', type: 'Dark', totalMin: 0, createdAt: 1, updatedAt: 1 })
    complete(d, 1, 50, 't')
    complete(d, 2)
    return d
  }

  it('keeps both computers’ offline sessions without duplicating shared ones', () => {
    const home = shared()
    const work = clone(home)
    complete(home, 3, 25, null, 101)
    complete(work, 3, 90, 't', 202)
    complete(work, 4, 50, null, 303)

    const merged = mergeGameData(home, work)
    expect(merged.sessionLog).toHaveLength(5)
    expect(merged.totalFocusMin).toBe(50 + 50 + 25 + 90 + 50)
    expect(merged.xp).toBe(merged.totalFocusMin)
    expect(merged.topics[0].totalMin).toBe(140)
    expect(merged.streak.current).toBe(4)
    const hatches = merged.sessionLog.filter((e) => e.hatch).length
    const caughtCount = Object.values(merged.caught).reduce((sum, c) => sum + c.count, 0)
    expect(caughtCount).toBe(hatches)
  })

  it('is idempotent and order-independent', () => {
    const home = shared()
    const work = clone(home)
    complete(home, 3, 25, null, 7)
    complete(work, 4, 50, null, 8)
    const ab = mergeGameData(clone(home), clone(work))
    const ba = mergeGameData(clone(work), clone(home))
    expect(aggregates(ab)).toEqual(aggregates(ba))
    expect(aggregates(mergeGameData(clone(ab), clone(ab)))).toEqual(aggregates(ab))
  })

  it('keeps the newest version of a topic, deletions included', () => {
    const home = shared()
    const work = clone(home)
    work.topics[0] = { ...work.topics[0], deleted: true, updatedAt: 50 }
    home.topics[0] = { ...home.topics[0], name: 'Tesis doctoral', updatedAt: 20 }
    expect(mergeGameData(home, work).topics[0].deleted).toBe(true)

    work.topics[0] = { ...work.topics[0], deleted: false, name: 'Tesis v2', updatedAt: 60 }
    expect(mergeGameData(home, work).topics[0]).toMatchObject({ name: 'Tesis v2', deleted: false })
  })

  it('takes the most recently edited settings and companion', () => {
    const home = shared()
    const work = clone(home)
    home.settings.blocklistApps = ['WhatsApp']
    home.settingsUpdatedAt = 100
    work.settings.blocklistApps = ['Slack']
    work.settingsUpdatedAt = 200
    expect(mergeGameData(home, work).settings.blocklistApps).toEqual(['Slack'])

    const caughtId = Number(Object.keys(home.caught)[0])
    home.companionId = caughtId
    home.companionUpdatedAt = 300
    work.companionId = null
    work.companionUpdatedAt = 10
    expect(mergeGameData(home, work).companionId).toBe(caughtId)
  })

  it('dedupes old entries that have no id', () => {
    const a = emptyData()
    a.sessionLog.push({ startedAt: 1000, durationMin: 25, topicId: null, completed: true })
    const b = clone(a)
    const merged = mergeGameData(a, b)
    expect(merged.sessionLog).toHaveLength(1)
    expect(merged.totalFocusMin).toBe(25)
  })

  it('keeps Pokédex entries recorded before hatches were logged', () => {
    const a = emptyData()
    a.caught[25] = { count: 2, shiny: false, firstCaughtAt: 5 }
    const b = emptyData()
    b.caught[25] = { count: 1, shiny: true, firstCaughtAt: 3 }
    expect(mergeGameData(a, b).caught[25]).toEqual({ count: 2, shiny: true, firstCaughtAt: 3 })
  })
})
