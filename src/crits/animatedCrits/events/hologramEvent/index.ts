// the "Hologram" event (beam; free hires): it covers its crit, whose click
// freezes the screen while a projector wisp lights up on the clicked floor's
// button and throws a cone of light onto each empty spot in turn, where a
// spinning wireframe cube of beams builds itself edge by edge, spinning
// faster and faster; it flickers, collapses to a point with a flash and a
// jolt, and a new worker materialises out of the glow; the last in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { BTN_H, getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "hologram";
const MAX_HIRES = 4;
// px the cube floats over the spot, and its half-size
const ABOVE = 80;
const HALF = 42;
const COLLAPSE_MS = 140;
const SPIN: [number, number] = [1.5, 7];
const TILT = 0.5;
const EDGE = 5;
const CONE = 0.22;
const PROJECTOR = 0.5;
const FLARE = 70;
const BUILD_SHAKE: [number, number] = [0.6, 1.1];
const CORNERS: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

interface Frame {
  hire: RewardHire;
  at: Point;
  starts: number;
  built: number;
}

export const forceHologramEvent = registerWispEvent(
  KEY,
  "Hologram",
  () => CONFIG.hologramEvent.chance,
  (floor, context) => {
    const { buildMs, gapMs, holdMs, mergeMs } = CONFIG.hologramEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const projector: Point = { x: button.x, y: button.y - BTN_H / 2 - 10 };
    const frames: Frame[] = hires.map((hire, k) => {
      const starts = 150 + k * (gapMs + buildMs * 0.5);
      return {
        hire,
        at: { x: hire.x, y: hire.y - ABOVE },
        starts,
        built: starts + buildMs,
      };
    });
    const last = frames[frames.length - 1];
    const endAt = last.built + COLLAPSE_MS + 400;
    const corners: Point[] = CORNERS.map(() => ({ x: 0, y: 0 }));
    const projectorAt = () => projector;

    const starting = createBeats(
      frames,
      (f) => f.starts,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const building = createBeats(
      frames,
      (f) => f.built + COLLAPSE_MS,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.at);
          return;
        }
        cover!.burst(f.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BUILD_SHAKE, k / Math.max(1, frames.length - 1)));
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
          starting.tick(ms, now);
          building.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          drawRewardHires(ctx, hires, now);
          for (const f of frames) {
            const t = ms - f.starts;
            if (t < 0 || ms > f.built + COLLAPSE_MS) continue;
            const u = clamp01(t / buildMs);
            const collapse = 1 - easeIn(clamp01((ms - f.built) / COLLAPSE_MS));
            const size = HALF * lerp([0.4, 1], easeOut(u)) * collapse;
            const flicker = ms > f.built - 120 ? 0.5 + 0.5 * Math.random() : 1;
            // spinning about the vertical, tipped toward the viewer
            const spin = (t / 1000) * Math.PI * 2 * lerp(SPIN, u * u);
            const cs = Math.cos(spin);
            const sn = Math.sin(spin);
            for (let i = 0; i < CORNERS.length; i++) {
              const [x, y, z] = CORNERS[i];
              const rx = x * cs + z * sn;
              const rz = -x * sn + z * cs;
              corners[i].x = f.at.x + rx * size;
              corners[i].y = f.at.y + (y + rz * TILT) * size * 0.8;
            }
            for (const i of [0, 2, 5, 7])
              drawBeam(ctx, projector, corners[i], 8, CONE * flicker);
            const shown = Math.ceil(EDGES.length * clamp01(u * 1.6));
            for (let e = 0; e < shown; e++) {
              const [a, b] = EDGES[e];
              drawBeam(ctx, corners[a], corners[b], EDGE, flicker);
            }
          }
          for (const f of frames) {
            const t = (ms - f.built - COLLAPSE_MS) / 300;
            if (t >= 0 && t < 1)
              drawBeamFlare(ctx, f.at, FLARE * (1 - t), 1 - t, now);
          }
          if (ms <= last.built + COLLAPSE_MS)
            drawWispHead(ctx, projectorAt, ms, now, WISP_SIZE * PROJECTOR, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
