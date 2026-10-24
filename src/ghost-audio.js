// Designed sound cues, not recordings: every spirit has its own timbre/rhythm.
export const IMPORTED_VOICES = {
  banaspati: {
    label: "Deru api dan letupan bara",
    hz: 70,
    end: 155,
    pulse: 53,
    noise: 1.7,
    overtone: 4.8,
    tone: 0.26,
    duration: 1.7,
  },
  suanggi: {
    label: "Bisikan kutukan bergaung",
    hz: 145,
    end: 89,
    pulse: 9,
    noise: 0.95,
    overtone: 3.8,
    tone: 0.35,
    duration: 2,
  },
  jiangshi: {
    label: "Erangan pendek dan hentak kaku",
    hz: 110,
    end: 77,
    pulse: 12,
    noise: 0.5,
    overtone: 2.3,
    tone: 0.46,
    duration: 1.45,
  },
  dracula: {
    label: "Desis dan geraman vampir",
    hz: 120,
    end: 53,
    pulse: 6,
    noise: 1.2,
    overtone: 3.1,
    tone: 0.4,
    duration: 1.8,
  },
  wendigo: {
    label: "Raungan panjang pecah",
    hz: 85,
    end: 280,
    pulse: 17,
    noise: 1.5,
    overtone: 5.2,
    tone: 0.48,
    duration: 2.2,
  },
  mummy: {
    label: "Erangan kering dan gesekan kain",
    hz: 82,
    end: 63,
    pulse: 11,
    noise: 1.3,
    overtone: 2.6,
    tone: 0.38,
    duration: 1.9,
  },
  yokai: {
    label: "Pekik rubah dan denging api",
    hz: 740,
    end: 280,
    pulse: 21,
    noise: 0.3,
    overtone: 3.6,
    tone: 0.36,
    duration: 1.3,
  },
  kappa: {
    label: "Kroak serak dan gelembung air",
    hz: 210,
    end: 87,
    pulse: 32,
    noise: 0.85,
    overtone: 1.7,
    tone: 0.44,
    duration: 1.6,
  },
  skeleton: {
    label: "Gemertak tulang berongga",
    hz: 460,
    end: 300,
    pulse: 47,
    noise: 1.1,
    overtone: 7.3,
    tone: 0.24,
    duration: 1.35,
  },
  "slender-man": {
    label: "Dengung rendah dan gangguan statis",
    hz: 38,
    end: 51,
    pulse: 8,
    noise: 1.25,
    overtone: 8.1,
    tone: 0.48,
    duration: 2.3,
  },
  "biarawati-iblis": {
    label: "Lantunan sumbang dan bisikan",
    hz: 265,
    end: 177,
    pulse: 5,
    noise: 0.65,
    overtone: 1.49,
    tone: 0.42,
    duration: 2.4,
  },
  "suster-ngesot": {
    label: "Isak dan gesekan lantai",
    hz: 420,
    end: 195,
    pulse: 14,
    noise: 1.4,
    overtone: 2.9,
    tone: 0.32,
    duration: 1.85,
  },
  tuyul: {
    label: "Cekikikan dan gemerincing koin",
    hz: 680,
    end: 430,
    pulse: 28,
    noise: 0.08,
    overtone: 5.7,
    tone: 0.3,
    duration: 1.25,
  },
  ngepet: {
    label: "Dengusan babi berat",
    hz: 95,
    end: 56,
    pulse: 13,
    noise: 0.85,
    overtone: 2,
    tone: 0.42,
    duration: 1.5,
  },
  leak: {
    label: "Geraman topeng dan jerit",
    hz: 170,
    end: 480,
    pulse: 36,
    noise: 0.5,
    overtone: 3.2,
    tone: 0.38,
    duration: 1.6,
  },
  keranda: {
    label: "Derit kayu dan desir kain",
    hz: 190,
    end: 105,
    pulse: 7,
    noise: 1.1,
    overtone: 6.3,
    tone: 0.23,
    duration: 1.9,
  },
  jelangkung: {
    label: "Ketukan bambu berongga",
    hz: 340,
    end: 290,
    pulse: 19,
    noise: 0.23,
    overtone: 2.7,
    tone: 0.48,
    duration: 1.3,
  },
  sundel: {
    label: "Ratapan lirih bergetar",
    hz: 370,
    end: 215,
    pulse: 4,
    noise: 0.3,
    overtone: 2,
    tone: 0.4,
    duration: 1.9,
  },
  "wewe-gombel": {
    label: "Senandung rendah dan bisikan",
    hz: 180,
    end: 136,
    pulse: 3,
    noise: 0.7,
    overtone: 3,
    tone: 0.4,
    duration: 2.1,
  },
  ular: {
    label: "Desis ular bergetar",
    hz: 930,
    end: 640,
    pulse: 16,
    noise: 2,
    overtone: 4.4,
    tone: 0.15,
    duration: 1.7,
  },
  begu: {
    label: "Dengung dalam dan embusan bayangan",
    hz: 42,
    end: 31,
    pulse: 5,
    noise: 0.6,
    overtone: 2,
    tone: 0.48,
    duration: 2.2,
  },
  kuyang: {
    label: "Lengking tajam berdenyut",
    hz: 760,
    end: 1090,
    pulse: 29,
    noise: 0.4,
    overtone: 2.3,
    tone: 0.3,
    duration: 1.4,
  },
  palasik: {
    label: "Isakan pendek dan tarikan napas",
    hz: 460,
    end: 280,
    pulse: 11,
    noise: 0.95,
    overtone: 3,
    tone: 0.35,
    duration: 1.55,
  },
  parakang: {
    label: "Geraman parau tersendat",
    hz: 115,
    end: 71,
    pulse: 42,
    noise: 0.8,
    overtone: 4,
    tone: 0.4,
    duration: 1.65,
  },
};
export const GHOST_VOICES = new Set([
  "pocong",
  "kuntilanak",
  "genderuwo",
  ...Object.keys(IMPORTED_VOICES),
]);
// Original synthesized effects, no remote audio service or microphone required.
export function synthesizeGhostVoice(id, sampleRate = 22050, event = "idle") {
  if (!GHOST_VOICES.has(id)) return new Float32Array(0);
  const voice = IMPORTED_VOICES[id];
  const duration =
    event === "capture"
      ? 0.65
      : (voice?.duration ?? (id === "genderuwo" ? 1.65 : 1.4));
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
    if (voice) {
      const freq =
        (voice.hz +
          (voice.end - voice.hz) * u +
          Math.sin(t * 23) * voice.hz * 0.035) *
        rise;
      phase += (Math.PI * 2 * freq) / sampleRate;
      const pulse =
        0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * voice.pulse)), 2);
      const knock =
        id === "jelangkung" ? 1.8 * Math.exp(-((t * 3.1) % 1) * 6) : 1;
      const hiss = id === "ular" ? white * 0.2 : noise;
      sample =
        (Math.sin(phase) * voice.tone +
          Math.sin(phase * voice.overtone) * 0.12 +
          hiss * voice.noise) *
        pulse *
        knock;
    } else if (id === "kuntilanak") {
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
    data[i] = Math.max(-0.849, Math.min(0.849, sample * envelope));
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
