// the "High Dive" event (mix; cash): it covers its crit, whose click freezes
// the screen while two rivers of cash pour in along the bottom of the screen
// and pool in its middle, and a diver wisp climbs out of the clicked floor's
// button to the very top, teeters there trembling as the screen rumbles,
// then plunges straight down, ever faster, into the pool: it hits in a huge
// blast and shake and a towering column of cash erupts up the screen
// behind it into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "highDive";
const REWARD = 4;
const EDGE = 30;
const TOP = 200;
const TEETER = 5;
const DIVER = 0.55;

export const forceHighDiveEvent = registerWispEvent(
  KEY,
  "High Dive",
  () => CONFIG.highDiveEvent.chance,
  (floor, context, area) => {
    const { climbMs, teeterMs, diveMs, poolMs, spoutMs, holdMs, mergeMs } =
      CONFIG.highDiveEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const pool: Point = { x: cx, y: area.bottom - EDGE };
    const board: Point = { x: cx, y: area.top + TOP };
    const total = totalSpot(area);
    const diveAt = climbMs + teeterMs;
    const hitAt = diveAt + diveMs;
    const sides = [area.left, area.right].map((x) =>
      sampleLine(
        (u) => ({ x: lerp([x, cx], u), y: pool.y + Math.sin(Math.PI * u) * 6 }),
        30,
      ),
    );
    const poolPour: Pour = {
      coinsAlong: 500,
      width: 40,
      streamMs: poolMs,
      travelMs: poolMs * 0.8,
    };
    const spout = sampleLine(
      (u) => ({ x: cx, y: lerp([pool.y, total.y], u) }),
      40,
    );
    const spoutPour: Pour = {
      coinsAlong: 900,
      width: 50,
      streamMs: spoutMs,
      travelMs: spoutMs * 0.9,
    };
    const durationMs = Math.max(
      pourDurationMs(hitAt, spoutPour),
      pourDurationMs(0, poolPour),
      hitAt + holdMs + mergeMs,
    );
    const at: Point = { x: 0, y: 0 };
    const diver = (ms: number): Point | null => {
      if (ms > hitAt) return null;
      if (ms < climbMs) {
        const u = easeOut(ms / climbMs);
        at.x = lerp([button.x, board.x], u);
        at.y = lerp([button.y, board.y], u);
      } else if (ms < diveAt) {
        at.x = board.x + Math.sin(ms / 27) * TEETER;
        at.y = board.y;
      } else {
        at.x = board.x;
        at.y = lerp([board.y, pool.y], easeIn((ms - diveAt) / diveMs));
      }
      return at;
    };

    const rumbling = createBeats(
      [climbMs, climbMs + teeterMs / 2],
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive()) shakeScreen(0.4 + 0.3 * k);
      },
    );
    const diving = createBeats(
      [diveAt],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const splash = createBeats(
      [hitAt],
      (ms) => ms,
      () => {
        pourLine(cover!, spout, spoutPour);
        cover!.blast(pool);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          diving.tick(ms, now);
          splash.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            diver,
            ms,
            now,
            WISP_SIZE * DIVER,
            ms > diveAt ? 1 : 0.4,
            0,
            hitAt,
          ),
      },
    );
    if (!cover) return;
    for (const side of sides) pourLine(cover, side, poolPour);
    playBoostEventStream();
  },
);
