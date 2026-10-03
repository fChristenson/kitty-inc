// the "Moat" event (money; cash): it covers its crit, whose click freezes the
// screen while a river of cash floods out of the clicked floor's button down
// to the bottom of the screen and races round its edges like a moat, lap
// after lap, every corner a splash, a bloop and a jolt, ever harder; then
// it breaks off at the top and surges into the total in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "moat";
const REWARD = 4;
const LAPS = 2;
const EDGE = 34;
const TOP = 190;
// a sample every STEP px along the moat
const STEP = 24;
const CORNER_SHAKE: [number, number] = [0.3, 1.2];

export const forceMoatEvent = registerWispEvent(
  KEY,
  "Moat",
  () => CONFIG.moatEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.moatEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const cx = (left + right) / 2;
    const lap: Point[] = [
      { x: right, y: bottom },
      { x: right, y: top },
      { x: left, y: top },
      { x: left, y: bottom },
      { x: cx, y: bottom },
    ];
    const total = totalSpot(area);
    const corners: Point[] = [{ x: cx, y: bottom }];
    for (let l = 0; l < LAPS; l++) corners.push(...lap);
    corners.push(
      { x: right, y: bottom },
      { x: right, y: top },
      { x: cx, y: top },
      total,
    );
    const line: Point[] = [{ x: button.x, y: button.y }];
    const cornerIndex: number[] = [];
    let prev: Point = button;
    for (const c of corners) {
      const steps = Math.max(
        2,
        Math.round(Math.hypot(c.x - prev.x, c.y - prev.y) / STEP),
      );
      for (let i = 1; i <= steps; i++)
        line.push({
          x: lerp([prev.x, c.x], i / steps),
          y: lerp([prev.y, c.y], i / steps),
        });
      cornerIndex.push(line.length - 1);
      prev = c;
    }
    const along = measure(line);
    const length = along[along.length - 1];
    const hits = cornerIndex.map((i, k) => ({
      at: corners[k],
      ms: (along[i] / length) * travelMs,
    }));
    const last = hits[hits.length - 1];
    const pour: Pour = { coinsAlong: 1000, width: 30, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      last.ms + holdMs + mergeMs,
    );

    const cornering = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        if (h === last) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(h.at, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CORNER_SHAKE, k / (hits.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => cornering.tick(ms, now),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
