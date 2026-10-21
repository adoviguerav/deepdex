import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { hostname } from 'os'
import { mergeGameData } from '../shared/merge'
import { importSummary, parseSave, serializeSave, type ImportSummary } from '../shared/saveFile'
import { localDay } from '../shared/types'
import type { Store } from './store'

export type ImportResult = { imported: false; error?: string } | { imported: true; summary: ImportSummary }

/** Moves progress between computers as a file: export on one, import and merge on the other. */
export function registerTransferIpc(store: Store, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('progress:export', async () => {
    const window = getWindow()
    if (!window) return { saved: false }
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Exportar progreso',
      defaultPath: `deepdex-progreso-${localDay(new Date())}.json`,
      filters: [{ name: 'Progreso de DeepDex', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { saved: false }
    writeFileSync(filePath, serializeSave(store.data, hostname().replace(/\.local$/, '')), 'utf-8')
    return { saved: true, path: filePath }
  })

  ipcMain.handle('progress:import', async (): Promise<ImportResult> => {
    const window = getWindow()
    if (!window) return { imported: false }
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Importar progreso',
      properties: ['openFile'],
      filters: [{ name: 'Progreso de DeepDex', extensions: ['json'] }]
    })
    if (canceled || !filePaths[0]) return { imported: false }
    try {
      const incoming = parseSave(readFileSync(filePaths[0], 'utf-8'), store.data)
      const before = store.data
      const merged = mergeGameData(before, incoming)
      const summary = importSummary(before, merged)
      store.replaceData(merged)
      window.webContents.send('data:changed')
      return { imported: true, summary }
    } catch (err) {
      return { imported: false, error: err instanceof Error ? err.message : 'No se pudo leer el archivo.' }
    }
  })
}
