// the "Fountain" event: it covers its crit, whose click freezes the screen
// while the button jets coins and bills straight up; they arc over, rain down
// across the whole screen and hang there, then sweep into the total (see
// ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import type { CoinPath } from "../../../../floors/coins";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../../moneyCover";
import { between } from "../../../../shared/easing";

const KEY = "fountain";
const COINS = 300;
// the jet leaves the button within this many px of its middle
const JET_WIDTH = 40;
// how high the arcs peak, of the screen's height from its top
const PEAK: [number, number] = [0.04, 0.2];
// arcs always rise at least this far above where they start or land
const MIN_RISE = 120;

// a thrown coin's arc from the button's jet to its landing spot
function arcPath(
  area: CoverArea,
  button: { x: number; y: number },
  land: { x: number; y: number },
): CoinPath {
  const x0 = button.x + (Math.random() - 0.5) * JET_WIDTH;
  const y0 = button.y;
  const peakY = area.top + between(PEAK) * (area.bottom - area.top);
  const rise = Math.max(MIN_RISE, Math.min(y0, land.y) - peakY);
  return (t) => ({
    x: x0 + (land.x - x0) * t,
    y: y0 + (land.y - y0) * t - 4 * rise * t * (1 - t),
  });
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.fountainEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { streamMs, travelMs } = CONFIG.fountainEvent;
      const cover = startMoneyCover(KEY, floor, context, CONFIG.fountainEvent, {
        layout: (area) => coverSpots(area, COINS),
      });
      if (!cover) return;
      const paths = cover.spots.map((spot) =>
        arcPath(cover.area, cover.button, spot),
      );
      cover.flow(paths, streamMs, travelMs, true);
      playBoostEventStream();
    },
  },
  { label: "Fountain", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Fountain
export function forceFountainEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
