import { POKEMON_NAMES, POKEMON_RARITY, POKEMON_TYPES } from './pokedexData'
import type { EggTier, Rarity } from './types'

export { POKEMON_NAMES }

export const TOTAL_SPECIES = POKEMON_NAMES.length // 649

/** National dex ranges per generation, inclusive. */
export const GENERATIONS = [
  { gen: 1, region: 'Kanto', from: 1, to: 151 },
  { gen: 2, region: 'Johto', from: 152, to: 251 },
  { gen: 3, region: 'Hoenn', from: 252, to: 386 },
  { gen: 4, region: 'Sinnoh', from: 387, to: 493 },
  { gen: 5, region: 'Teselia', from: 494, to: 649 }
] as const

export type PokeType =
  | 'Normal' | 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Ice' | 'Fighting'
  | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' | 'Rock' | 'Ghost'
  | 'Dragon' | 'Dark' | 'Steel' | 'Fairy'

export function typesOf(id: number): PokeType[] {
  return (POKEMON_TYPES[id - 1] ?? 'Normal').split('/') as PokeType[]
}

export const TYPE_LABELS_ES: Record<PokeType, string> = {
  Normal: 'Normal',
  Fire: 'Fuego',
  Water: 'Agua',
  Grass: 'Planta',
  Electric: 'Eléctrico',
  Ice: 'Hielo',
  Fighting: 'Lucha',
  Poison: 'Veneno',
  Ground: 'Tierra',
  Flying: 'Volador',
  Psychic: 'Psíquico',
  Bug: 'Bicho',
  Rock: 'Roca',
  Ghost: 'Fantasma',
  Dragon: 'Dragón',
  Dark: 'Siniestro',
  Steel: 'Acero',
  Fairy: 'Hada'
}

export const TYPE_COLORS: Record<PokeType, string> = {
  Normal: '#a8a878',
  Fire: '#f08030',
  Water: '#6890f0',
  Grass: '#78c850',
  Electric: '#f8d030',
  Ice: '#98d8d8',
  Fighting: '#c03028',
  Poison: '#a040a0',
  Ground: '#e0c068',
  Flying: '#a890f0',
  Psychic: '#f85888',
  Bug: '#a8b820',
  Rock: '#b8a038',
  Ghost: '#705898',
  Dragon: '#7038f8',
  Dark: '#705848',
  Steel: '#b8b8d0',
  Fairy: '#ee99ac'
}

/** Types offered when creating a topic (all 18 appear in gens 1-5). */
export const ALL_TYPES = Object.keys(TYPE_LABELS_ES) as PokeType[]

const RARITY_CODES: Record<string, Rarity> = {
  c: 'common',
  u: 'uncommon',
  r: 'rare',
  l: 'legendary'
}

export function rarityOf(id: number): Rarity {
  return RARITY_CODES[POKEMON_RARITY[id - 1]] ?? 'common'
}

export function nameOf(id: number): string {
  return POKEMON_NAMES[id - 1] ?? `#${id}`
}

/** Sprites ship with the app (src/renderer/public/sprites), so they work offline. */
export function spriteUrl(id: number, shiny = false): string {
  return shiny ? `./sprites/shiny/${id}.png` : `./sprites/${id}.png`
}

/** Hatch odds per egg tier: [common, uncommon, rare, legendary]. */
export const EGG_ODDS: Record<EggTier, [number, number, number, number]> = {
  common: [0.7, 0.25, 0.05, 0],
  rare: [0.35, 0.45, 0.2, 0],
  superrare: [0.1, 0.4, 0.45, 0.05]
}

export const SHINY_ODDS = 1 / 64

export interface BadgeDef {
  id: string
  name: string
  emoji: string
  description: string
  earned: (stats: {
    totalFocusMin: number
    sessionsCompleted: number
    bestStreak: number
    speciesCount: number
  }) => boolean
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first-session',
    name: 'Medalla Roca',
    emoji: '🪨',
    description: 'Primera sesión completada',
    earned: (s) => s.sessionsCompleted >= 1
  },
  {
    id: 'hours-10',
    name: 'Medalla Cascada',
    emoji: '💧',
    description: '10 horas de foco',
    earned: (s) => s.totalFocusMin >= 10 * 60
  },
  {
    id: 'hours-50',
    name: 'Medalla Trueno',
    emoji: '⚡',
    description: '50 horas de foco',
    earned: (s) => s.totalFocusMin >= 50 * 60
  },
  {
    id: 'hours-100',
    name: 'Medalla Arcoíris',
    emoji: '🌈',
    description: '100 horas de foco',
    earned: (s) => s.totalFocusMin >= 100 * 60
  },
  {
    id: 'hours-250',
    name: 'Medalla Tierra',
    emoji: '🌋',
    description: '250 horas de foco',
    earned: (s) => s.totalFocusMin >= 250 * 60
  },
  {
    id: 'streak-7',
    name: 'Medalla Alma',
    emoji: '🔥',
    description: 'Racha de 7 días',
    earned: (s) => s.bestStreak >= 7
  },
  {
    id: 'streak-30',
    name: 'Medalla Pantano',
    emoji: '🌿',
    description: 'Racha de 30 días',
    earned: (s) => s.bestStreak >= 30
  },
  {
    id: 'species-50',
    name: 'Medalla Volcán',
    emoji: '🏐',
    description: '50 especies distintas',
    earned: (s) => s.speciesCount >= 50
  }
]
