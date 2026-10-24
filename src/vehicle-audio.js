export const VEHICLE_SOUNDS = {
  bajaj: [82, 37, 0.6],
  bemo: [61, 29, 0.4],
  oplet: [48, 22, 0.32],
  becak: [520, 12, 0.08],
  egrang: [280, 5, 0.15],
  "kereta-santa": [880, 9, 0.07],
  "naga-sulong": [75, 4, 0.5],
  "getek-bambu": [190, 6, 0.8],
  "buaya-putih": [95, 11, 0.7],
};
export function vehicleSound(id, rate = 22050) {
  if (!VEHICLE_SOUNDS[id]) return new Float32Array();
  const [hz, pulse, noise] = VEHICLE_SOUNDS[id],
    a = new Float32Array(rate * 2);
  let seed = 123 + hz,
    water = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / rate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const hiss = seed / 2147483648 - 1;
    water = water * 0.96 + hiss * 0.04;
    const tau = Math.PI * 2,
      gate = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * pulse)), 3),
      fade = Math.min(1, t / 0.02, (2 - t) / 0.02);
    let sample;
    if (id === "egrang") {
      const hit = t % 0.42;
      sample =
        Math.exp(-hit * 40) *
        (Math.sin(tau * hit * 280) + 0.4 * Math.sin(tau * hit * 610)) *
        0.55;
    } else if (id === "becak") {
      const click = t % 0.13,
        bell = t % 0.95;
      sample =
        hiss * Math.exp(-click * 160) * 0.13 +
        (Math.sin(tau * bell * 1050) + 0.35 * Math.sin(tau * bell * 2380)) *
          Math.exp(-bell * 9) *
          0.15;
    } else if (id === "kereta-santa") {
      const bell = t % 0.32;
      sample =
        (Math.sin(tau * bell * 1240) +
          0.5 * Math.sin(tau * bell * 1870) +
          0.25 * Math.sin(tau * bell * 2930)) *
        Math.exp(-bell * 13) *
        0.22;
    } else if (id === "getek-bambu")
      sample =
        water * (0.5 + 0.5 * Math.sin(tau * t * 1.5)) * 0.9 +
        hiss * Math.pow(Math.max(0, Math.sin(tau * t * 1.5)), 8) * 0.06;
    else if (id === "naga-sulong")
      sample =
        (Math.sin(tau * hz * t + 2 * Math.sin(tau * t * 3)) * 0.28 +
          water * 0.6) *
        gate;
    else if (id === "buaya-putih")
      sample =
        (Math.sin(tau * hz * t + Math.sin(tau * t * 5)) * 0.18 + water * 0.8) *
        gate;
    else
      sample =
        (Math.sin(t * hz * tau) * 0.25 +
          Math.sin(t * hz * tau * 2) * 0.1 +
          hiss * noise * 0.12) *
        gate;
    a[i] = sample * fade;
  }
  return a;
}
export class VehicleAudio {
  constructor(sound) {
    this.sound = sound;
    this.buffers = new Map();
    this.current = null;
  }
  stop() {
    if (!this.current) return;
    try {
      this.current.source.stop();
    } catch {}
    this.current.source.disconnect();
    this.current.gain.disconnect();
    this.current = null;
  }
  update(id, moving) {
    const s = this.sound,
      c = s.ctx;
    if (!VEHICLE_SOUNDS[id] || !s.enabled || c?.state !== "running") {
      this.stop();
      return;
    }
    if (this.current?.id !== id) {
      this.stop();
      if (!this.buffers.has(id)) {
        const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        b.copyToChannel(vehicleSound(id, c.sampleRate), 0);
        this.buffers.set(id, b);
      }
      const source = c.createBufferSource(),
        gain = c.createGain();
      source.buffer = this.buffers.get(id);
      source.loop = true;
      source.connect(gain).connect(s.master);
      source.start();
      this.current = { id, source, gain };
    }
    this.current.source.playbackRate.setTargetAtTime(
      moving ? 1.15 : 0.8,
      c.currentTime,
      0.1,
    );
    this.current.gain.gain.setTargetAtTime(
      moving ? 0.35 : ["bajaj", "bemo", "oplet"].includes(id) ? 0.1 : 0.015,
      c.currentTime,
      0.1,
    );
  }
}
