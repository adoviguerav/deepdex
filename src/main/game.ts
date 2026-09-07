import {
  BADGES,
  EGG_ODDS,
  nameOf,
  rarityOf,
  SHINY_ODDS,
  TOTAL_SPECIES
} from '../shared/pokedex'
import type {
  CompletionResult,
  EggTier,
  GameData,
  HatchResult,
  Rarity,
  StreakState
} from '../shared/types'
import { levelForXp } from '../shared/types'

function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_SHIELDS = 2

function updateStreak(streak: StreakState, now: Date): void {
  const today = localDay(now)
  if (streak.lastDay === today) return
  const yesterday = localDay(new Date(now.getTime() - DAY_MS))
  const dayBefore = localDay(new Date(now.getTime() - 2 * DAY_MS))
  if (streak.lastDay === yesterday) {
    streak.current += 1
  } else if (streak.lastDay === dayBefore && streak.shields > 0) {
    // One missed day: a shield saves the streak instead of resetting it.
    streak.shields -= 1
    streak.current += 1
  } else {
    streak.current = 1
  }
  if (streak.current > 0 && streak.current % 7 === 0) {
    streak.shields = Math.min(MAX_SHIELDS, streak.shields + 1)
  }
  streak.best = Math.max(streak.best, streak.current)
  streak.lastDay = today
}

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary']

function rollRarity(tier: EggTier, random: () => number): Rarity {
  const odds = EGG_ODDS[tier]
  let roll = random()
  for (let i = 0; i < odds.length; i++) {
    if (roll < odds[i]) return RARITY_ORDER[i]
    roll -= odds[i]
  }
  return 'common'
}

const SPECIES_BY_RARITY: Record<Rarity, number[]> = {
  common: [],
  uncommon: [],
  rare: [],
  legendary: []
}
for (let id = 1; id <= TOTAL_SPECIES; id++) {
  SPECIES_BY_RARITY[rarityOf(id)].push(id)
}

function hatch(data: GameData, tier: EggTier, random: () => number): HatchResult {
  const rarity = rollRarity(tier, random)
  const pool = SPECIES_BY_RARITY[rarity]
  const pokemonId = pool[Math.floor(random() * pool.length)]
  const shinyOdds = data.streak.current >= 7 ? SHINY_ODDS * 2 : SHINY_ODDS
  const shiny = random() < shinyOdds
  const existing = data.caught[pokemonId]
  const isNew = !existing
  data.caught[pokemonId] = {
    count: (existing?.count ?? 0) + 1,
    shiny: (existing?.shiny ?? false) || shiny,
    firstCaughtAt: existing?.firstCaughtAt ?? Date.now()
  }
  return { pokemonId, name: nameOf(pokemonId), rarity, shiny, isNew }
}

function refreshBadges(data: GameData): string[] {
  const stats = {
    totalFocusMin: data.totalFocusMin,
    sessionsCompleted: data.sessionsCompleted,
    bestStreak: data.streak.best,
    speciesCount: Object.keys(data.caught).length
  }
  const newBadges: string[] = []
  for (const badge of BADGES) {
    if (!data.badges.includes(badge.id) && badge.earned(stats)) {
      data.badges.push(badge.id)
      newBadges.push(badge.id)
    }
  }
  return newBadges
}

/** Applies the rewards of a completed session to the game data (mutates it). */
export function grantCompletion(
  data: GameData,
  durationMin: number,
  eggTier: EggTier,
  now: Date = new Date(),
  random: () => number = Math.random
): CompletionResult {
  const levelBefore = levelForXp(data.xp)
  data.xp += durationMin
  data.totalFocusMin += durationMin
  data.sessionsCompleted += 1
  updateStreak(data.streak, now)
  const hatchResult = hatch(data, eggTier, random)
  const newBadges = refreshBadges(data)
  const levelAfter = levelForXp(data.xp)
  return {
    xpGained: durationMin,
    eggTier,
    levelBefore,
    levelAfter,
    newBadges,
    hatch: hatchResult,
    data
  }
}

export function recordAbort(data: GameData): void {
  data.sessionsAborted += 1
}
