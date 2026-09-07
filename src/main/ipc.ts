import { BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFileSync } from 'fs'
import { ALL_TYPES, TYPE_LABELS_ES, type PokeType } from '../shared/pokedex'
import type { CompletionResult, GameData, SessionState, Settings } from '../shared/types'
import { localDay } from '../shared/types'
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

  for (const topic of [...data.topics].sort((a, b) => b.totalMin - a.totalMin)) {
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

export function registerIpc(store: Store, engine: SessionEngine, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('session:start', (_event, durationMin: number, topicId: string | null) =>
    engine.start(durationMin, topicId ?? null)
  )
  ipcMain.handle('session:abort', () => engine.abort())
  ipcMain.handle('session:get', () => engine.getState())
  ipcMain.handle('data:get', () => store.data)
  ipcMain.handle('companion:set', (_event, pokemonId: number | null) => {
    store.data.companionId =
      pokemonId !== null && store.data.caught[pokemonId] ? pokemonId : null
    store.save()
    return store.data
  })

  ipcMain.handle('topics:create', (_event, name: string, type: PokeType) => {
    const trimmed = String(name).trim().slice(0, 60)
    if (trimmed && ALL_TYPES.includes(type)) {
      store.data.topics.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: trimmed,
        type,
        totalMin: 0,
        createdAt: Date.now()
      })
      store.save()
    }
    return store.data
  })

  ipcMain.handle('topics:delete', (_event, topicId: string) => {
    store.data.topics = store.data.topics.filter((t) => t.id !== topicId)
    store.save()
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
      settings.blocklistDomains = partial.blocklistDomains
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
    }
    if (typeof partial.customDurationMin === 'number' && Number.isFinite(partial.customDurationMin)) {
      settings.customDurationMin = Math.max(10, Math.min(240, Math.round(partial.customDurationMin)))
    }
    store.save()
    return store.data
  })

  engine.on('update', (state: SessionState) => {
    getWindow()?.webContents.send('session:update', state)
  })
  engine.on('completed', (result: CompletionResult) => {
    getWindow()?.webContents.send('session:completed', result)
  })
}
