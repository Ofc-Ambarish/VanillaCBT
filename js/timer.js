class CBTExamTimer {
  constructor({ durationSeconds, onTick, onExpire }) {
    this.totalDuration = durationSeconds;
    this.remainingSeconds = durationSeconds;
    this.onTick = onTick || (() => {});
    this.onExpire = onExpire || (() => {});
    this.intervalId = null;
    this.endTime = null;
    this.isRunning = false;
  }
  start(existingRemainingSeconds = null) {
    if (this.isRunning) return;
    this.remainingSeconds = existingRemainingSeconds !== null ? existingRemainingSeconds : this.totalDuration;
    this.endTime = Date.now() + (this.remainingSeconds * 1000);
    this.isRunning = true;
    this._tick();
    this.intervalId = setInterval(() => this._tick(), 500);
  }
  _tick() {
    const diff = Math.max(0, Math.round((this.endTime - Date.now()) / 1000));
    this.remainingSeconds = diff;
    this.onTick(this.remainingSeconds, this.formatTime(this.remainingSeconds));
    if (diff <= 0) { this.stop(); this.onExpire(); }
  }
  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.isRunning = false;
  }
  getRemainingSeconds() { return this.remainingSeconds; }
  formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
}
window.CBTExamTimer = CBTExamTimer;
