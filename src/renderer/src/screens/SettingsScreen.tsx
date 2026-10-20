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
      <section className="card">
        <h2 className="card-title">Apps bloqueadas</h2>
        <p className="settings-hint">
          Una por línea, con el nombre exacto de la app (p. ej. WhatsApp). Durante una sesión se cierran y, si siguen abiertas unos segundos después, se fuerzan a cerrar: guarda antes tu trabajo en ellas.
        </p>
        <textarea
          className="input blocklist-input"
          aria-label="Apps bloqueadas"
          rows={5}
          value={apps}
          onChange={(e) => setApps(e.target.value)}
        />
      </section>
      <section className="card">
        <h2 className="card-title">Webs bloqueadas</h2>
        <p className="settings-hint">
          Un dominio por línea (p. ej. twitter.com). Se bloquean en todos los navegadores, junto con sus variantes habituales (www., m., old.reddit.com…). macOS pedirá tu contraseña al empezar y al terminar cada sesión.
        </p>
        <textarea
          className="input blocklist-input"
          aria-label="Webs bloqueadas"
          rows={8}
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
        />
      </section>
      <button className="btn btn-primary btn-start" onClick={save}>
        {saved ? 'Guardado ✓' : 'Guardar cambios'}
      </button>
    </div>
  )
}
