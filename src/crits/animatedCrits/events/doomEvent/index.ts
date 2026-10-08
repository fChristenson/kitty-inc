// the "Doom" event (fps; perma tier), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/fps like an old shooter: its crit's click raises the floors' screen
// like a shutter onto a dark corridor, the player's pistol comes
// up and the view marches down it, blasting the one-eyed demon heads that
// float at it one after another, the last a big one taking two shots. The
// exit door at the end slides up into the ceiling, the floors behind it, and
// the view rushes through it back onto them, promoting the floor's perma
// crit tier
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import {
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsGun,
  drawFpsHead,
  drawFpsSky,
  drawFpsWall,
  drawFpsWallLines,
  fpsSight,
  FPS_HEAD_RADIUS,
  type Fps,
  type FpsCamera,
  type FpsHeadLook,
  type FpsLens,
  type FpsScreen,
} from "../../../../shared/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01 } from "../../../../shared/twinkle";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { canPromote, promotedTier } from "../../eventRewards";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "doom";

// the shutter (the floors' screen) stands at z 0, the view starts FOCAL
// behind it where it fills the screen, its eye EYE high, the horizon midway
const FOCAL = 1.2;
const EYE = 0.5;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const BOB_RATE = 7;
const BOB = 0.015;
// the corridor: its half width, height and length in SEG long segments,
// pillars standing PILLAR out of its walls at each segment's start, steps
// up at STEPS, a dark arch across it at ARCH
const HALF = 0.6;
const HIGH = 1.4;
const SEG = 1;
const END = 12;
const PILLAR = 0.07;
const PILLAR_DEEP = 0.12;
const STEPS = [6, 7, 8];
const STEP_UP = 0.06;
const FLOOR_END = STEPS.length * STEP_UP;
const ARCH = 4.5;
const ARCH_IN = 0.44;
const ARCH_LOW = 1.05;
const ARCH_DEEP = 0.25;
const MORTAR = 0.17;
// the exit at its end: the doorway's width (its height matches the screen,
// so the floors behind it fill the screen as the view reaches it) and how
// far short of the landing the march ends, for the rush through it
const OPEN_W = 0.5;
const RUSH = 3;
// the door sliding up over this stretch of the march
const DOOR_OPENS: [number, number] = [0.8, 0.95];
const STRIPES = [0.2, 0.45, 0.7];
// colours: brown stone and wood, dark iron doors
const CEILING = COLOR.woodOutline;
const FLOOR_TILES = [COLOR.hourglassWoodDark, COLOR.amberMutedShadow];
const CEILING_TILES = [COLOR.woodOutline, COLOR.woodText];
const WALLS = [COLOR.hourglassWood, COLOR.amberMutedActive];
const PILLAR_FACE = COLOR.amberMuted;
const PILLAR_SIDE = COLOR.hourglassWoodDark;
const RISER = COLOR.amberMuted;
const SEAM = COLOR.black;
const LIGHT = COLOR.woodFill;
const ARCH_COLOR = COLOR.skySpace;
const ARCH_SIDE = COLOR.woodOutline;
const SIDE_FRAME = COLOR.black;
const SIDE_DOOR = COLOR.cauldronIronDark;
const END_WALL = COLOR.amberMutedShadow;
const DOOR_FRAME = COLOR.cauldronIronDark;
const DOOR = COLOR.wallShadow;
const DOOR_STRIPE = COLOR.cauldronIron;
const OUTSIDE = COLOR.woodOutline;
// the demon heads
const HEAD: FpsHeadLook = {
  skin: COLOR.fullHouseCrimson,
  spots: COLOR.doubleDownCrimson,
  horns: COLOR.woodRing,
  mouth: COLOR.nightShiftIndigo,
  teeth: COLOR.woodRing,
  iris: COLOR.luckyCloverGreen,
};
const BIG_HEAD: FpsHeadLook = {
  ...HEAD,
  skin: COLOR.doubleDownCrimson,
  spots: COLOR.fullHouseCrimson,
  iris: COLOR.heavenlyGold,
  scale: 1.6,
};
// how high they float and bob, how fast they come at the view, and how
// long they take to gape, flash when hit and drop
const FLOAT = 0.55;
const FLOAT_BOB = 0.03;
const FLOAT_HZ = 0.004;
const APPROACH = 0.0004;
const CHARGE_MS = 450;
const HURT_MS = 150;
const FALL_MS = 300;
// a pistol shot: its bullets, their spread and flight, the gun's kick
const PELLETS = 2;
const SPREAD = 0.04;
const PELLET_MS = 80;
const PELLET_SIZE = 1.3;
const KICK_MS = 240;
// blasts on a hit, of the head's radius, and the shakes
const HIT_BLAST = 2.2;
const KILL_BLAST = 3.6;
const BOSS_BLAST = 6;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;
const NEAREST = 0.5;
// each head: where across it floats, how far ahead of the view when it's
// shot, and when (of the march) each shot lands, the last killing it
const DEMONS: {
  x: number;
  ahead: number;
  shots: number[];
  look: FpsHeadLook;
}[] = [
  { x: -0.22, ahead: 2.2, shots: [0.2], look: HEAD },
  { x: 0.24, ahead: 2.3, shots: [0.45], look: HEAD },
  { x: 0, ahead: 2.8, shots: [0.66, 0.76], look: BIG_HEAD },
];

interface Demon {
  x: number;
  z: number;
  look: FpsHeadLook;
  shots: number[];
  diesAt: number;
  // its bob's phase
  phase: number;
  boss: boolean;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.doomEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.promoteFloorTier !== undefined &&
      canPromote(floor),
    arm: startDoom,
  },
  { label: "Doom", color: COLOR.fullHouseCrimson },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Doom
export function forceDoomEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the doorway's height, so it has the screen's shape
const openHigh = (view: FpsScreen) => (OPEN_W * view.h) / view.w;

// the floor's height at z, up the steps
const floorAt = (z: number) =>
  STEPS.reduce((y, at) => (z >= at ? y + STEP_UP : y), 0);

// the eye's rise up the steps, climbing each just before reaching it
const climbAt = (z: number) =>
  STEPS.reduce(
    (y, at) => y + STEP_UP * smoothstep(clamp01((z - at + 0.3) / 0.3)),
    0,
  );

// one side's wall along a segment: stone with mortar and seams, a dark door
// in some, and the pillar at its start
function drawSideWall(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  k: number,
  side: number,
  floor: number,
): void {
  const z0 = k * SEG;
  const z1 = z0 + SEG;
  const x = side * HALF;
  const odd = (k + (side + 1) / 2) % 2;
  drawFpsWall(ctx, fps, x, 0, HIGH, z0, z1, WALLS[odd]);
  drawFpsWallLines(
    ctx,
    fps,
    x,
    floor + MORTAR,
    HIGH,
    MORTAR,
    z0,
    z1,
    SEAM,
    0.25,
  );
  drawFpsWall(ctx, fps, x, floor, HIGH, z0 + 0.5, z0 + 0.515, SEAM, 0.3);
  if (k > 0 && k < END - 1 && (k + (side + 1) / 2) % 3 === 1) {
    drawFpsWall(
      ctx,
      fps,
      x,
      floor,
      floor + 0.85,
      z0 + 0.22,
      z0 + 0.78,
      SIDE_FRAME,
    );
    drawFpsWall(
      ctx,
      fps,
      x,
      floor,
      floor + 0.78,
      z0 + 0.28,
      z0 + 0.72,
      SIDE_DOOR,
    );
    drawFpsWall(
      ctx,
      fps,
      x,
      floor,
      floor + 0.78,
      z0 + 0.66,
      z0 + 0.72,
      SEAM,
      0.5,
    );
    drawFpsWall(
      ctx,
      fps,
      x,
      floor + 0.36,
      floor + 0.4,
      z0 + 0.3,
      z0 + 0.66,
      DOOR_STRIPE,
    );
  }
  if (k === 0) return;
  const inner = side * (HALF - PILLAR);
  drawFpsWall(ctx, fps, inner, 0, HIGH, z0, z0 + PILLAR_DEEP, PILLAR_SIDE);
  drawFpsFace(ctx, fps, z0, inner, x, 0, HIGH, PILLAR_FACE);
}

// the dark arch across the corridor: its columns, lintel and their depth
function drawArch(ctx: CanvasRenderingContext2D, fps: Fps): void {
  const back = ARCH + ARCH_DEEP;
  for (const side of [-1, 1]) {
    drawFpsWall(ctx, fps, side * ARCH_IN, 0, ARCH_LOW, ARCH, back, ARCH_SIDE);
    drawFpsFace(
      ctx,
      fps,
      ARCH,
      side * ARCH_IN,
      side * HALF,
      0,
      HIGH,
      ARCH_COLOR,
    );
  }
  drawFpsFlat(ctx, fps, ARCH_LOW, -ARCH_IN, ARCH_IN, ARCH, back, ARCH_SIDE);
  drawFpsFace(ctx, fps, ARCH, -ARCH_IN, ARCH_IN, ARCH_LOW, HIGH, ARCH_COLOR);
}

// the corridor, far to near, the floors through the exit at its end
export function drawCorridor(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  floors: ScreenCopy,
  doorUp: number,
): void {
  const { view, cam } = fps;
  drawFpsSky(ctx, fps, CEILING);
  drawFpsGround(ctx, fps, OUTSIDE);
  const high = openHigh(view);
  const half = OPEN_W / 2;
  const sill = FLOOR_END;
  const lintel = sill + high;
  // the floors through the doorway, filling it
  const a = fpsSight(fps, -half, lintel, END);
  const b = fpsSight(fps, half, sill, END);
  if (a && b)
    drawScreenPart(
      ctx,
      floors,
      view.x,
      view.y,
      view.w,
      view.h,
      a.x,
      a.y,
      b.x - a.x,
      b.y - a.y,
    );
  // the end wall round the doorway, its iron frame, and the door sliding up
  drawFpsFace(ctx, fps, END, -HALF, -half, 0, HIGH, END_WALL);
  drawFpsFace(ctx, fps, END, half, HALF, 0, HIGH, END_WALL);
  drawFpsFace(ctx, fps, END, -half, half, lintel, HIGH, END_WALL);
  drawFpsFace(
    ctx,
    fps,
    END,
    -half - 0.05,
    -half,
    sill,
    lintel + 0.05,
    DOOR_FRAME,
  );
  drawFpsFace(
    ctx,
    fps,
    END,
    half,
    half + 0.05,
    sill,
    lintel + 0.05,
    DOOR_FRAME,
  );
  drawFpsFace(ctx, fps, END, -half, half, lintel, lintel + 0.05, DOOR_FRAME);
  const bottom = sill + doorUp * high;
  if (bottom < lintel) {
    drawFpsFace(ctx, fps, END, -half, half, bottom, lintel, DOOR);
    for (const y of STRIPES) {
      const sy = bottom + y * high;
      if (sy + 0.03 < lintel)
        drawFpsFace(ctx, fps, END, -half, half, sy, sy + 0.03, DOOR_STRIPE);
    }
  }
  for (let k = Math.ceil(END / SEG) - 1; k >= 0; k--) {
    const z0 = k * SEG;
    const z1 = z0 + SEG;
    if (z1 < cam.z) break;
    const floor = floorAt(z0);
    drawFpsFlat(ctx, fps, floor, -HALF, HALF, z0, z1, FLOOR_TILES[k % 2]);
    drawFpsFlat(ctx, fps, floor, -HALF, HALF, z0 + 0.5, z0 + 0.515, SEAM, 0.35);
    for (const sx of [-0.3, 0, 0.3])
      drawFpsFlat(ctx, fps, floor, sx - 0.006, sx + 0.006, z0, z1, SEAM, 0.35);
    drawFpsFlat(ctx, fps, HIGH, -HALF, HALF, z0, z1, CEILING_TILES[k % 2]);
    drawFpsFlat(ctx, fps, HIGH, -0.12, 0.12, z0 + 0.4, z0 + 0.6, LIGHT);
    for (const side of [-1, 1]) drawSideWall(ctx, fps, k, side, floor);
    if (k === Math.floor(ARCH / SEG)) drawArch(ctx, fps);
    // the step up onto this segment
    if (floor > floorAt(z0 - SEG))
      drawFpsFace(ctx, fps, z0, -HALF, HALF, floor - STEP_UP, floor, RISER);
  }
  // the corridor's mouth while the view's still outside it
  if (cam.z < 0) {
    drawFpsFace(ctx, fps, 0, -6, -HALF, 0, 6, END_WALL);
    drawFpsFace(ctx, fps, 0, HALF, 6, 0, 6, END_WALL);
    drawFpsFace(ctx, fps, 0, -HALF, HALF, HIGH, 6, END_WALL);
  }
}

function startDoom(floor: Floor, context: EventProcContext): void {
  const { doorMs, walkMs, flyMs } = CONFIG.doomEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const landMs = flyMs + CONFIG.flightStage.arriveMs;
  const landZ = END - FOCAL * OPEN_W;
  const marchTo = landZ - RUSH;
  const walkZ = (ms: number) =>
    lerp([-FOCAL, marchTo], clamp01((ms - doorMs) / walkMs));
  const at = (f: number) => doorMs + f * walkMs;
  const demons: Demon[] = DEMONS.map((d, i) => {
    const diesAt = at(d.shots[d.shots.length - 1]);
    return {
      x: d.x,
      z: walkZ(diesAt) + d.ahead,
      look: d.look,
      shots: d.shots.map(at),
      diesAt,
      phase: i * 2.1,
      boss: d.look === BIG_HEAD,
    };
  }).sort((a, b) => b.z - a.z);
  const shots = demons
    .flatMap((d) => d.shots.map((ms) => ({ ms, demon: d })))
    .sort((a, b) => a.ms - b.ms);
  const enterMs = doorMs + walkMs;

  // where a head floats at ms, coming at the view till it dies
  const demonZ = (d: Demon, ms: number) =>
    d.z + Math.max(0, d.diesAt - ms) * APPROACH;
  const demonY = (d: Demon, now: number) =>
    floorAt(d.z) + FLOAT + Math.sin(now * FLOAT_HZ + d.phase) * FLOAT_BOB;

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FpsScreen,
    ms: number,
    now: number,
    floors: ScreenCopy,
    cam: FpsCamera,
    lower: number,
  ): void => {
    const fps: Fps = { view, lens: LENS, cam };
    const march = clamp01((ms - doorMs) / walkMs);
    const doorUp = smoothstep(
      clamp01((march - DOOR_OPENS[0]) / (DOOR_OPENS[1] - DOOR_OPENS[0])),
    );
    drawCorridor(ctx, fps, floors, doorUp);
    for (const d of demons) {
      const z = demonZ(d, ms);
      if (z - cam.z < NEAREST) continue;
      const hit = d.shots.findLast((s) => ms >= s + PELLET_MS);
      const down =
        ms >= d.diesAt + PELLET_MS
          ? smoothstep(
              clamp01((ms - d.diesAt - PELLET_MS - HURT_MS / 2) / FALL_MS),
            )
          : 0;
      drawFpsHead(
        ctx,
        fps,
        d.x,
        demonY(d, now),
        z,
        d.look,
        {
          charge:
            ms < d.diesAt + PELLET_MS
              ? smoothstep(clamp01((ms - d.shots[0] + CHARGE_MS) / CHARGE_MS))
              : 0,
          hurt:
            hit !== undefined &&
            ms < hit + PELLET_MS + HURT_MS &&
            Math.floor((ms - hit) / 40) % 2 === 0,
          down,
        },
        now,
      );
    }
    // the gun, its pellets flying at the demon it's blasting, and the blasts
    const last = shots.findLast((s) => ms >= s.ms);
    const since = last ? ms - last.ms : Infinity;
    const muzzle = drawFpsGun(ctx, view, {
      bob: cam.z * BOB_RATE,
      recoil: Math.max(0, 1 - since / KICK_MS) ** 2,
      sinceShot: since,
      lower,
    });
    for (const shot of shots) {
      const d = shot.demon;
      if (ms < shot.ms || ms > shot.ms + PELLET_MS + 900) continue;
      const radius = FPS_HEAD_RADIUS * (d.look.scale ?? 1);
      const chest = fpsSight(fps, d.x, demonY(d, now), demonZ(d, shot.ms));
      if (!chest) continue;
      const r = radius * chest.s;
      for (let i = 0; i < PELLETS; i++) {
        const dx = (hash01(i, shot.ms) - 0.5) * SPREAD * chest.s;
        const dy = (hash01(i, shot.ms + 1) - 0.5) * SPREAD * chest.s;
        drawWispBetween(
          ctx,
          (t) => {
            const u = clamp01((t - shot.ms) / PELLET_MS);
            return {
              x: lerp([muzzle.x, chest.x + dx], u),
              y: lerp([muzzle.y, chest.y + dy], u),
            };
          },
          ms,
          now,
          WISP_SIZE * PELLET_SIZE,
          1,
          shot.ms,
          shot.ms + PELLET_MS,
        );
      }
      const kills = shot.ms === d.diesAt;
      drawDetonation(
        ctx,
        chest,
        ms - shot.ms - PELLET_MS,
        r * (kills ? (d.boss ? BOSS_BLAST : KILL_BLAST) : HIT_BLAST),
        now,
      );
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        const z = walkZ(ms);
        const cam = {
          x: 0,
          y: EYE + climbAt(z) + Math.abs(Math.sin(z * BOB_RATE)) * BOB,
          z,
          tip: 0,
        };
        const up = smoothstep(clamp01(ms / doorMs));
        drawScene(ctx, view, ms, now, floors, cam, 1 - up);
        // the shutter: the floors' screen sliding up out of the way
        if (up < 1)
          drawScreenPart(
            ctx,
            floors,
            view.x,
            view.y,
            view.w,
            view.h,
            view.x,
            view.y - up * up * view.h,
            view.w,
            view.h,
          );
      },
    },
    ownLanding: true,
    // the rush through the doorway till the floors fill the screen
    draw: (ctx, view, ms, now, floors) => {
      const u = clamp01(ms / landMs);
      const cam = {
        x: 0,
        y: FLOOR_END + lerp([EYE, openHigh(view) / 2], smoothstep(u)),
        z: lerp([marchTo, landZ], u * (0.7 + 0.3 * u)),
        tip: 0,
      };
      drawScene(
        ctx,
        view,
        enterMs + ms,
        now,
        floors,
        cam,
        smoothstep(clamp01(u * 3)),
      );
    },
    onEnd: () => {
      context.promoteFloorTier?.(floor, promotedTier(floor, tier));
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  for (const shot of shots) {
    beat(shot.ms - enterMs, () => {
      playExplosion();
      shakeScreen(SHOT_SHAKE);
    });
    if (shot.ms !== shot.demon.diesAt) continue;
    beat(shot.ms + PELLET_MS - enterMs, () => {
      if (shot.demon.boss) playCritExplosion();
      shakeScreen(shot.demon.boss ? BOSS_SHAKE : KILL_SHAKE);
    });
  }
}
