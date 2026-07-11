// Procedural space ambience — everything synthesized with the Web Audio API,
// so there are no asset files and it runs fully offline. One evolving drone
// bed plus an interaction voice that rises as the planet is disrupted; the
// timbre warms in solar mode. Driven per frame from PlanetSystem via update().

class SpaceAudio {
  constructor() {
    this.ctx = null
    this.enabled = false
    this.nodes = null
    this.target = 0 // master gain target (0 muted, up when enabled)
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

    // ---- interaction voice: swells with hover/disrupt strength ----------
    const interOsc = ctx.createOscillator()
    interOsc.type = 'triangle'
    interOsc.frequency.value = 220
    const interFilter = ctx.createBiquadFilter()
    interFilter.type = 'bandpass'
    interFilter.frequency.value = 600
    interFilter.Q.value = 3
    const interGain = ctx.createGain()
    interGain.gain.value = 0
    interOsc.connect(interFilter).connect(interGain).connect(masterFilter)
    interOsc.start(now)

    // fast tremolo on the interaction voice for a "charged" feel
    const tremLfo = ctx.createOscillator()
    tremLfo.frequency.value = 7
    const tremGain = ctx.createGain()
    tremGain.gain.value = 0.35
    const tremBias = ctx.createConstantSource()
    tremBias.offset.value = 0.65
    tremBias.start(now)
    tremLfo.connect(tremGain)
    // (tremGain modulates interGain; wired in update via a summing node)
    const interTrem = ctx.createGain()
    interTrem.gain.value = 1
    tremGain.connect(interTrem.gain)
    tremBias.connect(interTrem.gain)
    interGain.connect(interTrem).connect(masterFilter)
    // note: interGain already connects to masterFilter above for base level;
    // interTrem adds the tremolo-shaped component.
    tremLfo.start(now)

    this.nodes = {
      master,
      droneFilter,
      voiceGain,
      interOsc,
      interFilter,
      interGain,
      noiseGain,
      voiceA,
      voiceB,
    }
  }

  // Per-frame modulation. strength: 0..~1 hover/disrupt spring. solar: 0..1.
  update(strength, solar) {
    if (!this.ctx || !this.nodes) return
    const ctx = this.ctx
    const n = this.nodes
    const t = ctx.currentTime
    const s = Math.max(0, Math.min(1.2, strength))

    // Master fade in/out.
    n.master.gain.setTargetAtTime(this.target * 0.9, t, 0.25)

    // Interaction voice swells and brightens with disruption.
    n.interGain.gain.setTargetAtTime(s * 0.12, t, 0.08)
    n.interFilter.frequency.setTargetAtTime(500 + s * 2200, t, 0.08)
    n.interOsc.frequency.setTargetAtTime(196 + s * 130, t, 0.12)

    // Solar mode: warmer, brighter bed and a touch more air.
    n.droneFilter.frequency.setTargetAtTime(420 + solar * 520, t, 0.4)
    n.voiceA.detune.setTargetAtTime(-6 - solar * 8, t, 0.4)
    n.voiceB.detune.setTargetAtTime(7 + solar * 9, t, 0.4)
    n.noiseGain.gain.setTargetAtTime(0.015 + solar * 0.02, t, 0.4)
  }
}

export const spaceAudio = new SpaceAudio()
