import type { Floor } from "../../gameState";
import {
  type CritProcKind,
  type CritProcFlags,
  CRIT_PROC_INFO,
  CRIT_PROC_KINDS,
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
} from "../critTypes";

import { spawnFreezeCoinBurst } from "../../floors/coins";
import { playCoinDrop } from "../../sound";
import {
  playTierFlash,
  playSpecialFlash,
  STACK_DOWN,
  STACK_UP,
  TIER_FLASH_STROKE_WIDTH,
} from "../critFlash/presets";
import type { FlashMoment } from "../momentCrits";
import {
  playCritMerge,
  type FlashStack,
  isCritFlashActive,
  getFlashHoldEndsAt,
  freezeCritFlashAsBackground,
} from "../critFlash";
import { celebrateBonusTier, tierColor } from "./bonusTierReward";

import { getScreenUnfrozenAt, isScreenFrozen } from "../../shared/screenFreeze";

// crit celebrations are flash + sound only: no coin bursts (perf)
function celebrateTier(tier: CritTier, moment: FlashMoment | null): void {
  playTierFlash(
    tier,
    CRIT_TIER_CONFIG[tier].label,
    tierColor(tier),
    null,
    0,
    moment,
  );
}

// stacked crits: a crit up's or crit down's copy on the floor above/below
// lands in quick succession, each new number landing at its offset over the
// ones before it; every number but the last buzzes a short pulse, so the
// phone gives one distinct kick per number
const STACK_STEP_MS = 200;
const STACK_PULSE_MS = 120;

// what stacks on a landed crit; merge is a merge crit's second number
export interface CritStacking {
  up?: boolean;
  down?: boolean;
  merge?: CritTier;
}

interface StackStep {
  tier: CritTier;
  label: string;
  stack: FlashStack | null;
}

// a merge crit flashes as the tier its sum reaches
const tierOfMultiplier = (multiplier: number): CritTier =>
  multiplier >= CRIT_TIER_CONFIG.ultra.multiplier
    ? "ultra"
    : multiplier >= CRIT_TIER_CONFIG.mega.multiplier
      ? "mega"
      : "crit";

function stackSteps(
  landedTier: CritTier,
  { up, down, merge }: CritStacking,
): StackStep[] {
  const multiplier = merge
    ? CRIT_TIER_CONFIG[landedTier].multiplier +
      CRIT_TIER_CONFIG[merge].multiplier
    : undefined;
  const tier = multiplier ? tierOfMultiplier(multiplier) : landedTier;
  const label = multiplier ? `x${multiplier}` : CRIT_TIER_CONFIG[tier].label;
  const steps: StackStep[] = [{ tier, label, stack: null }];
  if (up) steps.push({ tier, label, stack: STACK_UP });
  if (down) steps.push({ tier, label, stack: STACK_DOWN });
  return steps;
}

// a merge crit's two numbers charge in, circle each other and smash after this
const MERGE_MS = 900;

const mergeNumber = (tier: CritTier) => ({
  label: CRIT_TIER_CONFIG[tier].label,
  color: tierColor(tier),
  strokeWidth: TIER_FLASH_STROKE_WIDTH[tier],
});

function celebrateStack(
  steps: StackStep[],
  landedTier: CritTier,
  { merge }: CritStacking,
  moment: FlashMoment | null,
): void {
  let delay = 0;
  if (merge) {
    playCritMerge(
      mergeNumber(landedTier),
      mergeNumber(merge),
      {
        label: steps[0].label,
        color: tierColor(steps[0].tier),
        strokeWidth: TIER_FLASH_STROKE_WIDTH[steps[0].tier],
      },
      MERGE_MS,
    );
    delay = MERGE_MS;
  }
  steps.forEach(({ tier, label, stack }, i) =>
    setTimeout(
      () =>
        playTierFlash(
          tier,
          label,
          tierColor(tier),
          stack,
          i < steps.length - 1 ? STACK_PULSE_MS : 0,
          // a lone number fires; a stack of them doesn't
          steps.length === 1 ? moment : null,
        ),
      delay + i * STACK_STEP_MS,
    ),
  );
}

// chain crit (see upgradeButton.ts's isChainCrit/rollFloorBuyCrit's own chain
// flag): the flash shows the word "Chain" instead of the tier's usual "x5"/
// "x25"/"x125" number — a celebration-moment-only swap, the upgrade button's
// own idle/armed label is untouched and still always shows the plain tier
// label. Keeps the tier's own color (chain has no dedicated color of its own)
function celebrateChain(tier: CritTier): void {
  playSpecialFlash("Chain", tierColor(tier));
}

// boost crit (see upgradeButton.ts's isBoostCrit): same swap as chain above,
// but with its own dedicated blue and an extra coin-drop sound
function celebrateBoost(): void {
  playSpecialFlash(BOOST_CRIT_LABEL, BOOST_CRIT_COLOR);
  playCoinDrop();
}

// sunshine crit (see upgradeButton.ts's isSunshineCrit): same celebration
// shape as boost above (the reward itself — a longer-lasting free worker
// boost — is applied by floorInteractions.ts), just its own dedicated gold
function celebrateSunshine(): void {
  playSpecialFlash(SUNSHINE_CRIT_LABEL, SUNSHINE_CRIT_COLOR);
  playCoinDrop();
}

// snowday crit (see upgradeButton.ts's isSnowdayCrit): same celebration
// shape as boost/sunshine above (the reward itself — an even longer-lasting
// free worker boost — is applied by floorInteractions.ts), its own dedicated
// frost color
function celebrateSnowday(): void {
  playSpecialFlash(SNOWDAY_CRIT_LABEL, SNOWDAY_CRIT_COLOR);
  playCoinDrop();
}

// night shift crit (see upgradeButton.ts's isNightShiftCrit): same
// celebration shape as boost/sunshine/snowday above (the reward itself — a
// shorter free worker boost plus a temporary +1-worker boost-strength bonus
// — is applied by floorInteractions.ts), its own dedicated midnight indigo
function celebrateNightShift(): void {
  playSpecialFlash(NIGHT_SHIFT_CRIT_LABEL, NIGHT_SHIFT_CRIT_COLOR);
  playCoinDrop();
}

// bounce crit (see upgradeButton.ts's isBounceCrit): same swap as chain
// above, keeping the landed tier's own color (climbing the building from the
// bottom up is applied by floorInteractions.ts, this only covers the
// celebration moment)
function celebrateBounce(tier: CritTier): void {
  playSpecialFlash(BOUNCE_CRIT_LABEL, tierColor(tier));
}

// heavenly crit (see upgradeButton.ts's isHeavenlyCrit): the single biggest
// reward in the game, so it gets the same "ultra-strength" flash treatment
// ultra tiers themselves use (long strobing hold, top priority) regardless of
// which tier actually landed alongside it — the reward itself (unlock all/
// max every tier/grant every floor a max-tier upgrade batch) is applied by
// floorInteractions.ts, this only covers the celebration moment
function celebrateHeavenly(): void {
  playTierFlash("ultra", HEAVENLY_CRIT_LABEL, HEAVENLY_CRIT_COLOR);
}

// pair/three of a kind/four of a kind/full house/tick tock crits (see
// upgradeButton.ts's isPairCrit etc.): same flat "own label + own color"
// flash shape as boost/booty/upgrade/peppermint above — the reward itself
// (promoting a fixed number of floors'/buildings' own tier, or paying every
// floor twice) is applied by floorInteractions.ts/main.ts, this only covers
// the celebration moment. One shared helper instead of 5 near-identical
// functions, since only the label/color ever differ between them
function celebrateFlatProc(label: string, color: string): void {
  playSpecialFlash(label, color);
}

// explosion is the one proc whose flash takes the LANDED TIER's color rather
// than a dedicated one of its own
function celebrateExplosion(tier: CritTier): void {
  celebrateFlatProc(EXPLOSION_CRIT_LABEL, tierColor(tier));
}

// booty adds a coin drop sound on top of the standard flash
function celebrateBooty(): void {
  celebrateFlatProc(BOOTY_CRIT_LABEL, BOOTY_CRIT_COLOR);
  playCoinDrop();
}

// chain and boost are both "special" procs riding the SAME landed tier (see
// isChainCrit/isBoostCrit) — when only one lands it plays immediately same as
// any plain crit, but when BOTH land on the same click they each get their own
// full turn, one after another, instead of one replacing (or silently
// dropping) the other. Regular (non-special) crits never join this queue —
// they're simply skipped while a special celebration is still due, rather
// than piling up behind it (see triggerCritCelebration below)
interface QueuedCelebration {
  kind: CritProcKind | "bonusTier" | "critStack";
  queuedAt: number;
  maxAgeMs?: number;
  run: () => void;
}
const specialCelebrationQueue: QueuedCelebration[] = [];
let drainingSpecialQueue = false;
const DEJA_VU_REPEAT_COUNT = 2;
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
    // an event owns the screen: celebrations wait until it ends
    if (isScreenFrozen()) {
      setTimeout(step, 100);
      return;
    }
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
      Date.now() - Math.max(popped.queuedAt, getScreenUnfrozenAt()) >
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
import { isDetachedJobRunning } from "../../shared/detachedJob";

export function triggerCritCelebration(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
  procs?: Partial<CritProcFlags>,
  bonusTier: CritTier | null = null,
  onFollowUpProc?: (kind: CritProcKind) => void,
  stacking: CritStacking = {},
  // the number flying into the floor's bar once its flash has held
  moment: FlashMoment | null = null,
): void {
  if (isDetachedJobRunning()) {
    if (procs?.dejaVu) {
      for (const kind of pickDejaVuFollowUps(procs)) onFollowUpProc?.(kind);
    }
    return;
  }
  const landed = procs ? CRIT_PROC_KINDS.filter((kind) => procs[kind]) : [];
  const steps = stackSteps(tier, stacking);
  const stacked = steps.length > 1 || stacking.merge !== undefined;
  if (landed.length > 0 || stacked) {
    const now = Date.now();
    // the stacked numbers go first; the procs riding them flash after
    if (stacked)
      specialCelebrationQueue.push({
        kind: "critStack",
        queuedAt: now,
        run: () => celebrateStack(steps, tier, stacking, moment),
      });
    for (const kind of landed) {
      queueProcCelebration(kind, tier, now);
      // Deja Vu doesn't just FLASH extra procs, it grants them: each follow-up
      // is applied and tallied through the same path a real roll uses (see
      // floorInteractions' onFollowUpProc)
      if (kind === "dejaVu") {
        for (const followUp of pickDejaVuFollowUps(procs!)) {
          onFollowUpProc?.(followUp);
          queueProcCelebration(
            followUp,
            tier,
            now,
            DEJA_VU_FOLLOW_UP_MAX_AGE_MS,
            true,
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
        run: () =>
          celebrateBonusTier(bonusTier, (offsetX, offsetY, arrival) => {
            const p = getScreenCenterLocal(floor);
            spawnFreezeCoinBurst(floor, p.x + offsetX, p.y + offsetY, arrival);
          }),
      });
    }
    drainSpecialCelebrationQueue();
    return;
  }
  // a plain tier crit with no special proc: only worth celebrating if nothing
  // special is still queued/playing — omitted entirely rather than cutting in
  // front of (or piling up behind) whatever special celebration is still due
  if (
    isScreenFrozen() ||
    specialCelebrationQueue.length > 0 ||
    isCritFlashActive(Date.now())
  ) {
    return;
  }
  celebrateTier(tier, moment);
}

// the handful of procs whose flash is more than the standard label+color
// treatment celebrateFlatProc gives every other one
const CUSTOM_PROC_CELEBRATIONS: Partial<
  Record<CritProcKind, (tier: CritTier) => void>
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
  tier: CritTier,
  now: number,
  maxAgeMs?: number,
  allowDuplicate = false,
): void {
  if (!allowDuplicate && specialCelebrationQueue.some((q) => q.kind === kind))
    return;
  const custom = CUSTOM_PROC_CELEBRATIONS[kind];
  const info = CRIT_PROC_INFO[kind];
  specialCelebrationQueue.push({
    kind,
    queuedAt: now,
    maxAgeMs,
    run: () =>
      custom ? custom(tier) : celebrateFlatProc(info.label, info.color),
  });
}

// Deja Vu picks one random proc other than itself and repeats that same proc
// twice. Avoid procs already shown on this roll so the replay reads as a new
// bonus rather than a duplicate of the original flash.
function pickDejaVuFollowUps(procs: Partial<CritProcFlags>): CritProcKind[] {
  const available = CRIT_PROC_KINDS.filter(
    (kind) =>
      kind !== "dejaVu" &&
      !procs[kind] &&
      !specialCelebrationQueue.some((q) => q.kind === kind),
  );
  if (available.length === 0) return [];
  const repeated = available[Math.floor(Math.random() * available.length)];
  return Array.from({ length: DEJA_VU_REPEAT_COUNT }, () => repeated);
}
