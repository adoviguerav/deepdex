import { useState } from 'react'
import type { GameData } from '../../../shared/types'
import { localDay } from '../../../shared/types'
import TypeChip from '../components/TypeChip'

function formatMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function TopicsScreen({
  data,
  onDataChanged
}: {
  data: GameData
  onDataChanged: (data: GameData) => void
}): JSX.Element {
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const topics = [...data.topics].sort((a, b) => b.totalMin - a.totalMin)
  const maxMin = Math.max(1, ...topics.map((t) => t.totalMin))
  const recentLog = [...data.sessionLog].reverse().slice(0, 15)

  const topicName = (id: string | null): string =>
    id === null ? 'Sin tema' : (data.topics.find((t) => t.id === id)?.name ?? 'Tema eliminado')

  const doExport = (): void => {
    void window.deepdex.exportTopics().then((res) => {
      setExportMsg(res.saved ? `✓ Guardado en ${res.path}` : 'Exportación cancelada')
      setTimeout(() => setExportMsg(null), 4000)
    })
  }

  const doDelete = (id: string): void => {
    void window.deepdex.deleteTopic(id).then((updated) => {
      onDataChanged(updated)
      setConfirmDelete(null)
    })
  }

  return (
    <div className="topics">
      <div className="panel">
        <div className="panel-title">HORAS POR TEMA</div>
        {topics.length === 0 && (
          <div className="egg-hint">
            Aún no hay temas. Crea uno en Inicio al empezar una sesión y tus horas se irán
            acumulando aquí.
          </div>
        )}
        {topics.map((topic) => (
          <div key={topic.id} className="topic-item">
            <div className="topic-item-head">
              <span className="topic-item-name">{topic.name}</span>
              <TypeChip type={topic.type} />
              <span className="topic-item-time">{formatMin(topic.totalMin)}</span>
              {confirmDelete === topic.id ? (
                <button className="topic-delete confirm" onClick={() => doDelete(topic.id)}>
                  ¿SEGURO?
                </button>
              ) : (
                <button className="topic-delete" onClick={() => setConfirmDelete(topic.id)}>
                  ✕
                </button>
              )}
            </div>
            <div className="progress-track xp-track topic-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.round((topic.totalMin / maxMin) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">ÚLTIMAS SESIONES</div>
        {recentLog.length === 0 && <div className="egg-hint">Todavía no hay sesiones.</div>}
        {recentLog.map((entry, i) => (
          <div key={i} className="log-row">
            <span>{localDay(new Date(entry.startedAt))}</span>
            <span>{formatMin(entry.durationMin)}</span>
            <span className="log-topic">{topicName(entry.topicId)}</span>
            <span>{entry.completed ? '✓' : '✗'}</span>
          </div>
        ))}
      </div>

      <button className="start-btn" onClick={doExport}>
        ⬇ EXPORTAR A MARKDOWN
      </button>
      {exportMsg && <div className="export-msg">{exportMsg}</div>}
    </div>
  )
}
