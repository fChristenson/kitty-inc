// the "Pi Clacks" event (experiment: Galperin's colliding blocks, which
// count out pi; a crit tier): it covers its crit, whose click freezes the
// screen while a wall of light snaps up at the clicked floor's bar's left
// end and a small wisp settles on the bar; a wisp a hundred times heavier
// rolls in from the right and clacks into it, knocking it back and forth
// between the big one and the wall, the clacks coming faster and faster
// into a frantic buzz as the big one is pushed back, then slowing as it
// gives way: 31 clacks in all, the first digits of pi, every one a flash
// and a jolt of the bar; the big wisp rolls off, leaps and slams back down
// onto the bar, blowing it up a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "piClacks";
// a hundred to one gives 31 clacks
const MASS = 100;
const SMALL = WISP_SIZE * 0.55;
const BIG = WISP_SIZE * 1.4;
// px the wisps ride above the bar, and their radii for touching
const RIDE = 50;
const SMALL_R = 22;
const BIG_R = 56;
const WALL_H = 220;
const WALL_W = 10;
const TRACK_W = 4;
const LEAP = 360;
const SOUND_GAP_MS = 45;
const CLACK_SHAKE: [number, number] = [0.2, 0.55];

interface Clack {
  // sim time, and both wisps' spots and speeds just after it
  t: number;
  p1: number;
  p2: number;
  v1: number;
  v2: number;
  wall: boolean;
}

export const forcePiClacksEvent = registerWispEvent(
  KEY,
  "Pi Clacks",
  () => CONFIG.piClacksEvent.chance,
  (floor, context) => {
    const { growMs, clackMs, rollMs, slamMs, holdMs, mergeMs } =
      CONFIG.piClacksEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const wallX = bar.box.x;
    const y = bar.box.y - RIDE;
    // distances from touching: the small one from the wall, the big one
    // from the small one's far side
    const room = bar.box.width - 2 * SMALL_R - BIG_R;
    const clacks: Clack[] = [
      { t: 0, p1: room * 0.3, p2: room, v1: 0, v2: -1, wall: false },
    ];
    for (;;) {
      const c = clacks[clacks.length - 1];
      const toWall = c.v1 < 0 ? -c.p1 / c.v1 : Infinity;
      const toBlock = c.v2 < c.v1 ? (c.p2 - c.p1) / (c.v1 - c.v2) : Infinity;
      if (toWall === Infinity && toBlock === Infinity) break;
      const dt = Math.min(toWall, toBlock);
      const p1 = toWall <= toBlock ? 0 : c.p1 + c.v1 * dt;
      const p2 = c.p2 + c.v2 * dt;
      if (toWall <= toBlock) {
        clacks.push({ t: c.t + dt, p1, p2, v1: -c.v1, v2: c.v2, wall: true });
        continue;
      }
      clacks.push({
        t: c.t + dt,
        p1,
        p2: p1,
        v1: ((1 - MASS) * c.v1 + 2 * MASS * c.v2) / (1 + MASS),
        v2: ((MASS - 1) * c.v2 + 2 * c.v1) / (1 + MASS),
        wall: false,
      });
    }
    const last = clacks[clacks.length - 1].t;
    const toMs = (t: number) => growMs + (t / last) * clackMs;
    const toT = (ms: number) => ((ms - growMs) / clackMs) * last;
    const lastAt = growMs + clackMs;
    const leapAt = lastAt + rollMs;
    const slamAt = leapAt + slamMs;
    const hits = clacks.slice(1);
    // the state at sim time t
    const stateAt = (t: number) => {
      let k = 0;
      while (k < clacks.length - 1 && clacks[k + 1].t <= t) k++;
      const c = clacks[k];
      const dt = Math.max(0, t - c.t);
      return { p1: c.p1 + c.v1 * dt, p2: c.p2 + c.v2 * dt };
    };
    const xSmall = (p1: number) => wallX + SMALL_R + p1;
    const xBig = (p2: number) => wallX + 2 * SMALL_R + BIG_R + p2;
    const smallSpot: Point = { x: 0, y };
    const smallAt = (ms: number): Point | null => {
      if (ms > leapAt) return null;
      smallSpot.x = xSmall(stateAt(toT(Math.max(growMs, ms))).p1);
      return smallSpot;
    };
    const lift = { x: 0, y: 0 };
    const bigSpot: Point = { x: 0, y };
    const bigAt = (ms: number): Point | null => {
      if (ms > slamAt) return null;
      if (ms < growMs) {
        // rolling in from the bar's right end
        bigSpot.x = xBig(room) + (1 - easeOut(clamp01(ms / growMs))) * 200;
        bigSpot.y = y;
        return bigSpot;
      }
      if (ms <= leapAt) {
        bigSpot.x = xBig(stateAt(toT(ms)).p2);
        bigSpot.y = y;
        return bigSpot;
      }
      const from = xBig(stateAt(toT(leapAt)).p2);
      lift.x = (from + bar.center.x) / 2;
      lift.y = y - LEAP;
      return bezier(
        { x: from, y },
        lift,
        bar.center,
        easeIn(clamp01((ms - leapAt) / slamMs)),
        bigSpot,
      );
    };
    let soundAt = -Infinity;

    const opening = createBeats(
      [0, leapAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const clacking = createBeats(
      hits,
      (c) => toMs(c.t),
      (c, k, now) => {
        const at: Point = c.wall
          ? { x: wallX, y }
          : { x: xSmall(c.p1) + SMALL_R, y };
        cover!.burst(at, c.wall ? 0.25 : 0.35);
        if (!c.wall) cover!.levels(bar, 0, at);
        if (!cover!.isLive()) return;
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
        shakeScreen(lerp(CLACK_SHAKE, k / (hits.length - 1)));
      },
    );
    const slamming = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, { x: bar.center.x, y: y - LEAP });
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const wallTop: Point = { x: wallX, y: y - WALL_H / 2 };
    const wallFoot: Point = { x: wallX, y: bar.box.y };
    const trackFrom: Point = { x: wallX, y: y + SMALL_R };
    const trackTo: Point = { x: wallX + bar.box.width, y: y + SMALL_R };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: slamAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          opening.tick(ms, now);
          clacking.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > slamAt + 400) return;
          const grow = easeOut(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - leapAt) / 300);
          drawBeam(ctx, wallFoot, wallTop, WALL_W, 0.8 * grow * fade);
          drawBeam(ctx, trackFrom, trackTo, TRACK_W, 0.35 * grow * fade);
          if (ms <= leapAt) drawWisp(ctx, smallAt, ms, now, SMALL * grow, 0.6);
          if (ms <= slamAt) drawWisp(ctx, bigAt, ms, now, BIG, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
