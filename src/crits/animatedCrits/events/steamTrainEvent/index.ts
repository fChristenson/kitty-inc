// the "Steam Train" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a locomotive wisp pulls out of the
// clicked floor's button with two carriage wisps in tow, chugging a winding
// line round the screen and puffing great billows of cash out of its stack
// at every chuff; it pulls into an empty spot with a hiss and a jolt and a
// new worker steps off, then steams on to the next, quicker each time, the
// last stop landing in a huge blast and shake. Pays floor income × floor
// number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute, bezier } from "../../../../shared/curves";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";

const KEY = "steamTrain";
const REWARD = 2;
const MAX_HIRES = 5;
const WIND = 110;
const CHUFF_MS = 85;
const STACK = 18;
const PUFF_UP = 150;
const PUFF_BACK = 130;
const LOCO = 0.6;
const CARRIAGE = 0.4;
const CARRIAGE_LAG_MS = 70;
const FORM_MS = 300;
const CHUFF_SHAKE = 0.15;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Stop {
  hire: RewardHire;
  // where on the route it pulls in, and when it arrives and leaves
  u: number;
  arrives: number;
  leaves: number;
}

export const forceSteamTrainEvent = registerWispEvent(
  KEY,
  "Steam Train",
  () => CONFIG.steamTrainEvent.chance,
  (floor, context) => {
    const { legsMs, dwellMs, holdMs, mergeMs } = CONFIG.steamTrainEvent;
    const found = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (found.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // nearest stop next, from the button on
    const hires: RewardHire[] = [];
    let at: Point = button;
    const left = found.slice();
    while (left.length > 0) {
      let best = 0;
      for (let i = 1; i < left.length; i++)
        if (
          Math.hypot(left[i].x - at.x, left[i].y - at.y) <
          Math.hypot(left[best].x - at.x, left[best].y - at.y)
        )
          best = i;
      const next = left.splice(best, 1)[0];
      hires.push(next);
      at = next;
    }
    // a winding line: a bend off to the side between every pair of stops
    const route: Point[] = [button];
    let prev: Point = button;
    hires.forEach((hire, k) => {
      const dx = hire.x - prev.x;
      const dy = hire.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const side = k % 2 ? 1 : -1;
      route.push({
        x: (prev.x + hire.x) / 2 + (-dy / len) * WIND * side,
        y: (prev.y + hire.y) / 2 + (dx / len) * WIND * side,
      });
      route.push({ x: hire.x, y: hire.y });
      prev = hire;
    });
    const last = route.length - 1;
    let clock = 0;
    const stops: Stop[] = hires.map((hire, k) => {
      const arrives = clock + lerp(legsMs, k / Math.max(1, hires.length - 1));
      clock = arrives + dwellMs;
      return { hire, u: (2 * (k + 1)) / last, arrives, leaves: clock };
    });
    const lastStop = stops[stops.length - 1];
    const endAt = lastStop.arrives;
    const spot: Point = { x: 0, y: 0 };
    // easing out of each stop and into the next
    const uAt = (ms: number): number => {
      let from = 0;
      let leaves = 0;
      for (const s of stops) {
        if (ms < s.arrives)
          return lerp(
            [from, s.u],
            smoothstep(clamp01((ms - leaves) / (s.arrives - leaves))),
          );
        if (ms < s.leaves) return s.u;
        from = s.u;
        leaves = s.leaves;
      }
      return from;
    };
    const locoAt = (ms: number): Point =>
      alongRoute(route, uAt(Math.max(0, ms)), spot);
    const carriages = [1, 2].map(
      (n) => (ms: number) => locoAt(ms - n * CARRIAGE_LAG_MS),
    );
    // a billow out of the stack at every chuff while it's moving, puffing up
    // and back the way it came
    const pour: Pour = {
      coinsAlong: 26,
      width: 28,
      streamMs: 80,
      travelMs: 380,
    };
    const chuffs: { ms: number; line: Point[] }[] = [];
    const into: Point = { x: 0, y: 0 };
    for (let ms = 0; ms < endAt; ms += CHUFF_MS) {
      if (stops.some((s) => ms >= s.arrives && ms < s.leaves)) continue;
      const a = { ...locoAt(ms) };
      const b = locoAt(ms - 30);
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const len = Math.hypot(dx, dy) || 1;
      const from: Point = { x: a.x, y: a.y - STACK };
      const bend: Point = { x: from.x - (dx / len) * 30, y: from.y - PUFF_UP };
      const to: Point = {
        x: from.x - (dx / len) * PUFF_BACK,
        y: from.y - PUFF_UP * 0.8,
      };
      chuffs.push({
        ms,
        line: sampleLine((u) => ({ ...bezier(from, bend, to, u, into) }), 12),
      });
    }

    const chuffing = createBeats(
      chuffs,
      (c) => c.ms,
      (c, k) => {
        pourLine(cover!, c.line, pour);
        if (!cover!.isLive() || k % 2) return;
        shakeScreen(CHUFF_SHAKE);
      },
    );
    const arriving = createBeats(
      stops,
      (s) => s.arrives,
      (s, k) => {
        giveHire(s.hire);
        const at: Point = { x: s.hire.x, y: s.hire.y };
        if (s === lastStop) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, stops.length - 1)));
      },
    );
    const lastChuff = chuffs.length ? chuffs[chuffs.length - 1].ms : 0;

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt, pourDurationMs(lastChuff, pour)) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          chuffing.tick(ms, now);
          arriving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          if (ms <= endAt)
            for (const c of carriages)
              drawWispHead(ctx, c, ms, now, WISP_SIZE * CARRIAGE, 0.6);
          drawWispBetween(ctx, locoAt, ms, now, WISP_SIZE * LOCO, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
