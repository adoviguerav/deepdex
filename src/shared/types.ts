import type { PokeType } from './pokedex'

export type SessionPhase = 'idle' | 'running'

export type WebBlockState = 'pending' | 'on' | 'off' | 'none'

export type EggTier = 'common' | 'rare' | 'superrare'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface SessionState {
  phase: SessionPhase
  durationMin: number
  startedAt: number | null
  remainingSec: number
  blockedAttempts: number
  eggTier: EggTier | null
  /** Web blocking: waiting for the password, in place, not in place, or nothing to block. */
  webBlock: WebBlockState
  /** True when macOS refuses DeepDex permission to close apps. */
  appBlockIssue: boolean
  topicId: string | null
  topicName: string | null
}

/** A task/subject the user dedicates focus hours to. */
export interface Topic {
  id: string
  name: string
  /** Pokémon type affinity: hatches during this topic lean toward it. */
  type: PokeType
  totalMin: number
  createdAt: number
  /** Last edit, so two synced computers agree on the newest version. */
  updatedAt?: number
  /** Deleted topics stay as tombstones so a sync can't bring them back. */
  deleted?: boolean
}

/**
 * One focus session. The log is the source of truth: XP, hours, the Pokédex,
 * streaks and badges are all recomputed from it, which is what lets two
 * computers merge their progress by taking the union of their logs.
 */
export interface SessionLogEntry {
  /** Unique per session; older entries without one get a deterministic id. */
  id?: string
  startedAt: number
  /** When it completed or was aborted. */
  endedAt?: number
  /** Planned minutes for completed sessions; elapsed minutes for aborted ones. */
  durationMin: number
  topicId: string | null
  completed: boolean
  /** The Pokémon that hatched from this session's egg. */
  hatch?: { pokemonId: number; shiny: boolean } | null
}

export interface CaughtRecord {
  count: number
  shiny: boolean
  firstCaughtAt: number
}

export interface StreakState {
  current: number
  best: number
  /** Local day (YYYY-MM-DD) of the last completed session */
  lastDay: string | null
  /**
   * Streak shields: earned every 7 straight days (max 2 held). A single
   * missed day consumes one instead of resetting the streak.
   */
  shields: number
}

export interface Settings {
  blocklistApps: string[]
  blocklistDomains: string[]
  customDurationMin: number
}

export interface GameData {
  xp: number
  totalFocusMin: number
  sessionsCompleted: number
  sessionsAborted: number
  streak: StreakState
  /** Keyed by national pokédex id (1-649) */
  caught: Record<number, CaughtRecord>
  badges: string[]
  /** Favourite caught Pokémon, shown on the home screen. */
  companionId: number | null
  topics: Topic[]
  sessionLog: SessionLogEntry[]
  settings: Settings
  /** Timestamps of the last edit, so the newest wins when two computers sync. */
  settingsUpdatedAt?: number
  companionUpdatedAt?: number
}

export interface HatchResult {
  pokemonId: number
  name: string
  rarity: Rarity
  shiny: boolean
  isNew: boolean
}

export interface CompletionResult {
  xpGained: number
  eggTier: EggTier
  topicName: string | null
  levelBefore: number
  levelAfter: number
  newBadges: string[]
  hatch: HatchResult | null
  data: GameData
}

export function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Calendar days from day key `a` to day key `b` (YYYY-MM-DD), immune to DST. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (key: string): number => {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(b) - toUtc(a)) / 86400000)
}

/**
 * The streak as it stands today: stored streaks only update when a session
 * completes, so a streak whose last day is too far back is already broken.
 */
export function displayStreak(streak: StreakState, now: Date = new Date()): number {
  if (!streak.lastDay) return 0
  const gap = daysBetween(streak.lastDay, localDay(now))
  if (gap <= 1) return streak.current
  if (gap === 2 && streak.shields > 0) return streak.current
  return 0
}

export const MAX_SHIELDS = 2

/**
 * Moves a streak forward to a day with a completed session: +1 for the next
 * day, a shield covers one missed day, anything longer starts over. Every 7
 * straight days earns a shield (max 2).
 */
export function advanceStreak(streak: StreakState, day: string): void {
  if (streak.lastDay === day) return
  const gap = streak.lastDay ? daysBetween(streak.lastDay, day) : Infinity
  if (gap === 1) {
    streak.current += 1
  } else if (gap === 2 && streak.shields > 0) {
    streak.shields -= 1
    streak.current += 1
  } else {
    streak.current = 1
  }
  if (streak.current % 7 === 0) {
    streak.shields = Math.min(MAX_SHIELDS, streak.shields + 1)
  }
  streak.best = Math.max(streak.best, streak.current)
  streak.lastDay = day
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** XP required to reach a given trainer level (cumulative). Level 1 = 0 XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round(100 * Math.pow(level - 1, 1.5))
}

export function levelForXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

export function eggTierForDuration(durationMin: number): EggTier {
  if (durationMin >= 80) return 'superrare'
  if (durationMin >= 45) return 'rare'
  return 'common'
}
