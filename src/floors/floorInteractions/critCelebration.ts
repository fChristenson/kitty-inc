import type { Floor } from "../../gameState";
import { type CritProcKind } from "../../shared/critTypes";
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
  UPGRADE_CRIT_COLOR,
  UPGRADE_CRIT_LABEL,
  PEPPERMINT_CRIT_COLOR,
  PEPPERMINT_CRIT_LABEL,
  HEAVENLY_CRIT_COLOR,
  HEAVENLY_CRIT_LABEL,
  PAIR_CRIT_COLOR,
  PAIR_CRIT_LABEL,
  THREE_OF_A_KIND_CRIT_COLOR,
  THREE_OF_A_KIND_CRIT_LABEL,
  FOUR_OF_A_KIND_CRIT_COLOR,
  FOUR_OF_A_KIND_CRIT_LABEL,
  FULL_HOUSE_CRIT_COLOR,
  FULL_HOUSE_CRIT_LABEL,
  TICK_TOCK_CRIT_COLOR,
  TICK_TOCK_CRIT_LABEL,
  CHAIR_GIVEAWAY_CRIT_COLOR,
  CHAIR_GIVEAWAY_CRIT_LABEL,
  SUPPLIES_GIVEAWAY_CRIT_COLOR,
  SUPPLIES_GIVEAWAY_CRIT_LABEL,
  WINTER_SALE_CRIT_COLOR,
  WINTER_SALE_CRIT_LABEL,
  SPRING_SALE_CRIT_COLOR,
  SPRING_SALE_CRIT_LABEL,
  SUMMER_SALE_CRIT_COLOR,
  SUMMER_SALE_CRIT_LABEL,
  AUTUMN_SALE_CRIT_COLOR,
  AUTUMN_SALE_CRIT_LABEL,
  HALLOWEEN_SALE_CRIT_COLOR,
  HALLOWEEN_SALE_CRIT_LABEL,
  EASTER_SALE_CRIT_COLOR,
  EASTER_SALE_CRIT_LABEL,
  SUNSHINE_CRIT_COLOR,
  SUNSHINE_CRIT_LABEL,
  SNOWDAY_CRIT_COLOR,
  SNOWDAY_CRIT_LABEL,
  FAST_FORWARD_CRIT_COLOR,
  FAST_FORWARD_CRIT_LABEL,
  FROZEN_CRIT_COLOR,
  FROZEN_CRIT_LABEL,
  SNOWBALL_CRIT_COLOR,
  SNOWBALL_CRIT_LABEL,
  FREE_SALE_CRIT_COLOR,
  FREE_SALE_CRIT_LABEL,
  PAYDAY_CRIT_COLOR,
  PAYDAY_CRIT_LABEL,
  GOLD_STANDARD_CRIT_COLOR,
  GOLD_STANDARD_CRIT_LABEL,
  NIGHT_SHIFT_CRIT_COLOR,
  NIGHT_SHIFT_CRIT_LABEL,
  ROYAL_FLUSH_CRIT_COLOR,
  ROYAL_FLUSH_CRIT_LABEL,
  INTERN_CRIT_COLOR,
  INTERN_CRIT_LABEL,
  UNION_BOSS_CRIT_COLOR,
  UNION_BOSS_CRIT_LABEL,
  RUSH_HOUR_CRIT_COLOR,
  RUSH_HOUR_CRIT_LABEL,
  GOLDEN_TICKET_CRIT_COLOR,
  GOLDEN_TICKET_CRIT_LABEL,
  SILVER_TICKET_CRIT_COLOR,
  SILVER_TICKET_CRIT_LABEL,
  GOLDEN_PARACHUTE_CRIT_COLOR,
  GOLDEN_PARACHUTE_CRIT_LABEL,
  PAYOUT_CRIT_COLOR,
  PAYOUT_CRIT_LABEL,
  GRAND_OPENING_CRIT_COLOR,
  GRAND_OPENING_CRIT_LABEL,
  FULLY_STAFFED_CRIT_COLOR,
  FULLY_STAFFED_CRIT_LABEL,
  ESPRESSO_SHOT_CRIT_COLOR,
  ESPRESSO_SHOT_CRIT_LABEL,
  DEJA_VU_CRIT_COLOR,
  DEJA_VU_CRIT_LABEL,
  CLONE_ARMY_CRIT_COLOR,
  CLONE_ARMY_CRIT_LABEL,
  LUCKY_CLOVER_CRIT_COLOR,
  LUCKY_CLOVER_CRIT_LABEL,
  SECOND_WIND_CRIT_COLOR,
  SECOND_WIND_CRIT_LABEL,
  EXECUTIVE_ORDER_CRIT_COLOR,
  EXECUTIVE_ORDER_CRIT_LABEL,
  ROUND_UP_CRIT_COLOR,
  ROUND_UP_CRIT_LABEL,
  GOLDEN_HANDSHAKE_CRIT_COLOR,
  GOLDEN_HANDSHAKE_CRIT_LABEL,
  SUPPLY_RUN_CRIT_COLOR,
  SUPPLY_RUN_CRIT_LABEL,
  CASUAL_FRIDAY_CRIT_COLOR,
  CASUAL_FRIDAY_CRIT_LABEL,
  FANCY_FRIDAY_CRIT_COLOR,
  FANCY_FRIDAY_CRIT_LABEL,
  FIRE_DRILL_CRIT_COLOR,
  FIRE_DRILL_CRIT_LABEL,
  DOUBLE_DOWN_CRIT_COLOR,
  DOUBLE_DOWN_CRIT_LABEL,
  COFFEE_RUN_CRIT_COLOR,
  COFFEE_RUN_CRIT_LABEL,
  TEAM_BUILDING_CRIT_COLOR,
  TEAM_BUILDING_CRIT_LABEL,
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

// explosion crit (see upgradeButton.ts's isExplosionCrit): same swap again,
// keeping the landed tier's own color (spreading both up and down is applied
// by floorInteractions.ts, this only covers the celebration moment)
function celebrateExplosion(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(EXPLOSION_CRIT_LABEL, tierColor(tier));
  spawnTierBursts(floor, tier, getScreenCenterLocal);
}

// booty crit (see upgradeButton.ts's isBootyCrit): same swap as boost above,
// its own dedicated gold — the reward itself (doubling the active company's
// total income) is applied by floorInteractions.ts, this only covers the
// celebration moment
function celebrateBooty(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(BOOTY_CRIT_LABEL, BOOTY_CRIT_COLOR);
  spawnTierBursts(floor, tier, getScreenCenterLocal);
  playCoinDrop();
  const p = getScreenCenterLocal(floor);
  spawnCoinBurst(floor, p.x, p.y, () => {});
}

// upgrade crit (see upgradeButton.ts's isUpgradeCrit): same swap as boost/
// booty above, its own dedicated cyan — the reward itself (promoting the
// floor's/building's own permanent tier) is applied by floorInteractions.ts/
// main.ts, this only covers the celebration moment
function celebrateUpgrade(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(UPGRADE_CRIT_LABEL, UPGRADE_CRIT_COLOR);
  spawnTierBursts(floor, tier, getScreenCenterLocal);
}

// peppermint crit (see upgradeButton.ts's isPeppermintCrit): same swap as
// boost/booty/upgrade above, its own dedicated pink — the reward itself
// (promoting every other unlocked floor in the building) is applied by
// floorInteractions.ts, this only covers the celebration moment
function celebratePeppermint(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
): void {
  playSpecialFlash(PEPPERMINT_CRIT_LABEL, PEPPERMINT_CRIT_COLOR);
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

// chain and boost are both "special" procs riding the SAME landed tier (see
// isChainCrit/isBoostCrit) — when only one lands it plays immediately same as
// any plain crit, but when BOTH land on the same click they each get their own
// full turn, one after another, instead of one replacing (or silently
// dropping) the other. Regular (non-special) crits never join this queue —
// they're simply skipped while a special celebration is still due, rather
// than piling up behind it (see triggerCritCelebration below)
interface QueuedCelebration {
  kind:
    | "chain"
    | "boost"
    | "bounce"
    | "explosion"
    | "booty"
    | "upgrade"
    | "peppermint"
    | "heavenly"
    | "pair"
    | "threeOfAKind"
    | "fourOfAKind"
    | "fullHouse"
    | "tickTock"
    | "chairGiveaway"
    | "suppliesGiveaway"
    | "winterSale"
    | "springSale"
    | "summerSale"
    | "autumnSale"
    | "halloweenSale"
    | "easterSale"
    | "sunshine"
    | "snowday"
    | "fastForward"
    | "frozen"
    | "snowball"
    | "freeSale"
    | "payday"
    | "goldStandard"
    | "royalFlush"
    | "nightShift"
    | "intern"
    | "unionBoss"
    | "rushHour"
    | "goldenTicket"
    | "silverTicket"
    | "goldenParachute"
    | "payout"
    | "grandOpening"
    | "fullyStaffed"
    | "espressoShot"
    | "dejaVu"
    | "cloneArmy"
    | "luckyClover"
    | "secondWind"
    | "executiveOrder"
    | "roundUp"
    | "goldenHandshake"
    | "supplyRun"
    | "casualFriday"
    | "fancyFriday"
    | "fireDrill"
    | "doubleDown"
    | "coffeeRun"
    | "teamBuilding"
    | "bonusTier";
  queuedAt: number;
  maxAgeMs?: number;
  run: () => void;
}
const specialCelebrationQueue: QueuedCelebration[] = [];
let drainingSpecialQueue = false;
type RandomFollowUpKind = Exclude<CritProcKind, "bullMarket" | "dejaVu">;
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
  chain = false,
  boost = false,
  bounce = false,
  explosion = false,
  booty = false,
  upgrade = false,
  peppermint = false,
  heavenly = false,
  pair = false,
  threeOfAKind = false,
  fourOfAKind = false,
  fullHouse = false,
  tickTock = false,
  chairGiveaway = false,
  suppliesGiveaway = false,
  winterSale = false,
  springSale = false,
  summerSale = false,
  autumnSale = false,
  halloweenSale = false,
  sunshine = false,
  snowday = false,
  fastForward = false,
  frozen = false,
  snowball = false,
  freeSale = false,
  payday = false,
  goldStandard = false,
  royalFlush = false,
  nightShift = false,
  bonusTier: CritTier | null = null,
  intern = false,
  unionBoss = false,
  easterSale = false,
  rushHour = false,
  goldenTicket = false,
  silverTicket = false,
  goldenParachute = false,
  payout = false,
  grandOpening = false,
  fullyStaffed = false,
  espressoShot = false,
  dejaVu = false,
  cloneArmy = false,
  luckyClover = false,
  secondWind = false,
  executiveOrder = false,
  roundUp = false,
  goldenHandshake = false,
  supplyRun = false,
  casualFriday = false,
  fancyFriday = false,
  fireDrill = false,
  doubleDown = false,
  coffeeRun = false,
  teamBuilding = false,
): void {
  const procFlags: Partial<Record<CritProcKind, boolean>> = {
    chain,
    boost,
    bounce,
    explosion,
    booty,
    upgrade,
    peppermint,
    heavenly,
    pair,
    threeOfAKind,
    fourOfAKind,
    fullHouse,
    tickTock,
    chairGiveaway,
    suppliesGiveaway,
    winterSale,
    springSale,
    summerSale,
    autumnSale,
    halloweenSale,
    easterSale,
    sunshine,
    snowday,
    fastForward,
    frozen,
    snowball,
    freeSale,
    bullMarket: false,
    payday,
    goldStandard,
    nightShift,
    intern,
    unionBoss,
    rushHour,
    goldenTicket,
    silverTicket,
    goldenParachute,
    payout,
    grandOpening,
    fullyStaffed,
    espressoShot,
    dejaVu,
    cloneArmy,
    luckyClover,
    secondWind,
    executiveOrder,
    roundUp,
    goldenHandshake,
    supplyRun,
    casualFriday,
    fancyFriday,
    fireDrill,
    doubleDown,
    coffeeRun,
    teamBuilding,
  };
  if (
    chain ||
    boost ||
    bounce ||
    explosion ||
    booty ||
    upgrade ||
    peppermint ||
    heavenly ||
    pair ||
    threeOfAKind ||
    fourOfAKind ||
    fullHouse ||
    tickTock ||
    chairGiveaway ||
    suppliesGiveaway ||
    winterSale ||
    springSale ||
    summerSale ||
    autumnSale ||
    halloweenSale ||
    sunshine ||
    snowday ||
    fastForward ||
    frozen ||
    snowball ||
    freeSale ||
    payday ||
    goldStandard ||
    royalFlush ||
    nightShift ||
    intern ||
    unionBoss ||
    easterSale ||
    rushHour ||
    goldenTicket ||
    silverTicket ||
    goldenParachute ||
    payout ||
    grandOpening ||
    fullyStaffed ||
    espressoShot ||
    dejaVu ||
    cloneArmy ||
    luckyClover ||
    secondWind ||
    executiveOrder ||
    roundUp ||
    goldenHandshake ||
    supplyRun ||
    casualFriday ||
    fancyFriday ||
    fireDrill ||
    doubleDown ||
    coffeeRun ||
    teamBuilding
  ) {
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
    if (bounce && !specialCelebrationQueue.some((q) => q.kind === "bounce")) {
      specialCelebrationQueue.push({
        kind: "bounce",
        queuedAt: now,
        run: () => celebrateBounce(floor, tier, getScreenCenterLocal),
      });
    }
    if (
      explosion &&
      !specialCelebrationQueue.some((q) => q.kind === "explosion")
    ) {
      specialCelebrationQueue.push({
        kind: "explosion",
        queuedAt: now,
        run: () => celebrateExplosion(floor, tier, getScreenCenterLocal),
      });
    }
    if (booty && !specialCelebrationQueue.some((q) => q.kind === "booty")) {
      specialCelebrationQueue.push({
        kind: "booty",
        queuedAt: now,
        run: () => celebrateBooty(floor, tier, getScreenCenterLocal),
      });
    }
    if (upgrade && !specialCelebrationQueue.some((q) => q.kind === "upgrade")) {
      specialCelebrationQueue.push({
        kind: "upgrade",
        queuedAt: now,
        run: () => celebrateUpgrade(floor, tier, getScreenCenterLocal),
      });
    }
    if (
      peppermint &&
      !specialCelebrationQueue.some((q) => q.kind === "peppermint")
    ) {
      specialCelebrationQueue.push({
        kind: "peppermint",
        queuedAt: now,
        run: () => celebratePeppermint(floor, tier, getScreenCenterLocal),
      });
    }
    if (
      heavenly &&
      !specialCelebrationQueue.some((q) => q.kind === "heavenly")
    ) {
      specialCelebrationQueue.push({
        kind: "heavenly",
        queuedAt: now,
        run: () => celebrateHeavenly(floor, tier, getScreenCenterLocal),
      });
    }
    if (pair && !specialCelebrationQueue.some((q) => q.kind === "pair")) {
      specialCelebrationQueue.push({
        kind: "pair",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            PAIR_CRIT_LABEL,
            PAIR_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      threeOfAKind &&
      !specialCelebrationQueue.some((q) => q.kind === "threeOfAKind")
    ) {
      specialCelebrationQueue.push({
        kind: "threeOfAKind",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            THREE_OF_A_KIND_CRIT_LABEL,
            THREE_OF_A_KIND_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      fourOfAKind &&
      !specialCelebrationQueue.some((q) => q.kind === "fourOfAKind")
    ) {
      specialCelebrationQueue.push({
        kind: "fourOfAKind",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FOUR_OF_A_KIND_CRIT_LABEL,
            FOUR_OF_A_KIND_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      fullHouse &&
      !specialCelebrationQueue.some((q) => q.kind === "fullHouse")
    ) {
      specialCelebrationQueue.push({
        kind: "fullHouse",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FULL_HOUSE_CRIT_LABEL,
            FULL_HOUSE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      tickTock &&
      !specialCelebrationQueue.some((q) => q.kind === "tickTock")
    ) {
      specialCelebrationQueue.push({
        kind: "tickTock",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            TICK_TOCK_CRIT_LABEL,
            TICK_TOCK_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      chairGiveaway &&
      !specialCelebrationQueue.some((q) => q.kind === "chairGiveaway")
    ) {
      specialCelebrationQueue.push({
        kind: "chairGiveaway",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            CHAIR_GIVEAWAY_CRIT_LABEL,
            CHAIR_GIVEAWAY_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      suppliesGiveaway &&
      !specialCelebrationQueue.some((q) => q.kind === "suppliesGiveaway")
    ) {
      specialCelebrationQueue.push({
        kind: "suppliesGiveaway",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            SUPPLIES_GIVEAWAY_CRIT_LABEL,
            SUPPLIES_GIVEAWAY_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (intern && !specialCelebrationQueue.some((q) => q.kind === "intern")) {
      specialCelebrationQueue.push({
        kind: "intern",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            INTERN_CRIT_LABEL,
            INTERN_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      unionBoss &&
      !specialCelebrationQueue.some((q) => q.kind === "unionBoss")
    ) {
      specialCelebrationQueue.push({
        kind: "unionBoss",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            UNION_BOSS_CRIT_LABEL,
            UNION_BOSS_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      winterSale &&
      !specialCelebrationQueue.some((q) => q.kind === "winterSale")
    ) {
      specialCelebrationQueue.push({
        kind: "winterSale",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            WINTER_SALE_CRIT_LABEL,
            WINTER_SALE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      springSale &&
      !specialCelebrationQueue.some((q) => q.kind === "springSale")
    ) {
      specialCelebrationQueue.push({
        kind: "springSale",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            SPRING_SALE_CRIT_LABEL,
            SPRING_SALE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      summerSale &&
      !specialCelebrationQueue.some((q) => q.kind === "summerSale")
    ) {
      specialCelebrationQueue.push({
        kind: "summerSale",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            SUMMER_SALE_CRIT_LABEL,
            SUMMER_SALE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      autumnSale &&
      !specialCelebrationQueue.some((q) => q.kind === "autumnSale")
    ) {
      specialCelebrationQueue.push({
        kind: "autumnSale",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            AUTUMN_SALE_CRIT_LABEL,
            AUTUMN_SALE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      halloweenSale &&
      !specialCelebrationQueue.some((q) => q.kind === "halloweenSale")
    ) {
      specialCelebrationQueue.push({
        kind: "halloweenSale",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            HALLOWEEN_SALE_CRIT_LABEL,
            HALLOWEEN_SALE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      easterSale &&
      !specialCelebrationQueue.some((q) => q.kind === "easterSale")
    ) {
      specialCelebrationQueue.push({
        kind: "easterSale",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            EASTER_SALE_CRIT_LABEL,
            EASTER_SALE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      rushHour &&
      !specialCelebrationQueue.some((q) => q.kind === "rushHour")
    ) {
      specialCelebrationQueue.push({
        kind: "rushHour",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            RUSH_HOUR_CRIT_LABEL,
            RUSH_HOUR_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      goldenTicket &&
      !specialCelebrationQueue.some((q) => q.kind === "goldenTicket")
    ) {
      specialCelebrationQueue.push({
        kind: "goldenTicket",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            GOLDEN_TICKET_CRIT_LABEL,
            GOLDEN_TICKET_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      silverTicket &&
      !specialCelebrationQueue.some((q) => q.kind === "silverTicket")
    ) {
      specialCelebrationQueue.push({
        kind: "silverTicket",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            SILVER_TICKET_CRIT_LABEL,
            SILVER_TICKET_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      goldenParachute &&
      !specialCelebrationQueue.some((q) => q.kind === "goldenParachute")
    ) {
      specialCelebrationQueue.push({
        kind: "goldenParachute",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            GOLDEN_PARACHUTE_CRIT_LABEL,
            GOLDEN_PARACHUTE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (payout && !specialCelebrationQueue.some((q) => q.kind === "payout")) {
      specialCelebrationQueue.push({
        kind: "payout",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            PAYOUT_CRIT_LABEL,
            PAYOUT_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      grandOpening &&
      !specialCelebrationQueue.some((q) => q.kind === "grandOpening")
    ) {
      specialCelebrationQueue.push({
        kind: "grandOpening",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            GRAND_OPENING_CRIT_LABEL,
            GRAND_OPENING_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      fullyStaffed &&
      !specialCelebrationQueue.some((q) => q.kind === "fullyStaffed")
    ) {
      specialCelebrationQueue.push({
        kind: "fullyStaffed",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FULLY_STAFFED_CRIT_LABEL,
            FULLY_STAFFED_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      espressoShot &&
      !specialCelebrationQueue.some((q) => q.kind === "espressoShot")
    ) {
      specialCelebrationQueue.push({
        kind: "espressoShot",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            ESPRESSO_SHOT_CRIT_LABEL,
            ESPRESSO_SHOT_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (dejaVu && !specialCelebrationQueue.some((q) => q.kind === "dejaVu")) {
      specialCelebrationQueue.push({
        kind: "dejaVu",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            DEJA_VU_CRIT_LABEL,
            DEJA_VU_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });

      const availableFollowUps = CRIT_PROC_KINDS.filter(
        (kind) =>
          kind !== "dejaVu" &&
          kind !== "bullMarket" &&
          !procFlags[kind] &&
          !specialCelebrationQueue.some((q) => q.kind === kind),
      ) as RandomFollowUpKind[];
      for (
        let i = 0;
        i < DEJA_VU_RANDOM_FOLLOW_UP_COUNT && availableFollowUps.length > 0;
        i++
      ) {
        const randomIndex = Math.floor(
          Math.random() * availableFollowUps.length,
        );
        const followUpKind = availableFollowUps.splice(randomIndex, 1)[0];
        const followUpInfo = CRIT_PROC_INFO[followUpKind];
        specialCelebrationQueue.push({
          kind: followUpKind,
          queuedAt: now,
          maxAgeMs: DEJA_VU_FOLLOW_UP_MAX_AGE_MS,
          run: () =>
            celebrateFlatProc(
              followUpInfo.label,
              tierColor(tier),
              floor,
              tier,
              getScreenCenterLocal,
            ),
        });
      }
    }
    if (
      cloneArmy &&
      !specialCelebrationQueue.some((q) => q.kind === "cloneArmy")
    ) {
      specialCelebrationQueue.push({
        kind: "cloneArmy",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            CLONE_ARMY_CRIT_LABEL,
            CLONE_ARMY_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      luckyClover &&
      !specialCelebrationQueue.some((q) => q.kind === "luckyClover")
    ) {
      specialCelebrationQueue.push({
        kind: "luckyClover",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            LUCKY_CLOVER_CRIT_LABEL,
            LUCKY_CLOVER_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      secondWind &&
      !specialCelebrationQueue.some((q) => q.kind === "secondWind")
    ) {
      specialCelebrationQueue.push({
        kind: "secondWind",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            SECOND_WIND_CRIT_LABEL,
            SECOND_WIND_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      executiveOrder &&
      !specialCelebrationQueue.some((q) => q.kind === "executiveOrder")
    ) {
      specialCelebrationQueue.push({
        kind: "executiveOrder",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            EXECUTIVE_ORDER_CRIT_LABEL,
            EXECUTIVE_ORDER_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (roundUp && !specialCelebrationQueue.some((q) => q.kind === "roundUp")) {
      specialCelebrationQueue.push({
        kind: "roundUp",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            ROUND_UP_CRIT_LABEL,
            ROUND_UP_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      goldenHandshake &&
      !specialCelebrationQueue.some((q) => q.kind === "goldenHandshake")
    ) {
      specialCelebrationQueue.push({
        kind: "goldenHandshake",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            GOLDEN_HANDSHAKE_CRIT_LABEL,
            GOLDEN_HANDSHAKE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      supplyRun &&
      !specialCelebrationQueue.some((q) => q.kind === "supplyRun")
    ) {
      specialCelebrationQueue.push({
        kind: "supplyRun",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            SUPPLY_RUN_CRIT_LABEL,
            SUPPLY_RUN_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      casualFriday &&
      !specialCelebrationQueue.some((q) => q.kind === "casualFriday")
    ) {
      specialCelebrationQueue.push({
        kind: "casualFriday",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            CASUAL_FRIDAY_CRIT_LABEL,
            CASUAL_FRIDAY_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      fancyFriday &&
      !specialCelebrationQueue.some((q) => q.kind === "fancyFriday")
    ) {
      specialCelebrationQueue.push({
        kind: "fancyFriday",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FANCY_FRIDAY_CRIT_LABEL,
            FANCY_FRIDAY_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      fireDrill &&
      !specialCelebrationQueue.some((q) => q.kind === "fireDrill")
    ) {
      specialCelebrationQueue.push({
        kind: "fireDrill",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FIRE_DRILL_CRIT_LABEL,
            FIRE_DRILL_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      doubleDown &&
      !specialCelebrationQueue.some((q) => q.kind === "doubleDown")
    ) {
      specialCelebrationQueue.push({
        kind: "doubleDown",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            DOUBLE_DOWN_CRIT_LABEL,
            DOUBLE_DOWN_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      coffeeRun &&
      !specialCelebrationQueue.some((q) => q.kind === "coffeeRun")
    ) {
      specialCelebrationQueue.push({
        kind: "coffeeRun",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            COFFEE_RUN_CRIT_LABEL,
            COFFEE_RUN_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      teamBuilding &&
      !specialCelebrationQueue.some((q) => q.kind === "teamBuilding")
    ) {
      specialCelebrationQueue.push({
        kind: "teamBuilding",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            TEAM_BUILDING_CRIT_LABEL,
            TEAM_BUILDING_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      sunshine &&
      !specialCelebrationQueue.some((q) => q.kind === "sunshine")
    ) {
      specialCelebrationQueue.push({
        kind: "sunshine",
        queuedAt: now,
        run: () => celebrateSunshine(floor, tier, getScreenCenterLocal),
      });
    }
    if (snowday && !specialCelebrationQueue.some((q) => q.kind === "snowday")) {
      specialCelebrationQueue.push({
        kind: "snowday",
        queuedAt: now,
        run: () => celebrateSnowday(floor, tier, getScreenCenterLocal),
      });
    }
    if (
      fastForward &&
      !specialCelebrationQueue.some((q) => q.kind === "fastForward")
    ) {
      specialCelebrationQueue.push({
        kind: "fastForward",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FAST_FORWARD_CRIT_LABEL,
            FAST_FORWARD_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (frozen && !specialCelebrationQueue.some((q) => q.kind === "frozen")) {
      specialCelebrationQueue.push({
        kind: "frozen",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FROZEN_CRIT_LABEL,
            FROZEN_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      snowball &&
      !specialCelebrationQueue.some((q) => q.kind === "snowball")
    ) {
      specialCelebrationQueue.push({
        kind: "snowball",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            SNOWBALL_CRIT_LABEL,
            SNOWBALL_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      freeSale &&
      !specialCelebrationQueue.some((q) => q.kind === "freeSale")
    ) {
      specialCelebrationQueue.push({
        kind: "freeSale",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            FREE_SALE_CRIT_LABEL,
            FREE_SALE_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (payday && !specialCelebrationQueue.some((q) => q.kind === "payday")) {
      specialCelebrationQueue.push({
        kind: "payday",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            PAYDAY_CRIT_LABEL,
            PAYDAY_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      goldStandard &&
      !specialCelebrationQueue.some((q) => q.kind === "goldStandard")
    ) {
      specialCelebrationQueue.push({
        kind: "goldStandard",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            GOLD_STANDARD_CRIT_LABEL,
            GOLD_STANDARD_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      royalFlush &&
      !specialCelebrationQueue.some((q) => q.kind === "royalFlush")
    ) {
      specialCelebrationQueue.push({
        kind: "royalFlush",
        queuedAt: now,
        run: () =>
          celebrateFlatProc(
            ROYAL_FLUSH_CRIT_LABEL,
            ROYAL_FLUSH_CRIT_COLOR,
            floor,
            tier,
            getScreenCenterLocal,
          ),
      });
    }
    if (
      nightShift &&
      !specialCelebrationQueue.some((q) => q.kind === "nightShift")
    ) {
      specialCelebrationQueue.push({
        kind: "nightShift",
        queuedAt: now,
        run: () => celebrateNightShift(floor, tier, getScreenCenterLocal),
      });
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
