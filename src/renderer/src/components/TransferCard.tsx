import { useState } from 'react'
import type { ImportSummary } from '../../../shared/saveFile'

function formatMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function describe({ newSessions, newAborted, newSpecies, addedMin, otherChanges }: ImportSummary): string {
  const parts: string[] = []
  if (newSessions > 0) parts.push(plural(newSessions, 'sesión nueva', 'sesiones nuevas'))
  if (addedMin > 0) parts.push(`+${formatMin(addedMin)} de foco`)
  if (newSpecies > 0) parts.push(plural(newSpecies, 'Pokémon nuevo', 'Pokémon nuevos'))
  if (newAborted > 0) parts.push(plural(newAborted, 'sesión abortada', 'sesiones abortadas'))
  if (otherChanges) parts.push('ajustes o temas más recientes')
  return parts.length === 0
    ? 'Ya lo tenías todo: no había nada nuevo.'
    : `Progreso juntado: ${parts.join(', ')}.`
}

type Message = { text: string; error?: boolean; canUndo?: boolean }

/** Carries progress to another computer as a file and merges it there. */
export default function TransferCard(): JSX.Element {
  const [message, setMessage] = useState<Message | null>(null)
  const [busy, setBusy] = useState(false)

  const run = (action: () => Promise<Message | null>): void => {
    setBusy(true)
    void action()
      .then((m) => m && setMessage(m))
      .catch(() => setMessage({ text: 'Algo ha fallado. No se ha cambiado nada.', error: true }))
      .finally(() => setBusy(false))
  }

  const exportProgress = (): void =>
    run(async () => {
      const r = await window.deepdex.exportProgress()
      if (r.saved) return { text: 'Exportado. Lleva el archivo al otro Mac.' }
      return r.error ? { text: r.error, error: true } : null
    })

  const importProgress = (): void =>
    run(async () => {
      const r = await window.deepdex.importProgress()
      if (!r.imported) return r.error ? { text: r.error, error: true } : null
      const { newSessions, newAborted, newSpecies, addedMin, otherChanges } = r.summary
      const changed = newSessions + newAborted + newSpecies + addedMin !== 0 || otherChanges
      return { text: describe(r.summary), canUndo: changed }
    })

  const undoImport = (): void =>
    run(async () => {
      const r = await window.deepdex.undoImport()
      return r.undone
        ? { text: 'Importación deshecha: tienes tu progreso de antes.' }
        : { text: r.error ?? 'No se pudo deshacer.', error: true }
    })

  return (
    <section className="card">
      <h2 className="card-title">Mover progreso</h2>
      <p className="settings-hint">
        Exporta tu progreso a un archivo, pásalo al otro Mac (AirDrop, correo, USB) e impórtalo allí. Se juntan las
        sesiones de los dos ordenadores sin duplicar ninguna, así que puedes hacerlo en los dos sentidos tantas veces
        como quieras.
      </p>
      {message && (
        <div className={message.error ? 'transfer-message error' : 'transfer-message'} role="status">
          <span>{message.text}</span>
          {message.canUndo && (
            <button className="link-quiet" onClick={undoImport} disabled={busy}>
              Deshacer
            </button>
          )}
        </div>
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
