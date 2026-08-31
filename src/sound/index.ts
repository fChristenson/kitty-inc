import themeUrl from "../assets/sound/theme.mp3";
import coinDropUrl from "../assets/sound/coinDrop.mp3";
import swooshUrl from "../assets/sound/swoosh.mp3";
import soldUrl from "../assets/sound/sold.mp3";
import bloopUrl from "../assets/sound/bloop.mp3";
import explosionUrl from "../assets/sound/explosion.mp3";

const MUSIC_VOLUME = 0.4;
const SFX_VOLUME = 0.9;

// a single click can hit several overlapping cats, or a cat and the mouse, in the
// same synchronous call stack (see gameCanvas.ts's onPointerUp) — this window
// collapses all of those into one play instead of one per target hit
const BLOOP_DEBOUNCE_MS = 50;
let lastBloopPlayTime = 0;

// the upgrade button's press-and-hold auto-repeat can re-fire every 20ms once
// sped up (see gameCanvas.ts's UPGRADE_HOLD_FAST_MULTIPLIER), and every one of
// those clicks calls playCoinDrop — without this debounce, a held Sale-boosted
// click spammed dozens of overlapping fresh Audio instances per second, which is
// what was actually clipping/distorting into "awful noise", not a single sound
// itself being too loud
const COIN_DROP_DEBOUNCE_MS = 60;
let lastCoinDropPlayTime = 0;

// crit can re-roll on every click too (rollCritUpgrade), so the same fast-held
// Sale click could otherwise fire a fresh full explosion.mp3 before the last one
// even finished — on top of the coin drops and background music already
// playing, that's what actually overloaded into noise, not any one sound alone
const EXPLOSION_DEBOUNCE_MS = 800;
let lastExplosionPlayTime = 0;

// any press-and-hold-driven purchase loop (corporationBoostMenu's stock-raise
// hold, etc.) can call this many times a second — without a debounce, each of
// those spawns its own Audio instance; the browser doesn't drop the excess, it
// queues/staggers starting them, so sound kept audibly playing catch-up well
// after the hold had already stopped instead of just being skipped
const SOLD_DEBOUNCE_MS = 60;
let lastSoldPlayTime = 0;

let music: HTMLAudioElement | null = null;

// starts the looping background theme; call once from main.ts. Every browser blocks
// audio autoplay until the user has interacted with the page at least once, so if
// the immediate play() attempt gets rejected, this retries on the first pointer/key
// interaction instead of just staying silent forever
export function startBackgroundMusic(): void {
  if (music) return; // already started
  music = new Audio(themeUrl);
  music.loop = true;
  music.volume = MUSIC_VOLUME;

  music.play().catch(() => {
    const retry = () => {
      music!.play().catch(() => {});
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
  });
}

// one-shot sound effect, played on every successful upgrade-button purchase. Creates
// a fresh Audio instance per call instead of reusing one — reusing a single element
// and calling .play() again just restarts it from 0, cutting off the tail of a
// rapid previous play (e.g. clicking the upgrade button several times quickly).
// Debounced (see COIN_DROP_DEBOUNCE_MS) so the press-and-hold auto-repeat's fastest
// tier doesn't stack dozens of overlapping plays into distorted noise
export function playCoinDrop(): void {
  const now = Date.now();
  if (now - lastCoinDropPlayTime < COIN_DROP_DEBOUNCE_MS) return;
  lastCoinDropPlayTime = now;
  const sfx = new Audio(coinDropUrl);
  sfx.volume = SFX_VOLUME;
  sfx.play().catch(() => {});
}

// one-shot sound effect for opening/closing any of the action bar's dialogs
// (upgrade menu, boost menu, map menu) or switching to/from the static map view.
// skips swoosh.mp3's own brief quiet lead-in so it reads as instant on click
export function playSwoosh(): void {
  const sfx = new Audio(swooshUrl);
  sfx.volume = SFX_VOLUME;
  sfx.currentTime = 0.1;
  sfx.play().catch(() => {});
}

// one-shot sound effect for a successful purchase — buying a worker, a boost, or
// the next building on the map. sold.mp3 has a long quiet lead-in, so this skips
// the first 0.5s and starts playback right where the actual "sold" sound begins.
// Debounced (see SOLD_DEBOUNCE_MS) so a press-and-hold purchase loop drops excess
// plays instead of queuing a backlog that keeps audibly firing after the hold ends
export function playSold(): void {
  const now = Date.now();
  if (now - lastSoldPlayTime < SOLD_DEBOUNCE_MS) return;
  lastSoldPlayTime = now;
  const sfx = new Audio(soldUrl);
  sfx.volume = SFX_VOLUME;
  sfx.currentTime = 0.5;
  sfx.play().catch(() => {});
}

// one-shot sound effect for the crit-upgrade "jackpot" moment (see
// floorInteractions.ts, played alongside triggerScreenShake and the CRIT! flash).
// explosion.mp3 has a quiet lead-in, so this skips the first 0.3s to line the
// actual "bang" up earlier with the visual shake/flash. Debounced (see
// EXPLOSION_DEBOUNCE_MS) so back-to-back crits during a fast held click can't
// stack multiple full explosions on top of each other
export function playExplosion(): void {
  const now = Date.now();
  if (now - lastExplosionPlayTime < EXPLOSION_DEBOUNCE_MS) return;
  lastExplosionPlayTime = now;
  const sfx = new Audio(explosionUrl);
  sfx.volume = SFX_VOLUME;
  sfx.currentTime = 0.04;
  sfx.play().catch(() => {});
}

// one-shot sound effect for clicking a cat or the mouse, and for hitting the
// every-10th-upgrade floor milestone; debounced (see BLOOP_DEBOUNCE_MS) so one
// click landing on several targets only plays once
export function playBloop(): void {
  const now = Date.now();
  if (now - lastBloopPlayTime < BLOOP_DEBOUNCE_MS) return;
  lastBloopPlayTime = now;
  const sfx = new Audio(bloopUrl);
  sfx.volume = SFX_VOLUME;
  sfx.play().catch(() => {});
}
