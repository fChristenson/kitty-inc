// the "Lock-On Volley" event (flight; perma tier), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, where it
// flies down a corridor of beam frames. Squadrons of wisps rush in; an aim
// laser snaps onto each in turn and locks it, then a swarm of homing wisps
// curls out from under the view and blows the whole squadron in a rattling
// chain of blasts. Three volleys, the last a whirling ring round a huge one
// in the middle; the view crash-lands and the floor goes up a perma tier
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { drawAimLaser, drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { clamp01 } from "../../../../shared/easing";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { canPromote, promotedTier } from "../../eventRewards";
import {
  canStartFlightStage,
  isFlightStageRunning,
  project,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "lockOnVolley";

// the squadrons: when each rushes in (ms into the flight) and how many, the
// last a whirling ring
const VOLLEYS = [150, 900, 1650];
const SQUADS = [6, 6, 10];
// where they fly (screen widths from its middle at depth 1, so spread across
// the view where they hold), the ring's radius and spin
const SPREAD: [number, number] = [0.3, 1];
const RING = 0.9;
const RING_SPIN = 0.0015;
const SWAY = 0.08;
// their rush in from FAR, slowing to HOLD, and their size there
const FAR = 10;
const HOLD = 3;
const APPROACH = 0.006;
const WISP_SCALE = 3.5;
// each lock in turn, the aim laser hunting onto it first; the volley's
// release after the last lock, the homing wisps' flight, the gap between hits
const LOCK_EVERY = 60;
const AIM_MS = 90;
const RELEASE_AFTER = 120;
const HOMING_MS = 300;
const HIT_EVERY = 45;
const HOMING_SWING = 0.45;
const HOMING = WISP_SIZE * 0.6;
// the lock: a ring of glimmers round the wisp (of its size)
const LOCK_GLIMMERS = 8;
const LOCK_R = 1.4;
const LOCK_GLIMMER = 14;
// the corridor's frames (of the screen's width), their spacing, speed and
// the deepest one drawn
const FRAME_W = 1.2;
const FRAME_H = 1.6;
const FRAME_GAP = 1.4;
const FRAME_FAR = 12;
const FRAME_SPEED = 0.006;
const FRAME_WIDTH = 40;
const FRAMES = 9;
// the crosshair the lasers and homing wisps come from (of the screen)
const CROSSHAIR: [number, number] = [0.5, 0.86];
// blasts (of the screen's width at depth 1), the core's, and shakes
const BLAST = 0.6;
const RING_BLAST = 0.6;
const CORE_AFTER = 120;
const CORE_BLAST = 0.25;
const SHAKE = 0.8;
const CORE_SHAKE = 2.4;
const AFTER_CORE = 200;

interface Foe {
  x: number;
  y: number;
  a: number;
  ring: boolean;
  start: number;
  lock: number;
  launch: number;
  hit: number;
  side: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.lockOnVolleyEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.promoteFloorTier !== undefined &&
      canPromote(floor),
    arm: startLockOnVolley,
  },
  { label: "Lock-On Volley", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Lock-On Volley
export function forceLockOnVolleyEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function planFoes(): Foe[] {
  return VOLLEYS.flatMap((start, v) => {
    const n = SQUADS[v];
    const ring = v === VOLLEYS.length - 1;
    const release = start + n * LOCK_EVERY + RELEASE_AFTER;
    return Array.from({ length: n }, (_, k) => {
      const a = ring
        ? (k / n) * Math.PI * 2
        : hash01(k, 7001 + v) * Math.PI * 2;
      const r = ring
        ? RING
        : SPREAD[0] + hash01(k, 7011 + v) * (SPREAD[1] - SPREAD[0]);
      const hit = release + HOMING_MS + k * HIT_EVERY;
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        a,
        ring,
        start,
        lock: start + k * LOCK_EVERY,
        launch: hit - HOMING_MS,
        hit,
        side: k % 2 ? 1 : -1,
      };
    });
  });
}

const depthOf = (foe: Foe, ms: number) =>
  Math.max(HOLD, FAR - (ms - foe.start) * APPROACH);

function foeAt(view: FlightView, foe: Foe, ms: number): Point {
  if (foe.ring) {
    const a = foe.a + ms * RING_SPIN;
    return project(
      view,
      Math.cos(a) * RING,
      Math.sin(a) * RING,
      depthOf(foe, ms),
    );
  }
  return project(
    view,
    foe.x + Math.sin(ms * 0.003 + foe.a) * SWAY,
    foe.y + Math.cos(ms * 0.004 + foe.a) * SWAY,
    depthOf(foe, ms),
  );
}

function drawCorridor(
  ctx: CanvasRenderingContext2D,
  view: FlightView,
  ms: number,
): void {
  const travel = ms * FRAME_SPEED;
  const fadeIn = clamp01(ms / 200);
  for (let j = 0; j < FRAMES; j++) {
    const z =
      1 + ((((j * FRAME_GAP - travel) % FRAME_FAR) + FRAME_FAR) % FRAME_FAR);
    const corners = [
      project(view, -FRAME_W, -FRAME_H, z),
      project(view, FRAME_W, -FRAME_H, z),
      project(view, FRAME_W, FRAME_H, z),
      project(view, -FRAME_W, FRAME_H, z),
    ];
    const alpha = fadeIn * clamp01(1.4 - z / FRAME_FAR);
    for (let i = 0; i < 4; i++)
      drawBeam(ctx, corners[i], corners[(i + 1) % 4], FRAME_WIDTH / z, alpha);
  }
}

function startLockOnVolley(floor: Floor, context: EventProcContext): void {
  const tier = context.critTier ?? pickCritTierByOdds();
  const foes = planFoes();
  const coreAt = Math.max(...foes.map((f) => f.hit)) + CORE_AFTER;
  const flyMs = coreAt + AFTER_CORE;
  const hits = createBeats(
    foes,
    (f) => f.hit,
    () => {
      playExplosion();
      shakeScreen(SHAKE);
    },
  );
  let cored = false;
  startFlightStage(KEY, floor, context, {
    flyMs,
    draw: (ctx, view, ms, now) => {
      if (ms < 0) return;
      hits.tick(ms, now);
      if (!cored && ms >= coreAt) {
        cored = true;
        playCritExplosion();
        shakeScreen(CORE_SHAKE);
      }
      drawCorridor(ctx, view, ms);
      const crosshair = {
        x: view.x + view.w * CROSSHAIR[0],
        y: view.y + view.h * CROSSHAIR[1],
      };
      for (const foe of foes) {
        if (ms < foe.start) continue;
        const at = (t: number) => foeAt(view, foe, t);
        const z = depthOf(foe, ms);
        const size = (WISP_SIZE * WISP_SCALE) / z;
        drawWispBetween(ctx, at, ms, now, size, 0.4, foe.start, foe.hit);
        if (ms < foe.hit) {
          const spot = at(ms);
          if (ms >= foe.lock - AIM_MS && ms < foe.lock)
            drawAimLaser(ctx, crosshair, spot);
          if (ms >= foe.lock) {
            const r = size * LOCK_R * (1 + Math.exp(-(ms - foe.lock) / 80));
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < LOCK_GLIMMERS; i++) {
              const a = (i / LOCK_GLIMMERS) * Math.PI * 2 + ms * 0.004;
              stampGlimmer(
                ctx,
                spot.x + Math.cos(a) * r,
                spot.y + Math.sin(a) * r,
                LOCK_GLIMMER,
                a,
                i % 2 ? COLOR.heavenlyGold : COLOR.white,
              );
            }
            ctx.globalCompositeOperation = previous;
          }
        }
        // the homing wisp curling out from under the view onto it
        const pull = {
          x: crosshair.x + foe.side * view.w * HOMING_SWING,
          y: crosshair.y - view.w * 0.1,
        };
        drawWispBetween(
          ctx,
          (t) => {
            if (t < foe.launch) return null;
            const p = clamp01((t - foe.launch) / HOMING_MS);
            const to = at(t);
            const u = 1 - p;
            return {
              x: u * u * crosshair.x + 2 * u * p * pull.x + p * p * to.x,
              y: u * u * crosshair.y + 2 * u * p * pull.y + p * p * to.y,
            };
          },
          ms,
          now,
          HOMING,
          0.7,
          foe.launch,
          foe.hit,
        );
        drawDetonation(
          ctx,
          at(foe.hit),
          ms - foe.hit,
          (view.w * (foe.ring ? RING_BLAST : BLAST)) / depthOf(foe, foe.hit),
          now,
        );
      }
      drawDetonation(
        ctx,
        project(view, 0, 0, HOLD),
        ms - coreAt,
        view.w * CORE_BLAST,
        now,
      );
    },
    onEnd: () => {
      context.promoteFloorTier?.(floor, promotedTier(floor, tier));
      endEventProc(KEY);
    },
  });
}
