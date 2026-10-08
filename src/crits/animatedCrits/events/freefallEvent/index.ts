// the "Freefall" event (flight; a crit tier), a flight-stage event (see
// ../../flightStage) with its own way in: it covers its crit, whose click
// folds the floors' screen in half, its top half tipping backward until it
// lies flat like a rooftop, baring the stage's blue sky. The view rises onto
// that rooftop, walks to its far edge and tilts down over it at a small white
// hole far below, crouches and jumps; it falls into the hole, the floors
// appear in it and the view crash-lands back on them a crit tier higher
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { drawBeam } from "../../../../shared/beam";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { nextCritTier, pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  drawFlightHole,
  drawHoleFall,
  HOLE_FOCAL,
  HOLE_SIZE,
} from "../../flightStage/hole";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "freefall";

// the scene, in screen widths: x right, y up, z away from the view. The
// screen stands at z 0, its fold along y 0; the view starts FOCAL in front
// of it, where the screen exactly fills the view
const FOCAL = HOLE_FOCAL;
// nearer than this to the view, a strip isn't drawn
const NEAR = 0.05;
const STRIPS = 24;
const FOLD_SHAKE = 1;
// the view on the folded top half: its eye height, where it steps onto it
// (past the fold), how far past the far edge it leans to look over, and how
// far down it looks there (radians); it keeps its eyes on that edge till then
const EYE = 0.3;
const STEP_ON = 0.08;
const LEAN_OVER = 0.06;
const EDGE_PITCH = -1.3;
const EDGE_GLOW = 22;
// the hole far below, out past the far edge
const HOLE_DEPTH = 7;
const HOLE_OUT = 1.2;
// the jump: a crouch, a spring up to the top of its arc (looking up a
// little, out past the edge), then the drop out over the hole looking
// straight down; the shares of it each takes
const CROUCH = 0.1;
const CROUCH_SHARE = 0.25;
const RISE_SHARE = 0.35;
const JUMP_UP = 0.8;
const JUMP_OUT = 0.3;
const LEAP_DROP = 1.2;
const LEAP_SHAKE = 1.4;
// how far past the far edge the line of sight to the hole clears it before
// the hole's fully in sight
const SIGHT_CLEAR = 0.15;

interface Camera {
  y: number;
  z: number;
  // 0 looks straight ahead, -PI/2 straight down
  pitch: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.freefallEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startFreefall,
  },
  { label: "Freefall", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Freefall
export function forceFreefallEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// where the scene's point (0, y, z) shows, and the screen widths a unit
// there spans; null when it's behind or too near the view
function sight(
  view: FlightView,
  cam: Camera,
  y: number,
  z: number,
): { y: number; scale: number } | null {
  const vy = y - cam.y;
  const vz = z - cam.z;
  const sin = Math.sin(cam.pitch);
  const cos = Math.cos(cam.pitch);
  const depth = vy * sin + vz * cos;
  if (depth < NEAR) return null;
  const up = vy * cos - vz * sin;
  return { y: view.cy - (up / depth) * FOCAL * view.w, scale: FOCAL / depth };
}

// a full-width band of the floors' screen (rows srcY..srcY + srcH of it)
// lying in the scene from (aY, aZ), its top, to (bY, bZ), its bottom
function drawBand(
  ctx: CanvasRenderingContext2D,
  view: FlightView,
  cam: Camera,
  floors: ScreenCopy,
  srcY: number,
  srcH: number,
  aY: number,
  aZ: number,
  bY: number,
  bZ: number,
): void {
  const a = sight(view, cam, aY, aZ);
  const b = sight(view, cam, bY, bZ);
  if (!a || !b) return;
  const half = (view.w * (a.scale + b.scale)) / 4;
  drawScreenPart(
    ctx,
    floors,
    view.x,
    srcY,
    view.w,
    srcH,
    view.cx - half,
    Math.min(a.y, b.y),
    half * 2,
    Math.abs(b.y - a.y) + 1,
  );
}

// the floors' screen, its top half tipped back `fold` radians on its hinge
function drawScreen(
  ctx: CanvasRenderingContext2D,
  view: FlightView,
  cam: Camera,
  floors: ScreenCopy,
  fold: number,
): void {
  const half = view.h / view.w / 2;
  const step = half / STRIPS;
  const rows = view.h / 2 / STRIPS;
  const cos = Math.cos(fold);
  const sin = Math.sin(fold);
  for (let j = 0; j < STRIPS; j++) {
    // the bottom half standing at z 0, from the hinge down
    drawBand(
      ctx,
      view,
      cam,
      floors,
      view.cy + j * rows,
      rows,
      -j * step,
      0,
      -(j + 1) * step,
      0,
    );
    // the top half, from its far end in to the hinge
    const d0 = (j + 1) * step;
    const d1 = j * step;
    drawBand(
      ctx,
      view,
      cam,
      floors,
      view.cy - (j + 1) * rows,
      rows,
      d0 * cos,
      d0 * sin,
      d1 * cos,
      d1 * sin,
    );
  }
}

// 0..1: how far the hole has come into sight from (y, z) past the folded
// half's far edge at `top`, which hides it from a view standing back on it
function holeInSight(top: number, y: number, z: number): number {
  if (y <= 0) return 1;
  const holeZ = top + HOLE_OUT;
  const crossesAt = z + (y / (y + HOLE_DEPTH)) * (holeZ - z);
  return smoothstep(clamp01((crossesAt - top) / SIGHT_CLEAR));
}

function startFreefall(floor: Floor, context: EventProcContext): void {
  const { foldMs, walkMs, tiltMs, jumpMs, flyMs } = CONFIG.freefallEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const walkAt = foldMs;
  const tiltAt = walkAt + walkMs;
  const jumpAt = tiltAt + tiltMs;
  const enterMs = jumpAt + jumpMs;
  // the fall lasts through the stage's arrival, landing at its crash
  const landMs = flyMs + CONFIG.flightStage.arriveMs;
  // where the view is `ms` into the way in; `top` the folded half's far edge
  const cameraAt = (ms: number, top: number): Camera => {
    // eyes on the far edge until the hole shows past it, then on the hole
    const aim = (y: number, z: number) => {
      const onEdge = Math.max(EDGE_PITCH, Math.atan2(-y, top - z));
      const onHole = Math.atan2(-(y + HOLE_DEPTH), top + HOLE_OUT - z);
      return lerp([onEdge, onHole], holeInSight(top, y, z));
    };
    const at = (y: number, z: number): Camera => ({ y, z, pitch: aim(y, z) });
    const start = { y: 0, z: -FOCAL, pitch: 0 };
    const walked = at(EYE, STEP_ON);
    const edge = { y: EYE, z: top + LEAN_OVER };
    const leapt = { y: EYE - LEAP_DROP, z: top + HOLE_OUT };
    const crouched = { y: EYE - CROUCH, z: edge.z };
    const apex = { y: EYE + JUMP_UP, z: edge.z + JUMP_OUT };
    const between = (
      a: { y: number; z: number },
      b: { y: number; z: number },
      p: number,
    ) => at(lerp([a.y, b.y], p), lerp([a.z, b.z], p));
    if (ms < walkAt) return start;
    if (ms < tiltAt) {
      const p = smoothstep((ms - walkAt) / walkMs);
      return {
        y: lerp([start.y, walked.y], p),
        z: lerp([start.z, walked.z], p),
        pitch: lerp([start.pitch, walked.pitch], p),
      };
    }
    if (ms < jumpAt)
      // walking the whole way to the edge
      return between(walked, edge, smoothstep((ms - tiltAt) / tiltMs));
    const p = (ms - jumpAt) / jumpMs;
    if (p < CROUCH_SHARE)
      return between(edge, crouched, smoothstep(p / CROUCH_SHARE));
    if (p < CROUCH_SHARE + RISE_SHARE)
      return between(
        crouched,
        apex,
        1 - (1 - (p - CROUCH_SHARE) / RISE_SHARE) ** 2,
      );
    return between(
      apex,
      leapt,
      ((p - CROUCH_SHARE - RISE_SHARE) / (1 - CROUCH_SHARE - RISE_SHARE)) ** 2,
    );
  };
  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        const top = view.h / view.w / 2;
        const cam = cameraAt(ms, top);
        const fold = (Math.PI / 2) * clamp01(ms / foldMs) ** 2;
        drawScreen(ctx, view, cam, floors, fold);
        // the far edge glowing once it lies flat, to look over
        if (ms >= walkAt) {
          const edge = sight(view, cam, 0, top);
          if (edge) {
            const half = (view.w * edge.scale) / 2;
            drawBeam(
              ctx,
              { x: view.cx - half, y: edge.y },
              { x: view.cx + half, y: edge.y },
              EDGE_GLOW,
            );
          }
        }
        const hole = sight(view, cam, -HOLE_DEPTH, top + HOLE_OUT);
        if (hole && ms >= tiltAt)
          drawFlightHole(
            ctx,
            view,
            floors,
            hole.y,
            HOLE_SIZE * view.w * hole.scale,
            FOCAL / hole.scale,
            holeInSight(top, cam.y, cam.z),
            now,
          );
      },
    },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      // dropping ever faster onto the hole and through it, the floors at its
      // bottom filling the view right as it lands
      drawHoleFall(
        ctx,
        view,
        floors,
        ms,
        landMs,
        HOLE_DEPTH + EYE - LEAP_DROP,
        now,
      ),
    onEnd: () => {
      context.applyTierCrit?.(floor, nextCritTier(tier));
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  beat(walkAt - enterMs, () => shakeScreen(FOLD_SHAKE));
  beat(walkAt - enterMs, playSwoosh);
  beat(jumpAt - enterMs + jumpMs * CROUCH_SHARE, () => {
    playSwoosh();
    shakeScreen(LEAP_SHAKE);
  });
}
