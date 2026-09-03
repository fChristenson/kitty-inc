import { COLOR } from "../palette";
import { playJackpot } from "../sound";
import { triggerTwirlText } from "../shared/twirlText";
import { divide, type BigNumber } from "../shared/bigNumber";

// "Shopping spree" is a rare random moment — no more visual gauge building up
// to it (that whole segmented bar + persistent "Shopping"/"spree" banner was
// removed); instead floors/floorInteractions.ts rolls SPREE_CHANCE on every
// upgrade-button click that actually pays out (a normal paid upgrade, a
// crit's free upgrades, or a Sale-boosted click) via rollShoppingSpree()
// below. A hit just runs the existing center-screen "Shopping spree" twirl-in
// (shared/twirlText) + shared/coinRain's coin rain (both driven off
// isSpreeActive()) for a fixed SPREE_DURATION_MS, then ends on its own. Not
// persisted — a purely session-long moment, same as e.g. screenShake's own
// module state.

const SPREE_CHANCE = 0.01;
const SPREE_DURATION_MS = 15000;

let spreeEndsAt: number | null = null;

// call once per qualifying click (see floorInteractions.ts) — rolls
// SPREE_CHANCE and starts a spree on a hit; a no-op while one's already
// running (doesn't restack/extend it)
export function rollShoppingSpree(): void {
  if (spreeEndsAt !== null) return;
  if (Math.random() < SPREE_CHANCE) forceShoppingSpree();
}

// unconditional start — the roll above on a hit, and the dev-only "Shopping
// Spree" test button
export function forceShoppingSpree(): void {
  spreeEndsAt = Date.now() + SPREE_DURATION_MS;
  // same color/look as the mega ("25x") crit flash text (see
  // floorInteractions/critCelebration.ts), not ultra's red
  triggerTwirlText(["Shopping", "spree"], COLOR.amber, playJackpot);
}

// now defaults to Date.now() for callers that just need a one-off check
// (e.g. a floor-view cost/affordability check); gameCanvas.ts's redraw
// passes its own frame timestamp explicitly instead. Also the only place
// spreeEndsAt actually gets cleared once its time is up
export function isSpreeActive(now: number = Date.now()): boolean {
  if (spreeEndsAt !== null && now >= spreeEndsAt) spreeEndsAt = null;
  return spreeEndsAt !== null;
}

// half price on every floor-view purchase (upgrade button, floor unlock)
// while a spree is up — the one direct gameplay effect of the spree itself,
// separate from its celebratory twirl-in/coin-rain visuals
export function applySpreeDiscount(cost: BigNumber): BigNumber {
  return isSpreeActive() ? divide(cost, 2) : cost;
}

export function __debugState() {
  return { spreeEndsAt };
}

// TEMP debug hook — remove before shipping
if (import.meta.env.MODE !== "production") {
  (
    window as unknown as { __purchaseMeterDebug: unknown }
  ).__purchaseMeterDebug = {
    rollShoppingSpree,
    forceShoppingSpree,
    __debugState,
  };
}
