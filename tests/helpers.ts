import type { GameData } from '../src/shared/types'

export function emptyData(): GameData {
  return {
    xp: 0,
    totalFocusMin: 0,
    sessionsCompleted: 0,
    sessionsAborted: 0,
    streak: { current: 0, best: 0, lastDay: null, shields: 0 },
    caught: {},
    badges: [],
    companionId: null,
    topics: [],
    sessionLog: [],
    settings: { blocklistApps: [], blocklistDomains: [], customDurationMin: 60 }
  }
}

/** Deterministic PRNG so hatch tests are repeatable. */
export function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
