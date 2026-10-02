// the "Trickle" event: it covers its crit, whose click freezes the screen while
// coins and bills rain down from above the screen like Downpour's, but bounce
// on every floor in view on their way down, hopping off each one, until they
// settle in the pool along the screen's bottom and drain into the total
// (see ../rain)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import type { CoinPath } from "../coins";
import { canStartMoneyCover, isMoneyCoverRunning } from "../moneyCover";
import { startRain, type RainDrop } from "../rain";
import { findFloorLines } from "../onScreenWorkers";
import { FLOOR_W, SIDE_WALL_WIDTH } from "../constants";
import { between } from "../../shared/easing";

const KEY = "trickle";
// how high a drop hops off each floor, and off the bottom as it settles
const HOP: [number, number] = [50, 130];
const SETTLE_HOP: [number, number] = [12, 30];
// the coins pile up this deep on the screen's bottom
const POOL_DEPTH = 45;
// the pool stays at least this far below the lowest floor in view
const POOL_CLEARANCE = 25;


// a drop falling ever faster onto each floor below it, hopping off and
// slowing at the top of each hop, then falling on into its spot in the pool
// and settling there with one last little hop; timed like one gravity throughout
function bouncePath({ from, land }: RainDrop, ledges: number[]): CoinPath {
  const pieces: { y0: number; y1: number; ms: number; rising: boolean }[] = [];
  let y = from.y;
  const bounceOn = (ground: number, hop: number) => {
    pieces.push({
      y0: y,
      y1: ground,
      ms: Math.sqrt(ground - y),
      rising: false,
    });
    pieces.push({
      y0: ground,
      y1: ground - hop,
      ms: Math.sqrt(hop),
      rising: true,
    });
    y = ground - hop;
  };
  for (const ledge of ledges)
    if (ledge > y && ledge < land.y) bounceOn(ledge, between(HOP));
  bounceOn(land.y, between(SETTLE_HOP));
  pieces.push({
    y0: y,
    y1: land.y,
    ms: Math.sqrt(land.y - y),
    rising: false,
  });
  const total = pieces.reduce((sum, p) => sum + p.ms, 0) || 1;
  return (t) => {
    let at = t * total;
    let piece = pieces[pieces.length - 1];
    for (const p of pieces) {
      if (at <= p.ms) {
        piece = p;
        break;
      }
      at -= p.ms;
    }
    const f = piece.ms > 0 ? Math.min(1, at / piece.ms) : 1;
    const eased = piece.rising ? 1 - (1 - f) ** 2 : f * f;
    return {
      x: from.x + (land.x - from.x) * t,
      y: piece.y0 + (piece.y1 - piece.y0) * eased,
    };
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.trickleEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const ledges = findFloorLines(floor, context.getOnScreenFloors);
      startRain(
        KEY,
        floor,
        context,
        CONFIG.trickleEvent,
        (drop) => bouncePath(drop, ledges),
        // inside the building's walls, settling below every floor in view so
        // no drop rests on one
        (area) => ({
          left: SIDE_WALL_WIDTH,
          right: FLOOR_W - SIDE_WALL_WIDTH,
          poolDepth: POOL_DEPTH,
          poolTop:
            Math.max(-Infinity, ...ledges.filter((y) => y < area.bottom)) +
            POOL_CLEARANCE,
        }),
      );
    },
  },
  { label: "Trickle", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Trickle
export function forceTrickleEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
