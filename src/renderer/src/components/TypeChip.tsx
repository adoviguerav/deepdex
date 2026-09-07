import { TYPE_COLORS, TYPE_LABELS_ES, type PokeType } from '../../../shared/pokedex'

export default function TypeChip({ type }: { type: PokeType }): JSX.Element {
  return (
    <span className="type-chip" style={{ backgroundColor: TYPE_COLORS[type] }}>
      {TYPE_LABELS_ES[type].toUpperCase()}
    </span>
  )
}
