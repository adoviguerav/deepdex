import type { CompletionResult, EggTier, GameData, StreakState } from '../shared/types'
import { levelForXp } from '../shared/types'

function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function updateStreak(streak: StreakState, now: Date): void {
  const today = localDay(now)
  if (streak.lastDay === today) return
  const yesterday = localDay(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  streak.current = streak.lastDay === yesterday ? streak.current + 1 : 1
  streak.best = Math.max(streak.best, streak.current)
  streak.lastDay = today
}

/**
 * Applies the rewards of a completed session to the game data (mutates it).
 * Hatching and badges land in phase 3; for now a session grants XP, hours
 * and streak progress.
 */
export function grantCompletion(
  data: GameData,
  durationMin: number,
  _eggTier: EggTier,
  now: Date = new Date()
): CompletionResult {
  const levelBefore = levelForXp(data.xp)
  data.xp += durationMin
  data.totalFocusMin += durationMin
  data.sessionsCompleted += 1
  updateStreak(data.streak, now)
  const levelAfter = levelForXp(data.xp)
  return {
    xpGained: durationMin,
    levelBefore,
    levelAfter,
    newBadges: [],
    hatch: null,
    data
  }
}

export function recordAbort(data: GameData): void {
  data.sessionsAborted += 1
}
