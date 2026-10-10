// a random spawn's prize and its payout once tapped, shared by every random
// spawn (src/spawn/bubbles): a coin flips up into the total, a crit
// number flies up, swells and slams into its floor's income bar, and a badge
// plays its crit celebration. The spawn keeps the Payout and draws it each
// frame until it's done
import {
  CRIT_TIER_CONFIG,
  eventProcContext,
  isVisibleOnFloor,
  loadFeaturedRewards,
  pickCritTierByOdds,
  pickFeaturedBadge,
} from "../../crits";
import {
  getIncomeBarCenter,
  increaseIncomeRateBy,
  punchIncomeBar,
  rewardPayoutAmount,
  type FloorActionsDeps,
} from "../../floors";
import { isFloorMaxed, type Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { addTotalIncome } from "../../totalIncome";
import { playSold } from "../../sound";
import { drawCoinFlip, startCoinFlip, type CoinFlip } from "../coinFlip";
import { bezier } from "../curves";
import { isFloorLocked } from "../detachedJob";
import { easeIn, easeOut, lerp, progress } from "../easing";
import { DETONATION_MS, drawDetonation } from "../explosion";
import { playBarExplosion } from "../explosionBang";
import { shakeScreen } from "../screenShake";
import { pulseHudTotalFlash } from "../totalIncomeCoins";
import { drawWispTrail, WISP_TRAIL_MS, type Point } from "../wisp";
import { drawMini, type Prize } from "./minis";

export { drawMini, prepareMini, type Prize } from "./minis";

// a coin shakes the screen as it lands in the total
const COIN_SHAKE = 0.4;
// a crit number flies up off its spot, swelling to SMASH_SIZE, and slams
// down onto its floor's bar SMASH_MS after the tap
const SMASH_MS = 340;
const SMASH_ARC = 360;
const SMASH_SIZE = 340;
// of the flight spent swelling before the slam
const SMASH_SWELL = 0.55;
const SMASH_BLAST = 260;
const SMASH_SHAKE = 0.6;
const SQUASH_MS = 250;
const TRAIL_SIZE = 30;
// a number is done once its blast and trail have faded
const SMASH_DONE_MS = SMASH_MS + Math.max(DETONATION_MS, WISP_TRAIL_MS);

export interface PrizeOdds {
  tier: number;
  coin: number;
  badge: number;
}

// a floor at the level cap can't take a crit number's levels, so it rolls
// only coins and badges
export function rollPrize(
  { tier: tierOdds, coin, badge }: PrizeOdds,
  floor: Floor,
): Prize {
  const tier = isFloorMaxed(floor) ? 0 : tierOdds;
  const roll = Math.random() * (tier + coin + badge);
  if (roll < tier) return { kind: "tier", tier: pickCritTierByOdds() };
  if (roll < tier + coin) return { kind: "coin" };
  return { kind: "badge", badge: pickFeaturedBadge() };
}

// a random unlocked floor whose income bar is in view, the one a spawn's
// prizes pay (a crit number slams into that bar)
export function pickSpawnFloor(deps: FloorActionsDeps): Floor | null {
  const floors = (deps.getOnScreenFloors?.() ?? []).filter(
    (entry) =>
      entry.floor.unlocked &&
      isVisibleOnFloor(
        entry,
        getIncomeBarCenter(deps.floors.indexOf(entry.floor) === 0).y,
      ),
  );
  return floors.length
    ? floors[Math.floor(Math.random() * floors.length)].floor
    : null;
}

export interface Payout {
  prize: Prize;
  floor: Floor;
  // performance.now() it was tapped, and the spot it was tapped at
  at: number;
  // a crit number's flight onto its floor's bar (screen units, kept up to
  // date each frame), and whether it has landed
  bar: Point;
  smash: (at: number) => Point | null;
  // drawn this big, as the spawn showed it
  size: number;
  hit: boolean;
  // a coin's flip into the total
  flip: CoinFlip | null;
}

// the floor a prize pays, or the building's first if it's gone
function payFloor(deps: FloorActionsDeps, floor: Floor): Floor | undefined {
  return deps.floors.includes(floor) ? floor : deps.floors[0];
}

// where floor's income bar is on screen, kept on the screen's height
function barOnScreen(
  deps: FloorActionsDeps,
  floor: Floor,
  height: number,
  into: Point,
): void {
  barAt(deps, floor, into);
  into.y = Math.min(height, Math.max(0, into.y));
}

// where floor's income bar's middle is on screen
export function barAt(
  deps: FloorActionsDeps,
  floor: Floor,
  into: Point,
): Point {
  const area = deps.getScreenAreaLocal?.(floor);
  if (!area) return into;
  const bar = getIncomeBarCenter(deps.floors.indexOf(floor) === 0);
  into.x = bar.x - area.left;
  into.y = bar.y - area.top;
  return into;
}

// every open floor whose income bar is in view and can still take levels,
// top first: what a spawn's blasts level up
export function barsInView(deps: FloorActionsDeps): Floor[] {
  return (deps.getOnScreenFloors?.() ?? [])
    .filter(
      (entry) =>
        entry.floor.unlocked &&
        !isFloorMaxed(entry.floor) &&
        !isFloorLocked(entry.floor) &&
        isVisibleOnFloor(
          entry,
          getIncomeBarCenter(deps.floors.indexOf(entry.floor) === 0).y,
        ),
    )
    .sort((a, b) => a.top - b.top)
    .map((entry) => entry.floor);
}

// free levels landing on floor's bar, tallied over it
export function landBarLevels(
  deps: FloorActionsDeps,
  floor: Floor,
  levels: number,
): void {
  increaseIncomeRateBy(floor, levels);
  deps.persist();
  punchIncomeBar(floor, `+${levels} Lvl`, COLOR.heavenlyGold);
}

// pays prize, tapped at `from` (screen units on a screen `height` tall) for
// floor: badges at once, a coin once its flip lands in the total, a crit
// number once its smash lands
export function collectPrize(
  deps: FloorActionsDeps,
  floor: Floor,
  prize: Prize,
  from: Point,
  height: number,
  size: number,
  now: number,
): Payout | null {
  const target = payFloor(deps, floor);
  if (!target) return null;
  const payout: Payout = {
    prize,
    floor: target,
    at: now,
    bar: { x: 0, y: 0 },
    smash: () => null,
    size,
    hit: false,
    flip: null,
  };
  if (prize.kind === "coin")
    payout.flip = startCoinFlip(from, now, size / 2, 0);
  // the badge rewards are a lazy chunk the idle loader may not have reached
  else if (prize.kind === "badge")
    void loadFeaturedRewards().then(() =>
      eventProcContext(deps, deps.floors.indexOf(target) === 0).applyProcCrit?.(
        target,
        "crit",
        prize.badge,
      ),
    );
  else {
    const start = { ...from };
    const bend = { x: 0, y: 0 };
    const at = { x: 0, y: 0 };
    const { bar } = payout;
    barOnScreen(deps, target, height, bar);
    payout.smash = (t) => {
      if (t < now || t > now + SMASH_MS) return null;
      bend.x = (start.x + bar.x) / 2;
      bend.y = Math.min(start.y, bar.y) - SMASH_ARC;
      return bezier(start, bend, bar, progress(t, now, SMASH_MS) ** 1.6, at);
    };
  }
  return payout;
}

// a coin landing in the total: it pays
function landCoin(deps: FloorActionsDeps, floor: Floor): void {
  addTotalIncome(rewardPayoutAmount(floor, Date.now()));
  deps.persist();
  pulseHudTotalFlash();
  playSold();
  shakeScreen(COIN_SHAKE);
}

// where the total readout is on screen, from floor's space
function totalOnScreen(
  deps: FloorActionsDeps,
  floor: Floor,
  into: Point,
): void {
  const area = deps.getScreenAreaLocal?.(floor);
  const total = deps.getTotalLocal?.(floor);
  if (!area || !total) return;
  into.x = total.x - area.left;
  into.y = total.y - area.top;
}

// a crit number slamming onto its floor's bar: its levels land
function smashIn(deps: FloorActionsDeps, payout: Payout): void {
  if (payout.prize.kind !== "tier") return;
  const { multiplier, color } = CRIT_TIER_CONFIG[payout.prize.tier];
  increaseIncomeRateBy(payout.floor, multiplier);
  deps.persist();
  punchIncomeBar(payout.floor, `+${multiplier} Lvl`, color);
  shakeScreen(SMASH_SHAKE);
  playBarExplosion(1 + 0.1 * Math.random());
}

// whether a payout has finished playing
export function isPayoutDone(payout: Payout, now: number): boolean {
  if (payout.flip) return payout.flip.landed;
  return payout.prize.kind !== "tier" || now >= payout.at + SMASH_DONE_MS;
}

// a coin flipping up into the total, or a crit number flying up, swelling,
// and slamming onto its bar; nothing for badges, which paid on the tap
export function drawPayout(
  ctx: CanvasRenderingContext2D,
  deps: FloorActionsDeps,
  payout: Payout,
  height: number,
  t: number,
  now: number,
): void {
  const { flip, floor } = payout;
  if (flip) {
    // the bar point is spare for a coin: it holds the total
    totalOnScreen(deps, floor, payout.bar);
    drawCoinFlip(ctx, flip, t, payout.bar, () => landCoin(deps, floor));
    return;
  }
  if (payout.prize.kind !== "tier") return;
  barOnScreen(deps, payout.floor, height, payout.bar);
  const hitAt = payout.at + SMASH_MS;
  drawWispTrail(ctx, payout.smash, t, now, TRAIL_SIZE);
  if (t < hitAt) {
    const at = payout.smash(t);
    const u = progress(t, payout.at, SMASH_MS);
    const size =
      u < SMASH_SWELL
        ? lerp([payout.size, SMASH_SIZE], easeOut(u / SMASH_SWELL))
        : lerp(
            [SMASH_SIZE, payout.size],
            easeIn((u - SMASH_SWELL) / (1 - SMASH_SWELL)),
          );
    if (at) drawMini(ctx, payout.prize, at.x, at.y, size);
    return;
  }
  if (!payout.hit) {
    payout.hit = true;
    smashIn(deps, payout);
  }
  drawDetonation(ctx, payout.bar, t - hitAt, SMASH_BLAST, now);
  // squashed flat into the bar as it fades
  const out = progress(t, hitAt, SQUASH_MS);
  if (out >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - out;
  ctx.translate(payout.bar.x, payout.bar.y);
  ctx.scale(1 + 0.6 * out, 1 - 0.5 * out);
  drawMini(ctx, payout.prize, 0, 0, payout.size);
  ctx.restore();
}
