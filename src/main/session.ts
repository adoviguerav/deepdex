import { EventEmitter } from 'events'
import type { CompletionResult, SessionState } from '../shared/types'
import { eggTierForDuration } from '../shared/types'
import { grantCompletion, recordAbort } from './game'
import type { Store } from './store'

export interface SessionHooks {
  /** Called when a session starts; engages the blockers. */
  engage: () => Promise<void>
  /** Called when a session ends (completed or aborted); releases the blockers. */
  release: () => Promise<void>
}

function idleState(): SessionState {
  return {
    phase: 'idle',
    durationMin: 0,
    startedAt: null,
    remainingSec: 0,
    blockedAttempts: 0,
    eggTier: null,
    webBlockActive: false
  }
}

/**
 * The session timer lives here, in the main process, so it keeps running if
 * the window reloads and can drive the tray title.
 *
 * Events: 'update' (SessionState), 'completed' (CompletionResult)
 */
export class SessionEngine extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null
  private state: SessionState = idleState()

  constructor(
    private store: Store,
    private hooks: SessionHooks
  ) {
    super()
  }

  getState(): SessionState {
    return { ...this.state }
  }

  get isRunning(): boolean {
    return this.state.phase === 'running'
  }

  /** Counts a session killed by a crash/force-quit (found on startup) as aborted. */
  recoverOrphanSession(): boolean {
    const orphan = this.store.activeSession
    if (!orphan) return false
    recordAbort(this.store.data)
    this.store.setActiveSession(null)
    return true
  }

  start(durationMin: number): SessionState {
    if (this.isRunning) return this.getState()
    const minutes = Math.max(1, Math.min(240, Math.round(durationMin)))
    this.state = {
      phase: 'running',
      durationMin: minutes,
      startedAt: Date.now(),
      remainingSec: minutes * 60,
      blockedAttempts: 0,
      eggTier: eggTierForDuration(minutes),
      webBlockActive: false
    }
    this.store.setActiveSession({ startedAt: this.state.startedAt!, durationMin: minutes })
    void this.hooks.engage()
    this.timer = setInterval(() => this.tick(), 1000)
    this.emitUpdate()
    return this.getState()
  }

  abort(): SessionState {
    if (!this.isRunning) return this.getState()
    this.stopTimer()
    recordAbort(this.store.data)
    this.store.setActiveSession(null)
    this.store.save()
    void this.hooks.release()
    this.state = idleState()
    this.emitUpdate()
    return this.getState()
  }

  setWebBlockActive(active: boolean): void {
    if (!this.isRunning) return
    this.state.webBlockActive = active
    this.emitUpdate()
  }

  reportBlockedAttempt(): void {
    if (!this.isRunning) return
    this.state.blockedAttempts += 1
    this.emitUpdate()
  }

  /** Release blockers without touching state; used on app quit. */
  async shutdown(): Promise<void> {
    if (this.isRunning) {
      this.stopTimer()
      recordAbort(this.store.data)
      this.store.setActiveSession(null)
      this.store.save()
      await this.hooks.release()
    }
  }

  private tick(): void {
    // Recompute from the wall clock so sleep/lid-close doesn't stretch the session.
    const elapsedSec = Math.floor((Date.now() - (this.state.startedAt ?? Date.now())) / 1000)
    this.state.remainingSec = Math.max(0, this.state.durationMin * 60 - elapsedSec)
    if (this.state.remainingSec <= 0) {
      this.complete()
    } else {
      this.emitUpdate()
    }
  }

  private complete(): void {
    this.stopTimer()
    const { durationMin, eggTier } = this.state
    const result: CompletionResult = grantCompletion(this.store.data, durationMin, eggTier!)
    this.store.setActiveSession(null)
    this.store.save()
    void this.hooks.release()
    this.state = idleState()
    this.emitUpdate()
    this.emit('completed', result)
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private emitUpdate(): void {
    this.emit('update', this.getState())
  }
}
