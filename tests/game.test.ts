import { describe, expect, it } from 'vitest'
import { grantCompletion, recordAbort } from '../src/main/game'
import { eggsUntilLegendary } from '../src/shared/eggs'
import { LEGENDARY_PITY, rarityOf, TOTAL_SPECIES, typesOf } from '../src/shared/pokedex'
import { displayStreak, levelForXp, xpForLevel } from '../src/shared/types'
import { emptyData, seeded } from './helpers'

const session = { durationMin: 50, eggTier: 'rare' as const, topicId: null, startedAt: 0 }

function completeOn(data: ReturnType<typeof emptyData>, date: Date): void {
  grantCompletion(data, { ...session, startedAt: date.getTime() }, date, seeded(1))
}

describe('streak', () => {
  it('grows on consecutive days and ignores a second session the same day', () => {
    const d = emptyData()
    completeOn(d, new Date(2026, 4, 4, 10))
    completeOn(d, new Date(2026, 4, 4, 18))
    completeOn(d, new Date(2026, 4, 5, 9))
    expect(d.streak.current).toBe(2)
  })

  it('resets after a missed day without shields', () => {
    const d = emptyData()
    completeOn(d, new Date(2026, 4, 4, 10))
    completeOn(d, new Date(2026, 4, 6, 10))
    expect(d.streak.current).toBe(1)
  })

  it('earns a shield every 7 days (max 2) and spends one on a single missed day', () => {
    const d = emptyData()
    for (let day = 1; day <= 14; day++) completeOn(d, new Date(2026, 4, day, 10))
    expect(d.streak.shields).toBe(2)
    for (let day = 15; day <= 21; day++) completeOn(d, new Date(2026, 4, day, 10))
    expect(d.streak.shields).toBe(2)
    completeOn(d, new Date(2026, 4, 23, 10))
    expect(d.streak.current).toBe(22)
    expect(d.streak.shields).toBe(1)
  })

  it('survives the spring DST change (23-hour day)', () => {
    const d = emptyData()
    completeOn(d, new Date(2026, 2, 28, 23, 30))
    completeOn(d, new Date(2026, 2, 29, 23, 30))
    completeOn(d, new Date(2026, 2, 30, 0, 30))
    expect(d.streak.current).toBe(3)
  })

  it('survives the autumn DST change (25-hour day) without spending a shield', () => {
    const d = emptyData()
    d.streak = { current: 5, best: 5, lastDay: '2026-10-24', shields: 1 }
    completeOn(d, new Date(2026, 9, 25, 23, 30))
    expect(d.streak.current).toBe(6)
    expect(d.streak.shields).toBe(1)
  })

  it('shows a broken streak as 0 before the next session', () => {
    const now = new Date(2026, 4, 10, 12)
    expect(displayStreak({ current: 12, best: 12, lastDay: '2026-05-09', shields: 0 }, now)).toBe(12)
    expect(displayStreak({ current: 12, best: 12, lastDay: '2026-05-08', shields: 1 }, now)).toBe(12)
    expect(displayStreak({ current: 12, best: 12, lastDay: '2026-05-08', shields: 0 }, now)).toBe(0)
    expect(displayStreak({ current: 12, best: 12, lastDay: '2026-05-01', shields: 2 }, now)).toBe(0)
  })
})

describe('rewards', () => {
  it('adds XP, minutes, topic hours and a log entry', () => {
    const d = emptyData()
    d.topics.push({ id: 't', name: 'Tesis', type: 'Dragon', totalMin: 0, createdAt: 0 })
    const r = grantCompletion(d, { ...session, topicId: 't' }, new Date(2026, 4, 4), seeded(2))
    expect(r.xpGained).toBe(50)
    expect(d.totalFocusMin).toBe(50)
    expect(d.topics[0].totalMin).toBe(50)
    expect(d.sessionLog).toHaveLength(1)
    expect(r.newBadges).toContain('first-session')
  })

  it('awards each badge only once, exactly at its threshold', () => {
    const d = emptyData()
    d.totalFocusMin = 599 - 50
    grantCompletion(d, session, new Date(2026, 4, 4), seeded(3))
    expect(d.badges).not.toContain('hours-10')
    const r = grantCompletion(d, { ...session, durationMin: 1 }, new Date(2026, 4, 4), seeded(4))
    expect(r.newBadges).toContain('hours-10')
    const again = grantCompletion(d, session, new Date(2026, 4, 4), seeded(5))
    expect(again.newBadges).not.toContain('hours-10')
  })

  it('aborts count but grant nothing', () => {
    const d = emptyData()
    recordAbort(d, { startedAt: 0, elapsedMin: 12, topicId: null })
    expect(d.sessionsAborted).toBe(1)
    expect(d.xp).toBe(0)
    expect(d.sessionLog[0].completed).toBe(false)
  })
})

describe('hatching', () => {
  it('always yields a valid species, and only superrare eggs yield legendaries', () => {
    const types = [null, 'Steel', 'Dark', 'Ghost', 'Ice', 'Dragon'] as const
    for (const type of types) {
      for (const eggTier of ['common', 'rare', 'superrare'] as const) {
        const random = seeded(42)
        for (let i = 0; i < 2000; i++) {
          const d = emptyData()
          if (type) d.topics.push({ id: 't', name: 'x', type, totalMin: 0, createdAt: 0 })
          const r = grantCompletion(d, { ...session, eggTier, topicId: type ? 't' : null }, new Date(2026, 4, 4), random)
          const id = r.hatch!.pokemonId
          expect(id).toBeGreaterThanOrEqual(1)
          expect(id).toBeLessThanOrEqual(TOTAL_SPECIES)
          if (eggTier !== 'superrare') expect(rarityOf(id)).not.toBe('legendary')
          if (eggTier === 'superrare') expect(rarityOf(id)).not.toBe('common')
        }
      }
    }
  })

  it('leans toward the topic type', () => {
    const random = seeded(7)
    let darkHits = 0
    for (let i = 0; i < 2000; i++) {
      const d = emptyData()
      d.topics.push({ id: 't', name: 'x', type: 'Dark', totalMin: 0, createdAt: 0 })
      const r = grantCompletion(d, { ...session, topicId: 't' }, new Date(2026, 4, 4), random)
      if (typesOf(r.hatch!.pokemonId).includes('Dark')) darkHits++
    }
    expect(darkHits / 2000).toBeGreaterThan(0.5)
  })
})

describe('long sessions', () => {
  const long = { durationMin: 90, eggTier: 'superrare' as const, topicId: null }

  function play(sessions: number, seed: number): ReturnType<typeof emptyData> {
    const d = emptyData()
    const random = seeded(seed)
    for (let i = 0; i < sessions; i++) {
      const end = new Date(2026, 0, 1 + i, 12)
      grantCompletion(d, { ...long, startedAt: end.getTime() - 90 * 60000 }, end, random)
    }
    return d
  }

  it('never go more than the pity limit without a legendary', () => {
    for (let seed = 1; seed <= 50; seed++) {
      let dry = 0
      for (const e of play(60, seed).sessionLog) {
        dry = rarityOf(e.hatch!.pokemonId) === 'legendary' ? 0 : dry + 1
        expect(dry).toBeLessThan(LEGENDARY_PITY)
      }
    }
  })

  it('count down to the guaranteed legendary', () => {
    const d = emptyData()
    expect(eggsUntilLegendary(d.sessionLog)).toBe(LEGENDARY_PITY)
    const day = new Date(2026, 0, 1).getTime()
    d.sessionLog.push({ startedAt: day, durationMin: 90, topicId: null, completed: true, hatch: { pokemonId: 10, shiny: false } })
    d.sessionLog.push({ startedAt: day, durationMin: 25, topicId: null, completed: true, hatch: { pokemonId: 11, shiny: false } })
    expect(eggsUntilLegendary(d.sessionLog)).toBe(LEGENDARY_PITY - 1)
    d.sessionLog.push({ startedAt: day, durationMin: 90, topicId: null, completed: true, hatch: { pokemonId: 150, shiny: false } })
    expect(eggsUntilLegendary(d.sessionLog)).toBe(LEGENDARY_PITY)
  })

  it('mostly bring species you have not caught yet', () => {
    let repeats = 0
    for (let seed = 1; seed <= 20; seed++) {
      const log = play(30, seed).sessionLog
      repeats += log.length - new Set(log.map((e) => e.hatch!.pokemonId)).size
    }
    expect(repeats / (20 * 30)).toBeLessThan(0.1)
  })
})

describe('levels', () => {
  it('xpForLevel and levelForXp are inverse at the boundaries', () => {
    for (let level = 1; level <= 60; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level)
      if (level > 1) expect(levelForXp(xpForLevel(level) - 1)).toBe(level - 1)
    }
  })
})
