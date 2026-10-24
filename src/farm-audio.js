export const FARM_VOICES = {
  cow: [110, 70, 3, 1.7],
  horse: [510, 240, 17, 1.5],
  goat: [280, 220, 26, 1.1],
  sheep: [210, 160, 19, 1.3],
  pig: [150, 85, 15, 1],
  chicken: [620, 420, 35, 0.8],
  duck: [330, 230, 24, 0.9],
  dog: [170, 95, 11, 0.7],
  tractor: [54, 48, 32, 1.4],
};
export function farmVoice(kind, rate = 22050) {
  const cfg = FARM_VOICES[kind];
  if (!cfg) return new Float32Array();
  const [start, end, pulse, duration] = cfg,
    out = new Float32Array(Math.ceil(rate * duration));
  let phase = 0,
    seed = kind.length * 729 + 45,
    noise = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate,
      u = t / duration;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noise = noise * 0.82 + (seed / 2147483648 - 1) * 0.18;
    phase +=
      (2 *
        Math.PI *
        (start + (end - start) * u + Math.sin(t * 29) * start * 0.035)) /
      rate;
    const envelope =
      kind === "tractor"
        ? 0.8 * Math.min(1, t / 0.01, (duration - t) / 0.01)
        : Math.min(1, t / 0.025) * Math.pow(1 - u, 1.1);
    const gate = 0.3 + 0.7 * Math.max(0, Math.sin(t * pulse));
    out[i] =
      (Math.sin(phase) * 0.36 + Math.sin(phase * 2) * 0.13 + noise * 0.45) *
      gate *
      envelope;
  }
  return out;
}
export class FarmAudio {
  constructor(sound) {
    this.sound = sound;
    this.buffers = new Map();
    this.voices = new Set();
    this.cooldowns = new Map();
    this.engine = null;
  }
  buffer(kind) {
    const ctx = this.sound.ctx;
    if (!this.buffers.has(kind)) {
      const a = farmVoice(kind, ctx.sampleRate),
        b = ctx.createBuffer(1, a.length, ctx.sampleRate);
      b.copyToChannel(a, 0);
      this.buffers.set(kind, b);
    }
    return this.buffers.get(kind);
  }
  play(kind, distance = 0) {
    const s = this.sound,
      c = s.ctx;
    if (
      !c ||
      c.state !== "running" ||
      !s.enabled ||
      distance > 32 ||
      this.voices.size >= 3 ||
      c.currentTime - (this.cooldowns.get(kind) ?? -99) < 5
    )
      return false;
    const source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = this.buffer(kind);
    gain.gain.value = 0.6 * Math.pow(1 - distance / 32, 2);
    source.connect(gain).connect(s.master);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.voices.delete(source);
    };
    this.voices.add(source);
    this.cooldowns.set(kind, c.currentTime);
    source.start();
    return true;
  }
  motor(on, moving = false) {
    const s = this.sound,
      c = s.ctx;
    if (!on || !s.enabled || !c || c.state !== "running") {
      if (this.engine) {
        this.engine.source.stop();
        this.engine.source.disconnect();
        this.engine.gain.disconnect();
        this.engine = null;
      }
      return;
    }
    if (!this.engine) {
      const source = c.createBufferSource(),
        gain = c.createGain();
      source.buffer = this.buffer("tractor");
      source.loop = true;
      source.connect(gain).connect(s.master);
      source.start();
      this.engine = { source, gain };
    }
    this.engine.gain.gain.setTargetAtTime(
      moving ? 0.28 : 0.14,
      c.currentTime,
      0.15,
    );
    this.engine.source.playbackRate.setTargetAtTime(
      moving ? 1.4 : 0.8,
      c.currentTime,
      0.15,
    );
  }
  stop() {
    this.motor(false);
    for (const s of this.voices) s.stop();
    this.voices.clear();
  }
}
