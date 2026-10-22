import { LEGENDARY_PITY, rarityOf } from './pokedex'
import type { SessionLogEntry } from './types'
import { eggTierForDuration } from './types'

/** Superrare eggs hatched since the last legendary (or ever, if none). */
export function superraresSinceLegendary(log: SessionLogEntry[]): number {
  let count = 0
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]
    if (!e.completed || !e.hatch || eggTierForDuration(e.durationMin) !== 'superrare') continue
    if (rarityOf(e.hatch.pokemonId) === 'legendary') break
    count++
  }
  return count
}

/** How many superrare eggs until a legendary is guaranteed; 1 means the next one. */
export function eggsUntilLegendary(log: SessionLogEntry[]): number {
  return Math.max(1, LEGENDARY_PITY - superraresSinceLegendary(log))
}
