// the "Meander" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a broad river of cash spills out
// of the clicked floor's button up to the top of the screen and meanders down
// it in great lazy S-bends, swinging out to the edges and back through every
// income bar in view; each bar it floods through splashes with a jolt and
// free levels; it runs out of the bottom in a huge blast and shake and the
// coins sweep into the total. Pays floor income × floor number × REWARD,
// plus the levels
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "meander";
const REWARD = 2;
const MAX_BARS = 4;
const EDGE = 50;
const TOP = 150;
const FLOOD_SHAKE: [number, number] = [0.5, 1.3];

export const forceMeanderEvent = registerWispEvent(
  KEY,
  "Meander",
  () => CONFIG.meanderEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.meanderEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    let side = Math.random() < 0.5;
    const route: Point[] = [
      button,
      { x: side ? left : right, y: area.top + TOP },
    ];
    let y = area.top + TOP;
    for (const bar of bars) {
      side = !side;
      route.push({ x: side ? left : right, y: (y + bar.center.y) / 2 });
      route.push(bar.center);
      y = bar.center.y;
    }
    route.push({ x: side ? right : left, y: (y + area.bottom) / 2 });
    route.push({ x: (left + right) / 2, y: area.bottom - 10 });
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 200);
    const along = measure(line);
    const length = along[along.length - 1];
    const floods = bars.map((bar) => {
      let best = 0;
      let bestD = Infinity;
      line.forEach((p, i) => {
        const d = Math.hypot(p.x - bar.center.x, p.y - bar.center.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return { bar, ms: (along[best] / length) * travelMs };
    });
    const endMs = travelMs;
    const end = line[line.length - 1];
    const pour: Pour = { coinsAlong: 1000, width: 44, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      endMs + holdMs + mergeMs,
    );

    const flooding = createBeats(
      floods,
      (f) => f.ms,
      (f, k) => {
        cover!.levels(f.bar, levelsFor(f.bar.floor));
        cover!.burst(f.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FLOOD_SHAKE, k / Math.max(1, floods.length - 1)));
      },
    );
    const finale = createBeats(
      [endMs],
      (ms) => ms,
      () => cover!.blast(end),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          flooding.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
