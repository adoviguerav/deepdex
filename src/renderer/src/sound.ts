let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx = ctx ?? new AudioContext()
    return ctx
  } catch {
    return null
  }
}

function note(freq: number, at: number, duration: number, volume = 0.05): void {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  const t = ac.currentTime + at
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration)
}

/** Little Game Boy-ish jingles. */
export function playHatch(): void {
  note(523, 0, 0.12)
  note(659, 0.12, 0.12)
  note(784, 0.24, 0.12)
  note(1047, 0.36, 0.3)
}

export function playLevelUp(): void {
  note(392, 0, 0.1)
  note(523, 0.1, 0.1)
  note(659, 0.2, 0.1)
  note(784, 0.3, 0.1)
  note(1047, 0.4, 0.35)
}

export function playBadge(): void {
  note(659, 0, 0.15)
  note(659, 0.18, 0.15)
  note(880, 0.36, 0.4)
}
