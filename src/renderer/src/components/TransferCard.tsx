import { useState } from 'react'
import type { ImportResult } from '../../../preload/index'

function formatMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function describe(result: ImportResult): string | null {
  if (!result.imported) return result.error ?? null
  const { newSessions, newSpecies, addedMin } = result.summary
  if (newSessions === 0 && newSpecies === 0) return 'Ya lo tenías todo: no había nada nuevo.'
  const parts = [`${newSessions} ${newSessions === 1 ? 'sesión nueva' : 'sesiones nuevas'}`]
  if (addedMin > 0) parts.push(`+${formatMin(addedMin)} de foco`)
  if (newSpecies > 0) parts.push(`${newSpecies} ${newSpecies === 1 ? 'Pokémon nuevo' : 'Pokémon nuevos'}`)
  return `Progreso juntado: ${parts.join(', ')}.`
}

/** Carries progress to another computer as a file and merges it there. */
export default function TransferCard(): JSX.Element {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const exportProgress = (): void => {
    setBusy(true)
    void window.deepdex
      .exportProgress()
      .then((r) => r.saved && setMessage({ text: 'Exportado. Lleva el archivo al otro Mac.', error: false }))
      .finally(() => setBusy(false))
  }

  const importProgress = (): void => {
    setBusy(true)
    void window.deepdex
      .importProgress()
      .then((r) => {
        const text = describe(r)
        if (text) setMessage({ text, error: !r.imported })
      })
      .finally(() => setBusy(false))
  }

  return (
    <section className="card">
      <h2 className="card-title">Mover progreso</h2>
      <p className="settings-hint">
        Exporta tu progreso a un archivo, pásalo al otro Mac (AirDrop, correo, USB) e impórtalo allí. Se juntan las
        sesiones de los dos ordenadores sin duplicar ninguna, así que puedes hacerlo en los dos sentidos tantas veces
        como quieras.
      </p>
      {message && (
        <p className={message.error ? 'transfer-message error' : 'transfer-message'} role="status">
          {message.text}
        </p>
      )}
      <div className="transfer-actions">
        <button className="btn btn-secondary" onClick={exportProgress} disabled={busy}>
          Exportar progreso
        </button>
        <button className="btn btn-primary" onClick={importProgress} disabled={busy}>
          Importar y juntar
        </button>
      </div>
    </section>
  )
}
