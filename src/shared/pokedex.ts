import type { EggTier, Rarity } from './types'

/** National dex names, index 0 = #1 Bulbasaur. */
export const POKEMON_NAMES = [
  'Bulbasaur', 'Ivysaur', 'Venusaur', 'Charmander', 'Charmeleon', 'Charizard',
  'Squirtle', 'Wartortle', 'Blastoise', 'Caterpie', 'Metapod', 'Butterfree',
  'Weedle', 'Kakuna', 'Beedrill', 'Pidgey', 'Pidgeotto', 'Pidgeot',
  'Rattata', 'Raticate', 'Spearow', 'Fearow', 'Ekans', 'Arbok',
  'Pikachu', 'Raichu', 'Sandshrew', 'Sandslash', 'Nidoran♀', 'Nidorina',
  'Nidoqueen', 'Nidoran♂', 'Nidorino', 'Nidoking', 'Clefairy', 'Clefable',
  'Vulpix', 'Ninetales', 'Jigglypuff', 'Wigglytuff', 'Zubat', 'Golbat',
  'Oddish', 'Gloom', 'Vileplume', 'Paras', 'Parasect', 'Venonat',
  'Venomoth', 'Diglett', 'Dugtrio', 'Meowth', 'Persian', 'Psyduck',
  'Golduck', 'Mankey', 'Primeape', 'Growlithe', 'Arcanine', 'Poliwag',
  'Poliwhirl', 'Poliwrath', 'Abra', 'Kadabra', 'Alakazam', 'Machop',
  'Machoke', 'Machamp', 'Bellsprout', 'Weepinbell', 'Victreebel', 'Tentacool',
  'Tentacruel', 'Geodude', 'Graveler', 'Golem', 'Ponyta', 'Rapidash',
  'Slowpoke', 'Slowbro', 'Magnemite', 'Magneton', "Farfetch'd", 'Doduo',
  'Dodrio', 'Seel', 'Dewgong', 'Grimer', 'Muk', 'Shellder',
  'Cloyster', 'Gastly', 'Haunter', 'Gengar', 'Onix', 'Drowzee',
  'Hypno', 'Krabby', 'Kingler', 'Voltorb', 'Electrode', 'Exeggcute',
  'Exeggutor', 'Cubone', 'Marowak', 'Hitmonlee', 'Hitmonchan', 'Lickitung',
  'Koffing', 'Weezing', 'Rhyhorn', 'Rhydon', 'Chansey', 'Tangela',
  'Kangaskhan', 'Horsea', 'Seadra', 'Goldeen', 'Seaking', 'Staryu',
  'Starmie', 'Mr. Mime', 'Scyther', 'Jynx', 'Electabuzz', 'Magmar',
  'Pinsir', 'Tauros', 'Magikarp', 'Gyarados', 'Lapras', 'Ditto',
  'Eevee', 'Vaporeon', 'Jolteon', 'Flareon', 'Porygon', 'Omanyte',
  'Omastar', 'Kabuto', 'Kabutops', 'Aerodactyl', 'Snorlax', 'Articuno',
  'Zapdos', 'Moltres', 'Dratini', 'Dragonair', 'Dragonite', 'Mewtwo', 'Mew'
]

export const TOTAL_SPECIES = POKEMON_NAMES.length // 151

const LEGENDARY = new Set([144, 145, 146, 150, 151])

const RARE = new Set([
  3, 6, 9, 31, 34, 59, 62, 65, 68, 71, 76, 80, 89, 91, 94, 103, 106, 107,
  112, 113, 115, 121, 123, 124, 125, 126, 127, 128, 130, 131, 132, 134, 135,
  136, 137, 139, 141, 142, 143, 148, 149
])

const UNCOMMON = new Set([
  2, 5, 8, 12, 15, 18, 20, 22, 24, 25, 26, 28, 30, 33, 36, 38, 40, 42, 45,
  47, 49, 51, 53, 55, 57, 58, 61, 64, 67, 70, 73, 75, 78, 82, 83, 85, 87,
  93, 95, 97, 99, 101, 105, 108, 110, 111, 114, 117, 119, 120, 122, 133,
  138, 140, 147
])

export function rarityOf(id: number): Rarity {
  if (LEGENDARY.has(id)) return 'legendary'
  if (RARE.has(id)) return 'rare'
  if (UNCOMMON.has(id)) return 'uncommon'
  return 'common'
}

export function nameOf(id: number): string {
  return POKEMON_NAMES[id - 1] ?? `#${id}`
}

export function spriteUrl(id: number, shiny = false): string {
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
  return shiny ? `${base}/shiny/${id}.png` : `${base}/${id}.png`
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
