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
}

export interface SessionLogEntry {
  startedAt: number
  /** Planned minutes for completed sessions; elapsed minutes for aborted ones. */
  durationMin: number
  topicId: string | null
  completed: boolean
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
