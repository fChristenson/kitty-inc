// the "Trails" event: like Stream, but its crit's click sends many short
// coin streams off from the button in every direction, one after another,
// each winding its own short way into the total (see ../riverPaths)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { randomInt } from "../../utils";
import { playBoostEventStream } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  FLOW_FLIGHT_MS,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";
import { riverPaths, type RiverOptions } from "../riverPaths";

const KEY = "trails";
const TRAILS: [number, number] = [8, 12];
const COINS_PER_TRAIL = 110;
const END_PAUSE_MS = 100;
const TRAIL: RiverOptions = {
  wander: [0.15, 0.4],
  loops: [0, 0],
  startWidth: 30,
};

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.trailsEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { spreadMs, pourMs, travelMs } = CONFIG.trailsEvent;
      const durationMs =
        spreadMs + pourMs + travelMs * 1.03 + FLOW_FLIGHT_MS + END_PAUSE_MS;
      const cover = startMoneyCover(KEY, floor, context, { durationMs }, {});
      if (!cover) return;
      const trails = randomInt(...TRAILS);
      for (let i = 0; i < trails; i++)
        setTimeout(
          () => {
            if (!cover.isLive()) return;
            const paths = riverPaths(
              cover.area,
              cover.button,
              COINS_PER_TRAIL,
              TRAIL,
            );
            cover.flow(paths, pourMs, travelMs);
          },
          (spreadMs * i) / Math.max(1, trails - 1),
        );
      playBoostEventStream();
    },
  },
  { label: "Trails", color: COLOR.teal },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Trails
export function forceTrailsEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
