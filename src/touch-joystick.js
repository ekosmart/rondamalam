export function stickVector(dx, dy, radius = 48) {
  const length = Math.hypot(dx, dy), magnitude = Math.min(1, length / radius);
  const power = Math.max(0, (magnitude - 0.12) / 0.88);
  return { x: length ? dx / length * power : 0, z: length ? dy / length * power : 0 };
}

export class TouchJoystick {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.pointer = null;
    this.reset();
    root.addEventListener('pointerdown', e => {
      if (this.pointer !== null || game.ui?.panel) return;
      e.preventDefault();
      this.pointer = e.pointerId;
      root.setPointerCapture(e.pointerId);
      this.move(e);
    });
    root.addEventListener('pointermove', e => {
      if (this.pointer === e.pointerId) { e.preventDefault(); this.move(e); }
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
      root.addEventListener(name, e => { if (this.pointer === e.pointerId) this.reset(); });
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
  }
  move(e) {
    const r = this.root.getBoundingClientRect(), radius = r.width * 0.34;
    const dx = e.clientX - r.x - r.width / 2, dy = e.clientY - r.y - r.height / 2;
    this.game.moveStick = stickVector(dx, dy, radius);
    const limit = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
    this.root.style.setProperty('--stick-x', dx * limit + 'px');
    this.root.style.setProperty('--stick-y', dy * limit + 'px');
    this.root.classList.add('engaged');
  }
  reset() {
    const pointer = this.pointer;
    this.pointer = null;
    if (pointer !== null && this.root.hasPointerCapture(pointer)) this.root.releasePointerCapture(pointer);
    this.game.moveStick = { x: 0, z: 0 };
    this.root.style.setProperty('--stick-x', '0px');
    this.root.style.setProperty('--stick-y', '0px');
    this.root.classList.remove('engaged');
  }
}
