import type { Floor } from "../../gameState";
import {
  type CritTier,
  CRIT_TIER_CONFIG,
  BOOST_CRIT_COLOR,
  BOOST_CRIT_LABEL,
} from "../upgradeButton";
import { spawnCoinBurst } from "../coins";
import {
  playCoinDrop,
  playExplosion,
  playJackpot,
  playPayout,
} from "../../sound";
import { triggerScreenShake, isCritFlashActive } from "../../screenShake";
import { COLOR } from "../../palette";

function tierColor(tier: CritTier): string {
  if (tier === "ultra") return COLOR.red;
  if (tier === "mega") return COLOR.amber;
  return COLOR.purple;
}

// the shake/flash/sfx treatment for a landed tier, tier-scaled — `label`/
// `color` let a piggyback proc (see celebrateChain/celebrateBoost below) show
// its own text/color in place of the tier's default "x5"/"x25"/"x125" purple/
// amber/red, while keeping that tier's own intensity/duration/priority
function playTierFlash(tier: CritTier, label: string, color: string): void {
  if (tier === "ultra") {
    // blinkHz strobes the flash text on/off during its holdMs "stick" phase, on
    // top of its regular grow/fade animation. holdMs is deliberately an EXACT
    // odd multiple of the blink's own half-cycle (1000/(blinkHz*2) = 83.33ms
    // at blinkHz=6; 15 * 83.33 = 1250) — this makes the on/off pattern always
    // land back "on" (full alpha) exactly when the hold phase ends, so the
    // fade-out below (which always starts from alpha=1) never has to jump or
    // warp the blink's own timing to transition smoothly; every single blink
    // cycle stays a plain, identical-duration on/off toggle (see
    // screenShake.ts's own drawCritFlash). Total on-screen lifetime =
    // GROWTH_DURATION_MS(100) + holdMs(1250) + fadeDurationMs(intensity-scaled,
    // ~576ms at 2.6) ≈ 1.93s, matching playPayout's own fade window (see
    // sound/index.ts) closely enough that neither the flash nor the sound
    // outlasts the other.
    // priority 2 is the highest tier, so it can never be cut off early by a
    // mega/crit rolling moments later (see triggerScreenShake's own suppression)
    triggerScreenShake({
      intensity: 2.6,
      label,
      color,
      strokeWidth: 16,
      blinkHz: 6,
      holdMs: 1250,
      priority: 2,
    });
    playPayout();
  } else if (tier === "mega") {
    // priority 1: can interrupt a plain crit's flash, but never an in-progress
    // ultra celebration (priority 2)
    triggerScreenShake({
      intensity: 1.8,
      label,
      color,
      strokeWidth: 14,
      priority: 1,
    });
    playJackpot();
  } else {
    // priority 0 (the default): the only tier that can ever get suppressed by
    // a still-playing mega/ultra flash, so those bigger moments are never
    // stepped on by an immediately-following ordinary crit
    triggerScreenShake({ label, color });
    playCoinDrop();
    playExplosion();
  }
}

// chain/boost celebrations (see celebrateChain/celebrateBoost below) never
// scale with the actual landed tier — always this same punchy "25x" flash
// (no ultra-style blink/hold to sit through) and its own sfx, regardless of
// whether a crit/mega/ultra was what actually procced them
function playSpecialFlash(label: string, color: string): void {
  triggerScreenShake({
    intensity: 1.8,
    label,
    color,
    strokeWidth: 14,
    priority: 1,
  });
  playExplosion();
}

// bursts on top of whatever the caller's own reward already spawned, so the
// celebration keeps erupting for as long as the flash/shake animation plays
// out. First one is dead center (matching the flash text) at 0s; the rest are
// staggered outward so they read as separate pops, not one simultaneous burst.
// Each tier up gets more bursts spread wider/longer, matching its bigger
// shake/flash duration. Re-read fresh at each delayed spawn in case the user
// scrolls in between
function spawnTierBursts(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  const CENTER_BURST_OFFSET_PX = 200;
  const CENTER_BURST_OFFSET_PY = 100;
  const MEGA_BURST_OFFSET_PX = 260;
  const MEGA_BURST_OFFSET_PY = 140;
  const ULTRA_BURST_OFFSET_PX = 320;
  const ULTRA_BURST_OFFSET_PY = 170;
  const centerBursts: { offsetX: number; offsetY: number; delayMs: number }[] =
    tier === "ultra"
      ? [
          { offsetX: 0, offsetY: 0, delayMs: 0 },
          { offsetX: 0, offsetY: -ULTRA_BURST_OFFSET_PY, delayMs: 90 },
          {
            offsetX: ULTRA_BURST_OFFSET_PX,
            offsetY: -ULTRA_BURST_OFFSET_PY / 2,
            delayMs: 180,
          },
          {
            offsetX: ULTRA_BURST_OFFSET_PX,
            offsetY: ULTRA_BURST_OFFSET_PY / 2,
            delayMs: 270,
          },
          { offsetX: 0, offsetY: ULTRA_BURST_OFFSET_PY, delayMs: 360 },
          {
            offsetX: -ULTRA_BURST_OFFSET_PX,
            offsetY: ULTRA_BURST_OFFSET_PY / 2,
            delayMs: 450,
          },
          {
            offsetX: -ULTRA_BURST_OFFSET_PX,
            offsetY: -ULTRA_BURST_OFFSET_PY / 2,
            delayMs: 540,
          },
        ]
      : tier === "mega"
        ? [
            { offsetX: 0, offsetY: 0, delayMs: 0 },
            {
              offsetX: -MEGA_BURST_OFFSET_PX,
              offsetY: -MEGA_BURST_OFFSET_PY,
              delayMs: 120,
            },
            {
              offsetX: MEGA_BURST_OFFSET_PX,
              offsetY: -MEGA_BURST_OFFSET_PY,
              delayMs: 240,
            },
            {
              offsetX: -MEGA_BURST_OFFSET_PX,
              offsetY: MEGA_BURST_OFFSET_PY,
              delayMs: 360,
            },
            {
              offsetX: MEGA_BURST_OFFSET_PX,
              offsetY: MEGA_BURST_OFFSET_PY,
              delayMs: 480,
            },
          ]
        : [
            { offsetX: 0, offsetY: 0, delayMs: 0 },
            {
              offsetX: -CENTER_BURST_OFFSET_PX,
              offsetY: -CENTER_BURST_OFFSET_PY,
              delayMs: 100,
            },
            {
              offsetX: CENTER_BURST_OFFSET_PX,
              offsetY: CENTER_BURST_OFFSET_PY,
              delayMs: 200,
            },
          ];
  for (const { offsetX, offsetY, delayMs } of centerBursts) {
    // a little random scatter/timing jitter on top of each burst's own base
    // spot — keeps repeated crits from erupting in the exact same
    // choreographed pattern every single time
    const jitterX = offsetX + (Math.random() - 0.5) * 40;
    const jitterY = offsetY + (Math.random() - 0.5) * 40;
    const jitteredDelayMs = Math.max(0, delayMs + (Math.random() - 0.5) * 40);
    setTimeout(() => {
      const p = getScreenCenterLocal(floor);
      spawnCoinBurst(floor, p.x + jitterX, p.y + jitterY, () => {});
    }, jitteredDelayMs);
  }
}

function celebrateTier(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playTierFlash(tier, CRIT_TIER_CONFIG[tier].label, tierColor(tier));
  spawnTierBursts(floor, tier, getScreenCenterLocal);
}

// chain crit (see upgradeButton.ts's isChainCrit/rollFloorBuyCrit's own chain
// flag): the flash shows the word "Chain" instead of the tier's usual "x5"/
// "x25"/"x125" number — a celebration-moment-only swap, the upgrade button's
// own idle/armed label is untouched and still always shows the plain tier
// label. Keeps the tier's own color (chain has no dedicated color of its own)
function celebrateChain(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash("Chain", tierColor(tier));
  spawnTierBursts(floor, tier, getScreenCenterLocal);
}

// boost crit (see upgradeButton.ts's isBoostCrit): same swap as chain above,
// but with its own dedicated blue and an extra punch (its free-worker payout)
// on top of the tier's own flash/sound/bursts
function celebrateBoost(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(BOOST_CRIT_LABEL, BOOST_CRIT_COLOR);
  spawnTierBursts(floor, tier, getScreenCenterLocal);
  playCoinDrop();
  const p = getScreenCenterLocal(floor);
  spawnCoinBurst(floor, p.x, p.y, () => {});
}

// chain and boost are both "special" procs riding the SAME landed tier (see
// isChainCrit/isBoostCrit) — when only one lands it plays immediately same as
// any plain crit, but when BOTH land on the same click they each get their own
// full turn, one after another, instead of one replacing (or silently
// dropping) the other. Regular (non-special) crits never join this queue —
// they're simply skipped while a special celebration is still due, rather
// than piling up behind it (see triggerCritCelebration below)
interface QueuedCelebration {
  kind: "chain" | "boost";
  queuedAt: number;
  run: () => void;
}
const specialCelebrationQueue: QueuedCelebration[] = [];
let drainingSpecialQueue = false;

// a bulk-buy hold (x250 multiplier) can land many chain/boost procs far
// faster than they can each get their own on-screen turn — anything still
// waiting once it's this stale is long past the moment it actually happened,
// so it's dropped rather than played back late; and only one of each kind is
// ever queued at once (see the dedupe in triggerCritCelebration below), so a
// pile of identical "Chain" procs never replays the same celebration on repeat
const CELEBRATION_QUEUE_MAX_AGE_MS = 2000;

function drainSpecialCelebrationQueue(): void {
  if (drainingSpecialQueue) return;
  drainingSpecialQueue = true;
  const step = () => {
    if (isCritFlashActive(Date.now())) {
      setTimeout(step, 100);
      return;
    }
    const next = specialCelebrationQueue.shift();
    if (!next) {
      drainingSpecialQueue = false;
      return;
    }
    if (Date.now() - next.queuedAt > CELEBRATION_QUEUE_MAX_AGE_MS) {
      step();
      return;
    }
    next.run();
    setTimeout(step, 100);
  };
  step();
}

// the one shared "how does a crit tier celebrate" trigger — shake/flash/sfx/coin
// bursts, tier-scaled. Extracted out of the upgrade-button click branch so any
// OTHER click that can roll a crit tier (the Sale-boost click below, later a
// floor-unlock purchase) gets the exact same weighted celebration instead of each
// call site hand-rolling (and inevitably drifting from) its own copy. Deliberately
// does NOT decide what a crit actually REWARDS (extra upgrades vs a bigger sale
// payout vs whatever a future caller wants) — that stays the caller's own concern.
// Labels always come from CRIT_TIER_CONFIG (the one canonical source); the flash's
// own color intentionally does NOT always match CRIT_TIER_CONFIG[tier].color (that
// one's the upgrade BUTTON's color) — mega's button is gold but its flash text is
// amber/orange per an explicit earlier request, so the flash keeps its own colors
export function triggerCritCelebration(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
  chain = false,
  boost = false,
): void {
  if (chain || boost) {
    const now = Date.now();
    // one of each kind at a time — a rapid pile-up of the same proc (e.g. a
    // bulk-buy hold repeatedly rolling "chain") shouldn't queue up N replays
    // of the identical celebration, just the first still-fresh one
    if (chain && !specialCelebrationQueue.some((q) => q.kind === "chain")) {
      specialCelebrationQueue.push({
        kind: "chain",
        queuedAt: now,
        run: () => celebrateChain(floor, tier, getScreenCenterLocal),
      });
    }
    if (boost && !specialCelebrationQueue.some((q) => q.kind === "boost")) {
      specialCelebrationQueue.push({
        kind: "boost",
        queuedAt: now,
        run: () => celebrateBoost(floor, tier, getScreenCenterLocal),
      });
    }
    drainSpecialCelebrationQueue();
    return;
  }
  // a plain tier crit with no special proc: only worth celebrating if nothing
  // special is still queued/playing — omitted entirely rather than cutting in
  // front of (or piling up behind) whatever special celebration is still due
  if (specialCelebrationQueue.length > 0 || isCritFlashActive(Date.now())) {
    return;
  }
  celebrateTier(floor, tier, getScreenCenterLocal);
}
