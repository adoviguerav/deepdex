import { nameOf, TOTAL_SPECIES } from '../../../shared/pokedex'
import type { GameData } from '../../../shared/types'
import Sprite from '../components/Sprite'

export default function PokedexScreen({ data }: { data: GameData }): JSX.Element {
  const caughtCount = Object.keys(data.caught).length
  const ids = Array.from({ length: TOTAL_SPECIES }, (_, i) => i + 1)

  return (
    <div className="pokedex">
      <div className="pokedex-header panel">
        POKÉDEX: {caughtCount}/{TOTAL_SPECIES}
      </div>
      <div className="pokedex-grid">
        {ids.map((id) => {
          const record = data.caught[id]
          return (
            <div key={id} className={record ? 'dex-cell caught' : 'dex-cell'}>
              <Sprite
                id={id}
                shiny={record?.shiny ?? false}
                size={64}
                silhouette={!record}
                alt={record ? nameOf(id) : '???'}
              />
              <div className="dex-name">
                {record ? nameOf(id) : `#${String(id).padStart(3, '0')}`}
              </div>
              {record && record.count > 1 && <div className="dex-count">×{record.count}</div>}
              {record?.shiny && <div className="dex-shiny">✨</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
