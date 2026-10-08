// the "Stunt Track" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a river of cash tears in
// from the screen's edge and races up a stunt track, running a full
// loop-the-loop round each income bar in turn, every loop it closes a flash,
// a bang and a jolt landing free levels on the bar inside it; off the last
// loop it launches up into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "stuntTrack";
const REWARD = 2;
const MAX_BARS = 3;
const RADIUS = 150;
// each loop comes out this far past where it went in, like a corkscrew
const DRIFT = 60;
const LOOP_POINTS = 28;
const STEP = 24;
const LOOP_SHAKE: [number, number] = [0.7, 1.4];

export const forceStuntTrackEvent = registerWispEvent(
  KEY,
  "Stunt Track",
  () => CONFIG.stuntTrackEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, levelShare, holdMs, mergeMs } =
      CONFIG.stuntTrackEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => b.center.y - a.center.y);
    if (bars.length === 0) return;
    const total = totalSpot(area);
    const line: Point[] = [];
    const runTo = (to: Point) => {
      const from = line[line.length - 1];
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / STEP),
      );
      for (let i = 1; i <= steps; i++)
        line.push({
          x: lerp([from.x, to.x], i / steps),
          y: lerp([from.y, to.y], i / steps),
        });
    };
    // in from whichever side is farther from the first loop
    const first = bars[0].center;
    const fromLeft = first.x > (area.left + area.right) / 2;
    const dir = fromLeft ? 1 : -1;
    line.push({
      x: fromLeft ? area.left - 40 : area.right + 40,
      y: first.y + RADIUS,
    });
    const loopEnds: number[] = [];
    for (const bar of bars) {
      const { x, y } = bar.center;
      runTo({ x: x - (dir * DRIFT) / 2, y: y + RADIUS });
      // round the bar: up the far side, over the top and down the near side
      for (let i = 1; i <= LOOP_POINTS; i++) {
        const a = (i / LOOP_POINTS) * Math.PI * 2;
        line.push({
          x:
            x +
            dir *
              (Math.sin(a) * RADIUS + (DRIFT * i) / LOOP_POINTS - DRIFT / 2),
          y: y + Math.cos(a) * RADIUS,
        });
      }
      loopEnds.push(line.length - 1);
    }
    runTo(total);
    const along = measure(line);
    const length = along[along.length - 1];
    const pour: Pour = { coinsAlong: 900, width: 30, streamMs, travelMs };
    const loops = bars.map((bar, k) => ({
      bar,
      at: line[loopEnds[k]],
      closes: (travelMs * along[loopEnds[k]]) / length,
    }));
    const last = loops[loops.length - 1];

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const looping = createBeats(
      loops,
      (l) => l.closes,
      (l, k) => {
        cover!.levels(l.bar, levelsFor(l.bar.floor, levelShare, 2), l.at);
        if (l === last) for (const bar of bars) cover!.slam(bar);
        cover!.burst(l.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LOOP_SHAKE, k / Math.max(1, loops.length - 1)));
      },
    );
    const landing = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(0, pour),
          travelMs + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          looping.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
