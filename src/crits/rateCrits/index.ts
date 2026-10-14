// rate crits: a special group playing a multiplier crit's number out onto
// the income bars in view, its own last, every reward landing on a bar's
// rate (how fast it runs, what it pays), never its levels. Each reward turns
// the bar's readout over onto its new value, so it reads whether the bar is
// filling, full and beating, or maxed gold. Each kind is its own module
// under ./crits, played by floorCrits/critPlayer; a hit of step 0 only
// jolts, any other lands its reward on that bar
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import type { Floor } from "../../gameState";
import type { RateCritKind } from "../critTypes";
import type { FloorCritPlay } from "../floorCrits/critPlayer";
import { otherFloorsInView, spotsFromFlash } from "../floorCrits/playTargets";
import {
  bankDoublePayout,
  overclockBar,
  stepBar,
  windUpBar,
} from "./rateBonus";
import { CONFIG } from "../../config";
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

// step 2 is the crit's own bar
function reward(kind: RateCritKind, target: Floor, step: number): void {
  switch (kind) {
    case "overclockCrit":
      overclockBar(target);
      return;
    case "shiftUpCrit":
      target.incomeIntervalSeconds /= CONFIG.crit.shiftUpSpeed;
      return;
    case "quickstepCrit":
      stepBar(target);
      return;
    case "shortcutCrit":
      bankDoublePayout(target);
      return;
    case "cleanCutCrit":
      target.payoutMultiplier =
        (target.payoutMultiplier ?? 1) *
        (step === 2
          ? CONFIG.crit.cleanCutOwnPayout
          : CONFIG.crit.cleanCutPayout);
      return;
    case "woundUpCrit":
      windUpBar(target);
      return;
  }
}

// a rate crit playing out from floor's crit onto every open floor's bar in
// view, maxed ones too, its own first in bars()
export function rateCritPlayFor(
  deps: FloorActionsDeps,
  floor: Floor,
  kind: RateCritKind,
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
    onHit: (bar, step, _color, spill) => {
      const target = targets[bar];
      playBarExplosion(1 + step * 0.08);
      if (step === 0) {
        punchIncomeBar(target, null);
        return;
      }
      // turned over from what it read before the reward
      flipIncomeRate(target);
      reward(kind, target, step);
      punchIncomeBar(target, null, COLOR.heavenlyGold);
      if (kind === "shiftUpCrit" || kind === "cleanCutCrit") deps.persist();
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
