import { GhostVoices } from "./ghost-audio.js";
import { FarmAudio } from "./farm-audio.js";
import { VehicleAudio } from "./vehicle-audio.js";
export class Soundscape {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.timer = 0;
    this.ambience = null;
    this.ghostVoices = new GhostVoices(this);
    this.farm = new FarmAudio(this);
    this.vehicle = new VehicleAudio(this);
  }
  start() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * 3,
        this.ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < data.length; i++) {
        prev = (prev + (Math.random() * 2 - 1) * 0.018) / 1.025;
        data[i] = prev;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      this.ambience = gain;
    }
    this.ctx.resume();
    this.setEnabled(this.enabled);
  }
  fishCheer() {
    if (!this.enabled) return;
    if (!this.fishVoice) this.fishVoice = new Audio("/audio/mancing-mania.wav");
    this.fishVoice.volume = 0.85;
    this.fishVoice.currentTime = 0;
    this.fishVoice.play().catch(() => {
      if (!this.enabled || !("speechSynthesis" in window)) return;
      const line = new SpeechSynthesisUtterance("Mancing Mania, Mantap!");
      line.lang = "id-ID";
      window.speechSynthesis.speak(line);
    });
  }
  setWeather(weather, paused = false) {
    if (!this.ctx) return;
    if (!this.weatherGain) {
      const b = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * 3,
        this.ctx.sampleRate,
      );
      const data = b.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      this.weatherFilter = this.ctx.createBiquadFilter();
      this.weatherFilter.type = "lowpass";
      this.weatherGain = this.ctx.createGain();
      this.weatherGain.gain.value = 0;
      src
        .connect(this.weatherFilter)
        .connect(this.weatherGain)
        .connect(this.master);
      src.start();
    }
    const gain = paused
      ? 0
      : weather.rain
        ? 0.07 * weather.rain
        : weather.wind
          ? 0.16 * weather.wind
          : 0;
    const frequency = weather.rain ? 2000 : 400;
    if (this.weatherLevel === gain && this.weatherFrequency === frequency)
      return;
    this.weatherLevel = gain;
    this.weatherFrequency = frequency;
    this.weatherGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.7);
    this.weatherFilter.frequency.setTargetAtTime(
      frequency,
      this.ctx.currentTime,
      0.7,
    );
  }
  setEnabled(on) {
    if (!on) this.vehicle.stop();
    if (!on) this.farm.stop();
    this.enabled = on;
    if (!on) {
      this.ghostVoices.stop();
      this.fishVoice?.pause();
      window.speechSynthesis?.cancel();
    }
    if (this.master)
      this.master.gain.setTargetAtTime(on ? 0.3 : 0, this.ctx.currentTime, 0.1);
  }
  tone(freq, duration = 0.2, type = "sine", volume = 0.2, end = freq) {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime,
      osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
  play(id) {
    if (id === "thunder") {
      this.tone(45, 1.8, "sawtooth", 0.22, 18);
      this.tone(180, 0.3, "triangle", 0.2, 35);
    }

    if (id === "rocket") {
      this.tone(35, 2.7, "sawtooth", 0.13, 160);
      this.tone(70, 2.5, "triangle", 0.2, 45);
    }
    if (id === "dinosaur") {
      this.tone(58, 1.2, "sawtooth", 0.09, 26);
      this.tone(160, 0.9, "triangle", 0.08, 43);
    }
    if (id === "splash") {
      this.tone(410, 0.22, "sine", 0.12, 120);
      this.tone(680, 0.15, "triangle", 0.07, 260);
    }

    if (id === "siren") {
      for (let i = 0; i < 4; i++)
        setTimeout(
          () =>
            this.tone(i % 2 ? 740 : 420, 0.5, "sine", 0.2, i % 2 ? 420 : 740),
          i * 460,
        );
    }
    if (id === "portal") {
      this.tone(75, 2.2, "sine", 0.28, 620);
      this.tone(900, 1.7, "triangle", 0.07, 170);
    }
    if (id === "solar") {
      this.tone(960, 0.22, "sawtooth", 0.065, 190);
      this.tone(220, 0.3, "sine", 0.18, 70);
    }
    if (id === "missile") {
      this.tone(80, 1.1, "sawtooth", 0.1, 500);
      this.tone(160, 0.65, "triangle", 0.16, 45);
    }
    if (id === "zombie") this.tone(63, 0.8, "sawtooth", 0.035, 28);
    if (id === "ring") {
      [0, 150, 340].forEach((d, i) =>
        setTimeout(() => this.tone(330 + i * 55, 0.65, "sine", 0.48, 180), d),
      );
    }
    if (id === "hit") {
      this.tone(170, 0.13, "triangle", 0.45, 44);
      this.tone(550, 0.1, "sawtooth", 0.05, 65);
    }
    if (id === "swing") this.tone(260, 0.16, "triangle", 0.18, 60);
    if (id === "hurt") this.tone(100, 0.3, "sawtooth", 0.13, 35);
    if (id === "capture")
      [330, 440, 550, 880].forEach((n, i) =>
        setTimeout(() => this.tone(n, 0.6, "sine", 0.25), i * 100),
      );
    if (id === "fail") this.tone(260, 0.4, "triangle", 0.2, 110);
    if (id === "skill") {
      this.tone(80, 0.9, "sawtooth", 0.08, 650);
      this.tone(330, 0.8, "sine", 0.15, 100);
    }
    if (id === "collect" || id === "click")
      this.tone(id === "click" ? 550 : 880, 0.12, "sine", 0.13, 660);
    if (id === "step")
      this.tone(70 + Math.random() * 40, 0.06, "triangle", 0.08, 35);
    if (id === "bottle") this.tone(1300, 0.2, "sine", 0.16, 340);
  }
  update(dt, night, danger) {
    if (!this.ctx) return;
    this.timer -= dt;
    if (this.timer < 0) {
      this.timer = night ? 1.2 + Math.random() * 3 : 2 + Math.random() * 5;
      if (night) {
        this.tone(3300 + Math.random() * 500, 0.08, "sine", 0.018);
        setTimeout(() => this.tone(3700, 0.09, "sine", 0.014), 130);
        if (danger) this.tone(47, 1.8, "sine", 0.15, 40);
      } else this.tone(1200, 0.3, "sine", 0.025, 2200);
    }
  }
}
