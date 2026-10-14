// what a played crit's reward gets (FloorCritDef's reward and beforeOpen):
// the floor its hit lands on and the hit, plus the reward landing on screen
// there, so a crit's module holds only what it gives. Its group's player
// (buttonCrits, lockCrits, rateCrits) makes one per reward hit
import type { Floor } from "../../gameState";
import type { CritTier } from "../critTypes";
import { multiply, type BigNumber } from "../../shared/bigNumber";
import { liveEffect } from "../../shared/detachedJob";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { addTotalIncome } from "../../totalIncome";
import {
  currentPayoutAmount,
  flipIncomeRate,
  getIncomeBarCenter,
  increaseIncomeRateBy,
  punchIncomeBar,
} from "../../floors/incomePanel";
import { flipUpgradeButton as animateFlip } from "../../floors/upgradeButton";
import { spawnHomingCoinBurst as animateHomingCoins } from "../../floors/coins";
import { celebrateWorkerBoost, recruitWorker } from "../../floors/worker";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../floors/constants";

const flipUpgradeButton = liveEffect(animateFlip);
const spawnHomingCoinBurst = liveEffect(animateHomingCoins);

export interface CritTarget {
  // the floor the hit lands on, the crit's own and the building's floors
  floor: Floor;
  ownFloor: Floor;
  floors: Floor[];
  own: boolean;
  // the hit's step (1, or 2 on its own floor), the crit's tier and multiple,
  // and its number's colour
  step: number;
  tier: CritTier;
  count: number;
  color: string;
  now: number;
  // a lock crit's: what the floor it opened would have cost, and how many
  // reward hits it landed before this one
  price: BigNumber | null;
  index: number;
  // levels on floor, its bar popping "+N Lvl"
  levelUp(levels: number): void;
  // its bar jolting, glowing the crit's colour, label over it
  punch(label: string | null): void;
  // its bar's readout turning over onto its new value: call it before
  // changing what the bar runs at or pays
  flipRate(): void;
  // its upgrade button turning over onto what it now gives
  flipButton(): void;
  // cash into the total, coins flying from floor's bar
  pay(amount: BigNumber): void;
  // floor's payout `payouts` times over into the total
  payPayouts(payouts: number): void;
  // a worker hired on floor, at spot (0..1 across its walk; random if unset)
  hire(spot?: number): void;
}

export interface CritHit {
  floor: Floor;
  ownFloor: Floor;
  floors: Floor[];
  step: number;
  tier: CritTier;
  count: number;
  color: string;
  price?: BigNumber | null;
  index?: number;
}

export function critTarget(hit: CritHit): CritTarget {
  const { floor, color } = hit;
  const now = Date.now();
  const target: CritTarget = {
    ...hit,
    own: floor === hit.ownFloor,
    now,
    price: hit.price ?? null,
    index: hit.index ?? 0,
    levelUp: (levels) => {
      if (levels <= 0) return;
      increaseIncomeRateBy(floor, levels);
      punchIncomeBar(floor, `+${levels} Lvl`, color);
    },
    punch: (label) => punchIncomeBar(floor, label, color),
    flipRate: () => flipIncomeRate(floor),
    flipButton: () => flipUpgradeButton(floor),
    pay: (amount) => {
      addTotalIncome(amount);
      const bar = getIncomeBarCenter(hit.floors.indexOf(floor) === 0);
      spawnHomingCoinBurst(floor, bar.x, bar.y, {
        onEachArrive: pulseHudTotalFlash,
      });
    },
    payPayouts: (payouts) =>
      target.pay(multiply(currentPayoutAmount(floor, now), payouts)),
    hire: (spot = Math.random()) => {
      const x = FLOOR_X_MIN + (FLOOR_X_MAX - FLOOR_X_MIN) * spot;
      const worker = recruitWorker(floor, x, now);
      if (worker !== null) celebrateWorkerBoost(floor, worker, now);
    },
  };
  return target;
}
