import { useState } from 'react'
import { GENERATIONS, nameOf, rarityOf, TOTAL_SPECIES, typesOf } from '../../../shared/pokedex'
import type { GameData } from '../../../shared/types'
import Sprite from '../components/Sprite'
import TypeChip from '../components/TypeChip'

const RARITY_LABEL: Record<string, string> = {
  common: 'Común',
  uncommon: 'Infrecuente',
  rare: 'Raro',
  legendary: 'Legendario'
}

export default function PokedexScreen({
  data,
  onDataChanged
}: {
  data: GameData
  onDataChanged: (data: GameData) => void
}): JSX.Element {
  const [selected, setSelected] = useState<number | null>(null)
  const [gen, setGen] = useState<number>(1)
  const caughtCount = Object.keys(data.caught).length
  const region = GENERATIONS.find((g) => g.gen === gen) ?? GENERATIONS[0]
  const ids = Array.from({ length: region.to - region.from + 1 }, (_, i) => region.from + i)
  const caughtIn = (from: number, to: number): number =>
    Object.keys(data.caught).filter((k) => Number(k) >= from && Number(k) <= to).length

  const record = selected ? data.caught[selected] : undefined

  const makeCompanion = (): void => {
    if (!selected) return
    void window.deepdex.setCompanion(selected).then((updated) => {
      onDataChanged(updated)
      setSelected(null)
    })
  }

  return (
    <div className="pokedex">
      <div className="pokedex-header">
        <div className="pokedex-total">
          <span className="field-label">Pokédex</span>
          <span className="pixel">
            {caughtCount}/{TOTAL_SPECIES}
          </span>
        </div>
        <div className="region-tabs">
          {GENERATIONS.map((g) => (
            <button
              key={g.gen}
              className={g.gen === gen ? 'region-tab active' : 'region-tab'}
              aria-pressed={g.gen === gen}
              onClick={() => setGen(g.gen)}
            >
              <span>{g.region}</span>
              <span className="region-count">
                {caughtIn(g.from, g.to)}/{g.to - g.from + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="pokedex-grid">
        {ids.map((id) => {
          const rec = data.caught[id]
          return (
            <button key={id} className={rec ? 'dex-cell caught' : 'dex-cell'} onClick={() => setSelected(id)}>
              <Sprite
                id={id}
                shiny={rec?.shiny ?? false}
                size={96}
                silhouette={!rec}
                alt={rec ? nameOf(id) : '???'}
              />
              <div className="dex-name">
                {rec ? nameOf(id) : `#${String(id).padStart(3, '0')}`}
              </div>
              {rec && rec.count > 1 && <div className="dex-count">×{rec.count}</div>}
              {rec?.shiny && <div className="dex-shiny">✨</div>}
              {data.companionId === id && <div className="dex-companion">♥</div>}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal dex-detail" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="dex-detail-head">
              <span className="pixel dex-number">#{String(selected).padStart(3, '0')}</span>
              <h2 className="modal-title">{record ? nameOf(selected) : '???'}</h2>
            </div>
            <div className="dex-detail-sprite">
              <Sprite
                id={selected}
                shiny={record?.shiny ?? false}
                size={192}
                silhouette={!record}
                alt={record ? nameOf(selected) : '???'}
              />
            </div>
            <div className="dex-detail-types">
              {typesOf(selected).map((t) => (
                <TypeChip key={t} type={t} />
              ))}
              <span className={`rarity-tag rarity-${rarityOf(selected)}`}>{RARITY_LABEL[rarityOf(selected)]}</span>
            </div>
            {record ? (
              <div className="dex-detail-info">
                <div>Eclosionado ×{record.count}{record.shiny ? ' · ✨ shiny' : ''}</div>
                <div>Primera vez: {new Date(record.firstCaughtAt).toLocaleDateString('es-ES')}</div>
              </div>
            ) : (
              <div className="dex-detail-info">Aún no ha salido de ningún huevo.</div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                Cerrar
              </button>
              {record && data.companionId !== selected && (
                <button className="btn btn-primary" onClick={makeCompanion}>
                  Elegir como compañero
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
