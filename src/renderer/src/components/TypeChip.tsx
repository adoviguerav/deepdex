import { TYPE_COLORS, TYPE_LABELS_ES, type PokeType } from '../../../shared/pokedex'

/** Light type colours (Electric, Ice, Ground…) need dark text to stay readable. */
function textColorFor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const vsWhite = 1.05 / (luminance + 0.05)
  const vsInk = (luminance + 0.05) / 0.0637
  return vsInk > vsWhite ? '#1f1f1f' : '#ffffff'
}

export default function TypeChip({ type }: { type: PokeType }): JSX.Element {
  const bg = TYPE_COLORS[type]
  return (
    <span className="type-chip" style={{ backgroundColor: bg, color: textColorFor(bg) }}>
      {TYPE_LABELS_ES[type]}
    </span>
  )
}
