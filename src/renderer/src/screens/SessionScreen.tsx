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
      <div className="session-top">
        MODO FOCO{session.topicName ? ` · ${session.topicName.toUpperCase()}` : ''}
      </div>
      <div className="timer">{formatTime(session.remainingSec)}</div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {session.eggTier && (
        <div className="session-egg">
          <Egg tier={session.eggTier} wobble />
          <div className="egg-hint">El huevo se incuba con tu foco…</div>
        </div>
      )}
      <div className="block-status">
        <span>
          {session.blockedAttempts > 0
            ? `INTENTOS BLOQUEADOS: ${session.blockedAttempts}`
            : 'TODO EN CALMA'}
        </span>
        {session.webBlock === 'pending' && (
          <span className="web-block">Escribe tu contraseña de macOS para bloquear las webs…</span>
        )}
        {session.webBlock === 'on' && <span className="web-block on">🛡 WEBS BLOQUEADAS</span>}
        {session.webBlock === 'off' && (
          <>
            <span className="web-block">⚠ WEBS SIN BLOQUEAR (cancelaste la contraseña)</span>
            <button className="retry-btn" onClick={retryWeb} disabled={retrying}>
              {retrying ? 'ESPERANDO CONTRASEÑA…' : 'BLOQUEAR WEBS AHORA'}
            </button>
          </>
        )}
        {session.appBlockIssue && (
          <span className="web-block">
            ⚠ macOS no deja a DeepDex cerrar apps. Actívalo en Ajustes del Sistema → Privacidad y
            seguridad → Automatización.
          </span>
        )}
      </div>
      <button className="emergency-btn" onClick={() => setStep('phrase')}>
        ⚠ EMERGENCIA
      </button>

      {step !== 'closed' && (
        <div className="modal-backdrop">
          <div className="modal panel">
            {step === 'phrase' && (
              <>
                <div className="panel-title">SALIDA DE EMERGENCIA</div>
                <p className="modal-text">
                  Abortar pierde el huevo y toda la XP de esta sesión. Si de verdad es una
                  emergencia, escribe:
                </p>
                <p className="modal-phrase">«{EMERGENCY_PHRASE}»</p>
                <input
                  className="custom-duration"
                  type="text"
                  value={phrase}
                  autoFocus
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="escribe la frase"
                />
                <div className="modal-actions">
                  <button className="preset" onClick={closeEmergency}>
                    SEGUIR EN FOCO
                  </button>
                  <button
                    className="preset danger"
                    disabled={phrase.trim().toLowerCase() !== EMERGENCY_PHRASE}
                    onClick={startCountdown}
                  >
                    SÍ, ABORTAR
                  </button>
                </div>
              </>
            )}
            {step === 'countdown' && (
              <>
                <div className="panel-title">ÚLTIMA OPORTUNIDAD</div>
                <p className="modal-text">
                  La sesión se abortará en {countdown} segundos. Aún puedes arrepentirte y
                  conservar tu huevo.
                </p>
                <div className="countdown-number">{countdown}</div>
                <button className="preset" onClick={closeEmergency}>
                  ✋ CANCELAR Y SEGUIR
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
