// the "Rooftops" event (fps; free hires), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click tips the floors' screen forward flat into the
// first roof and the view sprints off across the night rooftops, leaping the
// gaps between them; guards on the roofs ahead are dropped mid-leap, a big
// one on the last roof taking two. A final leap through a lit window across
// the street lands back on the floors, a cat hired on every floor with room
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import {
  createFpsShot,
  drawFpsEnemy,
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsOpening,
  drawFpsShots,
  drawFpsSky,
  drawFpsWall,
  fpsEnemyPose,
  fpsOpeningLanding,
  fpsSight,
  FPS_GUARD,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/animationStyles/fps";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardHires, giveHire } from "../../eventRewards";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "rooftops";

// the view starts FOCAL behind z 0, eye EYE up, and sprints RUN world units a
// second, its eye rising JUMP over each gap's leap
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const EYE = 0.4;
const RUN = 3.2;
const JUMP = 0.35;
const TAKE_OFF = 0.4;
const TOUCH_DOWN = 0.3;
// the roofs: from a to b along, half wide, their parapets, ledges and the
// drop below their far edge
const ROOFS = [
  { a: -2, b: 2.2 },
  { a: 3.2, b: 6.6 },
  { a: 7.8, b: 11.2 },
];
const ROOF_HALF = 0.9;
const PARAPET = 0.12;
const LEDGE = 0.03;
const DROP = 4;
const ROOF_COLORS = [COLOR.wallShadow, COLOR.cauldronIron];
// the building across the street and its lit window, the floors in it; the
// last leap from LEAP_FROM through it, arcing LEAP_ARC
const FACADE = 13.6;
const FACADE_HALF = 1.2;
const FACADE_Y: [number, number] = [-4, 4];
const WIN_W = 0.8;
const SILL = 0.2;
const FRAME = 0.05;
const WIN_GLOW = fadeStops(COLOR.heavenlyGold);
const WIN_GLOW_ALPHA = 0.5;
const WIN_GLOW_R = 0.9;
const LEAP_FROM = 10.4;
const LEAP_ARC = 0.4;
// the city far behind, its windows lit
const CITY_Z = 30;
const CITY = 14;
const CITY_FROM = -6;
const CITY_EVERY = 0.9;
const CITY_W = 0.8;
const CITY_HIGH: [number, number] = [1, 4];
const CITY_LIGHTS = 3;
const CITY_LIGHT = 0.04;
// the guards: on the roofs ahead, shot when the view is `ahead` short, the
// big one twice
const GUARDS = [
  { x: -0.3, z: 5.2, side: -1, scale: 1, ahead: 2.4, shots: [0] },
  { x: 0.35, z: 6.2, side: 1, scale: 1, ahead: 2.4, shots: [0] },
  { x: 0, z: 9.9, side: 1, scale: 1.4, ahead: 3.4, shots: [0, 160] },
];
const AIM_LEAD = 200;
const CHEST = 0.42;
const HIT_BLAST = 0.3;
const KILL_BLAST = 0.6;
const BOSS_BLAST = 1.1;
// a dead guard isn't drawn this close, nor a live one this close
const DEAD_NEAREST = 1.5;
const NEAREST = 0.3;
const DEAD_AFTER = 500;
const BOB_RATE = 0.012;
const GUN_UP_MS = 250;
const TIP_WASH = 0.6;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;
const LAND_SHAKE = 0.8;
const TIP_SHAKE = 0.6;

interface Guard {
  x: number;
  z: number;
  side: number;
  look: FpsEnemyLook;
  aims: number;
  hits: number[];
  dies: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.rooftopsEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      findRewardHires(floor, context).length > 0,
    arm: startRooftops,
  },
  { label: "Rooftops", color: COLOR.nightShiftIndigo },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Rooftops
export function forceRooftopsEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

const CITY_BLOCKS = Array.from({ length: CITY }, (_, i) => ({
  x0: CITY_FROM + i * CITY_EVERY,
  high: lerp(CITY_HIGH, hash01(i, 7601)),
}));

// the sky, the city far off and the building across the street with its lit
// window, the floors in it
function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  floors: ScreenCopy,
  aspect: number,
  now: number,
): void {
  drawFpsSky(ctx, fps, COLOR.skySpace);
  drawFpsGround(ctx, fps, COLOR.black);
  for (const b of CITY_BLOCKS)
    drawFpsFace(
      ctx,
      fps,
      CITY_Z,
      b.x0,
      b.x0 + CITY_W,
      FACADE_Y[0],
      b.high,
      COLOR.nightShiftIndigo,
    );
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < CITY; i++) {
    const b = CITY_BLOCKS[i];
    for (let k = 0; k < CITY_LIGHTS; k++) {
      const p = fpsSight(
        fps,
        b.x0 + CITY_W * (0.2 + 0.6 * hash01(i * 10 + k, 7602)),
        b.high * (0.2 + 0.7 * hash01(i * 10 + k, 7603)),
        CITY_Z,
      );
      if (p)
        stampGlimmer(
          ctx,
          p.x,
          p.y,
          CITY_LIGHT * p.s,
          now * 0.001 + i + k,
          COLOR.heavenlyGold,
        );
    }
  }
  ctx.restore();
  drawFpsFace(
    ctx,
    fps,
    FACADE,
    -FACADE_HALF,
    FACADE_HALF,
    FACADE_Y[0],
    FACADE_Y[1],
    COLOR.wallShadow,
  );
  const top = SILL + WIN_W * aspect;
  drawFpsFace(
    ctx,
    fps,
    FACADE,
    -WIN_W / 2 - FRAME,
    WIN_W / 2 + FRAME,
    SILL - FRAME,
    top + FRAME,
    COLOR.woodOutline,
  );
  drawFpsOpening(ctx, fps, floors, FACADE, WIN_W, SILL, aspect);
  const win = fpsSight(fps, 0, (SILL + top) / 2, FACADE);
  if (!win) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = WIN_GLOW_ALPHA;
  drawGlow(ctx, WIN_GLOW, win.x, win.y, WIN_GLOW_R * win.s);
  ctx.restore();
}

function startRooftops(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { tipMs, flyMs, hireGapMs } = CONFIG.rooftopsEvent;
  const { arriveMs } = CONFIG.flightStage;
  const tier = context.critTier ?? pickCritTierByOdds();
  const go = tipMs * 0.6;
  const runZ = (ms: number) => -FOCAL + (RUN * Math.max(0, ms - go)) / 1000;
  const reach = (z: number) => go + ((z + FOCAL) / RUN) * 1000;
  const enterMs = reach(LEAP_FROM);
  const leapMs = flyMs + arriveMs;
  const land = fpsOpeningLanding(FOCAL, FACADE, WIN_W, SILL, aspect);
  const guards: Guard[] = GUARDS.map((g) => {
    const first = reach(g.z - g.ahead);
    const hits = g.shots.map((s) => first + s);
    return {
      x: g.x,
      z: g.z,
      side: g.side,
      look: g.scale === 1 ? FPS_GUARD : { ...FPS_GUARD, scale: g.scale },
      aims: first - AIM_LEAD,
      hits,
      dies: hits[hits.length - 1] + FPS_ROUND_MS,
    };
  });
  const shots: FpsShot[] = guards.flatMap((g) =>
    g.hits.map((ms, k) => {
      const scale = g.look.scale ?? 1;
      const kills = k === g.hits.length - 1;
      return createFpsShot(
        ms,
        g.x,
        CHEST * scale,
        g.z,
        kills ? (scale > 1 ? BOSS_BLAST : KILL_BLAST) : HIT_BLAST,
      );
    }),
  );

  // the eye: running, arcing over each gap, then the leap at the window
  const camAt = (ms: number): { z: number; y: number } => {
    if (ms >= enterMs) {
      const u = clamp01((ms - enterMs) / leapMs);
      return {
        z: lerp([LEAP_FROM, land.z], u),
        y: lerp([EYE, land.y], u) + LEAP_ARC * Math.sin(Math.PI * u),
      };
    }
    const z = runZ(ms);
    let y = EYE;
    for (let k = 0; k < ROOFS.length - 1; k++) {
      const from = ROOFS[k].b - TAKE_OFF;
      const to = ROOFS[k + 1].a + TOUCH_DOWN;
      if (z > from && z < to)
        y += JUMP * Math.sin((Math.PI * (z - from)) / (to - from));
    }
    return { z, y };
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const cam = camAt(ms);
    const fps: Fps = {
      view,
      lens: LENS,
      cam: { x: 0, y: cam.y, z: cam.z, tip: 0 },
    };
    drawBackdrop(ctx, fps, floors, aspect, now);
    // the roofs far to near, each with its guards on it
    for (let k = ROOFS.length - 1; k >= 0; k--) {
      const r = ROOFS[k];
      drawFpsFace(ctx, fps, r.b, -ROOF_HALF, ROOF_HALF, -DROP, 0, COLOR.black);
      drawFpsFlat(
        ctx,
        fps,
        0,
        -ROOF_HALF,
        ROOF_HALF,
        r.a,
        r.b,
        ROOF_COLORS[k % ROOF_COLORS.length],
      );
      for (const x of [-ROOF_HALF, ROOF_HALF])
        drawFpsWall(ctx, fps, x, 0, PARAPET, r.a, r.b, COLOR.cauldronIronDark);
      drawFpsFace(
        ctx,
        fps,
        r.b,
        -ROOF_HALF,
        ROOF_HALF,
        0,
        LEDGE,
        COLOR.silverTicketGray,
      );
      for (const g of guards) {
        if (g.z <= r.a || g.z >= r.b) continue;
        const dead = ms > g.dies + DEAD_AFTER;
        if (g.z < cam.z + (dead ? DEAD_NEAREST : NEAREST)) continue;
        drawFpsEnemy(
          ctx,
          fps,
          g.x,
          g.z,
          g.look,
          fpsEnemyPose(ms, g.aims, g.hits, g.side),
          now,
        );
      }
    }
    const lower =
      ms >= enterMs
        ? clamp01((3 * (ms - enterMs)) / leapMs)
        : 1 - clamp01((ms - go) / GUN_UP_MS);
    drawFpsShots(ctx, fps, shots, ms, now, ms * BOB_RATE, lower);
    // the floors' screen tipping forward flat into the first roof
    if (ms < tipMs) {
      const u = smoothstep(clamp01(ms / tipMs));
      const h = view.h * Math.cos((u * Math.PI) / 2);
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.x,
        view.y + view.h - h,
        view.w,
        h,
      );
      ctx.globalAlpha = TIP_WASH * u;
      ctx.fillStyle = COLOR.black;
      ctx.fillRect(view.x, view.y + view.h - h, view.w, h);
      ctx.globalAlpha = 1;
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: { ms: enterMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, enterMs + ms, now, floors),
    onEnd: () => {
      findRewardHires(floor, context).forEach((hire, k) =>
        setTimeout(() => giveHire(hire), k * hireGapMs),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  beat(tipMs - enterMs, () => shakeScreen(TIP_SHAKE));
  for (let k = 1; k < ROOFS.length; k++)
    beat(reach(ROOFS[k].a + TOUCH_DOWN) - enterMs, () =>
      shakeScreen(LAND_SHAKE),
    );
  for (const g of guards) {
    const boss = (g.look.scale ?? 1) > 1;
    for (const ms of g.hits)
      beat(ms - enterMs, () => {
        playExplosion();
        shakeScreen(SHOT_SHAKE);
      });
    beat(g.dies - enterMs, () => {
      if (boss) playCritExplosion();
      shakeScreen(boss ? BOSS_SHAKE : KILL_SHAKE);
    });
  }
  beat(0, playSwoosh);
}
