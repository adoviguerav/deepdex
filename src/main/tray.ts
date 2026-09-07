import { Menu, nativeImage, Tray } from 'electron'
import type { SessionState } from '../shared/types'
import type { SessionEngine } from './session'

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Menu bar item showing the remaining session time. Uses a text-only tray
 * (empty icon + title), which macOS renders fine.
 */
export function createTray(engine: SessionEngine, showWindow: () => void, quit: () => void): Tray {
  const tray = new Tray(nativeImage.createEmpty())
  tray.setTitle('◓')

  const rebuildMenu = (state: SessionState): void => {
    const menu = Menu.buildFromTemplate([
      {
        label:
          state.phase === 'running'
            ? `En foco — quedan ${formatTime(state.remainingSec)}`
            : 'Sin sesión activa',
        enabled: false
      },
      { type: 'separator' },
      { label: 'Abrir DeepDex', click: showWindow },
      { type: 'separator' },
      { label: 'Salir', click: quit }
    ])
    tray.setContextMenu(menu)
  }

  rebuildMenu(engine.getState())
  engine.on('update', (state: SessionState) => {
    tray.setTitle(state.phase === 'running' ? `◓ ${formatTime(state.remainingSec)}` : '◓')
    rebuildMenu(state)
  })

  return tray
}
