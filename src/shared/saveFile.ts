import type { GameData, SessionLogEntry } from './types'

/** Progress carried from one computer to another as a plain JSON file. */
export const SAVE_FORMAT = 'deepdex-save'

export interface SaveFile {
  format: typeof SAVE_FORMAT
  version: 1
  exportedAt: number
  device: string
  data: GameData
}

export function serializeSave(data: GameData, device: string, now = Date.now()): string {
  const file: SaveFile = { format: SAVE_FORMAT, version: 1, exportedAt: now, device, data }
  return JSON.stringify(file, null, 2)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function validEntry(e: unknown): e is SessionLogEntry {
  return (
    isRecord(e) &&
    typeof e.startedAt === 'number' &&
    typeof e.durationMin === 'number' &&
    e.durationMin >= 0 &&
    typeof e.completed === 'boolean'
  )
}

/**
 * Reads an exported save, or the app's own data file copied by hand, and
 * fills whatever is missing so it can be merged. Settings without an edit
 * time never win over the local ones. Throws with a message for the user.
 */
export function parseSave(text: string, local: GameData): GameData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un progreso de DeepDex.')
  }
  const data = isRecord(raw)
    ? raw.format === SAVE_FORMAT || isRecord(raw.data)
      ? raw.data
      : raw
    : null
  if (!isRecord(data) || !Array.isArray(data.sessionLog)) {
    throw new Error('El archivo no es un progreso de DeepDex.')
  }

  const d = data as Partial<GameData>
  return {
    ...local,
    xp: 0,
    totalFocusMin: 0,
    sessionsCompleted: 0,
    sessionsAborted: 0,
    streak: { current: 0, best: 0, lastDay: null, shields: 0 },
    caught: isRecord(d.caught) ? d.caught : {},
    badges: Array.isArray(d.badges) ? d.badges.filter((b) => typeof b === 'string') : [],
    topics: Array.isArray(d.topics) ? d.topics.filter((t) => isRecord(t) && typeof t.id === 'string') : [],
    sessionLog: d.sessionLog!.filter(validEntry).map((e) => ({ ...e, topicId: e.topicId ?? null })),
    settings: d.settingsUpdatedAt && isRecord(d.settings) ? { ...local.settings, ...d.settings } : local.settings,
    settingsUpdatedAt: d.settingsUpdatedAt && isRecord(d.settings) ? d.settingsUpdatedAt : undefined,
    companionId: typeof d.companionId === 'number' ? d.companionId : null,
    companionUpdatedAt: typeof d.companionUpdatedAt === 'number' ? d.companionUpdatedAt : undefined
  }
}

export interface ImportSummary {
  newSessions: number
  newSpecies: number
  addedMin: number
}

export function importSummary(before: GameData, after: GameData): ImportSummary {
  return {
    newSessions: after.sessionLog.length - before.sessionLog.length,
    newSpecies: Object.keys(after.caught).length - Object.keys(before.caught).length,
    addedMin: after.totalFocusMin - before.totalFocusMin
  }
}
