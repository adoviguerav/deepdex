import { useEffect, useRef, useState } from 'react'
import type { SessionState } from '../../../shared/types'
import Egg from '../components/Egg'

const EMERGENCY_PHRASE = 'necesito salir de verdad'
const EMERGENCY_WAIT_SEC = 30

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type EmergencyStep = 'closed' | 'phrase' | 'countdown'

export default function SessionScreen({
  session,
  onAborted
}: {
  session: SessionState
  onAborted: () => void
}): JSX.Element {
  const [step, setStep] = useState<EmergencyStep>('closed')
  const [phrase, setPhrase] = useState('')
  const [countdown, setCountdown] = useState(EMERGENCY_WAIT_SEC)
  const [retrying, setRetrying] = useState(false)
  const deadline = useRef(0)
  const onAbortedRef = useRef(onAborted)
  onAbortedRef.current = onAborted

  // Counts against a fixed deadline: the timer ticks re-render this screen
  // every second and must not restart the countdown.
  useEffect(() => {
    if (step !== 'countdown') return
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      setCountdown(left)
      if (left === 0) {
        clearInterval(id)
        void window.deepdex.abortSession().then(() => onAbortedRef.current())
      }
    }, 250)
    return () => clearInterval(id)
  }, [step])

  useEffect(() => window.deepdex.onOpenEmergency(() => setStep((s) => (s === 'closed' ? 'phrase' : s))), [])

  const startCountdown = (): void => {
    deadline.current = Date.now() + EMERGENCY_WAIT_SEC * 1000
    setCountdown(EMERGENCY_WAIT_SEC)
    setStep('countdown')
  }

  const closeEmergency = (): void => {
    setStep('closed')
    setPhrase('')
    setCountdown(EMERGENCY_WAIT_SEC)
  }

  const retryWeb = (): void => {
    setRetrying(true)
    void window.deepdex.retryWebBlock().finally(() => setRetrying(false))
  }

  const progress =
    session.durationMin > 0 ? 1 - session.remainingSec / (session.durationMin * 60) : 0

  return (
    <div className="app session-screen">
      <div className="session-main">
        <div className="session-top">
          <span className="session-kicker">
            <span className="lens on" aria-hidden="true" />
            Modo foco
          </span>
          {session.topicName && <span className="session-topic">{session.topicName}</span>}
        </div>
        <div className="timer pixel" aria-label={`Quedan ${formatTime(session.remainingSec)}`}>
          {formatTime(session.remainingSec)}
        </div>
        <div className="meter meter-dark" aria-hidden="true">
          <span className="meter-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        {session.eggTier && (
          <div className="session-egg">
            <div className="incubator">
              <Egg tier={session.eggTier} scale={4} motion="idle" />
            </div>
            <div className="session-hint">El huevo se incuba con tu foco</div>
          </div>
        )}
      </div>

      <div className="session-status">
        <div className="status-row">
          <span className="status-dot ok" aria-hidden="true" />
          {session.blockedAttempts > 0
            ? `${session.blockedAttempts} ${session.blockedAttempts === 1 ? 'intento bloqueado' : 'intentos bloqueados'}`
            : 'Apps bloqueadas, todo en calma'}
        </div>
        {session.webBlock === 'pending' && (
          <div className="status-row">
            <span className="status-dot wait" aria-hidden="true" />
            Escribe tu contraseña de macOS para bloquear las webs
          </div>
        )}
        {session.webBlock === 'on' && (
          <div className="status-row">
            <span className="status-dot ok" aria-hidden="true" />
            Webs bloqueadas
          </div>
        )}
        {session.webBlock === 'off' && (
          <div className="status-row">
            <span className="status-dot warn" aria-hidden="true" />
            Webs sin bloquear: cancelaste la contraseña
            <button className="link-btn" onClick={retryWeb} disabled={retrying}>
              {retrying ? 'Esperando…' : 'Reintentar'}
            </button>
          </div>
        )}
        {session.appBlockIssue && (
          <div className="status-row">
            <span className="status-dot warn" aria-hidden="true" />
            macOS no deja cerrar apps. Actívalo en Ajustes del Sistema → Privacidad y seguridad →
            Automatización.
          </div>
        )}
      </div>

      <button className="btn btn-ghost-danger" onClick={() => setStep('phrase')}>
        Salida de emergencia
      </button>

      {step !== 'closed' && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="emergency-title">
            {step === 'phrase' && (
              <>
                <h2 id="emergency-title" className="modal-title">
                  Salida de emergencia
                </h2>
                <p className="modal-text">
                  Si abortas, pierdes el huevo y la XP de esta sesión. Si de verdad es una emergencia,
                  escribe <strong>{EMERGENCY_PHRASE}</strong>:
                </p>
                <input
                  className="input"
                  type="text"
                  value={phrase}
                  autoFocus
                  aria-label="Frase de confirmación"
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={EMERGENCY_PHRASE}
                />
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={closeEmergency}>
                    Seguir en foco
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={phrase.trim().toLowerCase() !== EMERGENCY_PHRASE}
                    onClick={startCountdown}
                  >
                    Sí, abortar
                  </button>
                </div>
              </>
            )}
            {step === 'countdown' && (
              <>
                <h2 id="emergency-title" className="modal-title">
                  Última oportunidad
                </h2>
                <p className="modal-text">La sesión se abortará cuando llegue a cero. Aún puedes conservar tu huevo.</p>
                <div className="countdown-number pixel" aria-live="polite">
                  {countdown}
                </div>
                <button className="btn btn-primary" onClick={closeEmergency}>
                  Cancelar y seguir
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
