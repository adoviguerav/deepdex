import { useState } from 'react'
import { ALL_TYPES, nameOf, TYPE_LABELS_ES, type PokeType } from '../../../shared/pokedex'
import type { GameData } from '../../../shared/types'
import { eggTierForDuration, levelForXp, localDay, xpForLevel } from '../../../shared/types'
import Egg from '../components/Egg'
import Sprite from '../components/Sprite'

const PRESETS = [25, 50, 90]

const TIER_LABEL: Record<string, string> = {
  common: 'HUEVO COMÚN',
  rare: 'HUEVO RARO',
  superrare: 'HUEVO SUPERRARO'
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

  const effectiveDuration = usingCustom
    ? Math.max(10, Math.min(240, parseInt(custom, 10) || data.settings.customDurationMin))
    : duration
  const tier = eggTierForDuration(effectiveDuration)
  const level = levelForXp(data.xp)
  const nextXp = xpForLevel(level + 1)
  const hours = Math.floor(data.totalFocusMin / 60)
  const minutes = data.totalFocusMin % 60

  const today = localDay(new Date())
  const todayMin = data.sessionLog
    .filter((e) => e.completed && localDay(new Date(e.startedAt)) === today)
    .reduce((sum, e) => sum + e.durationMin, 0)

  const selectedTopic = data.topics.find((t) => t.id === topicId) ?? null

  const createTopic = (): void => {
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
              <span>HOY {Math.floor(todayMin / 60)}h {todayMin % 60}m</span>
              <span>
                🔥 {data.streak.current}
                {data.streak.shields > 0 && ` 🛡×${data.streak.shields}`}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="panel">
        <div className="panel-title">¿A QUÉ LE DEDICAS ESTA SESIÓN?</div>
        <div className="topic-row">
          <button
            className={topicId === null ? 'preset active' : 'preset'}
            onClick={() => setTopicId(null)}
          >
            SIN TEMA
          </button>
          {data.topics.map((topic) => (
            <button
              key={topic.id}
              className={topicId === topic.id ? 'preset active' : 'preset'}
              onClick={() => setTopicId(topic.id)}
              title={`Tipo ${TYPE_LABELS_ES[topic.type]}`}
            >
              {topic.name.toUpperCase()}
            </button>
          ))}
          <button className="preset" onClick={() => setCreatingTopic(!creatingTopic)}>
            + NUEVO
          </button>
        </div>
        {creatingTopic && (
          <div className="new-topic-form">
            <input
              className="custom-duration topic-name-input"
              type="text"
              placeholder="nombre del tema"
              value={newTopicName}
              maxLength={60}
              onChange={(e) => setNewTopicName(e.target.value)}
            />
            <select
              className="type-select"
              value={newTopicType}
              onChange={(e) => setNewTopicType(e.target.value as PokeType)}
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS_ES[t]}
                </option>
              ))}
            </select>
            <button className="preset danger" onClick={createTopic} disabled={!newTopicName.trim()}>
              CREAR
            </button>
          </div>
        )}
        {selectedTopic && (
          <div className="egg-hint topic-hint">
            Afinidad {TYPE_LABELS_ES[selectedTopic.type]}: más Pokémon de ese tipo al eclosionar
          </div>
        )}
      </div>

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
