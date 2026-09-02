import { drawCartoonText, drawPill, formatPrice } from "../../utils";
import { FLOOR_W, FLOOR_H, DIVIDER_H, SIDE_WALL_WIDTH } from "../constants";
import { COLOR } from "../../palette";
import { getWiggleRotation } from "../../shared/wiggle";
import { type BigNumber, divide } from "../../shared/bigNumber";
import type { Floor } from "../../gameState";

// button placement, bottom-right corner of each floor (mirrors the income panel on the left).
// Width cut 25% from the previous 440 (was matching the income panel 1:1); BTN_X sets its
// right edge flush against the side wall (FLOOR_W - SIDE_WALL_WIDTH), same alignment rule
// as the income bar's left edge. BTN_H exactly fills DIVIDER_H, spanning it edge-to-edge
export const BTN_W = 330;
export const BTN_H = 140;
export const BTN_X = FLOOR_W - SIDE_WALL_WIDTH - BTN_W;
// centered inside the divider band below (see outerWall/index.ts's DIVIDER_H),
// mounted on top of it since that's drawn first, nudged down 10px from dead
// center — except the bottom (ground) floor, which stays at dead center. BTN_H
// leaves just enough divider clearance for this nudge without clipping against
// the floor canvas edge
function getBtnY(isGroundFloor: boolean): number {
  const base = FLOOR_H - DIVIDER_H / 2 - BTN_H / 2;
  return isGroundFloor ? base + 2 : base + 10;
}

function isPointOnButton(
  x: number,
  localY: number,
  isGroundFloor: boolean,
): boolean {
  const y = getBtnY(isGroundFloor);
  return x >= BTN_X && x <= BTN_X + BTN_W && localY >= y && localY <= y + BTN_H;
}

export function getButtonCenter(isGroundFloor: boolean): {
  x: number;
  y: number;
} {
  return { x: BTN_X + BTN_W / 2, y: getBtnY(isGroundFloor) + BTN_H / 2 };
}

// whether a floor-local canvas point falls on the upgrade button
export function hitTestUpgradeButton(
  x: number,
  y: number,
  isGroundFloor: boolean,
): boolean {
  return isPointOnButton(x, y, isGroundFloor);
}

// a satisfying "juicy" press animation, keyed per floor (each floor's button
// bounces independently): a quick squash inward followed by a springy overshoot
// past full size before settling, via a damped-oscillator curve rather than a
// linear tween — the single overshoot is what reads as bouncy/tactile instead of
// just "shrinks then grows back"
const pressedAt = new WeakMap<Floor, number>();
const PRESS_DURATION_MS = 450;
const PRESS_AMPLITUDE = 0.18; // how deep the initial squash-in goes (1 - this)
const PRESS_DECAY = 9; // 1/sec; higher = the bounce dies out faster
const PRESS_FREQUENCY = 26; // rad/sec; higher = a snappier/quicker bounce

// call right when a purchase actually succeeds (see floorInteractions/index.ts) —
// every subsequent draw of this floor's button picks the animation up from here
export function triggerButtonPress(floor: Floor): void {
  pressedAt.set(floor, Date.now());
}

function pressScale(floor: Floor, now: number): number {
  const startedAt = pressedAt.get(floor);
  if (startedAt === undefined) return 1;
  const elapsedMs = now - startedAt;
  if (elapsedMs >= PRESS_DURATION_MS) return 1;
  const t = elapsedMs / 1000; // seconds, for the decay/frequency constants above
  return (
    1 -
    PRESS_AMPLITUDE * Math.exp(-PRESS_DECAY * t) * Math.cos(PRESS_FREQUENCY * t)
  );
}

// "crit" upgrade: a rare, free, oversized upgrade — the slot-machine jackpot moment.
// Three tiers (a variable-ratio reward schedule, not a flat one) roll independently
// each completed upgrade click (see floorInteractions/index.ts's rollCritUpgrade
// calls) — rarest ("ultra") is checked first, then "mega", then "crit", so a click
// can never land more than one at once. While active, this floor's button recolors,
// wiggles, and shows "xN" instead of its price; clicking it costs nothing and
// instantly applies that tier's upgrade count at once.
export type CritTier = "crit" | "mega" | "ultra";

// the ONE canonical source for every per-tier number/label — every caller (this
// module's own drawUpgradeButton, floorInteractions.ts, critCelebration.ts) reads
// from this instead of hand-building its own "xN"/multiplier, which is exactly what
// let a stale hardcoded "Sale x5" label slip in once before (see repo memory) and
// silently drift from the real, tier-scaled payout. Add any FUTURE per-tier value
// here too, never as a new standalone constant a callsite has to remember to keep
// in sync. `multiplier` is the one shared x5-per-tier number reused for EVERY
// tier-scaled reward (upgrade-button free-upgrade count, Sale payout multiplier,
// and a permanently-crited floor's rate multiplier below) since they're always
// the same number by design — no separate count/saleMultiplier fields to drift
export const CRIT_TIER_CONFIG: Record<
  CritTier,
  {
    chance: number; // rolled once per completed upgrade click, see rollCritUpgrade
    multiplier: number;
    color: string;
    label: string; // canonical "xN" text — shared by the button AND the flash text
  }
> = {
  crit: {
    chance: 0.05,
    multiplier: 5,
    color: COLOR.purple,
    label: "x5",
  },
  mega: {
    // ~1 in 100 upgrade clicks — deliberately much rarer than crit's so it reads
    // as a genuine jackpot moment, not just a bigger version of the common crit
    chance: 0.01,
    multiplier: 25,
    color: COLOR.starYellow,
    label: "x25",
  },
  ultra: {
    // rarer still than mega's — the true jackpot-of-jackpots moment
    chance: 0.001,
    multiplier: 125,
    color: COLOR.red,
    label: "x125",
  },
};

// back-compat convenience re-exports for callers that just want one tier's
// multiplier — still sourced from CRIT_TIER_CONFIG above, never a separate
// hardcoded number
export const CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.crit.multiplier;
export const MEGA_CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.mega.multiplier;
export const ULTRA_CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.ultra.multiplier;

const critTiers = new WeakMap<Floor, CritTier>();

// call once per completed upgrade click (crit or normal) to roll the next one —
// rarest tier checked first, so a click can never land more than one tier at once
export function rollCritUpgrade(floor: Floor): void {
  if (Math.random() < CRIT_TIER_CONFIG.ultra.chance) {
    critTiers.set(floor, "ultra");
    return;
  }
  if (Math.random() < CRIT_TIER_CONFIG.mega.chance) {
    critTiers.set(floor, "mega");
    return;
  }
  if (Math.random() < CRIT_TIER_CONFIG.crit.chance)
    critTiers.set(floor, "crit");
}

// same odds/tiers as rollCritUpgrade, but a one-shot roll (not tied to any Floor's
// "next click" telegraph) for a floor-unlock purchase — see floorInteractions.ts's
// hitTestFloorLock branch. Returns null on a miss (the common case). A forced tier
// (see forceFloorBuyCrit below) always wins and is consumed on the very next call
let forcedFloorBuyCrit: CritTier | null = null;

export function rollFloorBuyCrit(): CritTier | null {
  if (forcedFloorBuyCrit) {
    const tier = forcedFloorBuyCrit;
    forcedFloorBuyCrit = null;
    return tier;
  }
  if (Math.random() < CRIT_TIER_CONFIG.ultra.chance) return "ultra";
  if (Math.random() < CRIT_TIER_CONFIG.mega.chance) return "mega";
  if (Math.random() < CRIT_TIER_CONFIG.crit.chance) return "crit";
  return null;
}

// dev/test-only: guarantees the NEXT floor bought crits at this tier, bypassing
// chance entirely (see hud/testButton's "Floor Crit"/"Floor Mega Crit"/"Floor
// Ultra Crit")
export function forceFloorBuyCrit(tier: CritTier): void {
  forcedFloorBuyCrit = tier;
}

export function getCritTier(floor: Floor): CritTier | null {
  return critTiers.get(floor) ?? null;
}

export function isCritUpgrade(floor: Floor): boolean {
  return critTiers.has(floor);
}

// call right when a crit click is handled, before rolling the next one
export function consumeCritUpgrade(floor: Floor): void {
  critTiers.delete(floor);
}

// dev/test-only: force this floor's button into a crit state right away,
// bypassing chance entirely (see hud/testButton's "Spawn Crit"/"Spawn Mega Crit"/
// "Spawn Ultra Crit")
export function forceCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
}

export function forceMegaCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "mega");
}

export function forceUltraCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "ultra");
}

// "Sale" boost: a purchasable, targeted alternative to boostMenu's boost-all (see
// hud/boostMenu/index.ts's applySaleBoost, which picks the random floor and calls
// triggerSaleBoost below). While active on a floor, its upgrade button wiggles like
// a crit and clicking it is free. A crit can still roll during a sale (see
// floorInteractions/index.ts); rather than stacking upgrades as usual, it
// multiplies that click's sale payout by the rolled tier's own
// CRIT_TIER_CONFIG[tier].multiplier
export const SALE_DURATION_MS = 15_000;
// each sale click pays out floorIncomePerSecond(floor) below (1 second of that
// floor's own income), credited straight to the player's total — hud/boostMenu's
// own cost is priced off this same rate times this many assumed clicks, halved, so
// a fully-clicked sale earns back at least double the cost
export const SALE_ASSUMED_CLICKS = 10;
const saleStartedAt = new WeakMap<Floor, number>();

export function triggerSaleBoost(floor: Floor): void {
  saleStartedAt.set(floor, Date.now());
}

export function isSaleActive(floor: Floor, now: number): boolean {
  const startedAt = saleStartedAt.get(floor);
  return startedAt !== undefined && now - startedAt < SALE_DURATION_MS;
}

// 1 second's worth of a floor's own current income rate — deliberately NOT added
// back into floor.incomeAmount itself (that would compound: a bigger rate next
// click, forever), just read fresh each click and credited straight to the
// player's total (see floorInteractions/index.ts and hud/boostMenu/index.ts)
export function floorIncomePerSecond(floor: Floor): BigNumber {
  return divide(floor.incomeAmount, floor.incomeIntervalSeconds);
}

export function drawUpgradeButton(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  hovered: boolean,
  cost: BigNumber,
  affordable: boolean,
  isGroundFloor: boolean,
): void {
  const x = BTN_X;
  const y = getBtnY(isGroundFloor);
  const cx = x + BTN_W / 2;
  const cy = y + BTN_H / 2;
  const now = Date.now();
  const scale = pressScale(floor, now);
  const critTier = getCritTier(floor);
  const crit = critTier !== null;
  const sale = isSaleActive(floor, now);

  ctx.save();
  ctx.translate(cx, cy);
  if (crit || sale) {
    ctx.rotate(getWiggleRotation(now));
  }
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  if (!crit && !sale) {
    if (!affordable) ctx.globalAlpha = 0.5;
    else if (hovered) ctx.filter = "brightness(0.85)";
  } else if (hovered) {
    ctx.filter = "brightness(0.85)";
  }
  // rounded RECTANGLE, not a full pill — ref.png's button corners are only modestly
  // rounded, unlike the fully-stadium-shaped income bar. Must clear the combined
  // black+white+dark ring inset (~21% of BTN_H) with room to spare, or the
  // innermost green fill's own radius gets clamped to 0 and its corners go square
  // even though the outer rings are still visibly rounded
  drawPill(
    ctx,
    x,
    y,
    BTN_W,
    BTN_H,
    crit
      ? CRIT_TIER_CONFIG[critTier!].color
      : sale
        ? COLOR.amber
        : floor.critMultiplierTier
          ? CRIT_TIER_CONFIG[floor.critMultiplierTier].color
          : affordable
            ? COLOR.moneyGreen
            : COLOR.disabledGray,
    true,
    true,
    40,
  );

  ctx.font = '900 52px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = sale
    ? crit
      ? `Sale x${CRIT_TIER_CONFIG[critTier!].multiplier}`
      : "Sale"
    : crit
      ? CRIT_TIER_CONFIG[critTier!].label
      : formatPrice(cost);
  drawCartoonText(ctx, label, cx, cy);
  ctx.restore();
}
