// All cues are synthesized locally through the game's Web Audio master (including mute).
export function magicSound(sound, kind) {
  if (!sound.enabled || !sound.ctx || sound.ctx.state !== "running") return;
  const ctx = sound.ctx,
    t = ctx.currentTime;
  const score = {
    curse: [180, 95, 140],
    portal: [130, 196, 260, 390],
    train: [196, 207, 294],
    rescue: [330, 440, 660],
    spell: [680, 420],
    owl: [420, 380, 410],
  }[kind] || [220];
  score.forEach((f, i) => {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = kind === "curse" ? "sawtooth" : "sine";
    o.frequency.setValueAtTime(f, t + i * 0.09);
    o.frequency.exponentialRampToValueAtTime(
      f * (kind === "portal" ? 2 : 0.7),
      t + i * 0.09 + 0.5,
    );
    g.gain.setValueAtTime(0, t + i * 0.09);
    g.gain.linearRampToValueAtTime(0.08, t + i * 0.09 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.65);
    o.connect(g).connect(sound.master);
    o.start(t + i * 0.09);
    o.stop(t + i * 0.09 + 0.7);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  });
}
