// the "Stream" event: it covers its crit, whose click freezes the screen while
// the button pours a river of coins and bills that winds across the whole
// screen, looping the loop along the way, then flows into the total (see
// ../moneyCover and ../riverPaths)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  FLOW_FLIGHT_MS,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { riverPaths, type RiverOptions } from "../../riverPaths";

const KEY = "stream";
// coins along the whole river while it's full
const COINS_ALONG = 2_000;
const END_PAUSE_MS = 100;
const RIVER: RiverOptions = { wander: [1.4, 2], loops: [1, 1], startWidth: 60 };

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.streamEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { travelMs } = CONFIG.streamEvent;
      // the button pours until the river's head reaches the total, then the
      // event ends as its tail does
      const streamMs = travelMs + FLOW_FLIGHT_MS;
      const durationMs =
        streamMs + travelMs * 1.03 + FLOW_FLIGHT_MS + END_PAUSE_MS;
      const cover = startMoneyCover(KEY, floor, context, { durationMs }, {});
      if (!cover) return;
      const count = Math.round((COINS_ALONG * streamMs) / travelMs);
      const paths = riverPaths(cover.area, cover.button, count, RIVER);
      cover.flow(paths, streamMs, travelMs);
      playBoostEventStream();
    },
  },
  { label: "Stream", color: COLOR.cyan },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Stream
export function forceStreamEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
