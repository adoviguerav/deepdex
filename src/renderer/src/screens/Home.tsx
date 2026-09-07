import { useState } from 'react'
import type { GameData } from '../../../shared/types'
import { eggTierForDuration, levelForXp, xpForLevel } from '../../../shared/types'
import { nameOf } from '../../../shared/pokedex'
import Egg from '../components/Egg'
import Sprite from '../components/Sprite'

const PRESETS = [25, 50, 90]

const TIER_LABEL: Record<string, string> = {
  common: 'HUEVO COMÚN',
  rare: 'HUEVO RARO',
  superrare: 'HUEVO SUPERRARO'
}

export default function Home({ data }: { data: GameData }): JSX.Element {
  const [duration, setDuration] = useState(50)
  const [custom, setCustom] = useState(String(data.settings.customDurationMin))
  const [usingCustom, setUsingCustom] = useState(false)

  const effectiveDuration = usingCustom
    ? Math.max(10, Math.min(240, parseInt(custom, 10) || data.settings.customDurationMin))
    : duration
  const tier = eggTierForDuration(effectiveDuration)
  const level = levelForXp(data.xp)
  const nextXp = xpForLevel(level + 1)
  const hours = Math.floor(data.totalFocusMin / 60)
  const minutes = data.totalFocusMin % 60

  const start = (): void => {
    if (usingCustom) {
      void window.deepdex.updateSettings({ customDurationMin: effectiveDuration })
    }
    void window.deepdex.startSession(effectiveDuration)
  }

  return (
    <div className="home">
      <header className="home-header">
        <div className="header-main">
          {data.companionId && data.caught[data.companionId] && (
            <div className="companion" title={nameOf(data.companionId)}>
              <Sprite
                id={data.companionId}
                shiny={data.caught[data.companionId].shiny}
                size={56}
                alt={nameOf(data.companionId)}
              />
            </div>
          )}
          <div className="header-text">
            <div className="trainer-line">
              ENTRENADOR NV. {level}
              <span className="xp-detail">
                {data.xp}/{nextXp} XP
              </span>
            </div>
            <div className="stats-line">
              <span>⏱ {hours}h {minutes}m</span>
              <span>
                🔥 RACHA {data.streak.current}
                {data.streak.shields > 0 && ` 🛡×${data.streak.shields}`}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="egg-preview panel">
        <Egg tier={tier} wobble={false} />
        <div className="egg-label">{TIER_LABEL[tier]}</div>
        <div className="egg-hint">
          {tier === 'superrare'
            ? '¡Puede salir un legendario!'
            : tier === 'rare'
              ? 'Mejores Pokémon dentro'
              : 'Sesiones más largas, mejores huevos'}
        </div>
      </div>

      <div className="duration-picker panel">
        <div className="panel-title">DURACIÓN</div>
        <div className="preset-row">
          {PRESETS.map((min) => (
            <button
              key={min}
              className={!usingCustom && duration === min ? 'preset active' : 'preset'}
              onClick={() => {
                setUsingCustom(false)
                setDuration(min)
              }}
            >
              {min}m
            </button>
          ))}
          <button
            className={usingCustom ? 'preset active' : 'preset'}
            onClick={() => setUsingCustom(true)}
          >
            OTRA
          </button>
        </div>
        {usingCustom && (
          <input
            className="custom-duration"
            type="number"
            min={10}
            max={240}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
      </div>

      <button className="start-btn" onClick={start}>
        ▶ EMPEZAR FOCO ({effectiveDuration} MIN)
      </button>
    </div>
  )
}
