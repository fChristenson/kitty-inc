// The game's clock: real time with every stretch the game spent paused cut
// out. Every timer, boost, walk and income cycle runs off Date.now(), so
// Date.now() itself reads this clock: while paused nothing moves or accrues,
// and nothing catches up on resume. The paused total is saved so timestamps
// saved in game time still line up after a reload. Import this module first.

const PAUSED_KEY = "cash-clicker:paused-ms";
const realNow = Date.now.bind(Date);

function loadPausedMs(): number {
  try {
    const value = Number(localStorage.getItem(PAUSED_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

let pausedMs = loadPausedMs();
let pausedAt: number | null = null;

Date.now = () => (pausedAt ?? realNow()) - pausedMs;

export function pauseGame(): void {
  if (pausedAt === null) pausedAt = realNow();
}

export function resumeGame(): void {
  if (pausedAt === null) return;
  pausedMs += realNow() - pausedAt;
  pausedAt = null;
  try {
    localStorage.setItem(PAUSED_KEY, String(pausedMs));
  } catch {
    // storage full or blocked: the clock still runs right this session
  }
}

export function isGamePaused(): boolean {
  return pausedAt !== null;
}
