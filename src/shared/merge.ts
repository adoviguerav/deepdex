import { BADGES } from './pokedex'
import type { CaughtRecord, GameData, SessionLogEntry, StreakState, Topic } from './types'
import { advanceStreak, localDay } from './types'

/** Entries written before ids existed get one derived from their contents, identical on every computer. */
export function entryId(e: SessionLogEntry): string {
  return e.id ?? `legacy-${e.startedAt}-${e.durationMin}-${e.completed ? 1 : 0}`
}

function entryEnd(e: SessionLogEntry): number {
  return e.endedAt ?? e.startedAt + e.durationMin * 60000
}

function unionCaught(...sources: Record<number, CaughtRecord>[]): Record<number, CaughtRecord> {
  const out: Record<number, CaughtRecord> = {}
  for (const source of sources) {
    for (const [key, rec] of Object.entries(source ?? {})) {
      const id = Number(key)
      const prev = out[id]
      out[id] = prev
        ? {
            count: Math.max(prev.count, rec.count),
            shiny: prev.shiny || rec.shiny,
            firstCaughtAt: Math.min(prev.firstCaughtAt, rec.firstCaughtAt)
          }
        : { ...rec }
    }
  }
  return out
}

/**
 * Recomputes XP, hours, session counts, topic totals, the Pokédex, the streak
 * and badges from the session log (mutates and returns `data`). Pokédex
 * entries and badges recorded before the log carried hatches are kept.
 */
export function rebuildFromLog(data: GameData): GameData {
  const log = [...data.sessionLog].sort((a, b) => a.startedAt - b.startedAt)
  const completed = log.filter((e) => e.completed)
  const focusMin = completed.reduce((sum, e) => sum + e.durationMin, 0)

  data.sessionLog = log
  data.xp = focusMin
  data.totalFocusMin = focusMin
  data.sessionsCompleted = completed.length
  data.sessionsAborted = log.length - completed.length

  for (const topic of data.topics) {
    topic.totalMin = completed.filter((e) => e.topicId === topic.id).reduce((sum, e) => sum + e.durationMin, 0)
  }

  const hatched: Record<number, CaughtRecord> = {}
  for (const e of completed) {
    if (!e.hatch) continue
    const prev = hatched[e.hatch.pokemonId]
    hatched[e.hatch.pokemonId] = {
      count: (prev?.count ?? 0) + 1,
      shiny: (prev?.shiny ?? false) || e.hatch.shiny,
      firstCaughtAt: prev?.firstCaughtAt ?? entryEnd(e)
    }
  }
  data.caught = unionCaught(data.caught, hatched)

  const streak: StreakState = { current: 0, best: 0, lastDay: null, shields: 0 }
  const days = [...new Set(completed.map((e) => localDay(new Date(entryEnd(e)))))].sort()
  for (const day of days) advanceStreak(streak, day)
  data.streak = streak

  const stats = {
    totalFocusMin: data.totalFocusMin,
    sessionsCompleted: data.sessionsCompleted,
    bestStreak: data.streak.best,
    speciesCount: Object.keys(data.caught).length
  }
  const earned = BADGES.filter((b) => b.earned(stats)).map((b) => b.id)
  data.badges = [...new Set([...data.badges, ...earned])]

  if (data.companionId !== null && !data.caught[data.companionId]) data.companionId = null
  return data
}

function topicStamp(t: Topic): number {
  return t.updatedAt ?? t.createdAt
}

/**
 * Merges the progress of two computers without losing either: the union of
 * both session logs (by id), the newest version of each topic (deletions
 * included), the most recently edited settings and companion, then a full
 * rebuild from the merged log.
 */
export function mergeGameData(a: GameData, b: GameData): GameData {
  const entries = new Map<string, SessionLogEntry>()
  for (const e of [...a.sessionLog, ...b.sessionLog]) {
    const id = entryId(e)
    const prev = entries.get(id)
    // Prefer the copy that knows which Pokémon hatched.
    if (!prev || (!prev.hatch && e.hatch)) entries.set(id, { ...e, id })
  }

  const topics = new Map<string, Topic>()
  for (const t of [...a.topics, ...b.topics]) {
    const prev = topics.get(t.id)
    if (!prev || topicStamp(t) > topicStamp(prev)) topics.set(t.id, { ...t })
  }

  const aSettings = a.settingsUpdatedAt ?? 0
  const bSettings = b.settingsUpdatedAt ?? 0
  const aCompanion = a.companionUpdatedAt ?? 0
  const bCompanion = b.companionUpdatedAt ?? 0

  const merged: GameData = {
    ...a,
    caught: unionCaught(a.caught, b.caught),
    badges: [...new Set([...a.badges, ...b.badges])],
    topics: [...topics.values()],
    sessionLog: [...entries.values()],
    settings: bSettings > aSettings ? { ...b.settings } : { ...a.settings },
    settingsUpdatedAt: Math.max(aSettings, bSettings) || undefined,
    companionId: bCompanion > aCompanion ? b.companionId : a.companionId,
    companionUpdatedAt: Math.max(aCompanion, bCompanion) || undefined
  }
  return rebuildFromLog(merged)
}
