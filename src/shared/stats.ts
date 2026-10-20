import type { GameData } from './types'
import { localDay } from './types'

export interface DayTotal {
  day: string
  /** Completed focus minutes that started on this local day. */
  minutes: number
  /** Minutes per topic id ('none' for sessions without a topic). */
  byTopic: Record<string, number>
}

export interface HeatCell {
  day: string
  minutes: number
  /** Days after today, drawn empty. */
  future: boolean
}

export interface TopicStat {
  id: string
  name: string
  weekMin: number
  totalMin: number
}

export interface DayPart {
  label: string
  minutes: number
}

export interface FocusStats {
  todayMin: number
  weekMin: number
  monthMin: number
  avgDaily30: number
  bestDay: { day: string; minutes: number } | null
  last14: DayTotal[]
  /** 12 columns (weeks, oldest first) of 7 cells (Monday to Sunday). */
  heatmap: HeatCell[][]
  heatMax: number
  topics: TopicStat[]
  noTopicWeekMin: number
  completionRate: number | null
  avgSessionMin: number | null
  dayParts: DayPart[]
  sessionsLogged: number
}

const DAY_PARTS = [
  { label: 'Madrugada', from: 0, to: 6 },
  { label: 'Mañana', from: 6, to: 14 },
  { label: 'Tarde', from: 14, to: 20 },
  { label: 'Noche', from: 20, to: 24 }
]

/** Monday of the week containing `date`, at local midnight. */
function mondayOf(date: Date): Date {
  const offset = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/**
 * Hour statistics from the session log. Only completed sessions count as
 * focus time; aborted ones only weigh on the completion rate.
 */
export function computeStats(data: GameData, now: Date = new Date()): FocusStats {
  const completed = data.sessionLog.filter((e) => e.completed)
  const perDay = new Map<string, DayTotal>()
  for (const entry of completed) {
    const day = localDay(new Date(entry.startedAt))
    const total = perDay.get(day) ?? { day, minutes: 0, byTopic: {} }
    const key = entry.topicId ?? 'none'
    total.minutes += entry.durationMin
    total.byTopic[key] = (total.byTopic[key] ?? 0) + entry.durationMin
    perDay.set(day, total)
  }
  const minutesOn = (day: string): number => perDay.get(day)?.minutes ?? 0

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayKey = localDay(today)
  const monday = mondayOf(today)
  const weekKeys: string[] = []
  for (let d = monday; d <= today; d = shiftDays(d, 1)) weekKeys.push(localDay(d))
  const weekSet = new Set(weekKeys)
  const monthPrefix = todayKey.slice(0, 7)

  let weekMin = 0
  let monthMin = 0
  for (const total of perDay.values()) {
    if (weekSet.has(total.day)) weekMin += total.minutes
    if (total.day.startsWith(monthPrefix) && total.day <= todayKey) monthMin += total.minutes
  }

  let last30 = 0
  for (let i = 0; i < 30; i++) last30 += minutesOn(localDay(shiftDays(today, -i)))

  let bestDay: FocusStats['bestDay'] = null
  for (const total of perDay.values()) {
    if (!bestDay || total.minutes > bestDay.minutes) bestDay = { day: total.day, minutes: total.minutes }
  }

  const last14: DayTotal[] = []
  for (let i = 13; i >= 0; i--) {
    const day = localDay(shiftDays(today, -i))
    last14.push(perDay.get(day) ?? { day, minutes: 0, byTopic: {} })
  }

  const heatmap: HeatCell[][] = []
  let heatMax = 0
  const firstMonday = shiftDays(monday, -7 * 11)
  for (let w = 0; w < 12; w++) {
    const column: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = shiftDays(firstMonday, w * 7 + d)
      const day = localDay(date)
      const minutes = minutesOn(day)
      heatMax = Math.max(heatMax, minutes)
      column.push({ day, minutes, future: date > today })
    }
    heatmap.push(column)
  }

  const weekByTopic = new Map<string, number>()
  for (const entry of completed) {
    if (!weekSet.has(localDay(new Date(entry.startedAt)))) continue
    const key = entry.topicId ?? 'none'
    weekByTopic.set(key, (weekByTopic.get(key) ?? 0) + entry.durationMin)
  }
  const topics = data.topics
    .map((t) => ({ id: t.id, name: t.name, weekMin: weekByTopic.get(t.id) ?? 0, totalMin: t.totalMin }))
    .sort((a, b) => b.weekMin - a.weekMin || b.totalMin - a.totalMin)

  const dayParts = DAY_PARTS.map((part) => ({
    label: part.label,
    minutes: completed
      .filter((e) => {
        const hour = new Date(e.startedAt).getHours()
        return hour >= part.from && hour < part.to
      })
      .reduce((sum, e) => sum + e.durationMin, 0)
  }))

  return {
    todayMin: minutesOn(todayKey),
    weekMin,
    monthMin,
    avgDaily30: Math.round(last30 / 30),
    bestDay,
    last14,
    heatmap,
    heatMax,
    topics,
    noTopicWeekMin: weekByTopic.get('none') ?? 0,
    completionRate: data.sessionLog.length ? completed.length / data.sessionLog.length : null,
    avgSessionMin: completed.length
      ? Math.round(completed.reduce((sum, e) => sum + e.durationMin, 0) / completed.length)
      : null,
    dayParts,
    sessionsLogged: data.sessionLog.length
  }
}

export function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
