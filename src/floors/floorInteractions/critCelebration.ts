import type { Floor } from "../../gameState";
import { type CritProcKind, type CritProcFlags } from "../../shared/critTypes";
import { CRIT_PROC_INFO, CRIT_PROC_KINDS } from "../../shared/critTypes";
import {
  type CritTier,
  CRIT_TIER_CONFIG,
  BOOST_CRIT_COLOR,
  BOOST_CRIT_LABEL,
  BOUNCE_CRIT_LABEL,
  EXPLOSION_CRIT_LABEL,
  BOOTY_CRIT_COLOR,
  BOOTY_CRIT_LABEL,
  HEAVENLY_CRIT_COLOR,
  HEAVENLY_CRIT_LABEL,
  SUNSHINE_CRIT_COLOR,
  SUNSHINE_CRIT_LABEL,
  SNOWDAY_CRIT_COLOR,
  SNOWDAY_CRIT_LABEL,
  NIGHT_SHIFT_CRIT_COLOR,
  NIGHT_SHIFT_CRIT_LABEL,
} from "../upgradeButton";
import { spawnCoinBurst } from "../coins";
import {
  playCoinDrop,
  playExplosion,
  playJackpot,
  playPayout,
  playArcadeSlotWin,
  playSold,
} from "../../sound";
import { spawnBonusTierCoins, triggerHudTotalFlash } from "../../bonusTierFx";
import {
  triggerScreenShake,
  isCritFlashActive,
  getFlashHoldEndsAt,
  freezeCritFlashAsBackground,
} from "../../screenShake";
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
    // sticks at full size/opacity this much longer before the regular
    // fade-out begins, so the icon+text stay on screen a beat longer once
    // fully shown — bumped +300ms per explicit request
    holdMs: 600,
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

// per-tier flash tuning for the "special crit crit" bonus tier's own
// celebration below — unlike a plain landed tier (celebrateTier above, whose
// only tier with a strobing hold is ultra), EVERY bonus tier blinks, scaled
// up per tier so a bigger multiplier sticks around proportionally longer.
// Each holdMs is an exact odd multiple of blinkHz's own half-cycle
// (1000/(6*2) ≈ 83.33ms), so the strobe always lands back "on" right as the
// hold ends and the fade-out can begin smoothly (same reasoning
// playTierFlash's own ultra branch already documents) — ultra's own value
// (1250) is unchanged from that existing tier
const BONUS_TIER_FLASH: Record<
  CritTier,
  { intensity: number; strokeWidth: number; holdMs: number; priority: number }
> = {
  crit: { intensity: 1.4, strokeWidth: 10, holdMs: 417, priority: 0 },
  mega: { intensity: 2, strokeWidth: 14, holdMs: 750, priority: 1 },
  ultra: { intensity: 2.6, strokeWidth: 16, holdMs: 1250, priority: 2 },
};

// "special crit crit" bonus tier (see shared/critTypes' getBonusTierCrit):
// always blinks/strobes regardless of which tier (5x/25x/125x) actually
// landed — the same treatment ultra's own plain-crit flash gets — and always
// plays arcadeSlotWin.wav instead of that tier's usual sfx, since this is
// always its own distinct "slot machine hit", not a graduated
// crit/jackpot/payout escalation
function celebrateBonusTier(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  const { intensity, strokeWidth, holdMs, priority } = BONUS_TIER_FLASH[tier];
  triggerScreenShake({
    intensity,
    label: CRIT_TIER_CONFIG[tier].label,
    color: tierColor(tier),
    strokeWidth,
    blinkHz: 6,
    holdMs,
    priority,
  });
  playArcadeSlotWin();
  spawnTierBursts(floor, tier, getScreenCenterLocal);
  // 3 coins fly from this very flash text up to the total-income readout,
  // shrinking as they go (see bonusTierFx's own doc comment) — once they all
  // arrive, the total itself flashes white + wiggles while the purchase sound
  // plays, so the moment reads as this reward physically merging into the total
  spawnBonusTierCoins(() => {
    triggerHudTotalFlash();
    playSold();
  });
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

// sunshine crit (see upgradeButton.ts's isSunshineCrit): same celebration
// shape as boost above (the reward itself — a longer-lasting free worker
// boost — is applied by floorInteractions.ts), just its own dedicated gold
function celebrateSunshine(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(SUNSHINE_CRIT_LABEL, SUNSHINE_CRIT_COLOR);
  spawnTierBursts(floor, tier, getScreenCenterLocal);
  playCoinDrop();
  const p = getScreenCenterLocal(floor);
  spawnCoinBurst(floor, p.x, p.y, () => {});
}

// snowday crit (see upgradeButton.ts's isSnowdayCrit): same celebration
// shape as boost/sunshine above (the reward itself — an even longer-lasting
// free worker boost — is applied by floorInteractions.ts), its own dedicated
// frost color
function celebrateSnowday(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(SNOWDAY_CRIT_LABEL, SNOWDAY_CRIT_COLOR);
  spawnTierBursts(floor, tier, getScreenCenterLocal);
  playCoinDrop();
  const p = getScreenCenterLocal(floor);
  spawnCoinBurst(floor, p.x, p.y, () => {});
}

// night shift crit (see upgradeButton.ts's isNightShiftCrit): same
// celebration shape as boost/sunshine/snowday above (the reward itself — a
// shorter free worker boost plus a temporary +1-worker boost-strength bonus
// — is applied by floorInteractions.ts), its own dedicated midnight indigo
function celebrateNightShift(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(NIGHT_SHIFT_CRIT_LABEL, NIGHT_SHIFT_CRIT_COLOR);
  spawnTierBursts(floor, tier, getScreenCenterLocal);
  playCoinDrop();
  const p = getScreenCenterLocal(floor);
  spawnCoinBurst(floor, p.x, p.y, () => {});
}

// bounce crit (see upgradeButton.ts's isBounceCrit): same swap as chain
// above, keeping the landed tier's own color (climbing the building from the
// bottom up is applied by floorInteractions.ts, this only covers the
// celebration moment)
function celebrateBounce(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(BOUNCE_CRIT_LABEL, tierColor(tier));
  spawnTierBursts(floor, tier, getScreenCenterLocal);
}

// heavenly crit (see upgradeButton.ts's isHeavenlyCrit): the single biggest
// reward in the game, so it gets the same "ultra-strength" flash treatment
// ultra tiers themselves use (long strobing hold, top priority) regardless of
// which tier actually landed alongside it — the reward itself (unlock all/
// max every tier/grant every floor a max-tier upgrade batch) is applied by
// floorInteractions.ts, this only covers the celebration moment
function celebrateHeavenly(
  floor: Floor,
  _tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  triggerScreenShake({
    intensity: 2.6,
    label: HEAVENLY_CRIT_LABEL,
    color: HEAVENLY_CRIT_COLOR,
    strokeWidth: 16,
    blinkHz: 6,
    holdMs: 1250,
    priority: 2,
  });
  playPayout();
  // always the biggest (ultra-shaped) burst pattern, since this moment is the
  // biggest regardless of which base tier happened to land with it
  spawnTierBursts(floor, "ultra", getScreenCenterLocal);
}

// pair/three of a kind/four of a kind/full house/tick tock crits (see
// upgradeButton.ts's isPairCrit etc.): same flat "own label + own color"
// flash shape as boost/booty/upgrade/peppermint above — the reward itself
// (promoting a fixed number of floors'/buildings' own tier, or paying every
// floor twice) is applied by floorInteractions.ts/main.ts, this only covers
// the celebration moment. One shared helper instead of 5 near-identical
// functions, since only the label/color ever differ between them
function celebrateFlatProc(
  label: string,
  color: string,
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(label, color);
  spawnTierBursts(floor, tier, getScreenCenterLocal);
}

// explosion is the one proc whose flash takes the LANDED TIER's color rather
// than a dedicated one of its own
function celebrateExplosion(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  celebrateFlatProc(
    EXPLOSION_CRIT_LABEL,
    tierColor(tier),
    floor,
    tier,
    getScreenCenterLocal,
  );
}

// booty adds a coin drop + burst on top of the standard flash
function celebrateBooty(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  celebrateFlatProc(
    BOOTY_CRIT_LABEL,
    BOOTY_CRIT_COLOR,
    floor,
    tier,
    getScreenCenterLocal,
  );
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
  kind: CritProcKind | "bonusTier";
  queuedAt: number;
  maxAgeMs?: number;
  run: () => void;
}
const specialCelebrationQueue: QueuedCelebration[] = [];
let drainingSpecialQueue = false;
const DEJA_VU_RANDOM_FOLLOW_UP_COUNT = 2;
const DEJA_VU_FOLLOW_UP_MAX_AGE_MS = 5000;

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
    // a queued "special crit crit" bonus tier never waits for the flash ahead
    // of it to run its full course (grow -> hold -> fade) like every other
    // queued kind does below — it freezes that flash as a static backdrop
    // the INSTANT its own hold phase ends (before any fade begins), then
    // takes over as the still-animating foreground flash drawn on top of it,
    // so the proc's own celebration reads as "holds, freezes, and the bonus
    // tier flash stacks over it" instead of "fully fades out, then a
    // separate flash starts fresh"
    const next = specialCelebrationQueue[0];
    if (next?.kind === "bonusTier") {
      const holdEndsAt = getFlashHoldEndsAt();
      if (holdEndsAt !== null && Date.now() < holdEndsAt) {
        setTimeout(step, 50);
        return;
      }
      freezeCritFlashAsBackground();
      specialCelebrationQueue.shift();
      next.run();
      setTimeout(step, 100);
      return;
    }
    if (isCritFlashActive(Date.now())) {
      setTimeout(step, 100);
      return;
    }
    const popped = specialCelebrationQueue.shift();
    if (!popped) {
      drainingSpecialQueue = false;
      return;
    }
    if (
      Date.now() - popped.queuedAt >
      (popped.maxAgeMs ?? CELEBRATION_QUEUE_MAX_AGE_MS)
    ) {
      step();
      return;
    }
    popped.run();
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
  procs?: Partial<CritProcFlags>,
  bonusTier: CritTier | null = null,
  onFollowUpProc?: (kind: CritProcKind) => void,
): void {
  const landed = procs ? CRIT_PROC_KINDS.filter((kind) => procs[kind]) : [];
  if (landed.length > 0) {
    const now = Date.now();
    for (const kind of landed) {
      queueProcCelebration(kind, floor, tier, getScreenCenterLocal, now);
      // Deja Vu doesn't just FLASH extra procs, it grants them: each follow-up
      // is applied and tallied through the same path a real roll uses (see
      // floorInteractions' onFollowUpProc)
      if (kind === "dejaVu") {
        for (const followUp of pickDejaVuFollowUps(procs!)) {
          onFollowUpProc?.(followUp);
          queueProcCelebration(
            followUp,
            floor,
            tier,
            getScreenCenterLocal,
            now,
            DEJA_VU_FOLLOW_UP_MAX_AGE_MS,
          );
        }
      }
    }
    // "special crit crit": queued AFTER every proc's own celebration above,
    // so it plays right after theirs holds/fades — the queue's own
    // one-at-a-time draining (drainSpecialCelebrationQueue) is what makes
    // this read as "show the special crit, then stack a plain x5/x25/x125
    // tier flash on top of it" instead of both flashing simultaneously
    if (
      bonusTier &&
      !specialCelebrationQueue.some((q) => q.kind === "bonusTier")
    ) {
      specialCelebrationQueue.push({
        kind: "bonusTier",
        queuedAt: now,
        run: () => celebrateBonusTier(floor, bonusTier, getScreenCenterLocal),
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

// the handful of procs whose flash is more than the standard label+color
// treatment celebrateFlatProc gives every other one
const CUSTOM_PROC_CELEBRATIONS: Partial<
  Record<
    CritProcKind,
    (
      floor: Floor,
      tier: CritTier,
      getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
    ) => void
  >
> = {
  chain: celebrateChain,
  boost: celebrateBoost,
  bounce: celebrateBounce,
  explosion: celebrateExplosion,
  booty: celebrateBooty,
  heavenly: celebrateHeavenly,
  sunshine: celebrateSunshine,
  snowday: celebrateSnowday,
  nightShift: celebrateNightShift,
};

// one of each kind at a time — a rapid pile-up of the same proc (e.g. a
// bulk-buy hold repeatedly rolling "chain") shouldn't queue up N replays of
// the identical celebration, just the first still-fresh one
function queueProcCelebration(
  kind: CritProcKind,
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
  now: number,
  maxAgeMs?: number,
): void {
  if (specialCelebrationQueue.some((q) => q.kind === kind)) return;
  const custom = CUSTOM_PROC_CELEBRATIONS[kind];
  const info = CRIT_PROC_INFO[kind];
  specialCelebrationQueue.push({
    kind,
    queuedAt: now,
    maxAgeMs,
    run: () =>
      custom
        ? custom(floor, tier, getScreenCenterLocal)
        : celebrateFlatProc(
            info.label,
            info.color,
            floor,
            tier,
            getScreenCenterLocal,
          ),
  });
}

// Deja Vu's own bonus procs: only kinds that did NOT land on this roll, so it
// always reads as "and these too" rather than replaying what already showed.
// bullMarket is excluded — it has no per-floor reward to grant
function pickDejaVuFollowUps(procs: Partial<CritProcFlags>): CritProcKind[] {
  const available = CRIT_PROC_KINDS.filter(
    (kind) =>
      kind !== "dejaVu" &&
      kind !== "bullMarket" &&
      !procs[kind] &&
      !specialCelebrationQueue.some((q) => q.kind === kind),
  );
  const picked: CritProcKind[] = [];
  for (
    let i = 0;
    i < DEJA_VU_RANDOM_FOLLOW_UP_COUNT && available.length > 0;
    i++
  ) {
    const index = Math.floor(Math.random() * available.length);
    picked.push(available.splice(index, 1)[0]);
  }
  return picked;
}
