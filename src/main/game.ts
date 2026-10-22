import { eggsUntilLegendary } from '../shared/eggs'
import {
  BADGES,
  EGG_ODDS,
  nameOf,
  NEW_SPECIES_BIAS,
  rarityOf,
  SHINY_ODDS,
  TOTAL_SPECIES,
  typesOf
} from '../shared/pokedex'
import type {
  CompletionResult,
  EggTier,
  GameData,
  HatchResult,
  Rarity,
  Topic
} from '../shared/types'
import { advanceStreak, levelForXp, localDay, newId } from '../shared/types'

/** Chance that a hatch is drawn from the topic's type pool (when non-empty). */
const TYPE_BIAS = 0.6

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

function hatch(
  data: GameData,
  tier: EggTier,
  topic: Topic | null,
  random: () => number,
  now: Date
): HatchResult {
  const pity = tier === 'superrare' && eggsUntilLegendary(data.sessionLog) === 1
  const rarity = pity ? 'legendary' : rollRarity(tier, random)
  let pool = SPECIES_BY_RARITY[rarity]
  if (topic && random() < TYPE_BIAS) {
    const typed = pool.filter((id) => typesOf(id).includes(topic.type))
    if (typed.length > 0) pool = typed
  }
  if (random() < NEW_SPECIES_BIAS[tier]) {
    const unseen = pool.filter((id) => !data.caught[id])
    if (unseen.length > 0) pool = unseen
  }
  const pokemonId = pool[Math.floor(random() * pool.length)]
  // A week's streak and a superrare egg each double the shiny chance.
  const shinyOdds = SHINY_ODDS * (data.streak.current >= 7 ? 2 : 1) * (tier === 'superrare' ? 2 : 1)
  const shiny = random() < shinyOdds
  const existing = data.caught[pokemonId]
  const isNew = !existing
  data.caught[pokemonId] = {
    count: (existing?.count ?? 0) + 1,
    shiny: (existing?.shiny ?? false) || shiny,
    firstCaughtAt: existing?.firstCaughtAt ?? now.getTime()
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

export interface CompletedSession {
  durationMin: number
  eggTier: EggTier
  topicId: string | null
  startedAt: number
}

/** Applies the rewards of a completed session to the game data (mutates it). */
export function grantCompletion(
  data: GameData,
  session: CompletedSession,
  now: Date = new Date(),
  random: () => number = Math.random
): CompletionResult {
  const topic = data.topics.find((t) => t.id === session.topicId && !t.deleted) ?? null
  const levelBefore = levelForXp(data.xp)
  data.xp += session.durationMin
  data.totalFocusMin += session.durationMin
  data.sessionsCompleted += 1
  if (topic) topic.totalMin += session.durationMin
  advanceStreak(data.streak, localDay(now))
  const hatchResult = hatch(data, session.eggTier, topic, random, now)
  data.sessionLog.push({
    id: newId(),
    startedAt: session.startedAt,
    endedAt: now.getTime(),
    durationMin: session.durationMin,
    topicId: topic?.id ?? null,
    completed: true,
    hatch: { pokemonId: hatchResult.pokemonId, shiny: hatchResult.shiny }
  })
  const newBadges = refreshBadges(data)
  const levelAfter = levelForXp(data.xp)
  return {
    xpGained: session.durationMin,
    eggTier: session.eggTier,
    topicName: topic?.name ?? null,
    levelBefore,
    levelAfter,
    newBadges,
    hatch: hatchResult,
    data
  }
}

export function recordAbort(
  data: GameData,
  session: { startedAt: number; elapsedMin: number; topicId: string | null },
  now: Date = new Date()
): void {
  data.sessionsAborted += 1
  data.sessionLog.push({
    id: newId(),
    startedAt: session.startedAt,
    endedAt: now.getTime(),
    durationMin: session.elapsedMin,
    topicId: session.topicId,
    completed: false
  })
}
