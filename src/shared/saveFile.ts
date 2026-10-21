import { BADGES, ALL_TYPES, TOTAL_SPECIES } from './pokedex'
import { cleanSettings } from './settings'
import type { CaughtRecord, GameData, SessionLogEntry, Topic } from './types'

/** Progress carried from one computer to another as a plain JSON file. */
export const SAVE_FORMAT = 'deepdex-save'
const SAVE_VERSION = 1

export interface SaveFile {
  format: typeof SAVE_FORMAT
  version: typeof SAVE_VERSION
  exportedAt: number
  device: string
  data: GameData
}

export function serializeSave(data: GameData, device: string, now = Date.now()): string {
  const file: SaveFile = { format: SAVE_FORMAT, version: SAVE_VERSION, exportedAt: now, device, data }
  return JSON.stringify(file, null, 2)
}

const DAY_MS = 24 * 60 * 60 * 1000
const FIRST_SESSION = Date.UTC(2020, 0, 1)
const BADGE_IDS = new Set(BADGES.map((b) => b.id))

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isSpecies(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= TOTAL_SPECIES
}

/**
 * Anything merged in stays for good (merging only ever adds) and travels to
 * the other computer on the next export, so every field is checked here.
 */
class Sanitizer {
  constructor(private readonly now: number) {}

  /** An edit time: never in the future, so a bad clock can't make a value win forever. */
  stamp(v: unknown): number | undefined {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= this.now + DAY_MS ? v : undefined
  }

  /** A session time: after the app existed and not in the future. */
  sessionTime(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v >= FIRST_SESSION && v <= this.now + DAY_MS
  }

  entry(e: unknown): SessionLogEntry | null {
    if (!isRecord(e) || typeof e.completed !== 'boolean' || !this.sessionTime(e.startedAt)) return null
    const duration = e.durationMin
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0 || duration > 240) return null
    if (e.id !== undefined && (typeof e.id !== 'string' || e.id === '')) return null
    if (e.endedAt !== undefined && (!this.sessionTime(e.endedAt) || e.endedAt < e.startedAt)) return null
    const hatch =
      e.completed && isRecord(e.hatch) && isSpecies(e.hatch.pokemonId) && typeof e.hatch.shiny === 'boolean'
        ? { pokemonId: e.hatch.pokemonId, shiny: e.hatch.shiny }
        : null
    const out: SessionLogEntry = {
      startedAt: e.startedAt,
      durationMin: duration,
      topicId: typeof e.topicId === 'string' ? e.topicId : null,
      completed: e.completed,
      hatch
    }
    if (typeof e.id === 'string') out.id = e.id
    if (typeof e.endedAt === 'number') out.endedAt = e.endedAt
    return out
  }

  caught(v: unknown): Record<number, CaughtRecord> {
    const out: Record<number, CaughtRecord> = {}
    if (!isRecord(v)) return out
    for (const [key, rec] of Object.entries(v)) {
      const id = Number(key)
      if (!isSpecies(id) || !isRecord(rec)) continue
      const firstCaughtAt = this.stamp(rec.firstCaughtAt)
      if (!Number.isInteger(rec.count) || (rec.count as number) < 1 || typeof rec.shiny !== 'boolean') continue
      if (firstCaughtAt === undefined) continue
      out[id] = { count: rec.count as number, shiny: rec.shiny, firstCaughtAt }
    }
    return out
  }

  topic(t: unknown): Topic | null {
    if (!isRecord(t) || typeof t.id !== 'string' || t.id === '') return null
    if (typeof t.name !== 'string' || t.name.trim() === '') return null
    if (!ALL_TYPES.includes(t.type as Topic['type'])) return null
    const createdAt = this.stamp(t.createdAt)
    if (createdAt === undefined) return null
    const out: Topic = { id: t.id, name: t.name.trim(), type: t.type as Topic['type'], totalMin: 0, createdAt }
    const updatedAt = this.stamp(t.updatedAt)
    if (updatedAt !== undefined) out.updatedAt = updatedAt
    if (t.deleted === true) out.deleted = true
    return out
  }
}

/**
 * Reads an exported save, or the app's own data file copied by hand, keeping
 * only well-formed values so it can be merged safely. Settings without a
 * valid edit time never win over the local ones. Throws with a message for
 * the user.
 */
export function parseSave(text: string, local: GameData, now = Date.now()): GameData {
  const notASave = new Error('El archivo no es un progreso de DeepDex.')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw notASave
  }
  if (!isRecord(raw)) throw notASave
  if (raw.format === SAVE_FORMAT && typeof raw.version === 'number' && raw.version > SAVE_VERSION) {
    throw new Error('El archivo viene de una versión más nueva de DeepDex. Actualiza la app en este Mac e inténtalo otra vez.')
  }
  const data = raw.format === SAVE_FORMAT || isRecord(raw.data) ? raw.data : raw
  if (!isRecord(data) || !Array.isArray(data.sessionLog)) throw notASave

  const clean = new Sanitizer(now)
  const settingsUpdatedAt = isRecord(data.settings) ? clean.stamp(data.settingsUpdatedAt) : undefined
  const companionUpdatedAt = clean.stamp(data.companionUpdatedAt)
  return {
    ...local,
    xp: 0,
    totalFocusMin: 0,
    sessionsCompleted: 0,
    sessionsAborted: 0,
    streak: { current: 0, best: 0, lastDay: null, shields: 0 },
    caught: clean.caught(data.caught),
    badges: Array.isArray(data.badges) ? data.badges.filter((b): b is string => typeof b === 'string' && BADGE_IDS.has(b)) : [],
    topics: Array.isArray(data.topics) ? data.topics.map((t) => clean.topic(t)).filter((t): t is Topic => t !== null) : [],
    sessionLog: data.sessionLog.map((e) => clean.entry(e)).filter((e): e is SessionLogEntry => e !== null),
    settings: settingsUpdatedAt !== undefined ? cleanSettings(data.settings, local.settings) : local.settings,
    settingsUpdatedAt,
    companionId: companionUpdatedAt !== undefined && isSpecies(data.companionId) ? data.companionId : null,
    companionUpdatedAt: isSpecies(data.companionId) || data.companionId === null ? companionUpdatedAt : undefined
  }
}

export interface ImportSummary {
  newSessions: number
  newAborted: number
  newSpecies: number
  addedMin: number
  /** Blocklists, topics or companion taken from the file. */
  otherChanges: boolean
}

export function importSummary(before: GameData, after: GameData): ImportSummary {
  const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
  const topicKey = (d: GameData): unknown =>
    [...d.topics].sort((a, b) => a.id.localeCompare(b.id)).map((t) => [t.id, t.name, t.type, !!t.deleted])
  return {
    newSessions: after.sessionsCompleted - before.sessionsCompleted,
    newAborted: after.sessionsAborted - before.sessionsAborted,
    newSpecies: Object.keys(after.caught).length - Object.keys(before.caught).length,
    addedMin: after.totalFocusMin - before.totalFocusMin,
    otherChanges:
      !sameJson(before.settings, after.settings) ||
      !sameJson(topicKey(before), topicKey(after)) ||
      before.companionId !== after.companionId
  }
}
