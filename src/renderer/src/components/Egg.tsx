import type { EggTier } from '../../../shared/types'

const TIER_NAMES: Record<EggTier, string> = {
  common: 'Huevo común',
  rare: 'Huevo raro',
  superrare: 'Huevo superraro'
}

/** The sprite is 32x34 px; it is only ever drawn at whole multiples so pixels stay crisp. */
const EGG_W = 32
const EGG_H = 34

/**
 * The official egg sprite, with spot colours following Pokémon GO's distance
 * eggs (green 2 km, orange 5 km, purple 10 km) and two crack stages.
 */
export default function Egg({
  tier,
  crack = 0,
  scale = 4,
  motion = 'none'
}: {
  tier: EggTier
  crack?: 0 | 1 | 2
  scale?: number
  motion?: 'none' | 'idle' | 'hatching'
}): JSX.Element {
  const src = `./eggs/egg-${tier}${crack ? `-crack${crack}` : ''}.png`
  return (
    <img
      className={`egg egg-${motion}`}
      src={src}
      width={EGG_W * scale}
      height={EGG_H * scale}
      alt={TIER_NAMES[tier]}
      draggable={false}
    />
  )
}
