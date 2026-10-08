// the "Moths" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a big flame wisp flares up out of the clicked
// floor's button into the middle of the screen and moth wisps come
// fluttering in from the edges, spiralling in on it in giddy, jittery
// loops, ever tighter; one after another they catch alight and dart off
// blazing onto an empty spot on a floor in view, each a pop and a jolt as
// a new worker forms; the flame then flares in a huge blast and shake.
// Then the crit's tier pays out
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
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "moths";
const MAX_HIRES = 6;
const FORM_MS = 300;
// moths start OUT of the screen's half-size away, spiralling in to NEAR px
// at LAPS laps a second, jittering JITTER px
const OUT = 1.1;
const NEAR = 40;
const LAPS = 0.8;
const JITTER = 16;
const DART_MS = 300;
const FLAME = 0.9;
const MOTH = 0.32;
const DART_SHAKE: [number, number] = [0.5, 1.2];

export const forceMothsEvent = registerWispEvent(
  KEY,
  "Moths",
  () => CONFIG.mothsEvent.chance,
  (floor, context, area) => {
    const { flareMs, circleMs, gapsMs, holdMs, mergeMs } = CONFIG.mothsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const flame: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const out =
      (Math.max(area.right - area.left, area.bottom - area.top) / 2) * OUT;
    let clock: number = flareMs + circleMs;
    const moths = hires.map((hire, k) => {
      const darts = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const start = (k / hires.length) * Math.PI * 2 + Math.random();
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const at: Point = { x: 0, y: 0 };
      const from: Point = { x: 0, y: 0 };
      const ctrl: Point = { x: 0, y: 0 };
      const circling = (ms: number, into: Point) => {
        const t = Math.max(0, ms - flareMs * 0.5);
        const u = clamp01(t / (darts - flareMs * 0.5));
        const r = lerp([out, NEAR], easeOut(u));
        const a = start + (t / 1000) * LAPS * Math.PI * 2 * (1 + u);
        into.x = flame.x + Math.cos(a) * r + Math.sin(ms / 37 + k) * JITTER;
        into.y =
          flame.y + Math.sin(a) * r * 0.8 + Math.cos(ms / 29 + k) * JITTER;
        return into;
      };
      circling(darts, from);
      ctrl.x = (from.x + spot.x) / 2;
      ctrl.y = Math.min(from.y, spot.y) - 80;
      return {
        hire,
        spot,
        darts,
        lands: darts + DART_MS,
        at: (ms: number): Point | null => {
          if (ms < flareMs * 0.5 || ms >= darts + DART_MS) return null;
          if (ms < darts) return circling(ms, at);
          return bezier(from, ctrl, spot, easeIn((ms - darts) / DART_MS), at);
        },
      };
    });
    const last = moths[moths.length - 1];
    const endAt = last.lands;
    const flameAt: Point = { x: 0, y: 0 };
    const flameWisp = (ms: number): Point | null => {
      if (ms > endAt) return null;
      const u = easeOut(Math.min(1, ms / flareMs));
      flameAt.x = lerp([button.x, flame.x], u) + Math.sin(ms / 50) * 2;
      flameAt.y = lerp([button.y, flame.y], u);
      return flameAt;
    };

    const landing = createBeats(
      moths,
      (m) => m.lands,
      (m, k) => {
        giveHire(m.hire);
        if (m === last) {
          cover!.blast(flame);
          return;
        }
        cover!.burst(m.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DART_SHAKE, k / Math.max(1, moths.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const m of moths)
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * MOTH,
              ms > m.darts ? 1 : 0.3,
              flareMs * 0.5,
              m.lands,
            );
          drawWispBetween(
            ctx,
            flameWisp,
            ms,
            now,
            WISP_SIZE * FLAME,
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
  (floor, context) => findRewardHires(floor, context).length > 0,
);
