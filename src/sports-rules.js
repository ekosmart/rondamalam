import { RACE_TRACK, segmentDistance } from "./layout.js";
export class RaceProgress {
  constructor(laps = 2) {
    this.laps = laps;
    this.lap = 0;
    this.next = 1;
    this.passed = 0;
    this.done = false;
    this.time = 0;
  }
  step(previous, current, dt) {
    if (this.done) return false;
    this.time += dt;
    if (Math.hypot(current.x - previous.x, current.z - previous.z) > 30)
      return false;
    if (segmentDistance(RACE_TRACK[this.next], previous, current) > 7)
      return false;
    this.passed++;
    if (this.next === 0) {
      this.lap++;
      if (this.lap >= this.laps) this.done = true;
    }
    this.next = (this.next + 1) % RACE_TRACK.length;
    return true;
  }
}
export class CupMatch {
  constructor() {
    this.round = 0;
    this.score = [0, 0];
    this.seconds = 90;
    this.finished = false;
    this.won = false;
  }
  goal(team) {
    if (!this.finished && [0, 1].includes(team)) this.score[team]++;
  }
  tick(dt) {
    if (this.finished) return null;
    this.seconds = Math.max(0, this.seconds - dt);
    if (this.seconds > 0) return null;
    if (this.score[0] <= this.score[1]) {
      this.finished = true;
      return this.score[0] === this.score[1] ? "draw" : "loss";
    }
    if (this.round === 0) {
      this.round = 1;
      this.score = [0, 0];
      this.seconds = 90;
      return "final";
    }
    this.finished = true;
    this.won = true;
    return "champion";
  }
}
