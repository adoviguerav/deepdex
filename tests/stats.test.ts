import { describe, expect, it } from 'vitest'
import { computeStats, formatMinutes } from '../src/shared/stats'
import { emptyData } from './helpers'

describe('computeStats', () => {
  const now = new Date(2026, 9, 21, 20) // Wednesday 21 Oct 2026
  const at = (day: number, hour: number): number => new Date(2026, 9, day, hour).getTime()

  function sample(): ReturnType<typeof emptyData> {
    const d = emptyData()
    d.topics.push({ id: 'ml', name: 'ML', type: 'Psychic', totalMin: 140, createdAt: 0 })
    d.sessionLog.push(
      { startedAt: at(21, 9), durationMin: 50, topicId: 'ml', completed: true },
      { startedAt: at(21, 21), durationMin: 25, topicId: null, completed: true },
      { startedAt: at(19, 10), durationMin: 90, topicId: 'ml', completed: true }, // Monday
      { startedAt: at(18, 10), durationMin: 60, topicId: null, completed: true }, // Sunday, last week
      { startedAt: at(20, 10), durationMin: 10, topicId: 'ml', completed: false },
      { startedAt: at(1, 10), durationMin: 25, topicId: undefined as unknown as null, completed: true }
    )
    return d
  }

  it('sums today, this week (from Monday) and this month', () => {
    const s = computeStats(sample(), now)
    expect(s.todayMin).toBe(75)
    expect(s.weekMin).toBe(165)
    expect(s.monthMin).toBe(250)
  })

  it('builds 14 daily bars ending today, with per-topic minutes', () => {
    const s = computeStats(sample(), now)
    expect(s.last14).toHaveLength(14)
    expect(s.last14[13]).toMatchObject({ day: '2026-10-21', minutes: 75, byTopic: { ml: 50, none: 25 } })
  })

  it('lays the heatmap out as 12 Monday-first weeks with future days flagged', () => {
    const s = computeStats(sample(), now)
    expect(s.heatmap).toHaveLength(12)
    const thisWeek = s.heatmap[11]
    expect(thisWeek[0].day).toBe('2026-10-19')
    expect(thisWeek[2]).toMatchObject({ day: '2026-10-21', minutes: 75, future: false })
    expect(thisWeek[3].future).toBe(true)
  })

  it('computes completion rate, average session and topic week totals', () => {
    const s = computeStats(sample(), now)
    expect(s.completionRate).toBeCloseTo(5 / 6)
    expect(s.avgSessionMin).toBe(Math.round(250 / 5))
    expect(s.topics[0]).toMatchObject({ id: 'ml', weekMin: 140, totalMin: 140 })
    expect(s.noTopicWeekMin).toBe(25)
    expect(s.bestDay).toEqual({ day: '2026-10-19', minutes: 90 })
  })

  it('handles an empty log', () => {
    const s = computeStats(emptyData(), now)
    expect(s.todayMin).toBe(0)
    expect(s.completionRate).toBeNull()
    expect(s.bestDay).toBeNull()
  })

  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(135)).toBe('2h 15m')
  })
})
