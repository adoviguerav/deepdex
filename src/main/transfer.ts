import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { hostname } from 'os'
import { mergeGameData } from '../shared/merge'
import { importSummary, parseSave, serializeSave, type ImportSummary } from '../shared/saveFile'
import type { GameData } from '../shared/types'
import { localDay } from '../shared/types'
import type { Store } from './store'

export type ExportResult = { saved: false; error?: string } | { saved: true; path: string }
export type ImportResult = { imported: false; error?: string } | { imported: true; summary: ImportSummary }
export type UndoResult = { undone: boolean; error?: string }

/** Moves progress between computers as a file: export on one, import and merge on the other. */
export function registerTransferIpc(store: Store, getWindow: () => BrowserWindow | null): void {
  // The progress from just before the last import, while nothing else has changed since.
  let lastImport: { before: GameData; afterJson: string } | null = null

  ipcMain.handle('progress:export', async (): Promise<ExportResult> => {
    const window = getWindow()
    if (!window) return { saved: false }
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Exportar progreso',
      defaultPath: `deepdex-progreso-${localDay(new Date())}.json`,
      filters: [{ name: 'Progreso de DeepDex', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { saved: false }
    try {
      writeFileSync(filePath, serializeSave(store.data, hostname().replace(/\.local$/, '')), 'utf-8')
      return { saved: true, path: filePath }
    } catch (err) {
      console.error('Export failed:', err)
      return { saved: false, error: 'No se pudo guardar el archivo. Prueba en otra carpeta.' }
    }
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
    let merged: GameData
    const before = store.data
    try {
      const incoming = parseSave(readFileSync(filePaths[0], 'utf-8'), before)
      merged = mergeGameData(before, incoming)
    } catch (err) {
      console.error('Import failed:', err)
      const known = err instanceof Error && err.message.includes('DeepDex')
      return { imported: false, error: known ? (err as Error).message : 'No se pudo leer el archivo.' }
    }
    try {
      store.snapshot('pre-import')
    } catch (err) {
      console.error('Pre-import snapshot failed:', err)
      return { imported: false, error: 'No se pudo guardar una copia de tu progreso antes de importar. No se ha cambiado nada.' }
    }
    store.replaceData(merged)
    lastImport = { before, afterJson: JSON.stringify(merged) }
    window.webContents.send('data:changed')
    return { imported: true, summary: importSummary(before, merged) }
  })

  ipcMain.handle('progress:undo-import', (): UndoResult => {
    if (!lastImport) return { undone: false, error: 'No hay ninguna importación que deshacer.' }
    if (JSON.stringify(store.data) !== lastImport.afterJson) {
      lastImport = null
      return { undone: false, error: 'Has hecho cambios después de importar, así que ya no se puede deshacer.' }
    }
    store.replaceData(lastImport.before)
    lastImport = null
    getWindow()?.webContents.send('data:changed')
    return { undone: true }
  })
}
