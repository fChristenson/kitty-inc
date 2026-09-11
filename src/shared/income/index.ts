// The one shared per-floor income-rate/cycle formula — used identically by the
// live active-play ticker (floors/incomePanel's collectDueIncome/
// currentIncomeRatePerSecond) and by gameState's once-per-load idle/away-time
// catch-up (computeIdleIncome), so a returning player earns EXACTLY what the
// ticker would have paid out cycle-by-cycle the whole time the app was closed,
// never an approximation reimplemented by hand in a second place.
//
// Kept dependency-free on purpose (only a type-only Floor import, erased at
// runtime by verbatimModuleSyntax) so gameState.ts can import real values from
// here without creating a circular runtime dependency — gameState already
// imports type Floor from itself, and floors/incomePanel already imports Floor
// from gameState, so this module must never import a VALUE from either of them.
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { type BigNumber, ZERO, multiply, divide } from "../bigNumber";

// once a floor's true speed exceeds this, any faster payout folds into a bigger
// $ amount per cycle instead of a faster-than-manageable bar fill/catch-up loop
const MIN_INCOME_INTERVAL_SECONDS = CONFIG.incomePanel.minIncomeIntervalSeconds;

// permanent per-floor speed multiplier from the one-time office chairs/supplies/
// manager purchases (hud/upgradeMenu) — independent of (and stacked with) any
// caller-supplied temporary worker-boost multiplier
export function officeUpgradeSpeedMultiplier(floor: Floor): number {
  const perUpgrade = CONFIG.officeUpgrades.speedMultiplierPerUpgrade;
  return (
    (floor.hasOfficeChairs ? perUpgrade : 1) *
    (floor.hasOfficeSupplies ? perUpgrade : 1) *
    (floor.hasManager ? perUpgrade : 1)
  );
}

export interface EffectiveIncomeCycle {
  intervalSeconds: number;
  amount: BigNumber;
  overspeed: boolean;
}

// speedMultiplier is caller-supplied rather than derived internally from `now` —
// active play passes a worker-boost-aware multiplier (floors/incomePanel's own
// currentSpeedMultiplier), idle catch-up just passes officeUpgradeSpeedMultiplier
// alone (no worker boost survives a reload, so there's nothing else to fold in).
// The MIN_INCOME_INTERVAL_SECONDS clamp below is purely a display/pacing trick —
// the resulting amount/intervalSeconds rate is mathematically identical whether
// or not overspeed kicks in, which is what makes this formula safe to reuse
// verbatim for a lump-sum catch-up instead of only a per-frame tick
export function effectiveIncomeCycle(
  floor: Floor,
  speedMultiplier: number,
): EffectiveIncomeCycle {
  const uncappedIntervalSeconds = floor.incomeIntervalSeconds / speedMultiplier;

  if (uncappedIntervalSeconds >= MIN_INCOME_INTERVAL_SECONDS) {
    return {
      intervalSeconds: uncappedIntervalSeconds,
      amount: floor.incomeAmount,
      overspeed: false,
    };
  }
  const overspeedMultiplier =
    MIN_INCOME_INTERVAL_SECONDS / uncappedIntervalSeconds;
  return {
    intervalSeconds: MIN_INCOME_INTERVAL_SECONDS,
    amount: multiply(floor.incomeAmount, overspeedMultiplier),
    overspeed: true,
  };
}

// advances floor.lastCollectedAt by however many full cycles elapsed since it was
// last checked, returning the $ earned from those completed cycles (ZERO if the
// bar hasn't filled yet) — shared by the per-frame ticker and the once-per-load
// idle catch-up alike
export function collectDueIncome(
  floor: Floor,
  now: number,
  speedMultiplier: number,
): BigNumber {
  const { intervalSeconds, amount } = effectiveIncomeCycle(
    floor,
    speedMultiplier,
  );
  const intervalMs = intervalSeconds * 1000;
  const cycles = Math.floor((now - floor.lastCollectedAt) / intervalMs);
  if (cycles <= 0) return ZERO;
  floor.lastCollectedAt += cycles * intervalMs;
  return multiply(amount, cycles);
}

// same math as collectDueIncome, but read-only — doesn't advance floor.lastCollectedAt
export function peekDueIncome(
  floor: Floor,
  now: number,
  speedMultiplier: number,
): BigNumber {
  const { intervalSeconds, amount } = effectiveIncomeCycle(
    floor,
    speedMultiplier,
  );
  const intervalMs = intervalSeconds * 1000;
  const cycles = Math.floor((now - floor.lastCollectedAt) / intervalMs);
  return cycles > 0 ? multiply(amount, cycles) : ZERO;
}

// a floor's own $/sec at its current effective rate — same cycle math
// collectDueIncome/peekDueIncome use, just expressed as a flat rate. This is
// what gameState's idle catch-up multiplies by elapsed seconds instead of
// hand-rolling incomeAmount/incomeIntervalSeconds itself
export function currentIncomeRatePerSecond(
  floor: Floor,
  speedMultiplier: number,
): BigNumber {
  const { intervalSeconds, amount } = effectiveIncomeCycle(
    floor,
    speedMultiplier,
  );
  return divide(amount, intervalSeconds);
}
