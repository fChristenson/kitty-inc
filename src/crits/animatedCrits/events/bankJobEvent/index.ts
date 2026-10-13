// the "Bank Job" event (fps; cash), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click swings the floors' screen open on its hinge
// like a vault door onto a steel strongroom lined with stacks of gold bars.
// The view walks in, guards stepping out from the sides one after another;
// the pistol drops each, the gold beside him bursting into coins that pay
// into the total. At the end it blows the round vault door off, paying big,
// and a flood of coins pours out at the view as the floors rush back up
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playCoinDrop, playSwoosh } from "../../../../sound";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { addTotalIncome } from "../../../../totalIncome";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { multiply } from "../../../../shared/bigNumber";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import {
  createFpsCoin,
  createFpsShot,
  drawFpsCoins,
  drawFpsEnemy,
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsShots,
  drawFpsSky,
  drawFpsWall,
  drawFpsWallLines,
  fpsEnemyPose,
  fpsSight,
  FPS_GUARD,
  FPS_ROUND_MS,
  type Fps,
  type FpsCoin,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/animationStyles/fps";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
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

const KEY = "bankJob";

// the doorway into the strongroom stands at z 0, a screen wide and high,
// filling it from FOCAL behind; the eye level with its middle
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const BOB_RATE = 7;
const BOB = 0.015;
// the strongroom: half wide, the vault door's depth, how far the view walks
const HALF = 0.8;
const DOOR_Z = 6.2;
const STRIDE = 4.3;
// gold bar stacks down both walls: where along, how long, how high, the bars'
// seams; floor plates
const STACKS = [0.2, 1.4, 2.6, 3.8, 5];
const STACK_LONG = 0.9;
const STACK_Y: [number, number] = [0.3, 0.8];
const STACK_SEAMS = 0.1;
const PLATE_EVERY = 0.6;
const PLATE_LONG = 0.3;
// the round vault door: its radius, inner ring, spokes and their reach
const DOOR_R = 0.55;
const DOOR_RING = 0.7;
const DOOR_RIM = 0.04;
const SPOKES = 3;
const SPOKE_REACH = 0.6;
const SPOKE_W = 0.03;
const HOLE_GLOW = fadeStops(COLOR.heavenlyGold);
const HOLE_CORE = fadeStops(COLOR.white);
// the guards: where each stands, stepping out from STEP_FROM across over
// STEP_MS when the view is OUT_AHEAD short of him, aiming AIM_LAG after and
// shot SHOT_LAG after that
const GUARDS = [
  { x: -0.32, z: 1.6, side: -1 },
  { x: 0.3, z: 2.9, side: 1 },
  { x: -0.28, z: 4.2, side: -1 },
];
const STEP_FROM = 0.75;
const STEP_MS = 150;
const OUT_AHEAD = 2.5;
const AIM_LAG = 150;
const SHOT_LAG = 170;
const CHEST = 0.42;
const KILL_BLAST = 0.6;
// the door: the first shot when the view is DOOR_AHEAD short, the second
// DOOR_GAP later blowing it
const DOOR_AHEAD = 3.3;
const DOOR_GAP = 170;
const DOOR_HIT_BLAST = 0.4;
const DOOR_BLAST = 1.3;
const GUN_UP_MS = 250;
// coins: a guard's stack bursting, then the flood out of the vault (world
// units a second, and how far each spreads out)
const BURST = 24;
const BURST_MS = 900;
const BURST_SPEED: [number, number] = [0.6, 1.4];
const FLOOD = 160;
const FLOOD_LAG_MS = 250;
const FLOOD_SPEED: [number, number] = [4, 9];
const FLOOD_SPREAD = 1.5;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BLOWN_SHAKE = 3;
const SWING_SHAKE = 0.6;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.bankJobEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startBankJob,
  },
  { label: "Bank Job", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Bank Job
export function forceBankJobEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the round vault door, or the glowing hole it left
function drawVaultDoor(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  high: number,
  blown: boolean,
): void {
  const door = fpsSight(fps, 0, high / 2, DOOR_Z);
  if (!door) return;
  const r = DOOR_R * door.s;
  ctx.beginPath();
  ctx.arc(door.x, door.y, r, 0, Math.PI * 2);
  if (blown) {
    ctx.fillStyle = COLOR.black;
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGlow(ctx, HOLE_GLOW, door.x, door.y, r * 1.6);
    drawGlow(ctx, HOLE_CORE, door.x, door.y, r * 0.9);
    ctx.restore();
    return;
  }
  ctx.fillStyle = COLOR.silverTicketGray;
  ctx.fill();
  ctx.lineWidth = DOOR_RIM * door.s;
  ctx.strokeStyle = COLOR.cauldronIronDark;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(door.x, door.y, r * DOOR_RING, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.cauldronIron;
  ctx.fill();
  for (let k = 0; k < SPOKES; k++) {
    const a = (k / SPOKES) * Math.PI;
    const dx = Math.cos(a) * r * SPOKE_REACH;
    const dy = Math.sin(a) * r * SPOKE_REACH;
    drawBeam(
      ctx,
      { x: door.x - dx, y: door.y - dy },
      { x: door.x + dx, y: door.y + dy },
      SPOKE_W * door.s,
      0.5,
    );
  }
}

// the strongroom's shell, far to near: back wall, door, floor plates,
// ceiling, walls and the gold stacked along them
function drawStrongroom(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  high: number,
  blown: boolean,
): void {
  drawFpsSky(ctx, fps, COLOR.cauldronIronDark);
  drawFpsGround(ctx, fps, COLOR.cauldronIronDark);
  drawFpsFace(ctx, fps, DOOR_Z, -HALF, HALF, 0, high, COLOR.wallShadow);
  drawVaultDoor(ctx, fps, high, blown);
  for (let z = DOOR_Z - PLATE_EVERY; z > -FOCAL; z -= PLATE_EVERY)
    drawFpsFlat(
      ctx,
      fps,
      0,
      -HALF,
      HALF,
      z,
      z + PLATE_LONG,
      COLOR.cauldronIron,
    );
  drawFpsFlat(ctx, fps, high, -HALF, HALF, -FOCAL, DOOR_Z, COLOR.black, 0.3);
  for (const x of [-HALF, HALF]) {
    drawFpsWall(ctx, fps, x, 0, high, -FOCAL, DOOR_Z, COLOR.cauldronIron);
    const gx = x * 0.99;
    for (const z of STACKS) {
      drawFpsWall(
        ctx,
        fps,
        gx,
        STACK_Y[0],
        STACK_Y[1],
        z,
        z + STACK_LONG,
        COLOR.heavenlyGold,
      );
      drawFpsWallLines(
        ctx,
        fps,
        gx,
        STACK_Y[0],
        STACK_Y[1],
        STACK_SEAMS,
        z,
        z + STACK_LONG,
        COLOR.woodOutline,
        0.6,
      );
    }
  }
  // the doorway's frame while the view's still outside it
  if (fps.cam.z < 0) {
    drawFpsFace(ctx, fps, 0, -6, -0.5, -1, 6, COLOR.cauldronIronDark);
    drawFpsFace(ctx, fps, 0, 0.5, 6, -1, 6, COLOR.cauldronIronDark);
  }
}

function startBankJob(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  // the room's height: the doorway has the screen's shape
  const high = (area.bottom - area.top) / (area.right - area.left);
  const { swingMs, walkMs, flyMs, payoutsPerGuard, payoutsVault } =
    CONFIG.bankJobEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const go = swingMs / 2;
  const camZ = (ms: number) => -FOCAL + STRIDE * clamp01((ms - go) / walkMs);
  // when the view is `ahead` short of z
  const reach = (z: number, ahead: number) =>
    go + ((z - ahead + FOCAL) / STRIDE) * walkMs;
  const guards = GUARDS.map((g) => {
    const out = reach(g.z, OUT_AHEAD);
    const aims = out + AIM_LAG;
    const hit = aims + SHOT_LAG;
    return { ...g, out, aims, hits: [hit], dies: hit + FPS_ROUND_MS };
  });
  const doorHit = reach(DOOR_Z, DOOR_AHEAD);
  const blownAt = doorHit + DOOR_GAP + FPS_ROUND_MS;
  const shots: FpsShot[] = [
    ...guards.map((g) => createFpsShot(g.hits[0], g.x, CHEST, g.z, KILL_BLAST)),
    createFpsShot(doorHit, 0, high / 2, DOOR_Z, DOOR_HIT_BLAST),
    createFpsShot(doorHit + DOOR_GAP, 0, high / 2, DOOR_Z, DOOR_BLAST),
  ];
  const coins: FpsCoin[] = [];
  guards.forEach((g, i) => {
    for (let k = 0; k < BURST; k++) {
      const seed = i * 100 + k;
      const speed = lerp(BURST_SPEED, hash01(seed, 7401));
      coins.push(
        createFpsCoin(
          g.side * 0.79,
          lerp(STACK_Y, hash01(seed, 7402)),
          g.z + hash01(seed, 7403) * STACK_LONG,
          -g.side * speed * (0.4 + hash01(seed, 7404)),
          speed * (0.6 + hash01(seed, 7405)),
          (hash01(seed, 7406) - 0.5) * speed,
          g.dies,
          seed,
          true,
        ),
      );
    }
  });
  for (let k = 0; k < FLOOD; k++) {
    const seed = 1000 + k;
    const a = hash01(seed, 7407) * Math.PI * 2;
    const r = Math.sqrt(hash01(seed, 7408)) * DOOR_R;
    const speed = lerp(FLOOD_SPEED, hash01(seed, 7409));
    coins.push(
      createFpsCoin(
        Math.cos(a) * r,
        high / 2 + Math.sin(a) * r,
        DOOR_Z,
        Math.cos(a) * FLOOD_SPREAD,
        Math.sin(a) * FLOOD_SPREAD,
        -speed,
        blownAt + hash01(seed, 7410) * FLOOD_LAG_MS,
        seed,
        false,
      ),
    );
  }
  // the flight starts as the door blows; the flood pours out over flyMs
  const enterMs = blownAt;

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const z = camZ(ms);
    const bob = Math.abs(Math.sin(z * BOB_RATE)) * BOB;
    const fps: Fps = {
      view,
      lens: LENS,
      cam: { x: 0, y: high / 2 + bob, z, tip: 0 },
    };
    drawStrongroom(ctx, fps, high, ms >= blownAt);
    for (let i = guards.length - 1; i >= 0; i--) {
      const g = guards[i];
      if (ms < g.out || g.z < z + 0.3) continue;
      const step = smoothstep(clamp01((ms - g.out) / STEP_MS));
      drawFpsEnemy(
        ctx,
        fps,
        lerp([g.side * STEP_FROM, g.x], step),
        g.z,
        FPS_GUARD,
        fpsEnemyPose(ms, g.aims, g.hits, g.side),
        now,
      );
    }
    drawFpsCoins(ctx, fps, coins, ms, BURST_MS);
    drawFpsShots(
      ctx,
      fps,
      shots,
      ms,
      now,
      z * BOB_RATE,
      1 - clamp01((ms - go) / GUN_UP_MS),
    );
    // the floors' screen swinging open on its left hinge, darkening as it turns
    if (ms < swingMs) {
      const u = smoothstep(clamp01(ms / swingMs));
      const w = view.w * Math.cos((u * Math.PI) / 2);
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.x,
        view.y,
        w,
        view.h,
      );
      ctx.globalAlpha = 0.5 * u;
      ctx.fillStyle = COLOR.black;
      ctx.fillRect(view.x, view.y, w, view.h);
      ctx.globalAlpha = 1;
    }
  };

  const pay = (payouts: number) => {
    addTotalIncome(multiply(rewardPayoutAmount(floor, Date.now()), payouts));
    pulseHudTotalFlash();
    playCoinDrop();
  };

  const beat = startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      enter: { ms: enterMs, draw: drawScene },
      draw: (ctx, view, ms, now, floors) =>
        drawScene(ctx, view, enterMs + ms, now, floors),
      onEnd: () => {
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  beat(swingMs - enterMs, () => shakeScreen(SWING_SHAKE));
  for (const g of guards) {
    beat(g.hits[0] - enterMs, () => {
      playExplosion();
      shakeScreen(SHOT_SHAKE);
    });
    beat(g.dies - enterMs, () => {
      shakeScreen(KILL_SHAKE);
      pay(payoutsPerGuard);
    });
  }
  beat(doorHit - enterMs, () => {
    playExplosion();
    shakeScreen(SHOT_SHAKE);
  });
  beat(0, () => {
    playCritExplosion();
    shakeScreen(BLOWN_SHAKE);
    pay(payoutsVault);
  });
}
