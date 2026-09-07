import { useEffect, useState } from 'react'
import { BADGES } from '../../../shared/pokedex'
import type { CompletionResult } from '../../../shared/types'
import Egg from '../components/Egg'
import Sprite from '../components/Sprite'
import { playBadge, playHatch, playLevelUp } from '../sound'

const RARITY_LABEL: Record<string, string> = {
  common: 'COMÚN',
  uncommon: 'INFRECUENTE',
  rare: 'RARO',
  legendary: '★ LEGENDARIO ★'
}

export default function CompletedScreen({
  result,
  onDismiss
}: {
  result: CompletionResult
  onDismiss: () => void
}): JSX.Element {
  const [revealed, setRevealed] = useState(false)
  const hatch = result.hatch
  const leveledUp = result.levelAfter > result.levelBefore

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!revealed) return
    if (hatch) playHatch()
    if (leveledUp) setTimeout(playLevelUp, 900)
    if (result.newBadges.length > 0) setTimeout(playBadge, 1800)
  }, [revealed, hatch, leveledUp, result.newBadges.length])

  if (hatch && !revealed) {
    return (
      <div className="app completed-screen" onClick={() => setRevealed(true)}>
        <div className="completed-title">¡SESIÓN COMPLETADA!</div>
        <div className="hatch-egg">
          <Egg tier={result.eggTier} wobble />
        </div>
        <div className="egg-hint">El huevo se está rompiendo…</div>
      </div>
    )
  }

  return (
    <div className="app completed-screen">
      {hatch ? (
        <>
          <div className="completed-title">
            {hatch.shiny ? '✨ ¡POKÉMON SHINY! ✨' : `¡HA NACIDO ${hatch.name.toUpperCase()}!`}
          </div>
          <div className={`hatch-reveal rarity-${hatch.rarity}`}>
            <Sprite id={hatch.pokemonId} shiny={hatch.shiny} size={160} alt={hatch.name} />
          </div>
          <div className="hatch-meta">
            <span className={`rarity-tag rarity-${hatch.rarity}`}>
              {RARITY_LABEL[hatch.rarity]}
            </span>
            {hatch.isNew && <span className="new-tag">¡NUEVO EN LA POKÉDEX!</span>}
            {hatch.shiny && <span className="new-tag">{hatch.name.toUpperCase()} ✨</span>}
          </div>
        </>
      ) : (
        <div className="completed-title">¡SESIÓN COMPLETADA!</div>
      )}

      <div className="completed-xp">+{result.xpGained} XP</div>
      {leveledUp && <div className="level-up">¡SUBES A NIVEL {result.levelAfter}!</div>}
      {result.newBadges.length > 0 && (
        <div className="new-badges">
          {result.newBadges.map((id) => {
            const badge = BADGES.find((b) => b.id === id)
            if (!badge) return null
            return (
              <div key={id} className="badge-earned">
                {badge.emoji} {badge.name.toUpperCase()} — {badge.description}
              </div>
            )
          })}
        </div>
      )}
      <div className="completed-stats">
        RACHA: {result.data.streak.current} DÍA{result.data.streak.current === 1 ? '' : 'S'}
      </div>
      <button className="start-btn" onClick={onDismiss}>
        CONTINUAR
      </button>
    </div>
  )
}
