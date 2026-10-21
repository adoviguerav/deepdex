import { BrowserWindow, dialog, ipcMain, Notification } from 'electron'
import { writeFileSync } from 'fs'
import { normalizeDomain } from '../shared/domains'
import { ALL_TYPES, TYPE_LABELS_ES, type PokeType } from '../shared/pokedex'
import type { CompletionResult, GameData, SessionState, Settings } from '../shared/types'
import { localDay, newId } from '../shared/types'
import type { HostsBlocker } from './hostsBlocker'
import type { SessionEngine } from './session'
import type { Store } from './store'

function formatMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function buildExport(data: GameData): string {
  const topicName = (id: string | null): string =>
    id === null
      ? 'Sin tema'
      : (data.topics.find((t) => t.id === id)?.name ?? 'Tema eliminado')

  const lines: string[] = [
    '# DeepDex — Registro de horas de foco',
    '',
    `Generado: ${new Date().toLocaleString('es-ES')}`,
    `Total acumulado: ${formatMin(data.totalFocusMin)} en ${data.sessionsCompleted} sesiones completadas.`,
    '',
    '## Totales por tema',
    '',
    '| Tema | Tipo | Tiempo | Sesiones |',
    '|---|---|---|---|'
  ]

  const completed = data.sessionLog.filter((e) => e.completed)
  const sessionCount = (id: string | null): number =>
    completed.filter((e) => e.topicId === id).length

  for (const topic of data.topics.filter((t) => !t.deleted).sort((a, b) => b.totalMin - a.totalMin)) {
    lines.push(
      `| ${topic.name} | ${TYPE_LABELS_ES[topic.type]} | ${formatMin(topic.totalMin)} | ${sessionCount(topic.id)} |`
    )
  }
  const noTopicMin = completed
    .filter((e) => e.topicId === null)
    .reduce((sum, e) => sum + e.durationMin, 0)
  if (noTopicMin > 0) {
    lines.push(`| Sin tema | — | ${formatMin(noTopicMin)} | ${sessionCount(null)} |`)
  }

  lines.push('', '## Historial de sesiones', '')
  for (const entry of [...data.sessionLog].reverse()) {
    const date = new Date(entry.startedAt)
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    lines.push(
      `- ${localDay(date)} ${time} · ${formatMin(entry.durationMin)} · ${topicName(entry.topicId)} · ${entry.completed ? 'completada' : 'abortada'}`
    )
  }
  return lines.join('\n') + '\n'
}

export interface IpcContext {
  store: Store
  engine: SessionEngine
  hostsBlocker: HostsBlocker
  getWindow: () => BrowserWindow | null
  showWindow: () => BrowserWindow
  /** Asks for the admin password again to block websites in the running session. */
  retryWeb: () => Promise<void>
}

export function registerIpc({ store, engine, hostsBlocker, getWindow, showWindow, retryWeb }: IpcContext): void {
  // Kept until the window confirms it showed the hatch, so closing the window
  // during a session never loses the result.
  let pendingResult: CompletionResult | null = null

  ipcMain.handle('result:pending', () => pendingResult)
  ipcMain.handle('result:ack', () => {
    pendingResult = null
  })
  ipcMain.handle('hosts:status', () => ({ lingering: !engine.isRunning && hostsBlocker.hasBlock() }))
  ipcMain.handle('hosts:release', async () => {
    if (engine.isRunning) return { lingering: false }
    await hostsBlocker.release()
    return { lingering: hostsBlocker.hasBlock() }
  })
  ipcMain.handle('hosts:retry', async () => {
    if (engine.isRunning && engine.getState().webBlock === 'off') await retryWeb()
    return engine.getState()
  })

  ipcMain.handle('session:start', (_event, durationMin: number, topicId: string | null) =>
    engine.start(durationMin, topicId ?? null)
  )
  ipcMain.handle('session:abort', () => engine.abort())
  ipcMain.handle('session:get', () => engine.getState())
  ipcMain.handle('data:get', () => store.data)
  ipcMain.handle('companion:set', (_event, pokemonId: number | null) => {
    store.data.companionId =
      pokemonId !== null && store.data.caught[pokemonId] ? pokemonId : null
    store.data.companionUpdatedAt = Date.now()
    store.save()
    return store.data
  })

  ipcMain.handle('topics:create', (_event, name: string, type: PokeType) => {
    const trimmed = String(name).trim().slice(0, 60)
    if (trimmed && ALL_TYPES.includes(type)) {
      const now = Date.now()
      store.data.topics.push({ id: newId(), name: trimmed, type, totalMin: 0, createdAt: now, updatedAt: now })
      store.save()
    }
    return store.data
  })

  ipcMain.handle('topics:delete', (_event, topicId: string) => {
    const topic = store.data.topics.find((t) => t.id === topicId)
    if (topic) {
      topic.deleted = true
      topic.updatedAt = Date.now()
      store.save()
    }
    return store.data
  })

  ipcMain.handle('topics:export', async () => {
    const window = getWindow()
    if (!window) return { saved: false }
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Exportar registro de horas',
      defaultPath: `deepdex-horas-${localDay(new Date())}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (canceled || !filePath) return { saved: false }
    writeFileSync(filePath, buildExport(store.data), 'utf-8')
    return { saved: true, path: filePath }
  })

  ipcMain.handle('settings:update', (_event, partial: Partial<Settings>) => {
    const settings = store.data.settings
    if (Array.isArray(partial.blocklistApps)) {
      settings.blocklistApps = partial.blocklistApps.map((s) => String(s).trim()).filter(Boolean)
    }
    if (Array.isArray(partial.blocklistDomains)) {
      const valid = partial.blocklistDomains.map((d) => normalizeDomain(String(d))).filter((d): d is string => d !== null)
      settings.blocklistDomains = [...new Set(valid)]
    }
    if (typeof partial.customDurationMin === 'number' && Number.isFinite(partial.customDurationMin)) {
      settings.customDurationMin = Math.max(10, Math.min(240, Math.round(partial.customDurationMin)))
    }
    store.data.settingsUpdatedAt = Date.now()
    store.save()
    return store.data
  })

  engine.on('update', (state: SessionState) => {
    getWindow()?.webContents.send('session:update', state)
  })
  engine.on('completed', (result: CompletionResult) => {
    pendingResult = result
    getWindow()?.webContents.send('session:completed', result)
    if (Notification.isSupported()) {
      const hatch = result.hatch
      const notification = new Notification({
        title: '¡Sesión completada!',
        body: hatch
          ? `Ha nacido ${hatch.name}${hatch.shiny ? ' ✨ shiny' : ''}. +${result.xpGained} XP`
          : `+${result.xpGained} XP`
      })
      notification.on('click', () => showWindow())
      notification.show()
    }
  })
}
