// the "Kick In" event (fps; crit tiers), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/fps: its crit's click kicks the floors' screen flat like a door and
// the view storms in on three guards, dropping them left to right in quick
// fire; it strides to the next door and kicks it down on two more and a big
// one taking two. The last door goes down on the floors, the view dives
// through, and every bar in view climbs a crit tier
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { drawDetonation } from "../../../../shared/explosion";
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
  drawFpsWallLines,
  fillFpsQuad,
  fpsEnemyPose,
  fpsOpeningLanding,
  fpsSight,
  FPS_GUARD,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardBars } from "../../eventRewards";
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

const KEY = "kickIn";

const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const EYE = 0.7;
// the rooms: ROOM either side of the middle, at least HIGH tall, the walls
// between them at WALLS, doorways DOOR either side of the middle as tall as
// the screen's shape makes them; the floors' screen is the first door, at 0
const ROOM = 1.6;
const HIGH = 1.7;
const OVER_DOOR = 0.3;
const DOOR = 0.5;
const WALLS = [4, 8.5];
const FRAME = 0.06;
const PANEL: [number, number] = [0.55, 0.9];
const PANEL_W = 0.7;
// the floor's tiles, the wainscot, the ceiling's light
const TILE = 0.4;
const TILES = 8;
const WAINSCOT = 0.5;
const WAINSCOT_LINES = 0.1;
const CEIL_LIGHT = 0.3;
const ROOM_TONES = [COLOR.amberMuted, COLOR.secondWindSky];
// the kicks, ms in; each door falls flat away from its foot over FALL_MS,
// the last fading over FADE_MS as the view dives through it
const KICKS = [120, 1150, 2370];
const FALL_MS = 220;
const FADE_MS = 200;
const KICK_LEAD = 80;
const KICK_MS = 240;
const KICK_DIP = 0.06;
const KICK_LUNGE = 0.15;
const DUST = 0.12;
const DUST_Y = 0.05;
const DUST_IN = 0.4;
// where the view stands, ms in: lunging in after each kick, striding up to
// the next door; from the last kick it dives at the floors
const STOPS: [number, number][] = [
  [0, -FOCAL],
  [KICKS[0] + 60, -FOCAL],
  [KICKS[0] + 260, -0.3],
  [800, -0.3],
  [1100, 2.4],
  [KICKS[1] + 60, 2.4],
  [KICKS[1] + 280, 4.3],
  [2070, 4.3],
  [2320, 6.2],
];
const DIVE_LAG = 120;
// the guards in each room, each shot once at `at` after its room's kick, the
// big one twice; the view's aim swings AIM of the way to each
const GUARDS = [
  { x: -1, z: 2.6, room: 0, at: 300 },
  { x: 0.1, z: 3.1, room: 0, at: 440 },
  { x: 1, z: 2.5, room: 0, at: 580 },
  { x: -0.9, z: 6.6, room: 1, at: 330 },
  { x: 0.95, z: 6.4, room: 1, at: 470 },
  { x: 0, z: 7.4, room: 1, at: 640, scale: 1.5 },
];
const BIG_SECOND = 160;
const AIM_LAG = 120;
const AIM_STAGGER = 20;
const AIM = 0.25;
const AIM_LEAD = 120;
const AIM_HOLD = 200;
const CHEST = 0.42;
const HIT_BLAST = 0.15;
const KILL_BLAST = 0.3;
const BOSS_BLAST = 0.55;
const NEAREST = 0.3;
const BOB = 6;
const BOB_HIGH = 0.012;
const GUN_UP_MS = 200;
const GUN_DOWN = 3;
const KICK_SHAKE = 2;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;

interface Guard {
  x: number;
  z: number;
  room: number;
  side: number;
  look: FpsEnemyLook;
  aims: number;
  at: number;
  hits: number[];
  dies: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.kickInEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.applyTierCrit !== undefined,
    arm: startKickIn,
  },
  { label: "Kick In", color: COLOR.hourglassWood },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Kick In
export function forceKickInEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a door falling flat away from its foot at z, `u` 0..1 down
function drawFallingDoor(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  z: number,
  doorHigh: number,
  u: number,
  alpha = 1,
): void {
  if (alpha <= 0) return;
  const a = (Math.PI / 2) * u * u;
  const y = doorHigh * Math.cos(a);
  const dz = doorHigh * Math.sin(a);
  const at = (share: number): [number, number] => [y * share, z + dz * share];
  const [y0, z0] = at(PANEL[0]);
  const [y1, z1] = at(PANEL[1]);
  fillFpsQuad(
    ctx,
    fps,
    [
      [-DOOR, 0, z],
      [DOOR, 0, z],
      [DOOR, y, z + dz],
      [-DOOR, y, z + dz],
    ],
    COLOR.hourglassWood,
    alpha,
  );
  fillFpsQuad(
    ctx,
    fps,
    [
      [-DOOR * PANEL_W, y0, z0],
      [DOOR * PANEL_W, y0, z0],
      [DOOR * PANEL_W, y1, z1],
      [-DOOR * PANEL_W, y1, z1],
    ],
    COLOR.hourglassWoodDark,
    alpha,
  );
}

// a room from za to zb: its tiled floor, wainscoted walls and ceiling light
function drawRoom(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  za: number,
  zb: number,
  high: number,
  tone: string,
): void {
  for (let i = 0; za + i * TILE < zb; i++)
    for (let j = 0; j < TILES; j++)
      if ((i + j) % 2 === 0)
        drawFpsFlat(
          ctx,
          fps,
          0.001,
          -ROOM + j * TILE,
          -ROOM + (j + 1) * TILE,
          za + i * TILE,
          Math.min(zb, za + (i + 1) * TILE),
          COLOR.amberMutedShadow,
        );
  for (const x of [-ROOM, ROOM]) {
    drawFpsWall(ctx, fps, x, 0, high, za, zb, tone);
    drawFpsWall(
      ctx,
      fps,
      x * 0.999,
      0,
      WAINSCOT,
      za,
      zb,
      COLOR.hourglassWoodDark,
    );
    drawFpsWallLines(
      ctx,
      fps,
      x * 0.998,
      WAINSCOT_LINES,
      WAINSCOT,
      WAINSCOT_LINES,
      za,
      zb,
      COLOR.black,
      0.4,
    );
  }
  drawFpsFlat(ctx, fps, high, -ROOM, ROOM, za, zb, COLOR.cauldronIronDark);
  const mid = (za + zb) / 2;
  drawFpsFlat(
    ctx,
    fps,
    high - 0.002,
    -CEIL_LIGHT,
    CEIL_LIGHT,
    mid - CEIL_LIGHT,
    mid + CEIL_LIGHT,
    COLOR.white,
    0.8,
  );
}

// the wall at z round its doorway, framed
function drawDoorWall(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  z: number,
  doorHigh: number,
  high: number,
  tone: string,
): void {
  drawFpsFace(ctx, fps, z, -ROOM, -DOOR, 0, high, tone);
  drawFpsFace(ctx, fps, z, DOOR, ROOM, 0, high, tone);
  drawFpsFace(ctx, fps, z, -DOOR, DOOR, doorHigh, high, tone);
  const front = z - 0.005;
  for (const x of [-DOOR - FRAME, DOOR])
    drawFpsFace(
      ctx,
      fps,
      front,
      x,
      x + FRAME,
      0,
      doorHigh + FRAME,
      COLOR.woodOutline,
    );
  drawFpsFace(
    ctx,
    fps,
    front,
    -DOOR - FRAME,
    DOOR + FRAME,
    doorHigh,
    doorHigh + FRAME,
    COLOR.woodOutline,
  );
}

function startKickIn(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { flyMs, tierGapMs } = CONFIG.kickInEvent;
  const { arriveMs } = CONFIG.flightStage;
  const tier = context.critTier ?? pickCritTierByOdds();
  const doorHigh = 2 * DOOR * aspect;
  const high = Math.max(HIGH, doorHigh + OVER_DOOR);
  const land = fpsOpeningLanding(FOCAL, WALLS[1], 2 * DOOR, 0, aspect);
  const enterMs = KICKS[2] + DIVE_LAG;
  const diveMs = flyMs + arriveMs;
  const standZ = STOPS[STOPS.length - 1][1];
  const camZ = (ms: number) => {
    if (ms >= enterMs)
      return lerp(
        [standZ, land.z],
        smoothstep(clamp01((ms - enterMs) / diveMs)),
      );
    for (let i = 1; i < STOPS.length; i++) {
      const [t0, z0] = STOPS[i - 1];
      const [t1, z1] = STOPS[i];
      if (ms < t1)
        return lerp([z0, z1], smoothstep(clamp01((ms - t0) / (t1 - t0))));
    }
    return standZ;
  };
  const guards: Guard[] = GUARDS.map((g, k) => {
    const at = KICKS[g.room] + g.at;
    const big = (g.scale ?? 1) > 1;
    const hits = big ? [at, at + BIG_SECOND] : [at];
    return {
      x: g.x,
      z: g.z,
      room: g.room,
      side: g.x < 0 ? -1 : 1,
      look: big ? { ...FPS_GUARD, scale: g.scale } : FPS_GUARD,
      aims: KICKS[g.room] + AIM_LAG + k * AIM_STAGGER,
      at,
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
  const aimX = (ms: number) => {
    for (const g of guards)
      if (ms >= g.at - AIM_LEAD && ms < g.at + AIM_HOLD) return g.x * AIM;
    return 0;
  };
  const fallOf = (k: number, ms: number) => clamp01((ms - KICKS[k]) / FALL_MS);

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const z = camZ(ms);
    const dive = clamp01((ms - enterMs) / diveMs);
    // each kick dips the view and lunges it forward a touch
    let kick = 0;
    for (const k of KICKS)
      if (ms >= k - KICK_LEAD && ms < k - KICK_LEAD + KICK_MS)
        kick = Math.sin((Math.PI * (ms - k + KICK_LEAD)) / KICK_MS);
    const fps: Fps = {
      view,
      lens: LENS,
      cam: {
        x: aimX(ms) * (1 - dive),
        y:
          lerp([EYE, land.y], smoothstep(dive)) -
          KICK_DIP * kick +
          Math.abs(Math.sin(z * BOB)) * BOB_HIGH,
        z: z + KICK_LUNGE * kick,
        tip: 0,
      },
    };
    drawFpsSky(ctx, fps, COLOR.black);
    drawFpsGround(ctx, fps, COLOR.black);
    // far to near: the floors behind the last door, room two and its
    // guards, the wall between, room one and its guards
    drawFpsOpening(ctx, fps, floors, WALLS[1] + 0.02, 2 * DOOR, 0, aspect);
    drawFallingDoor(
      ctx,
      fps,
      WALLS[1],
      doorHigh,
      fallOf(2, ms),
      1 - clamp01((ms - KICKS[2] - FALL_MS) / FADE_MS),
    );
    drawRoom(ctx, fps, WALLS[0], WALLS[1], high, ROOM_TONES[1]);
    drawDoorWall(ctx, fps, WALLS[1], doorHigh, high, ROOM_TONES[1]);
    for (let k = guards.length - 1; k >= 0; k--) {
      const g = guards[k];
      if (g.room !== 1 || ms < KICKS[1] || g.z < fps.cam.z + NEAREST) continue;
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
    drawFallingDoor(ctx, fps, WALLS[0], doorHigh, fallOf(1, ms));
    drawDoorWall(ctx, fps, WALLS[0], doorHigh, high, ROOM_TONES[0]);
    drawRoom(ctx, fps, 0, WALLS[0], high, ROOM_TONES[0]);
    for (let k = guards.length - 1; k >= 0; k--) {
      const g = guards[k];
      if (g.room !== 0 || g.z < fps.cam.z + NEAREST) continue;
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
    // a puff of dust as each door slams down
    for (let k = 1; k < KICKS.length; k++) {
      const foot = fpsSight(fps, 0, DUST_Y, WALLS[k - 1] + DUST_IN);
      if (foot)
        drawDetonation(ctx, foot, ms - KICKS[k] - FALL_MS, DUST * foot.s, now);
    }
    const lower =
      ms >= KICKS[2]
        ? clamp01((GUN_DOWN * (ms - KICKS[2])) / (DIVE_LAG + diveMs))
        : 1 - clamp01((ms - KICKS[0]) / GUN_UP_MS);
    drawFpsShots(ctx, fps, shots, ms, now, z * BOB, lower);
    // the floors' screen kicked flat, falling away from its foot
    if (ms < KICKS[0] + FALL_MS) {
      const u = fallOf(0, ms);
      const h = view.h * Math.cos((Math.PI / 2) * u * u);
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
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: { ms: enterMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, enterMs + ms, now, floors),
    onEnd: () => {
      const bars = findRewardBars(floor, context);
      if (bars.length === 0) context.applyTierCrit?.(floor, tier);
      bars.forEach((bar, k) =>
        setTimeout(
          () => context.applyTierCrit?.(bar.floor, tier),
          k * tierGapMs,
        ),
      );
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  for (const k of KICKS)
    beat(k - enterMs, () => {
      playExplosion();
      shakeScreen(KICK_SHAKE);
    });
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
