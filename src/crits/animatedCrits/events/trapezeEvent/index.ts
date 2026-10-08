// the "Trapeze" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while two trapezes on glitter ropes swing high across
// the top of the screen in time, a catcher wisp hanging off each; a flyer
// wisp swings out on the left one, lets go at the top of the swing and
// somersaults across into the catcher's hands with a pop, rides the right
// trapeze back up and is flung off its far swing in a looping dive onto an
// empty spot, landing with a bang and a jolt as a new worker forms there;
// flyer after flyer, the last landing in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "trapeze";
const MAX_HIRES = 4;
const FORM_MS = 300;
const LIFT = 20;
// the pivots sit SPREAD either side of the middle, ROPE long, swinging SWING rad
const SPREAD = 0.22;
const ROPE = 300;
const SWING = 0.75;
const TOP = 40;
const LOOP = 60;
const ARC = 120;
const GLITTER = 6;
const CATCHER = 0.45;
const FLYER = 0.55;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceTrapezeEvent = registerWispEvent(
  KEY,
  "Trapeze",
  () => CONFIG.trapezeEvent.chance,
  (floor, context, area) => {
    const { periodMs, flingMs, holdMs, mergeMs } = CONFIG.trapezeEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const midX = (area.left + area.right) / 2;
    const pivots: Point[] = [
      { x: midX - width * SPREAD, y: area.top + TOP },
      { x: midX + width * SPREAD, y: area.top + TOP },
    ];
    const half = periodMs / 2;
    // the left trapeze peaks forward (swung right) at whole periods, the
    // right one (swung left) half a period later
    const angle = (side: number, ms: number) =>
      side === 0
        ? SWING * Math.cos((2 * Math.PI * ms) / periodMs)
        : -SWING * Math.cos((2 * Math.PI * (ms - half)) / periodMs);
    const bar = (side: number, ms: number, into: Point): Point => {
      const a = angle(side, ms);
      into.x = pivots[side].x + Math.sin(a) * ROPE;
      into.y = pivots[side].y + Math.cos(a) * ROPE;
      return into;
    };
    const flyers = hires.map((hire, k) => {
      const lets = (k + 1) * periodMs;
      const caught = lets + half;
      const flung = caught + half;
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const from: Point = { x: 0, y: 0 };
      bar(1, flung, from);
      const lands = flung + flingMs;
      const at: Point = { x: 0, y: 0 };
      const grip: Point = { x: 0, y: 0 };
      const gripTo: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        mounts: lets - half,
        caught,
        lands,
        at: (ms: number): Point | null => {
          if (ms < lets) return bar(0, Math.max(0, ms), at);
          if (ms < caught) {
            // somersaulting across between the two trapezes
            const u = (ms - lets) / half;
            bar(0, lets, grip);
            bar(1, caught, gripTo);
            const a = u * Math.PI * 2;
            at.x = lerp([grip.x, gripTo.x], u) - Math.sin(a) * LOOP;
            at.y =
              lerp([grip.y, gripTo.y], u) -
              Math.sin(Math.PI * u) * ARC * 0.5 -
              (1 - Math.cos(a)) * LOOP;
            return at;
          }
          if (ms < flung) return bar(1, ms, at);
          const u = clamp01((ms - flung) / flingMs);
          const a = u * Math.PI * 2;
          at.x = lerp([from.x, spot.x], u) + Math.sin(a) * LOOP;
          at.y =
            lerp([from.y, spot.y], u) -
            Math.sin(Math.PI * u) * ARC -
            (1 - Math.cos(a)) * LOOP;
          return at;
        },
      };
    });
    const last = flyers[flyers.length - 1];
    const endAt = last.lands;
    const catchers = [0, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => bar(side, Math.max(0, ms), at);
    });

    const catching = createBeats(
      flyers,
      (f) => f.caught,
      (f) => {
        cover!.burst(f.at(f.caught)!, 0.35);
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      flyers,
      (f) => f.lands,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.spot);
          return;
        }
        cover!.burst(f.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, flyers.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          catching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          const fade = 1 - clamp01((ms - (last.caught + half)) / 300);
          if (fade > 0)
            for (let side = 0; side < 2; side++) {
              const end = catchers[side](ms);
              const n = Math.floor(ROPE / 26);
              for (let i = 1; i < n; i++)
                drawGlitterLight(
                  ctx,
                  lerp([pivots[side].x, end.x], i / n),
                  lerp([pivots[side].y, end.y], i / n),
                  GLITTER,
                  side * 100 + i,
                  0.8 * fade,
                  now,
                );
              if (ms < last.caught + half)
                drawWisp(
                  ctx,
                  catchers[side],
                  ms,
                  now,
                  WISP_SIZE * CATCHER,
                  0.3,
                );
            }
          for (const f of flyers)
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * FLYER,
              0.7,
              f.mounts,
              f.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
