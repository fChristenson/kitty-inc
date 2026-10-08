// the "Surf" event (mix; cash): it covers its crit, whose click freezes the
// screen while a huge wave of cash rolls in from one side along the bottom,
// swelling ever higher, a wisp surfing its face; the surfer carves up and
// down it, ever harder, every turn a flash, a bloop, a jolt and a spray of
// coins off the lip; at the far side the wave rears up and breaks, pouring up
// into the total behind the surfer, which goes off in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "surf";
const REWARD = 4;
const COINS = 1_500;
const COIN = 0.7;
// the wave runs BACK px behind its crest and FRONT ahead, its steep face
// FACE px and its long back SLOPE px, swelling from HEIGHT[0] to HEIGHT[1]
const BACK = 560;
const FRONT = 50;
const FACE = 55;
const SLOPE = 240;
const HEIGHT: [number, number] = [150, 300];
// the lip throws CURL px ahead of the face
const CURL = 50;
const CHURN = 9;
const SURFER = 1;
// the surfer carves up and down CARVE px, faster and faster
const CARVE = 60;
const CARVE_RATE: [number, number] = [0.009, 0.02];
const SPRAY_COINS = 8;
const TURN_SHAKE: [number, number] = [0.5, 1.4];

export const forceSurfEvent = registerWispEvent(
  KEY,
  "Surf",
  () => CONFIG.surfEvent.chance,
  (floor, context, area) => {
    const { rollMs, drainMs, flightMs, holdMs, mergeMs } = CONFIG.surfEvent;
    const fallback = totalSpot(area);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const base = area.bottom - 30;
    const from = dir > 0 ? area.left - 150 : area.right + 150;
    const to = dir > 0 ? area.right - 130 : area.left + 130;
    const crestX = (ms: number) =>
      from + (to - from) * Math.min(1, ms / rollMs);
    const height = (ms: number) => lerp(HEIGHT, clamp01(ms / rollMs));
    // the wave's height at dx px ahead of its crest, 0..1
    const profile = (dx: number) =>
      dx > 0 ? Math.exp(-((dx / FACE) ** 2)) : Math.exp(-((dx / SLOPE) ** 2));
    const breakAt = rollMs;
    const endAt = breakAt + drainMs + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const dx = -BACK + (BACK + FRONT) * Math.random();
      const v = Math.sqrt(Math.random());
      const phase = Math.random() * Math.PI * 2;
      const flies = breakAt + ((FRONT - dx) / (BACK + FRONT)) * drainMs;
      const place = (ms: number, into: Point): Point => {
        const lip = v > 0.8 && dx > -70 ? CURL * ((v - 0.8) / 0.2) ** 2 : 0;
        into.x =
          crestX(ms) + dir * (dx + lip) + Math.cos(ms * 0.011 + phase) * CHURN;
        into.y =
          base -
          height(ms) * profile(dx) * v +
          Math.sin(ms * 0.013 + phase) * CHURN;
        return into;
      };
      const start: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < flies) {
          place(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        place(flies, start);
        const total = cover?.total() ?? fallback;
        lift.x = start.x;
        lift.y = total.y;
        bezier(
          start,
          lift,
          total,
          easeIn(clamp01((ms - flies) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    // the surfer's carve, ms in, quickening
    const [r0, r1] = CARVE_RATE;
    const carve = (ms: number) =>
      r0 * ms + ((r1 - r0) * ms * ms) / (2 * rollMs);
    const turns: number[] = [];
    for (let ms = 0, next = Math.PI / 2; ms < breakAt; ms += 4)
      if (carve(ms) >= next) {
        turns.push(ms);
        next += Math.PI;
      }
    const into: Point = { x: 0, y: 0 };
    const surfer = (ms: number): Point | null => {
      if (ms < 0 || ms >= breakAt + flightMs) return null;
      if (ms >= breakAt) {
        const total = cover?.total() ?? fallback;
        const u = easeIn((ms - breakAt) / flightMs);
        const sx = crestX(breakAt) - dir * 30;
        const sy = base - height(breakAt) * profile(-30);
        into.x = sx + (total.x - sx) * u;
        into.y = sy + (total.y - sy) * u;
        return into;
      }
      const s = Math.sin(carve(ms));
      const dx = -30 - CARVE * 0.5 + s * CARVE * 0.5;
      into.x = crestX(ms) + dir * dx;
      into.y = base - height(ms) * profile(dx) - 14 + s * CARVE * 0.6;
      return into;
    };

    const turning = createBeats(
      turns,
      (ms) => ms,
      (ms, k) => {
        const t = k / Math.max(1, turns.length - 1);
        const at = { ...surfer(ms)! };
        cover!.burst(at, 0.4 + 0.4 * t);
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(
              at,
              SPRAY_COINS,
              [60, 180],
              -Math.PI / 2 + dir * 0.6,
              1.2,
            ),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TURN_SHAKE, t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turning.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            surfer,
            ms,
            now,
            WISP_SIZE * SURFER,
            clamp01(ms / breakAt),
            0,
            breakAt + flightMs,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
