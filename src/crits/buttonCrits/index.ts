// button crits: a special group playing a multiplier crit's number out onto
// the upgrade buttons in view, its own first, every reward landing on a
// button. Each kind is its own module under ./crits, played by
// floorCrits/critPlayer; a hit of step 0 only jolts, any other lands its
// reward on that button
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import { isFloorMaxed, type Floor } from "../../gameState";
import type { ButtonCritKind, CritTier } from "../critTypes";
import type { FloorCritPlay } from "../floorCrits/critPlayer";
import { otherFloorsInView, spotsFromFlash } from "../floorCrits/playTargets";
import { armCritUpgrade } from "../floorCrits/upgradeCrit";
import {
  addButtonCharge,
  addDoubleTaps,
  addFreeTaps,
  addHireTaps,
  addHotTaps,
  addLinkedTaps,
  addNails,
  addPayoutTaps,
  linkButton,
} from "./buttonBonus";
import { CONFIG } from "../../config";
import { liveEffect } from "../../shared/detachedJob";
import { playBarExplosion } from "../../shared/explosionBang";
import {
  BTN_W,
  getButtonCenter,
  flipUpgradeButton as animateFlip,
  triggerButtonPress as animateButtonPress,
} from "../../floors/upgradeButton";
import { increaseIncomeRateBy, punchIncomeBar } from "../../floors/incomePanel";
import { spawnCoinBurst as animateCoinBurst } from "../../floors/coins";

const spawnCoinBurst = liveEffect(animateCoinBurst);
const triggerButtonPress = liveEffect(animateButtonPress);
const flipUpgradeButton = liveEffect(animateFlip);

// a reward hit knocks this many coins off its button
const COIN_SPILL: [number, number] = [8, 14];

// what one reward hit (step 1, or 2 for the crit's own last) gives a
// button: own is the crit's own button (ownFloor's), count the crit's
// multiple. Returns the levels it landed on the floor, if any
function reward(
  kind: ButtonCritKind,
  target: Floor,
  ownFloor: Floor,
  step: number,
  tier: CritTier,
  count: number,
): number {
  const own = target === ownFloor;
  switch (kind) {
    // a sure crit: the crit's own tier on its own button, a crit on the rest
    case "sureShotCrit":
      armCritUpgrade(target, own ? tier : "crit");
      flipUpgradeButton(target);
      return 0;
    // levels every press, the closing slam the crit's multiple
    case "autopressCrit": {
      const levels = step === 2 ? count : Math.ceil(count / 4);
      increaseIncomeRateBy(target, levels);
      return levels;
    }
    // free taps, twice the crit's multiple on its own button
    case "freeTapsCrit":
      addFreeTaps(target, own ? count * 2 : count);
      flipUpgradeButton(target);
      return 0;
    // its next tap lands the crit's multiple in levels, thrice on its own
    case "overchargeCrit":
      addButtonCharge(target, own ? count * 3 : count);
      return 0;
    // taps that each also pay its bar's payout, twice as many on its own
    case "gildedCrit":
      addPayoutTaps(target, own ? count * 2 : count);
      flipUpgradeButton(target);
      return 0;
    // taps that each land two levels, twice as many on its own
    case "blastingCapsCrit":
      addDoubleTaps(target, own ? count * 2 : count);
      flipUpgradeButton(target);
      return 0;
    // every other button linked to the own one, whose taps (the crit's
    // multiple) then level them all
    case "linkUpCrit":
      if (own) addLinkedTaps(target, count);
      else linkButton(ownFloor, target);
      flipUpgradeButton(target);
      return 0;
    // taps that each roll the next crit hot, twice as many on its own
    case "hotButtonCrit":
      addHotTaps(target, own ? count * 2 : count);
      flipUpgradeButton(target);
      return 0;
    // its next crit sticks for a few taps, twice as many on its own
    case "nailGunCrit":
      addNails(
        target,
        own ? CONFIG.crit.nailGunTaps * 2 : CONFIG.crit.nailGunTaps,
      );
      flipUpgradeButton(target);
      return 0;
    // taps that each hire a worker too, twice as many on its own
    case "springLoadedCrit": {
      const taps = Math.max(
        1,
        Math.round(count * CONFIG.crit.springLoadedHires),
      );
      addHireTaps(target, own ? taps * 2 : taps);
      flipUpgradeButton(target);
      return 0;
    }
  }
}

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
      const levels = reward(kind, target, floor, step, tier, count);
      // each press pops its own levels, so its few labels are made once
      if (levels > 0) punchIncomeBar(target, `+${levels} Lvl`, color);
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
