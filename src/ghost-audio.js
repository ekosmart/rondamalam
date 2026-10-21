export const GHOST_VOICES = new Set(["pocong", "kuntilanak", "genderuwo"]);
// Original synthesized effects, no remote audio service or microphone required.
export function synthesizeGhostVoice(id, sampleRate = 22050, event = "idle") {
  if (!GHOST_VOICES.has(id)) return new Float32Array(0);
  const duration = event === "capture" ? 0.65 : id === "genderuwo" ? 1.65 : 1.4;
  const data = new Float32Array(Math.ceil(duration * sampleRate));
  let phase = 0,
    seed = 701 + id.length * 71,
    noise = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate,
      u = t / duration;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const white = seed / 2147483648 - 1;
    noise = noise * 0.89 + white * 0.11;
    const envelope = Math.min(1, t / 0.045) * Math.pow(1 - u, 1.3);
    const rise = event === "capture" ? 1 + u * 2 : event === "attack" ? 1.2 : 1;
    let sample;
    if (id === "kuntilanak") {
      const freq = (510 - 190 * u + 23 * Math.sin(t * 35)) * rise;
      phase += (Math.PI * 2 * freq) / sampleRate;
      const laugh = Math.pow(Math.max(0, Math.sin(t * 24)), 1.5);
      sample =
        (Math.sin(phase) * 0.36 +
          Math.sin(phase * 2) * 0.17 +
          Math.sin(phase * 3) * 0.07 +
          white * 0.08) *
        laugh;
    } else if (id === "pocong") {
      phase += (Math.PI * 2 * (80 - 28 * u) * rise) / sampleRate;
      const breath = Math.pow(Math.sin(Math.PI * u), 0.7),
        hop =
          Math.exp(-Math.pow((t - 0.16) * 24, 2)) +
          Math.exp(-Math.pow((t - 0.68) * 24, 2));
      sample = noise * 1.6 * breath + Math.sin(phase) * (0.1 + 0.32 * hop);
    } else {
      phase +=
        (Math.PI * 2 * (64 - 18 * u + 3 * Math.sin(t * 12)) * rise) /
        sampleRate;
      sample =
        (Math.sin(phase) * 0.38 +
          Math.sin(phase * 2) * 0.16 +
          Math.sin(phase * 5) * 0.09 +
          noise * 0.38) *
        (0.7 + 0.3 * Math.sin(t * 31));
    }
    data[i] = Math.max(-0.85, Math.min(0.85, sample * envelope));
  }
  return data;
}

export class GhostVoices {
  constructor(sound) {
    this.sound = sound;
    this.buffers = new Map();
    this.voices = new Set();
    this.cooldowns = new Map();
    this.paused = false;
    this.last = -10;
  }
  stop(includePreview = true) {
    for (const v of [...this.voices])
      if (includePreview || !v.preview) {
        try {
          v.source.stop();
        } catch {}
        v.cleanup();
      }
  }
  pause(paused) {
    this.paused = paused;
    if (paused) this.stop(false);
  }
  play(id, { distance = 0, pan = 0, event = "idle", preview = false } = {}) {
    const s = this.sound,
      ctx = s.ctx;
    if (
      !GHOST_VOICES.has(id) ||
      !s.enabled ||
      !ctx ||
      ctx.state !== "running" ||
      distance >= 32 ||
      (!preview && this.paused)
    )
      return false;
    const now = ctx.currentTime,
      key = id + ":" + event;
    if (
      !preview &&
      (now - (this.cooldowns.get(key) ?? -20) < (event === "idle" ? 9 : 1.5) ||
        now - this.last < 0.7 ||
        this.voices.size >= 2)
    )
      return false;
    if (preview) this.stop();
    if (!this.buffers.has(key)) {
      const samples = synthesizeGhostVoice(id, ctx.sampleRate, event),
        b = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      b.copyToChannel(samples, 0);
      this.buffers.set(key, b);
    }
    const source = ctx.createBufferSource(),
      gain = ctx.createGain(),
      panner = ctx.createStereoPanner(),
      filter = ctx.createBiquadFilter();
    source.buffer = this.buffers.get(key);
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    filter.type = "lowpass";
    filter.frequency.value = preview
      ? 6000
      : Math.max(700, 6000 - distance * 140);
    gain.gain.value =
      (preview ? 0.75 : 0.65) * Math.pow(Math.max(0, 1 - distance / 32), 1.5);
    source.connect(filter).connect(gain).connect(panner).connect(s.master);
    const voice = {
      source,
      preview,
      cleanup: () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        panner.disconnect();
        this.voices.delete(voice);
      },
    };
    source.onended = voice.cleanup;
    this.voices.add(voice);
    this.cooldowns.set(key, now);
    this.last = now;
    source.start();
    return true;
  }
}
