import { BADGES, TOTAL_SPECIES } from '../../../shared/pokedex'
import { formatMinutes } from '../../../shared/stats'
import type { GameData } from '../../../shared/types'
import { displayStreak, levelForXp, xpForLevel } from '../../../shared/types'

export default function TrainerScreen({ data }: { data: GameData }): JSX.Element {
  const level = levelForXp(data.xp)
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const progress = (data.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)
  const speciesCount = Object.keys(data.caught).length
  const streak = displayStreak(data.streak)

  const stats = [
    { label: 'Horas de foco', value: formatMinutes(data.totalFocusMin) },
    { label: 'Sesiones completadas', value: String(data.sessionsCompleted) },
    { label: 'Sesiones abortadas', value: String(data.sessionsAborted) },
    { label: 'Racha actual', value: `${streak} ${streak === 1 ? 'día' : 'días'}` },
    { label: 'Mejor racha', value: `${data.streak.best} ${data.streak.best === 1 ? 'día' : 'días'}` },
    { label: 'Escudos de racha', value: `${data.streak.shields} de 2` },
    { label: 'Especies registradas', value: `${speciesCount} de ${TOTAL_SPECIES}` }
  ]

  return (
    <div className="trainer">
      <section className="card">
        <h2 className="card-title">Nivel de entrenador</h2>
        <div className="trainer-level">
          <span className="pixel level-big">NV.{level}</span>
          <span className="muted">
            {data.xp} XP · faltan {nextLevelXp - data.xp} para el nivel {level + 1}
          </span>
        </div>
        <div className="meter" aria-hidden="true">
          <span className="meter-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Estadísticas</h2>
        <dl className="stat-list">
          {stats.map((s) => (
            <div key={s.label} className="stat-item">
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="field-hint">
          Cada 7 días seguidos ganas un escudo (máximo 2). Si un día no completas ninguna sesión, se
          gasta un escudo en vez de perder la racha.
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">
          Medallas <span className="muted">{data.badges.length} de {BADGES.length}</span>
        </h2>
        <div className="badges-grid">
          {BADGES.map((badge) => {
            const earned = data.badges.includes(badge.id)
            return (
              <div key={badge.id} className={earned ? 'badge earned' : 'badge'}>
                <div className="badge-emoji" aria-hidden="true">
                  {badge.emoji}
                </div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-desc">
                  {earned ? '✓ ' : ''}
                  {badge.description}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
