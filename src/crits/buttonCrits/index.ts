// button crits: a special group playing a multiplier crit's number out onto
// the upgrade buttons in view, its own first, every reward landing on a
// button. Each kind is its own module under ./crits, played by
// floorCrits/critPlayer; a hit of step 0 only jolts, any other lands its
// reward on that button
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import { isFloorMaxed, type Floor } from "../../gameState";
import type { ButtonCritKind, CritTier } from "../critTypes";
import { getFloorCritDef, type FloorCritPlay } from "../floorCrits/critPlayer";
import { otherFloorsInView, spotsFromFlash } from "../floorCrits/playTargets";
import { critTarget } from "../critKit/target";
import { liveEffect } from "../../shared/detachedJob";
import { playBarExplosion } from "../../shared/explosionBang";
import {
  BTN_W,
  getButtonCenter,
  triggerButtonPress as animateButtonPress,
} from "../../floors/upgradeButton";
import { spawnCoinBurst as animateCoinBurst } from "../../floors/coins";

const spawnCoinBurst = liveEffect(animateCoinBurst);
const triggerButtonPress = liveEffect(animateButtonPress);

// a reward hit knocks this many coins off its button
const COIN_SPILL: [number, number] = [8, 14];

// a button crit playing out from floor's crit onto its own button, then every
// other open, not yet maxed floor's in view
export function buttonCritPlayFor(
  deps: FloorActionsDeps,
  floor: Floor,
  kind: ButtonCritKind,
  tier: CritTier,
  count: number,
): FloorCritPlay {
  const isGround = (f: Floor) => deps.floors.indexOf(f) === 0;
  const others = otherFloorsInView(
    deps,
    floor,
    (f) => getButtonCenter(isGround(f)).y,
  );
  const targets = [floor, ...others];
  return {
    kind,
    barHalfWidth: BTN_W / 2,
    bars: spotsFromFlash(deps, floor, targets, (target) =>
      getButtonCenter(isGround(target)),
    ),
    onHit: (bar, step, color, spill) => {
      const target = targets[bar];
      playBarExplosion(1 + step * 0.08);
      if (step === 0 || isFloorMaxed(target)) return;
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
      triggerButtonPress(target);
      deps.persist();
      const at = getButtonCenter(isGround(target));
      spawnCoinBurst(
        target,
        at.x + (Math.random() - 0.5) * BTN_W * 0.6,
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
