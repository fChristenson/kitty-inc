const soundUrl = (filename: string) => `${import.meta.env.BASE_URL}${filename}`;
const themeUrl = soundUrl("theme.mp3");
const coinDropUrl = soundUrl("coinDrop.mp3");
const swooshUrl = soundUrl("swoosh.mp3");
const soldUrl = soundUrl("sold.mp3");
const bloopUrl = soundUrl("bloop.mp3");
const explosionUrl = soundUrl("explosion.mp3");
const winUrl = soundUrl("win.wav");
const payoutUrl = soundUrl("payout.wav");
const arcadeSlotWinUrl = soundUrl("arcadeSlotWin.wav");
const magicCoinUrl = soundUrl("magicCoin.wav");
const notificationUrl = soundUrl("notification.wav");

const MUSIC_VOLUME = 0.3; // 25% quieter than the original 0.4 per explicit request
const SFX_VOLUME = 0.9;
// 50% louder than the shared SFX_VOLUME per explicit request — playSfx uses a
// GainNode (not <audio>.volume), so this actually plays louder instead of
// silently clamping flat at 1.0 the way the old Math.min(..., 1) version did
const COIN_DROP_VOLUME = SFX_VOLUME * 1.5;
// 25% quieter than the shared SFX_VOLUME per explicit request — the mega-crit
// (25x) jackpot sfx
const JACKPOT_VOLUME = SFX_VOLUME * 0.6;
// 50% quieter than the shared SFX_VOLUME per explicit request
const ARCADE_SLOT_WIN_VOLUME = SFX_VOLUME * 0.25;
// 25% louder than the shared SFX_VOLUME per explicit request — the "cash
// register" purchase sfx
const SOLD_VOLUME = SFX_VOLUME * 1.5;
// 50% louder than the shared SFX_VOLUME per explicit request — the
// Sale/Overtime event-ending cue
const NOTIFICATION_VOLUME = SFX_VOLUME * 2;

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

// same idea again, for the "special crit crit" bonus-tier moment
const MAGIC_COIN_DEBOUNCE_MS = 800;
let lastMagicCoinPlayTime = 0;

// any press-and-hold-driven purchase loop (corporationUpgradeMenu's building-
// upgrade holds, etc.) can call this many times a second — without a debounce, each of
// those schedules its own overlapping playback, so sound kept audibly playing
// catch-up well after the hold had already stopped instead of just being skipped
const SOLD_DEBOUNCE_MS = 60;
let lastSoldPlayTime = 0;

// Sounds for actions the GAME takes on its own — the cloud-cat auto-buyer's
// purchases, a hired manager's periodic re-boost — rather than ones the player
// clicked. These fire unattended, from more places the longer a save runs (one
// manager timer per managed floor), so without a shared cap they pile into
// constant noise. One gate for all of them, so adding another automated sound
// can't reintroduce the spam.
const AUTO_ACTION_DEBOUNCE_MS = 2000;
const lastAutoActionPlayTime = new Map<string, number>();

function autoActionAllowed(key: string): boolean {
  const now = Date.now();
  const last = lastAutoActionPlayTime.get(key) ?? 0;
  if (now - last < AUTO_ACTION_DEBOUNCE_MS) return false;
  lastAutoActionPlayTime.set(key, now);
  return true;
}

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
  // "interactive" asks for the smallest output buffer the device supports, so a
  // scheduled sound reaches the speakers as soon as possible — the default
  // ("balanced") trades latency for power on some platforms, which reads as the
  // sfx lagging behind the click that caused it
  if (!audioCtx)
    audioCtx = new AudioContextCtor({ latencyHint: "interactive" });
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
  win: winUrl,
  payout: payoutUrl,
  arcadeSlotWin: arcadeSlotWinUrl,
  magicCoin: magicCoinUrl,
  notification: notificationUrl,
} as const;
type SfxName = keyof typeof sfxUrls;

const sfxBufferCache = new Map<SfxName, Promise<AudioBuffer>>();
// the RESOLVED buffers, kept alongside the promise cache above purely so playSfx
// can start an already-decoded sound synchronously — see startBuffer's call sites
const decodedSfxBuffers = new Map<SfxName, AudioBuffer>();

function loadSfxBuffer(ctx: AudioContext, name: SfxName): Promise<AudioBuffer> {
  const cached = sfxBufferCache.get(name);
  if (cached) return cached;
  const promise = fetch(sfxUrls[name])
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      decodedSfxBuffers.set(name, buffer);
      return buffer;
    });
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
// be started once. maxDurationSeconds (if given) hard-cuts playback at that point,
// linearly fading the gain to 0 over the last fadeOutSeconds instead of an abrupt
// stop — used by playPayout to keep the ultra-crit sound in sync with its own
// shortened on-screen flash text
function playSfx(
  name: SfxName,
  volume: number,
  offsetSeconds = 0,
  rate = 1,
  maxDurationSeconds?: number,
  fadeOutSeconds = 0.4,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const startBuffer = (buffer: AudioBuffer) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    const startAt = ctx.currentTime;
    source.start(0, Math.min(offsetSeconds, buffer.duration));
    if (maxDurationSeconds !== undefined) {
      const fadeStartAt =
        startAt + Math.max(0, maxDurationSeconds - fadeOutSeconds);
      gain.gain.setValueAtTime(volume, fadeStartAt);
      gain.gain.linearRampToValueAtTime(0, startAt + maxDurationSeconds);
      source.stop(startAt + maxDurationSeconds);
    }
  };
  // the whole point of preloadSounds: once a buffer is decoded, start it RIGHT
  // HERE, in the same synchronous call the click handler made. Going through the
  // cached promise's .then() instead would push source.start() into a microtask,
  // which can't run until the entire click handler (crit rewards, coin bursts,
  // celebrations, persist) has finished — so the sound trailed the click by
  // however long all of that took
  const decoded = decodedSfxBuffers.get(name);
  if (decoded) {
    startBuffer(decoded);
    return;
  }
  loadSfxBuffer(ctx, name)
    .then(startBuffer)
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
  playSfx("sold", SOLD_VOLUME, 0.5);
}

// same sound, capped at one per AUTO_ACTION_DEBOUNCE_MS — for purchases the
// game makes on the player's behalf rather than ones they clicked
export function playAutoPurchase(): void {
  if (!autoActionAllowed("autoPurchase")) return;
  playSold();
}

// the click-celebration bloop a hired manager's own periodic re-boost fires,
// capped the same way: every managed floor runs its own boost timer, so at
// scale these overlap into a constant stream
export function playAutoBoost(): void {
  if (!autoActionAllowed("autoBoost")) return;
  playBloop();
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
  playSfx("win", JACKPOT_VOLUME);
}

// Sale/Overtime running out — debounced so several floors' events expiring
// together play one cue
const EVENT_ENDED_DEBOUNCE_MS = 800;
let lastEventEndedPlayTime = 0;
export function playEventEnded(): void {
  const now = Date.now();
  if (now - lastEventEndedPlayTime < EVENT_ENDED_DEBOUNCE_MS) return;
  lastEventEndedPlayTime = now;
  playSfx("notification", NOTIFICATION_VOLUME);
}

// how long the event-ending cue plays, so animations can span it exactly;
// falls back to notification.wav's measured length until it has decoded
export function getEventEndedDurationMs(): number {
  const buffer = decodedSfxBuffers.get("notification");
  return buffer ? buffer.duration * 1000 : 1467;
}

// one-shot sound effect for the even rarer ultra-crit moment (see
// floorInteractions.ts). Debounced (see PAYOUT_DEBOUNCE_MS) so back-to-back ultra
// crits during a fast held click can't stack overlapping plays. Capped at ~1.93s
// (matching critCelebration.ts's own total flash lifetime) and faded over its
// last 0.576s to match the flash text's own fade-out phase duration exactly
// (see screenShake.ts) — both end together with a smooth fade, instead of the
// sound outlasting the (now much shorter) flash by playing the full ~3s .wav
// past the point the screen's gone quiet
export function playPayout(): void {
  const now = Date.now();
  if (now - lastPayoutPlayTime < PAYOUT_DEBOUNCE_MS) return;
  lastPayoutPlayTime = now;
  playSfx("payout", SFX_VOLUME, 0, 1, 1.926, 0.576);
}

// one-shot sound effect for the "special crit crit" bonus-tier moment (see
// critCelebration.ts's celebrateBonusTier) — always this same sfx regardless
// of which bonus tier (5x/25x/125x) actually landed, since this moment is its
// own distinct "magic coin hit", not a graduated crit/jackpot/payout escalation.
// Debounced (see MAGIC_COIN_DEBOUNCE_MS) so back-to-back bonus tiers during
// a fast held click can't stack overlapping plays
export function playBonusTierMagicCoin(): void {
  const now = Date.now();
  if (now - lastMagicCoinPlayTime < MAGIC_COIN_DEBOUNCE_MS) return;
  lastMagicCoinPlayTime = now;
  playSfx("magicCoin", SFX_VOLUME);
}

// the same slot-machine sfx over the Boost event's coin stream
export function playBoostEventStream(): void {
  playSfx("arcadeSlotWin", ARCADE_SLOT_WIN_VOLUME);
}
