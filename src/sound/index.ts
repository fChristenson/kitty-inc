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
// rapid previous play (e.g. clicking the upgrade button several times quickly)
export function playCoinDrop(): void {
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
// the first 0.5s and starts playback right where the actual "sold" sound begins
export function playSold(): void {
  const sfx = new Audio(soldUrl);
  sfx.volume = SFX_VOLUME;
  sfx.currentTime = 0.5;
  sfx.play().catch(() => {});
}

// one-shot sound effect for the crit-upgrade "jackpot" moment (see
// floorInteractions.ts, played alongside triggerScreenShake and the CRIT! flash).
// explosion.mp3 has a quiet lead-in, so this skips the first 0.3s to line the
// actual "bang" up earlier with the visual shake/flash
export function playExplosion(): void {
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
