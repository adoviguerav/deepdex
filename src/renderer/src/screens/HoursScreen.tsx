import { useMemo, useRef, useState } from 'react'
import { computeStats, formatMinutes, type DayTotal, type HeatCell } from '../../../shared/stats'
import type { GameData } from '../../../shared/types'
import { localDay } from '../../../shared/types'
import TypeChip from '../components/TypeChip'

const WEEKDAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const HEAT_STEPS = [
  { min: 1, color: '#cfcec8', label: '<30m' },
  { min: 30, color: '#9a9994', label: '30m' },
  { min: 90, color: '#56575b', label: '1h30' },
  { min: 180, color: '#111214', label: '3h+' }
]

function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

function heatColor(minutes: number): string | null {
  let color: string | null = null
  for (const step of HEAT_STEPS) if (minutes >= step.min) color = step.color
  return color
}

interface Tip {
  x: number
  y: number
  lines: string[]
}

function useTooltip(): {
  tip: Tip | null
  boxRef: React.RefObject<HTMLDivElement>
  show: (target: Element, lines: string[]) => void
  hide: () => void
} {
  const [tip, setTip] = useState<Tip | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const show = (target: Element, lines: string[]): void => {
    const box = boxRef.current?.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    if (!box) return
    setTip({ x: r.left + r.width / 2 - box.left, y: r.top - box.top, lines })
  }
  return { tip, boxRef, show, hide: () => setTip(null) }
}

function TooltipBox({ tip }: { tip: Tip | null }): JSX.Element | null {
  if (!tip) return null
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.lines.map((line, i) => (
        <div key={i} className={i === 0 ? 'chart-tip-title' : undefined}>
          {line}
        </div>
      ))}
    </div>
  )
}

function DailyBars({ days, topicName }: { days: DayTotal[]; topicName: (id: string) => string }): JSX.Element {
  const { tip, boxRef, show, hide } = useTooltip()
  const W = 420
  const H = 150
  const left = 34
  const right = 8
  const top = 10
  const bottom = 26
  const plotW = W - left - right
  const plotH = H - top - bottom
  const maxMin = Math.max(60, ...days.map((d) => d.minutes))
  const yMax = Math.ceil(maxMin / 60) * 60
  const band = plotW / days.length
  const barW = Math.min(18, band - 6)
  const y = (min: number): number => top + plotH - (min / yMax) * plotH
  const ticks = [0, yMax / 2, yMax]
  const todayKey = localDay(new Date())

  return (
    <div className="chart-box" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Minutos de foco por día, últimos 14 días">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} className={t === 0 ? 'chart-axis' : 'chart-grid'} />
            <text x={left - 6} y={y(t) + 3} textAnchor="end" className="chart-label">
              {t === 0 ? '0' : formatMinutes(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const [yy, mm, dd] = d.day.split('-').map(Number)
          const weekday = new Date(yy, mm - 1, dd).getDay()
          const x = left + i * band + (band - barW) / 2
          const h = (d.minutes / yMax) * plotH
          const r = Math.min(4, h)
          const base = top + plotH
          const isToday = d.day === todayKey
          const lines = [
            dayLabel(d.day),
            d.minutes ? `${formatMinutes(d.minutes)} de foco` : 'Sin sesiones',
            ...Object.entries(d.byTopic)
              .sort((a, b) => b[1] - a[1])
              .map(([id, min]) => `${topicName(id)}: ${formatMinutes(min)}`)
          ]
          return (
            <g key={d.day}>
              {h > 0 && (
                <path
                  d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z`}
                  className={isToday ? 'chart-bar today' : 'chart-bar'}
                />
              )}
              <rect
                x={left + i * band}
                y={top}
                width={band}
                height={plotH}
                className="chart-hit"
                tabIndex={0}
                aria-label={lines.join(', ')}
                onMouseEnter={(e) => show(e.currentTarget, lines)}
                onFocus={(e) => show(e.currentTarget, lines)}
                onMouseLeave={hide}
                onBlur={hide}
              />
              <text x={x + barW / 2} y={H - 10} textAnchor="middle" className={isToday ? 'chart-label strong' : 'chart-label'}>
                {WEEKDAY_INITIALS[weekday]}
              </text>
            </g>
          )
        })}
      </svg>
      <TooltipBox tip={tip} />
    </div>
  )
}

function Heatmap({ weeks }: { weeks: HeatCell[][] }): JSX.Element {
  const { tip, boxRef, show, hide } = useTooltip()
  const cell = 16
  const gap = 3
  const left = 16
  const W = left + weeks.length * (cell + gap)
  const H = 7 * (cell + gap)
  return (
    <div className="chart-box" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg heatmap" role="img" aria-label="Calendario de foco, últimas 12 semanas">
        {['L', 'X', 'V'].map((label, i) => (
          <text key={label} x={0} y={(i * 2) * (cell + gap) + cell - 4} className="chart-label">
            {label}
          </text>
        ))}
        {weeks.map((column, w) =>
          column.map((c, d) => {
            if (c.future) return null
            const color = heatColor(c.minutes)
            const lines = [dayLabel(c.day), c.minutes ? `${formatMinutes(c.minutes)} de foco` : 'Sin sesiones']
            return (
              <rect
                key={c.day}
                x={left + w * (cell + gap)}
                y={d * (cell + gap)}
                width={cell}
                height={cell}
                rx={3}
                className={color ? 'heat-cell' : 'heat-cell empty'}
                style={color ? { fill: color } : undefined}
                tabIndex={0}
                aria-label={lines.join(', ')}
                onMouseEnter={(e) => show(e.currentTarget, lines)}
                onFocus={(e) => show(e.currentTarget, lines)}
                onMouseLeave={hide}
                onBlur={hide}
              />
            )
          })
        )}
      </svg>
      <div className="heat-legend">
        <span>Menos</span>
        <span className="heat-swatch empty" />
        {HEAT_STEPS.map((s) => (
          <span key={s.label} className="heat-swatch" style={{ background: s.color }} title={s.label} />
        ))}
        <span>Más</span>
        <span className="heat-legend-note">(&lt;30m · 30m · 1h30 · 3h+)</span>
      </div>
      <TooltipBox tip={tip} />
    </div>
  )
}

export default function HoursScreen({
  data,
  onDataChanged
}: {
  data: GameData
  onDataChanged: (data: GameData) => void
}): JSX.Element {
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const stats = useMemo(() => computeStats(data), [data])

  const topicName = (id: string | null): string =>
    id === null || id === 'none'
      ? 'Sin tema'
      : (data.topics.find((t) => t.id === id)?.name ?? 'Tema eliminado')

  const recentLog = [...data.sessionLog].reverse().slice(0, 15)
  const maxTopicWeek = Math.max(1, stats.noTopicWeekMin, ...stats.topics.map((t) => t.weekMin))
  const maxPart = Math.max(1, ...stats.dayParts.map((p) => p.minutes))
  const bestPart = stats.dayParts.reduce((a, b) => (b.minutes > a.minutes ? b : a))

  const doExport = (): void => {
    window.deepdex
      .exportTopics()
      .then((res) => setExportMsg(res.saved ? `✓ Guardado en ${res.path}` : 'Exportación cancelada'))
      .catch(() => setExportMsg('✗ No se pudo guardar el fichero'))
  }

  const doDelete = (id: string): void => {
    void window.deepdex.deleteTopic(id).then((updated) => {
      onDataChanged(updated)
      setConfirmDelete(null)
    })
  }

  return (
    <div className="hours">
      {stats.sessionsLogged === 0 ? (
        <div className="card hours-empty">
          Aún no hay sesiones. Completa la primera y aquí verás tus horas por día, por semana y por tema.
        </div>
      ) : (
        <>
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="stat-tile-label">Hoy</div>
              <div className="stat-tile-value pixel">{formatMinutes(stats.todayMin)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-label">Esta semana</div>
              <div className="stat-tile-value pixel">{formatMinutes(stats.weekMin)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-label">Este mes</div>
              <div className="stat-tile-value pixel">{formatMinutes(stats.monthMin)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-label">Media diaria (30 días)</div>
              <div className="stat-tile-value pixel">{formatMinutes(stats.avgDaily30)}</div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Últimos 14 días</h2>
            <DailyBars days={stats.last14} topicName={topicName} />
            {stats.bestDay && (
              <div className="chart-note">
                Tu mejor día: {dayLabel(stats.bestDay.day)} con {formatMinutes(stats.bestDay.minutes)}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">Calendario de foco</h2>
            <Heatmap weeks={stats.heatmap} />
          </div>

          <div className="card">
            <h2 className="card-title">Hábitos</h2>
            <div className="habit-row">
              <div>
                <div className="stat-tile-label">Completadas</div>
                <div className="habit-value pixel">
                  {stats.completionRate === null ? '—' : `${Math.round(stats.completionRate * 100)}%`}
                </div>
              </div>
              <div>
                <div className="stat-tile-label">Sesión media</div>
                <div className="habit-value pixel">
                  {stats.avgSessionMin === null ? '—' : formatMinutes(stats.avgSessionMin)}
                </div>
              </div>
            </div>
            <div className="day-parts">
              {stats.dayParts.map((p) => (
                <div key={p.label} className="hbar-row">
                  <span className="hbar-label">{p.label}</span>
                  <span className="hbar-track">
                    <span className="hbar-fill" style={{ width: `${(p.minutes / maxPart) * 100}%` }} />
                  </span>
                  <span className="hbar-value">{formatMinutes(p.minutes)}</span>
                </div>
              ))}
            </div>
            {bestPart.minutes > 0 && (
              <div className="chart-note">Te concentras más por la {bestPart.label.toLowerCase()}.</div>
            )}
          </div>
        </>
      )}

      <div className="card">
        <h2 className="card-title">Por tema · esta semana</h2>
        {stats.topics.length === 0 && stats.noTopicWeekMin === 0 && (
          <div className="egg-hint">
            Crea un tema en Inicio al empezar una sesión y sus horas aparecerán aquí.
          </div>
        )}
        {stats.topics.map((t) => {
          const topic = data.topics.find((x) => x.id === t.id)!
          return (
            <div key={t.id} className="topic-stat">
              <div className="topic-item-head">
                <span className="topic-item-name">{t.name}</span>
                <TypeChip type={topic.type} />
                {confirmDelete === t.id ? (
                  <button className="topic-delete confirm" onClick={() => doDelete(t.id)}>
                    ¿Borrar {formatMinutes(t.totalMin)}?
                  </button>
                ) : (
                  <button className="topic-delete" aria-label={`Borrar tema ${t.name}`} onClick={() => setConfirmDelete(t.id)}>
                    ✕
                  </button>
                )}
              </div>
              <div className="hbar-row">
                <span className="hbar-track">
                  <span className="hbar-fill" style={{ width: `${(t.weekMin / maxTopicWeek) * 100}%` }} />
                </span>
                <span className="hbar-value">{formatMinutes(t.weekMin)}</span>
              </div>
              <div className="topic-total">Total acumulado: {formatMinutes(t.totalMin)}</div>
            </div>
          )
        })}
        {stats.noTopicWeekMin > 0 && (
          <div className="topic-stat">
            <div className="topic-item-head">
              <span className="topic-item-name">Sin tema</span>
            </div>
            <div className="hbar-row">
              <span className="hbar-track">
                <span className="hbar-fill muted" style={{ width: `${(stats.noTopicWeekMin / maxTopicWeek) * 100}%` }} />
              </span>
              <span className="hbar-value">{formatMinutes(stats.noTopicWeekMin)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Últimas sesiones</h2>
        {recentLog.length === 0 && <div className="egg-hint">Todavía no hay sesiones.</div>}
        {recentLog.map((entry) => (
          <div key={`${entry.startedAt}-${entry.durationMin}`} className="log-row">
            <span>{localDay(new Date(entry.startedAt))}</span>
            <span>{formatMinutes(entry.durationMin)}</span>
            <span className="log-topic">{topicName(entry.topicId ?? null)}</span>
            <span aria-label={entry.completed ? 'completada' : 'abortada'}>{entry.completed ? '✓' : '✗'}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-secondary btn-start" onClick={doExport}>
        Exportar a Markdown
      </button>
      {exportMsg && <div className="export-msg">{exportMsg}</div>}
    </div>
  )
}
