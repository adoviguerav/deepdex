export type SessionPhase = 'idle' | 'running'

export type EggTier = 'common' | 'rare' | 'superrare'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface SessionState {
  phase: SessionPhase
  durationMin: number
  startedAt: number | null
  remainingSec: number
  blockedAttempts: number
  eggTier: EggTier | null
  /** True while the /etc/hosts web block is in place for this session. */
  webBlockActive: boolean
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
  /** Keyed by national pokédex id (1-151) */
  caught: Record<number, CaughtRecord>
  badges: string[]
  /** Favourite caught Pokémon, shown on the home screen. */
  companionId: number | null
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
  levelBefore: number
  levelAfter: number
  newBadges: string[]
  hatch: HatchResult | null
  data: GameData
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
