// income crits: the floor crits' twin for the total income, only ever on a
// cash crit. Its amount slams in green, then plays out onto the total readout
// (the player's one "bar"), every hit paying its share into the total. Each
// kind is its own module under ./crits, played by floorCrits/critPlayer
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import type { IncomeCritKind } from "../critTypes";
import type { FloorCritPlay } from "../floorCrits/critPlayer";
import { liveEffect } from "../../shared/detachedJob";
import { multiply, type BigNumber } from "../../shared/bigNumber";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import { getActiveCompanyIndex } from "../../company";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { playBarExplosion } from "../../shared/explosionBang";
import { spawnCoinBurst as animateCoinBurst } from "../../floors/coins";

const spawnCoinBurst = liveEffect(animateCoinBurst);

// how wide the readout's blasts spread, in the flash's units
const TOTAL_HALF_WIDTH = 420;
// a hit knocks coins out of the total, spilling down the screen
const COIN_SPILL: [number, number] = [10, 18];

// what an income crit adds to its cash crit's amount: `count` multiples of
// CONFIG.crit.incomeCritSeconds of the company's income
export function incomeCritBonus(count: number): BigNumber {
  return multiply(
    getCompanyIncomeRatePerSecond(getActiveCompanyIndex()),
    count * CONFIG.crit.incomeCritSeconds,
  );
}

// an income crit playing out from floor's crit onto the total, paying
// `reward` split across its hits
export function incomeCritPlayFor(
  deps: FloorActionsDeps,
  floor: Floor,
  kind: IncomeCritKind,
  reward: BigNumber,
): FloorCritPlay {
  const total = () => deps.getTotalLocal?.(floor) ?? { x: 0, y: -1e3 };
  return {
    kind,
    barHalfWidth: TOTAL_HALF_WIDTH,
    // the total from the screen's middle, where the flash is
    bars: () => {
      const center = deps.getScreenCenterLocal(floor);
      const at = total();
      return [{ x: at.x - center.x, y: at.y - center.y }];
    },
    onHit: (_bar, step, _color, spill, share = 1) => {
      playBarExplosion(1 + step * 0.08);
      addTotalIncome(multiply(reward, share));
      pulseHudTotalFlash();
      deps.persist();
      const at = total();
      spawnCoinBurst(
        floor,
        at.x + (Math.random() - 0.5) * TOTAL_HALF_WIDTH,
        at.y,
        () => {},
        0.7,
        [
          Math.max(1, Math.round(COIN_SPILL[0] * spill)),
          Math.max(1, Math.round(COIN_SPILL[1] * spill)),
        ],
      );
    },
  };
}
