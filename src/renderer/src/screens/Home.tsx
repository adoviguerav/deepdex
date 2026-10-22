import { useEffect, useState } from 'react'
import { eggsUntilLegendary } from '../../../shared/eggs'
import { ALL_TYPES, nameOf, TYPE_LABELS_ES, type PokeType } from '../../../shared/pokedex'
import { formatMinutes } from '../../../shared/stats'
import type { GameData } from '../../../shared/types'
import { displayStreak, eggTierForDuration, levelForXp, localDay, xpForLevel } from '../../../shared/types'
import Egg from '../components/Egg'
import Sprite from '../components/Sprite'

const PRESETS = [25, 50, 90]

const TIER_INFO: Record<string, { label: string; hint: string }> = {
  common: { label: 'Huevo común', hint: 'Menos de 45 min · Pokémon comunes' },
  rare: { label: 'Huevo raro', hint: '45 a 79 min · más infrecuentes y raros' },
  superrare: { label: 'Huevo superraro', hint: '80 min o más · sin comunes, 15 % de legendario' }
}

export default function Home({
  data,
  onDataChanged
}: {
  data: GameData
  onDataChanged: (data: GameData) => void
}): JSX.Element {
  const [duration, setDuration] = useState(50)
  const [custom, setCustom] = useState(String(data.settings.customDurationMin))
  const [usingCustom, setUsingCustom] = useState(false)
  const [topicId, setTopicId] = useState<string | null>(null)
  const [creatingTopic, setCreatingTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicType, setNewTopicType] = useState<PokeType>('Psychic')
  const [lingering, setLingering] = useState(false)
  const [releasing, setReleasing] = useState(false)

  const effectiveDuration = usingCustom
    ? Math.max(10, Math.min(240, parseInt(custom, 10) || data.settings.customDurationMin))
    : duration
  const tier = eggTierForDuration(effectiveDuration)
  const untilLegendary = eggsUntilLegendary(data.sessionLog)
  const level = levelForXp(data.xp)
  const levelXp = xpForLevel(level)
  const nextXp = xpForLevel(level + 1)
  const xpProgress = (data.xp - levelXp) / (nextXp - levelXp)
  const streak = displayStreak(data.streak)

  const today = localDay(new Date())
  const todayMin = data.sessionLog
    .filter((e) => e.completed && localDay(new Date(e.startedAt)) === today)
    .reduce((sum, e) => sum + e.durationMin, 0)

  const topics = data.topics.filter((t) => !t.deleted)
  const selectedTopic = topics.find((t) => t.id === topicId) ?? null
  const companion = data.companionId && data.caught[data.companionId] ? data.companionId : null

  useEffect(() => {
    const refresh = (): void => {
      void window.deepdex.getHostsStatus().then((st) => setLingering(st.lingering))
    }
    refresh()
    return window.deepdex.onHostsChanged(refresh)
  }, [])

  const releaseHosts = (): void => {
    setReleasing(true)
    void window.deepdex
      .releaseHosts()
      .then((st) => setLingering(st.lingering))
      .finally(() => setReleasing(false))
  }

  const createTopic = (event: React.FormEvent): void => {
    event.preventDefault()
    if (!newTopicName.trim()) return
    void window.deepdex.createTopic(newTopicName.trim(), newTopicType).then((updated) => {
      onDataChanged(updated)
      const created = updated.topics[updated.topics.length - 1]
      setTopicId(created?.id ?? null)
      setCreatingTopic(false)
      setNewTopicName('')
    })
  }

  const start = (): void => {
    if (usingCustom) {
      void window.deepdex.updateSettings({ customDurationMin: effectiveDuration })
    }
    void window.deepdex.startSession(effectiveDuration, topicId)
  }

  const appsList = data.settings.blocklistApps
  const domainCount = data.settings.blocklistDomains.length

  return (
    <div className="home">
      {lingering && (
        <div className="banner" role="alert">
          <span>Las webs siguen bloqueadas aunque no hay ninguna sesión: se canceló la contraseña al terminar.</span>
          <button className="btn btn-secondary" onClick={releaseHosts} disabled={releasing}>
            {releasing ? 'Esperando contraseña…' : 'Desbloquear webs'}
          </button>
        </div>
      )}

      <header className="card trainer-card">
        <h2 className="card-title">Entrenador</h2>
        {companion && (
          <div className="companion" title={nameOf(companion)}>
            <Sprite id={companion} shiny={data.caught[companion].shiny} size={96} alt={nameOf(companion)} />
          </div>
        )}
        <div className="trainer-info">
          <div className="trainer-level">
            <span className="pixel">NV.{level}</span>
            <span className="muted">
              {data.xp} / {nextXp} XP
            </span>
          </div>
          <div className="meter" aria-label={`Experiencia: ${data.xp} de ${nextXp}`}>
            <span className="meter-fill" style={{ width: `${Math.round(xpProgress * 100)}%` }} />
          </div>
          <div className="trainer-stats">
            <span>
              <strong>{formatMinutes(data.totalFocusMin)}</strong> en total
            </span>
            <span>
              <strong>{formatMinutes(todayMin)}</strong> hoy
            </span>
            <span>
              <strong>{streak}</strong> {streak === 1 ? 'día' : 'días'} de racha
              {data.streak.shields > 0 && ` · ${data.streak.shields} escudo${data.streak.shields > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </header>

      <section className="card session-card">
        <h2 className="card-title">Nueva sesión</h2>
        <div className="egg-row">
          <div className="egg-stage">
            <Egg tier={tier} scale={3} />
          </div>
          <div className="egg-text">
            <div className="egg-label">{TIER_INFO[tier].label}</div>
            <div className="egg-hint">{TIER_INFO[tier].hint}</div>
            {tier === 'superrare' && (
              <div className="egg-hint">
                {untilLegendary === 1
                  ? 'Este huevo trae un legendario seguro'
                  : `Legendario seguro en ${untilLegendary} huevos superraros como mucho`}
              </div>
            )}
          </div>
        </div>

        <div className="field">
          <div className="field-label">Duración</div>
          <div className="segmented" role="group" aria-label="Duración">
            {PRESETS.map((min) => (
              <button
                key={min}
                className={!usingCustom && duration === min ? 'segment active' : 'segment'}
                aria-pressed={!usingCustom && duration === min}
                onClick={() => {
                  setUsingCustom(false)
                  setDuration(min)
                }}
              >
                {min} min
              </button>
            ))}
            <button
              className={usingCustom ? 'segment active' : 'segment'}
              aria-pressed={usingCustom}
              onClick={() => setUsingCustom(true)}
            >
              Otra
            </button>
          </div>
          {usingCustom && (
            <label className="inline-input">
              <input
                className="input"
                type="number"
                min={10}
                max={240}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <span className="muted">minutos (10 a 240)</span>
            </label>
          )}
        </div>

        <div className="field">
          <div className="field-label">Tema</div>
          <div className="chips">
            <button
              className={topicId === null ? 'chip active' : 'chip'}
              aria-pressed={topicId === null}
              onClick={() => setTopicId(null)}
            >
              Sin tema
            </button>
            {topics.map((topic) => (
              <button
                key={topic.id}
                className={topicId === topic.id ? 'chip active' : 'chip'}
                aria-pressed={topicId === topic.id}
                onClick={() => setTopicId(topic.id)}
              >
                <span className={`type-dot type-${topic.type.toLowerCase()}`} aria-hidden="true" />
                {topic.name}
              </button>
            ))}
            <button className="chip chip-add" onClick={() => setCreatingTopic(!creatingTopic)}>
              {creatingTopic ? 'Cancelar' : '+ Nuevo'}
            </button>
          </div>
          {creatingTopic && (
            <form className="new-topic-form" onSubmit={createTopic}>
              <input
                className="input"
                type="text"
                placeholder="Nombre del tema"
                aria-label="Nombre del tema"
                value={newTopicName}
                maxLength={60}
                autoFocus
                onChange={(e) => setNewTopicName(e.target.value)}
              />
              <select
                className="input"
                aria-label="Tipo afín"
                value={newTopicType}
                onChange={(e) => setNewTopicType(e.target.value as PokeType)}
              >
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS_ES[t]}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary" type="submit" disabled={!newTopicName.trim()}>
                Crear
              </button>
            </form>
          )}
          <div className="field-hint">
            {selectedTopic
              ? `Afinidad ${TYPE_LABELS_ES[selectedTopic.type]}: el 60% de las eclosiones de este tema serán de ese tipo.`
              : creatingTopic
                ? 'El tipo afín decide qué Pokémon tienden a salir cuando estudias este tema.'
                : 'Asigna un tema para contar tus horas en él.'}
          </div>
        </div>
      </section>

      <button className="btn btn-primary btn-start" onClick={start}>
        <span>Empezar sesión</span>
        <span className="btn-meta">{effectiveDuration} min ▸</span>
      </button>
      <div className="start-note">
        {appsList.length > 0 ? `Se cerrarán ${appsList.join(', ')}` : 'No hay apps en la lista negra'}
        {domainCount > 0 && ` · ${domainCount} webs bloqueadas (pedirá tu contraseña)`}
      </div>
    </div>
  )
}
