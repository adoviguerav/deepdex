import type { EggTier } from '../../../shared/types'

const TIER_COLORS: Record<EggTier, { shell: string; spots: string }> = {
  common: { shell: '#f0e6c8', spots: '#7bb56a' },
  rare: { shell: '#cfe3f5', spots: '#5a8fd0' },
  superrare: { shell: '#f3d9f0', spots: '#b05ad0' }
}

export default function Egg({ tier, wobble }: { tier: EggTier; wobble: boolean }): JSX.Element {
  const colors = TIER_COLORS[tier]
  return (
    <svg
      className={wobble ? 'egg wobble' : 'egg'}
      viewBox="0 0 64 80"
      width="96"
      height="120"
      shapeRendering="crispEdges"
    >
      <path
        d="M32 4 C16 4 8 28 8 46 C8 64 18 76 32 76 C46 76 56 64 56 46 C56 28 48 4 32 4 Z"
        fill={colors.shell}
        stroke="#3a3a3a"
        strokeWidth="3"
      />
      <circle cx="24" cy="34" r="6" fill={colors.spots} />
      <circle cx="40" cy="48" r="5" fill={colors.spots} />
      <circle cx="30" cy="58" r="4" fill={colors.spots} />
      <circle cx="42" cy="26" r="4" fill={colors.spots} />
    </svg>
  )
}
