import { useState } from 'react'
import type { GameData } from '../../../shared/types'

export default function SettingsScreen({
  data,
  onDataChanged
}: {
  data: GameData
  onDataChanged: (data: GameData) => void
}): JSX.Element {
  const [apps, setApps] = useState(data.settings.blocklistApps.join('\n'))
  const [domains, setDomains] = useState(data.settings.blocklistDomains.join('\n'))
  const [saved, setSaved] = useState(false)

  const save = (): void => {
    void window.deepdex
      .updateSettings({
        blocklistApps: apps.split('\n').map((s) => s.trim()).filter(Boolean),
        blocklistDomains: domains.split('\n').map((s) => s.trim()).filter(Boolean)
      })
      .then((updated) => {
        onDataChanged(updated)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
  }

  return (
    <div className="settings">
      <div className="panel">
        <div className="panel-title">APPS BLOQUEADAS</div>
        <p className="settings-hint">
          Una por línea, con el nombre exacto de la app (p. ej. WhatsApp). Se cierran al
          instante durante una sesión.
        </p>
        <textarea
          className="blocklist-input"
          rows={5}
          value={apps}
          onChange={(e) => setApps(e.target.value)}
        />
      </div>
      <div className="panel">
        <div className="panel-title">WEBS BLOQUEADAS</div>
        <p className="settings-hint">
          Un dominio por línea (p. ej. twitter.com). Bloquea en todos los navegadores; macOS
          pedirá tu contraseña al iniciar y terminar la sesión.
        </p>
        <textarea
          className="blocklist-input"
          rows={8}
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
        />
      </div>
      <button className="start-btn" onClick={save}>
        {saved ? '✓ GUARDADO' : 'GUARDAR'}
      </button>
    </div>
  )
}
