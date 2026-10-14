// rate crits: a special group playing a multiplier crit's number out onto
// the income bars in view, its own last, every reward landing on a bar's
// rate (how fast it runs, what it pays), never its levels. Each reward turns
// the bar's readout over onto its new value, so it reads whether the bar is
// filling, full and beating, or maxed gold. Each kind is its own module
// under ./crits, played by floorCrits/critPlayer; a hit of step 0 only
// jolts, any other lands its reward on that bar
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import type { Floor } from "../../gameState";
import type { CritTier, RateCritKind } from "../critTypes";
import {
  getFloorCritDef,
  type FloorCritPlay,
} from "../floorCrits/critPlayer";
import { critTarget } from "../critKit/target";
import { otherFloorsInView, spotsFromFlash } from "../floorCrits/playTargets";
import { COLOR } from "../../palette";
import { liveEffect } from "../../shared/detachedJob";
import { playBarExplosion } from "../../shared/explosionBang";
import {
  flipIncomeRate,
  getIncomeBarBox,
  getIncomeBarCenter,
  punchIncomeBar,
} from "../../floors/incomePanel";
import { spawnCoinBurst as animateCoinBurst } from "../../floors/coins";

const spawnCoinBurst = liveEffect(animateCoinBurst);

// a reward hit knocks this many coins off its bar
const COIN_SPILL: [number, number] = [8, 14];

// a rate crit playing out from floor's crit onto every open floor's bar in
// view, maxed ones too, its own first in bars()
export function rateCritPlayFor(
  deps: FloorActionsDeps,
  floor: Floor,
  kind: RateCritKind,
  tier: CritTier,
  count: number,
): FloorCritPlay {
  const isGround = (f: Floor) => deps.floors.indexOf(f) === 0;
  const others = otherFloorsInView(
    deps,
    floor,
    (f) => getIncomeBarCenter(isGround(f)).y,
    true,
  );
  const targets = [floor, ...others];
  return {
    kind,
    barHalfWidth: getIncomeBarBox(isGround(floor)).width / 2,
    bars: spotsFromFlash(deps, floor, targets, (target) =>
      getIncomeBarCenter(isGround(target)),
    ),
    onHit: (bar, step, color, spill) => {
      const target = targets[bar];
      playBarExplosion(1 + step * 0.08);
      if (step === 0) {
        punchIncomeBar(target, null);
        return;
      }
      // turned over from what it read before the reward
      flipIncomeRate(target);
      // its own reward (FloorCritDef's), its module loaded by its first hit
      getFloorCritDef(kind)?.reward?.(
        critTarget({
          floor: target,
          ownFloor: floor,
          floors: deps.floors,
          step,
          tier,
          count,
          color,
        }),
      );
      punchIncomeBar(target, null, COLOR.heavenlyGold);
      deps.persist();
      const box = getIncomeBarBox(isGround(target));
      spawnCoinBurst(
        target,
        box.x + box.width * (0.2 + Math.random() * 0.6),
        box.y + box.height / 2,
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
