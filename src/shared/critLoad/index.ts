// whether a new special crit can proc: always while frames keep up; while
// they don't, not until the crits already playing (and their rewards' coins
// and labels, SETTLE_MS after) have finished. The game canvas notes each
// frame; crits register what counts as playing
import { CONFIG } from "../../config";

// a frame gap past this is a stall or a hidden tab, not the frame rate
const STALL_MS = 250;
const EASE = 0.1;

let frameMs = 1000 / 60;
let lastFrameAt = 0;
let lastBusyAt = -Infinity;
let busy: () => boolean = () => false;

// what counts as a crit still playing (the crit flash, its number, its queue)
export function setCritsPlaying(check: () => boolean): void {
  busy = check;
}

// every frame drawn, at performance.now()
export function noteCritFrame(now: number): void {
  const gap = now - lastFrameAt;
  if (lastFrameAt && gap < STALL_MS) frameMs += (gap - frameMs) * EASE;
  lastFrameAt = now;
  if (busy()) lastBusyAt = now;
}

export function canProcSpecialCrit(): boolean {
  if (frameMs < CONFIG.crit.procSlowFrameMs) return true;
  return !busy() && performance.now() - lastBusyAt > CONFIG.crit.procSettleMs;
}
