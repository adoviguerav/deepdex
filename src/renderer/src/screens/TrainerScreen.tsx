import { BADGES, TOTAL_SPECIES } from '../../../shared/pokedex'
import type { GameData } from '../../../shared/types'
import { levelForXp, xpForLevel } from '../../../shared/types'

export default function TrainerScreen({ data }: { data: GameData }): JSX.Element {
  const level = levelForXp(data.xp)
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const progress = (data.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)
  const hours = Math.floor(data.totalFocusMin / 60)
  const minutes = data.totalFocusMin % 60
  const speciesCount = Object.keys(data.caught).length

  return (
    <div className="trainer">
      <div className="panel">
        <div className="panel-title">ENTRENADOR NV. {level}</div>
        <div className="progress-track xp-track">
          <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="xp-numbers">
          {data.xp} XP · faltan {nextLevelXp - data.xp} para nv. {level + 1}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">ESTADÍSTICAS</div>
        <div className="stat-rows">
          <div className="stat-row"><span>Horas de foco</span><span>{hours}h {minutes}m</span></div>
          <div className="stat-row"><span>Sesiones completadas</span><span>{data.sessionsCompleted}</span></div>
          <div className="stat-row"><span>Sesiones abortadas</span><span>{data.sessionsAborted}</span></div>
          <div className="stat-row"><span>Racha actual</span><span>{data.streak.current} días</span></div>
          <div className="stat-row"><span>Mejor racha</span><span>{data.streak.best} días</span></div>
          <div className="stat-row"><span>Especies capturadas</span><span>{speciesCount}/{TOTAL_SPECIES}</span></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          MEDALLAS {data.badges.length}/{BADGES.length}
        </div>
        <div className="badges-grid">
          {BADGES.map((badge) => {
            const earned = data.badges.includes(badge.id)
            return (
              <div key={badge.id} className={earned ? 'badge earned' : 'badge'} title={badge.description}>
                <div className="badge-emoji">{badge.emoji}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-desc">{badge.description}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
