// Procedural space ambience — the drone bed and interaction voice are
// synthesized with the Web Audio API. The satellite ping is a bundled MP3
// sample decoded once into a buffer and retriggered on hover. Everything is
// local, so it runs fully offline. Driven per frame from PlanetSystem via
// update().

import pingUrl from '../assets/satellite-ping.mp3'

class SpaceAudio {
  constructor() {
    this.ctx = null
    this.enabled = false
    this.nodes = null
    this.target = 0 // master gain target (0 muted, up when enabled)
    this.pingBuffer = null // decoded satellite-ping sample
    this.lastPingAt = 0 // throttle rapid retriggers
  }

  // Called from a user gesture (the HUD toggle) — browsers require that to
  // start audio. Lazily builds the graph the first time.
  toggle() {
    if (!this.ctx) this._build()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    this.enabled = !this.enabled
    this.target = this.enabled ? 1 : 0
    if (this.enabled) this._playStartupTone()
    return this.enabled
  }

  _playStartupTone() {
    if (!this.ctx) return
    const ctx = this.ctx
    const now = ctx.currentTime

    // High ringing tone: descends slightly like a power-up, with reverb shimmer.
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.4)

    // Tremolo for the shimmer.
    const trem = ctx.createOscillator()
    trem.frequency.value = 14
    const tremGain = ctx.createGain()
    tremGain.gain.value = 180

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.08, now)
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    // Resonant highpass for a crystalline tone.
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 800
    filter.Q.value = 2

    const out = ctx.createGain()
    out.gain.value = 1
    out.connect(ctx.destination)

    trem.connect(tremGain)
    osc.frequency.setValueAtTime(1200, now)
    tremGain.connect(osc.frequency)
    osc.connect(filter).connect(env).connect(out)

    osc.start(now)
    trem.start(now)
    osc.stop(now + 0.5)
    trem.stop(now + 0.5)
  }

  _build() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.ctx = ctx
    const now = ctx.currentTime

    // Fetch + decode the satellite-ping sample once.
    fetch(pingUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        this.pingBuffer = decoded
      })
      .catch(() => {})

    // ---- master ---------------------------------------------------------
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    // Gentle master lowpass keeps the whole bed soft and distant.
    const masterFilter = ctx.createBiquadFilter()
    masterFilter.type = 'lowpass'
    masterFilter.frequency.value = 2600
    masterFilter.Q.value = 0.3
    masterFilter.connect(master)

    // ---- drone bed: sub + two detuned voices through an evolving lowpass -
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.16
    droneGain.connect(masterFilter)

    const droneFilter = ctx.createBiquadFilter()
    droneFilter.type = 'lowpass'
    droneFilter.frequency.value = 420
    droneFilter.Q.value = 6
    droneFilter.connect(droneGain)

    // slow LFO sweeping the drone cutoff — the "breathing" of the field
    const cutoffLfo = ctx.createOscillator()
    cutoffLfo.frequency.value = 0.05
    const cutoffLfoGain = ctx.createGain()
    cutoffLfoGain.gain.value = 240
    cutoffLfo.connect(cutoffLfoGain).connect(droneFilter.frequency)
    cutoffLfo.start(now)

    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 55 // A1
    const subGain = ctx.createGain()
    subGain.gain.value = 0.9
    sub.connect(subGain).connect(droneFilter)
    sub.start(now)

    const voiceA = ctx.createOscillator()
    voiceA.type = 'sawtooth'
    voiceA.frequency.value = 110
    voiceA.detune.value = -6
    const voiceB = ctx.createOscillator()
    voiceB.type = 'sawtooth'
    voiceB.frequency.value = 110
    voiceB.detune.value = 7
    const voiceGain = ctx.createGain()
    voiceGain.gain.value = 0.28
    voiceA.connect(voiceGain)
    voiceB.connect(voiceGain)
    voiceGain.connect(droneFilter)
    voiceA.start(now)
    voiceB.start(now)

    // ---- shimmer: filtered noise, very faint, high and airy -------------
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 3200
    noiseFilter.Q.value = 1.2
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.015
    noise.connect(noiseFilter).connect(noiseGain).connect(masterFilter)
    noise.start(now)

    this.nodes = {
      master,
      droneFilter,
      voiceGain,
      noiseGain,
      voiceA,
      voiceB,
    }
  }

  // Satellite ping — the bundled sample, but pitched down and band-limited
  // so it reads as a quiet, dark metallic tick in space rather than a bright
  // piano note. Slight per-satellite pitch variation avoids repetition.
  satellitePing(seed = 0) {
    if (!this.ctx || !this.enabled || !this.pingBuffer) return
    const ctx = this.ctx
    const now = ctx.currentTime

    // Throttle so sweeping across clusters doesn't machine-gun the sample.
    if (now - this.lastPingAt < 0.06) return
    this.lastPingAt = now

    const src = ctx.createBufferSource()
    src.buffer = this.pingBuffer
    src.playbackRate.value = 0.78 + (seed % 5) * 0.02 // darker, subtly varied

    // Band-limit: trim the low body and the bright top so what's left is a
    // thin metallic sheen — cold and distant.
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 620
    hp.Q.value = 0.5
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    lp.Q.value = 0.5

    // Short envelope so it's a tick, not a sustained tone; and very quiet.
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.16, now)
    gain.gain.setTargetAtTime(0.0001, now + 0.05, 0.12)

    src.connect(hp).connect(lp).connect(gain).connect(ctx.destination)
    src.start(now)
    src.stop(now + 0.9)
  }

  // Per-frame modulation. strength is intentionally unused — hovering the
  // main globe no longer makes any sound; only the ambient bed responds to
  // solar mode, and satellites ping on hover via satellitePing().
  update(strength, solar) {
    if (!this.ctx || !this.nodes) return
    const ctx = this.ctx
    const n = this.nodes
    const t = ctx.currentTime

    // Master fade in/out.
    n.master.gain.setTargetAtTime(this.target * 0.9, t, 0.25)

    // Solar mode: warmer, brighter bed and a touch more air.
    n.droneFilter.frequency.setTargetAtTime(420 + solar * 520, t, 0.4)
    n.voiceA.detune.setTargetAtTime(-6 - solar * 8, t, 0.4)
    n.voiceB.detune.setTargetAtTime(7 + solar * 9, t, 0.4)
    n.noiseGain.gain.setTargetAtTime(0.015 + solar * 0.02, t, 0.4)
  }
}

export const spaceAudio = new SpaceAudio()
