// the "Magnet" event: it covers its crit, whose click freezes the screen while
// a wisp (shared/wisp) hangs over the screen's middle and coins and bills pop up all
// over the screen, get yanked in to cling around it, then are all flung into
// the total (see ../moneyCover). Pays once per floor on screen
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { createEventFx } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import type { CoinPath } from "../../../../floors/coins";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";

const KEY = "magnet";
const COINS = 400;
// the orb's radius, and how far above the screen's middle it hangs
const ORB_SIZE = 90;
const ORB_RISE = 40;
// a pulled coin swerves up to this far (px) to one side on its way in
const CURL = 50;
// the coins cling in a ring around the orb, this far out (of its radius)
const CLING: [number, number] = [0.3, 1.1];
const HANG_MS = 300;

// a coin popping up at its spot and yanked, ever faster, into the clump
function pullPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
): CoinPath {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const curl = (Math.random() - 0.5) * 2 * CURL;
  return (t) => {
    const p = t * t;
    const swerve = Math.sin(Math.PI * p) * curl;
    return {
      x: start.x + dx * p - (dy / length) * swerve,
      y: start.y + dy * p + (dx / length) * swerve,
    };
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.magnetEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { streamMs, travelMs, mergeMs } = CONFIG.magnetEvent;
      const pullMs = streamMs + travelMs * 1.03;
      const fx = createEventFx(pullMs);
      let orb = { x: 0, y: 0 };
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: pullMs + HANG_MS + mergeMs, mergeMs },
        {
          layout: (area) => coverSpots(area, COINS),
          rewardMultiplier: Math.max(
            1,
            context.getOnScreenFloors?.().length ?? 1,
          ),
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            fx.draw(ctx, orb.x, orb.y, ({ white }) =>
              drawWisp(ctx, () => orb, now, now, WISP_SIZE, white),
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const { area } = cover;
      orb = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2 - ORB_RISE,
      };
      const paths = cover.spots.map((spot) => {
        const angle = Math.random() * Math.PI * 2;
        const r = ORB_SIZE * (CLING[0] + Math.random() * (CLING[1] - CLING[0]));
        return pullPath(spot, {
          x: orb.x + Math.cos(angle) * r,
          y: orb.y + Math.sin(angle) * r,
        });
      });
      cover.flow(paths, streamMs, travelMs, true);
      playBoostEventStream();
    },
  },
  { label: "Magnet", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Magnet
export function forceMagnetEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
