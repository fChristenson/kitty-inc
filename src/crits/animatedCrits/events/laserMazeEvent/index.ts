// the "Laser Maze" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while a maze of blazing beam walls snaps into
// place corridor by corridor ahead of a wisp that races out of the clicked
// floor's button and threads it, cutting hard right-angle turns, every turn
// a flash, a click and a jolt, ever faster, all the way up to the
// building's locked floor; it bursts out of the maze into the lock and the
// whole maze blazes in a huge blast and shake; the floor bursts open,
// unlocked for free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { measure, pointAlong } from "../../cashFlow";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "laserMaze";
const LEGS = 8;
const EDGE = 60;
// walls run GAP px either side of the corridor, appearing AHEAD ms early
const GAP = 26;
const WALL = 7;
const AHEAD = 150;
const FLARE_MS = 350;
const RUNNER = 0.45;
const TURN_SHAKE: [number, number] = [0.3, 1];

export const forceLaserMazeEvent = registerWispEvent(
  KEY,
  "Laser Maze",
  () => CONFIG.laserMazeEvent.chance,
  (floor, context, area) => {
    const { runMs, holdMs, mergeMs } = CONFIG.laserMazeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    // a staircase of right-angle runs: across, up, across, up... to the lock
    const corners: Point[] = [button];
    for (let k = 1; k < LEGS; k++) {
      const prev = corners[k - 1];
      if (k % 2 === 1)
        corners.push({
          x: k === LEGS - 1 ? lock.x : lerp([left, right], Math.random()),
          y: prev.y,
        });
      else corners.push({ x: prev.x, y: lerp([button.y, lock.y], k / LEGS) });
    }
    const end = corners[corners.length - 1];
    corners.push({ x: end.x, y: lock.y });
    if (Math.abs(end.x - lock.x) > 1) corners.push(lock);
    const along = measure(corners);
    const length = along[along.length - 1];
    // time runs u ** 1.3 along the maze, quickening
    const timeOf = (d: number) => runMs * (d / length) ** (1 / 1.3);
    const walls = corners.slice(1).map((to, k) => {
      const from = corners[k];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = (-dy / d) * GAP;
      const ny = (dx / d) * GAP;
      return {
        shows: timeOf(along[k]) - AHEAD,
        turns: timeOf(along[k + 1]),
        at: to,
        sides: [
          [
            { x: from.x + nx, y: from.y + ny },
            { x: to.x + nx, y: to.y + ny },
          ],
          [
            { x: from.x - nx, y: from.y - ny },
            { x: to.x - nx, y: to.y - ny },
          ],
        ] as [Point, Point][],
      };
    });
    const endAt = runMs;
    const runnerAt: Point = { x: 0, y: 0 };
    const runner = (ms: number): Point =>
      pointAlong(corners, along, clamp01(ms / runMs) ** 1.3, runnerAt);

    const turning = createBeats(
      walls.slice(0, -1),
      (w) => w.turns,
      (w, k) => {
        cover!.burst(w.at, 0.25);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TURN_SHAKE, k / Math.max(1, walls.length - 2)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          turning.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLARE_MS) return;
          const flare = ms > endAt ? 1 - (ms - endAt) / FLARE_MS : 0;
          for (const w of walls) {
            if (ms < w.shows) continue;
            const show = clamp01((ms - w.shows) / 80);
            for (const [a, b] of w.sides)
              drawBeam(
                ctx,
                a,
                b,
                WALL * (1 + flare * 2),
                ms > endAt ? flare : 0.7 * show,
              );
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              runner,
              ms,
              now,
              WISP_SIZE * RUNNER,
              1,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
