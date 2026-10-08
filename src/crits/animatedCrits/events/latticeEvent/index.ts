// the "Lattice" event: it covers its crit, whose click freezes the screen
// while rivers of cash shoot up out of its bottom edge one after another on
// the diagonal, bouncing from wall to wall and crossing each other into a
// woven diamond net of cash that climbs the whole screen, every river's
// launch a jolt; at the top they all pour into the total-income readout,
// which goes off in a huge blast and shake as the last arrives, and the
// coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { createBeats } from "../../../../shared/eventBeats";
import { roundCorners } from "../../riverPaths";
import { pourDurationMs, pourLine, totalSpot, type Pour } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "lattice";
const REWARD = 4;
// the rivers: launched from these shares across the bottom, alternately up
// to the right and up to the left, between walls INSET of the screen's width
// in from its sides, climbing to UNDER of its height below the total
const STARTS = [0.12, 0.88, 0.38, 0.62, 0.25, 0.75];
const INSET = 0.06;
const UNDER = 0.1;
const LIFT = 0.04;
const ROUND = 26;
const LAUNCH_SHAKE = 0.9;

export const forceLatticeEvent = registerWispEvent(
  KEY,
  "Lattice",
  () => CONFIG.latticeEvent.chance,
  (floor, context, area) => {
    const { gapMs, streamMs, travelMs, holdMs, mergeMs } = CONFIG.latticeEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const left = area.left + width * INSET;
    const right = area.right - width * INSET;
    const top = total.y + height * UNDER;
    // a straight diagonal bouncing off the walls until it nears the top
    const rivers = STARTS.map((share, k) => {
      let x = area.left + width * share;
      let y = area.bottom - height * LIFT;
      let dir = k % 2 === 0 ? 1 : -1;
      const corners: Point[] = [{ x, y }];
      while (y > top) {
        const run = dir === 1 ? right - x : x - left;
        const rise = Math.min(run, y - top);
        x += dir * rise;
        y -= rise;
        corners.push({ x, y });
        dir = -dir;
      }
      corners.push(total);
      return roundCorners(corners, ROUND, 6);
    });
    const pour: Pour = { coinsAlong: 330, width: 30, streamMs, travelMs };
    const starts = rivers.map((_, k) => k * gapMs);
    const lastIn = starts[starts.length - 1] + travelMs;
    const durationMs = Math.max(
      pourDurationMs(starts[starts.length - 1], pour),
      lastIn + holdMs + mergeMs,
    );

    const launches = createBeats(
      rivers,
      (_, k) => starts[k],
      (river) => {
        pourLine(cover!, river, pour);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(LAUNCH_SHAKE);
      },
    );
    const finale = createBeats(
      [lastIn],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          launches.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
