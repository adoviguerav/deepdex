import { useEffect, useState } from 'react'
import { BADGES, typesOf } from '../../../shared/pokedex'
import { formatMinutes } from '../../../shared/stats'
import type { CompletionResult } from '../../../shared/types'
import Egg from '../components/Egg'
import Sprite from '../components/Sprite'
import TypeChip from '../components/TypeChip'
import { playBadge, playHatch, playLevelUp } from '../sound'

const RARITY_LABEL: Record<string, string> = {
  common: 'Común',
  uncommon: 'Infrecuente',
  rare: 'Raro',
  legendary: 'Legendario'
}

/** Hatch sequence, as in the games: wobble, first crack, harder wobble, full crack, flash. */
type Phase = 'wobble' | 'crack1' | 'crack2' | 'flash' | 'revealed'
const PHASES: { phase: Phase; ms: number }[] = [
  { phase: 'wobble', ms: 1200 },
  { phase: 'crack1', ms: 900 },
  { phase: 'crack2', ms: 900 },
  { phase: 'flash', ms: 450 }
]

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export default function CompletedScreen({
  result,
  onDismiss
}: {
  result: CompletionResult
  onDismiss: () => void
}): JSX.Element {
  const hatch = result.hatch
  const [phase, setPhase] = useState<Phase>(hatch && !prefersReducedMotion() ? 'wobble' : 'revealed')
  const leveledUp = result.levelAfter > result.levelBefore

  useEffect(() => {
    if (phase === 'revealed') return
    const index = PHASES.findIndex((p) => p.phase === phase)
    const next = PHASES[index + 1]?.phase ?? 'revealed'
    const timer = setTimeout(() => setPhase(next), PHASES[index].ms)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'revealed') return
    const timers: ReturnType<typeof setTimeout>[] = []
    if (hatch) playHatch()
    if (leveledUp) timers.push(setTimeout(playLevelUp, 900))
    if (result.newBadges.length > 0) timers.push(setTimeout(playBadge, 1800))
    return () => timers.forEach(clearTimeout)
  }, [phase, hatch, leveledUp, result.newBadges.length])

  if (hatch && phase !== 'revealed') {
    const crack = phase === 'crack1' ? 1 : phase === 'crack2' || phase === 'flash' ? 2 : 0
    return (
      <button className="app hatch-screen" onClick={() => setPhase('revealed')} aria-label="Ver qué ha nacido">
        <div className="hatch-title">¡Oh! El huevo se mueve…</div>
        <div className={`incubator incubator-lg hatch-egg hatch-${phase}`}>
          <Egg tier={result.eggTier} crack={crack} scale={5} motion="hatching" />
        </div>
        <div className="muted">Haz clic para saltar</div>
        {phase === 'flash' && <div className="hatch-flash" />}
      </button>
    )
  }

  return (
    <div className="app completed-screen">
      <div className="completed-body">
        {hatch ? (
          <>
            <div className="completed-kicker">Sesión completada</div>
            <h1 className="completed-title">
              {hatch.shiny ? `¡${hatch.name} shiny!` : `¡Ha nacido ${hatch.name}!`}
            </h1>
            <div className={`hatch-reveal rarity-${hatch.rarity}${hatch.shiny ? ' shiny' : ''}`}>
              <Sprite id={hatch.pokemonId} shiny={hatch.shiny} size={192} alt={hatch.name} />
            </div>
            <div className="hatch-meta">
              {typesOf(hatch.pokemonId).map((t) => (
                <TypeChip key={t} type={t} />
              ))}
              <span className={`rarity-tag rarity-${hatch.rarity}`}>{RARITY_LABEL[hatch.rarity]}</span>
              {hatch.isNew && <span className="new-tag">Nuevo en la Pokédex</span>}
            </div>
          </>
        ) : (
          <h1 className="completed-title">Sesión completada</h1>
        )}

        <div className="reward-list">
          <div className="reward">
            <span className="pixel reward-value">+{result.xpGained}</span>
            <span className="muted">XP</span>
          </div>
          {result.topicName && (
            <div className="reward">
              <span className="pixel reward-value">+{formatMinutes(result.xpGained)}</span>
              <span className="muted">a {result.topicName}</span>
            </div>
          )}
          <div className="reward">
            <span className="pixel reward-value">{result.data.streak.current}</span>
            <span className="muted">{result.data.streak.current === 1 ? 'día de racha' : 'días de racha'}</span>
          </div>
        </div>

        {leveledUp && <div className="level-up">¡Subes a nivel {result.levelAfter}!</div>}
        {result.newBadges.map((id) => {
          const badge = BADGES.find((b) => b.id === id)
          if (!badge) return null
          return (
            <div key={id} className="badge-earned">
              <span className="badge-emoji" aria-hidden="true">
                {badge.emoji}
              </span>
              <span>
                <strong>{badge.name}</strong> · {badge.description}
              </span>
            </div>
          )
        })}
      </div>

      <button className="btn btn-primary btn-start" onClick={onDismiss}>
        Continuar
      </button>
    </div>
  )
}
