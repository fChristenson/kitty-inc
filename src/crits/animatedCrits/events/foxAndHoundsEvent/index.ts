// the "Fox and Hounds" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a small fox wisp bolts out of the clicked
// floor's button and zigzags round the screen in sharp darts, ever faster,
// a pack of four hound wisps streaming after it along its own trail; every
// time a hound snaps where the fox just turned: a burst of coins, a bloop
// and a jolt; finally the fox dives into the total and the whole pack piles
// in after it in a huge blast and shake. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "foxAndHounds";
const REWARD = 4;
const DARTS = 9;
const HOUNDS = 4;
// each hound runs LAG ms behind the one ahead
const LAG = 110;
const EDGE = 120;
const TOP = 240;
const DIVE_MS = 300;
const FOX = 0.34;
const HOUND = 0.42;
const SNAP_COINS = 6;
const SNAP_REACH: [number, number] = [20, 90];
const PILE_COINS = 12;
const PILE_REACH: [number, number] = [30, 140];
const SNAP_SHAKE: [number, number] = [0.3, 0.9];
const PILE_SHAKE = 1.2;
const BANG_GAP_MS = 60;

export const forceFoxAndHoundsEvent = registerWispEvent(
  KEY,
  "Fox and Hounds",
  () => CONFIG.foxAndHoundsEvent.chance,
  (floor, context, area) => {
    const { dartsMs, holdMs, mergeMs } = CONFIG.foxAndHoundsEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const turns: Point[] = Array.from({ length: DARTS }, (_, k) => ({
      x:
        k % 2 === 0
          ? lerp([cx + 60, area.right - EDGE], Math.random())
          : lerp([area.left + EDGE, cx - 60], Math.random()),
      y: lerp([top, bottom], Math.random()),
    }));
    let clock = 0;
    const legs = turns.map((to, k) => {
      const starts = clock;
      clock += lerp(dartsMs, k / (DARTS - 1));
      return { from: k === 0 ? button : turns[k - 1], to, starts, ends: clock };
    });
    const diveStarts = clock;
    const diveEnds = diveStarts + DIVE_MS;
    const endAt = diveEnds + LAG * HOUNDS;
    const last = turns[DARTS - 1];
    const runner = (lag: number) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const t = Math.max(0, ms - lag);
        if (t >= diveStarts) {
          const total = cover?.total() ?? fallback;
          const e = easeIn(clamp01((t - diveStarts) / DIVE_MS));
          at.x = lerp([last.x, total.x], e);
          at.y = lerp([last.y, total.y], e);
          return at;
        }
        let leg = legs[0];
        for (const l of legs) if (t >= l.starts) leg = l;
        const e = easeOut(clamp01((t - leg.starts) / (leg.ends - leg.starts)));
        at.x = lerp([leg.from.x, leg.to.x], e);
        at.y = lerp([leg.from.y, leg.to.y], e);
        return at;
      };
    };
    const fox = runner(0);
    const hounds = Array.from({ length: HOUNDS }, (_, h) =>
      runner(LAG * (h + 1)),
    );
    const snaps = legs.flatMap((leg, k) =>
      Array.from({ length: HOUNDS }, (_, h) => ({
        at: leg.to,
        due: leg.ends + LAG * (h + 1),
        k,
      })),
    );
    const piles = Array.from(
      { length: HOUNDS + 1 },
      (_, h) => diveEnds + LAG * h,
    );

    let lastBang = -Infinity;
    const bang = (now: number) => {
      if (now - lastBang < BANG_GAP_MS) return;
      lastBang = now;
      playBloop();
    };
    const snapping = createBeats(
      snaps,
      (s) => s.due,
      (s, _, now) => {
        cover!.burst(s.at, 0.35);
        cover!.launchFrom(s.at, ringTargets(s.at, SNAP_COINS, SNAP_REACH));
        if (!cover!.isLive()) return;
        shakeScreen(lerp(SNAP_SHAKE, s.k / (DARTS - 1)));
        bang(now);
      },
    );
    const piling = createBeats(
      piles,
      (ms) => ms,
      (_, h, now) => {
        const total = cover!.total() ?? fallback;
        if (h === HOUNDS) {
          cover!.blast(total);
          return;
        }
        cover!.burst(total, 0.6);
        cover!.launchFrom(total, ringTargets(total, PILE_COINS, PILE_REACH));
        if (!cover!.isLive()) return;
        shakeScreen(PILE_SHAKE);
        bang(now);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          snapping.tick(ms, now);
          piling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (let h = 0; h < HOUNDS; h++)
            drawWispBetween(
              ctx,
              hounds[h],
              ms,
              now,
              WISP_SIZE * HOUND,
              0.4,
              0,
              diveEnds + LAG * (h + 1),
            );
          drawWispBetween(ctx, fox, ms, now, WISP_SIZE * FOX, 1, 0, diveEnds);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
