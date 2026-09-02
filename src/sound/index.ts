import themeUrl from "../assets/sound/theme.mp3";
import coinDropUrl from "../assets/sound/coinDrop.mp3";
import swooshUrl from "../assets/sound/swoosh.mp3";
import soldUrl from "../assets/sound/sold.mp3";
import bloopUrl from "../assets/sound/bloop.mp3";
import explosionUrl from "../assets/sound/explosion.mp3";
import bubbleUrl from "../assets/sound/bubble.wav";
import winUrl from "../assets/sound/win.wav";
import payoutUrl from "../assets/sound/payout.wav";

const MUSIC_VOLUME = 0.4;
const SFX_VOLUME = 0.9;
// 25% louder than the shared SFX_VOLUME per explicit request, clamped to Audio's own 1.0 max
const COIN_DROP_VOLUME = Math.min(SFX_VOLUME * 1.25, 1);

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

// same idea as EXPLOSION_DEBOUNCE_MS, for the rarer mega-crit jackpot layered sfx
const JACKPOT_DEBOUNCE_MS = 800;
let lastJackpotPlayTime = 0;

// same idea again, for the even rarer ultra-crit payout sfx
const PAYOUT_DEBOUNCE_MS = 800;
let lastPayoutPlayTime = 0;

// any press-and-hold-driven purchase loop (corporationBoostMenu's stock-raise
// hold, etc.) can call this many times a second — without a debounce, each of
// those schedules its own overlapping playback, so sound kept audibly playing
// catch-up well after the hold had already stopped instead of just being skipped
const SOLD_DEBOUNCE_MS = 60;
let lastSoldPlayTime = 0;

let music: HTMLAudioElement | null = null;

// one shared AudioContext for every one-shot SFX below (NOT the looping background
// music above, which stays a plain <audio> element — looping/streaming doesn't need
// this). A brand-new `new Audio(url)` per play() call (the old approach) has to
// fetch+decode from scratch every single time, which reads as a real ~0.3s lag
// between an action and its sound specifically on mobile (slower CPU decode). Web
// Audio decodes each file's bytes into an AudioBuffer ONCE (see loadSfxBuffer,
// kicked off eagerly by preloadSounds()), so every later play just schedules an
// already-decoded buffer — near-instant even on mobile
const AudioContextCtor: typeof AudioContext | undefined =
  window.AudioContext ??
  (window as unknown as { webkitAudioContext?: typeof AudioContext })
    .webkitAudioContext;
let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (!AudioContextCtor) return null; // unsupported browser — callers no-op via optional chaining
  if (!audioCtx) audioCtx = new AudioContextCtor();
  return audioCtx;
}

// same autoplay-policy workaround startBackgroundMusic already needs for <audio> —
// a fresh AudioContext starts "suspended" until the user has interacted with the
// page at least once
function resumeAudioContextOnGesture(ctx: AudioContext): void {
  if (ctx.state === "running") return;
  const retry = () => {
    ctx.resume().catch(() => {});
    window.removeEventListener("pointerdown", retry);
    window.removeEventListener("keydown", retry);
  };
  window.addEventListener("pointerdown", retry);
  window.addEventListener("keydown", retry);
}

const sfxUrls = {
  coinDrop: coinDropUrl,
  swoosh: swooshUrl,
  sold: soldUrl,
  explosion: explosionUrl,
  bloop: bloopUrl,
  bubble: bubbleUrl,
  win: winUrl,
  payout: payoutUrl,
} as const;
type SfxName = keyof typeof sfxUrls;

const sfxBufferCache = new Map<SfxName, Promise<AudioBuffer>>();

function loadSfxBuffer(ctx: AudioContext, name: SfxName): Promise<AudioBuffer> {
  const cached = sfxBufferCache.get(name);
  if (cached) return cached;
  const promise = fetch(sfxUrls[name])
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data));
  sfxBufferCache.set(name, promise);
  return promise;
}

// kicks off decoding every one-shot SFX up front; call once from main.ts alongside
// its other asset preloading, well before the player can actually act on anything —
// by the time gameplay starts, every playX() below just schedules an
// already-decoded buffer instead of fetching/decoding for the first time on that
// very click
export function preloadSounds(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContextOnGesture(ctx);
  (Object.keys(sfxUrls) as SfxName[]).forEach((name) => {
    loadSfxBuffer(ctx, name).catch(() => {});
  });
}

// plays a preloaded SFX buffer starting offsetSeconds into it (0 = from the very
// start) at the given linear volume and playbackRate (1 = unchanged pitch/speed) —
// fire-and-forget, a fresh BufferSource node per call since each one can only ever
// be started once
function playSfx(
  name: SfxName,
  volume: number,
  offsetSeconds = 0,
  rate = 1,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  loadSfxBuffer(ctx, name)
    .then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0, Math.min(offsetSeconds, buffer.duration));
    })
    .catch(() => {});
}

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

// one-shot sound effect, played on every successful upgrade-button purchase.
// Debounced (see COIN_DROP_DEBOUNCE_MS) so the press-and-hold auto-repeat's fastest
// tier doesn't stack dozens of overlapping plays into distorted noise
export function playCoinDrop(): void {
  const now = Date.now();
  if (now - lastCoinDropPlayTime < COIN_DROP_DEBOUNCE_MS) return;
  lastCoinDropPlayTime = now;
  playSfx("coinDrop", COIN_DROP_VOLUME);
}

// one-shot sound effect for opening/closing any of the action bar's dialogs
// (upgrade menu, boost menu, map menu) or switching to/from the static map view.
// skips swoosh.mp3's own brief quiet lead-in so it reads as instant on click
export function playSwoosh(): void {
  playSfx("swoosh", SFX_VOLUME, 0.1);
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
  playSfx("sold", SFX_VOLUME, 0.5);
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
  playSfx("explosion", SFX_VOLUME, 0.04);
}

// one-shot sound effect for clicking a cat or the mouse, and for hitting the
// every-10th-upgrade floor milestone; debounced (see BLOOP_DEBOUNCE_MS) so one
// click landing on several targets only plays once
export function playBloop(): void {
  const now = Date.now();
  if (now - lastBloopPlayTime < BLOOP_DEBOUNCE_MS) return;
  lastBloopPlayTime = now;
  playSfx("bloop", SFX_VOLUME);
}

// one-shot sound effect for the rare mega-crit "JACKPOT!" moment (see
// floorInteractions.ts). Debounced (see JACKPOT_DEBOUNCE_MS) so back-to-back mega
// crits during a fast held click can't stack overlapping plays
export function playJackpot(): void {
  const now = Date.now();
  if (now - lastJackpotPlayTime < JACKPOT_DEBOUNCE_MS) return;
  lastJackpotPlayTime = now;
  playSfx("win", SFX_VOLUME);
}

// one-shot sound effect for the even rarer ultra-crit moment (see
// floorInteractions.ts). Debounced (see PAYOUT_DEBOUNCE_MS) so back-to-back ultra
// crits during a fast held click can't stack overlapping plays
export function playPayout(): void {
  const now = Date.now();
  if (now - lastPayoutPlayTime < PAYOUT_DEBOUNCE_MS) return;
  lastPayoutPlayTime = now;
  playSfx("payout", SFX_VOLUME);
}

// one-shot sound effect for hud/pressConferenceGame's own flap — its own
// sound, not a reuse of playBloop, so tuning/debouncing it never affects that
// shared cat-click/milestone sfx
export function playBubble(): void {
  playSfx("bubble", SFX_VOLUME);
}
