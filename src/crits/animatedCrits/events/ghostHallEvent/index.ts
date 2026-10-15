// the "Ghost Hall" event (fps; cash), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click drops the floors' screen away in strips like a
// curtain onto a candlelit hall hung with portraits. Ghost wisps swoop out of
// the frames at the view and the pistol pops each in a burst of coins that
// pay into the total, quicker and quicker; a huge ghost rises at the end of
// the hall and takes three, bursting into a shower of coins and a big payout.
// The view rushes into the great portrait at the end, the floors in its frame
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playCoinDrop, playSwoosh } from "../../../../sound";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { addTotalIncome } from "../../../../totalIncome";
import { multiply } from "../../../../shared/bigNumber";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import {
  createFpsCoin,
  createFpsShot,
  drawFpsCoins,
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsOpening,
  drawFpsShots,
  drawFpsSky,
  drawFpsWall,
  fpsOpeningLanding,
  fpsSight,
  FPS_ROUND_MS,
  type Fps,
  type FpsCoin,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/animationStyles/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { drawWisp, type Point } from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  FLIGHT_STAGE,
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

const KEY = "ghostHall";

// the view glides from FOCAL behind the hall's mouth to GLIDE_TO, eye EYE up
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const EYE = 0.6;
const GLIDE_TO = 3.2;
const BOB = 0.012;
const BOB_RATE = 7;
// the hall: half wide, high, its end wall, plank seams
const HALF = 0.8;
const HIGH = 1.4;
const END = 9;
const PLANK_EVERY = 0.3;
const PLANK = 0.02;
// the portraits down both walls: where along, their frames and canvases, a
// candle beside each
const PORTRAITS = [1.2, 2.6, 4, 5.4, 6.8];
const FRAME_Y: [number, number] = [0.5, 1.1];
const FRAME_HALF = 0.3;
const CANVAS_IN = 0.06;
const CANDLE_X = 0.94;
const CANDLE_Y = 0.45;
const CANDLE_ALONG = 0.7;
const CANDLE = 0.05;
// the great portrait at the end, the floors in it: its width (at most), sill
// and frame
const GREAT_W = 0.9;
const GREAT_SILL = 0.15;
const GREAT_ROOM = 0.1;
const GREAT_FRAME = 0.06;
// the ghosts: each swoops out of a portrait, alternating sides, over SWOOP_MS
// and is shot there, the next GAPS later; their size and how they swoop
const GAPS = [380, 340, 300, 260, 230];
const FIRST = 100;
const SWOOP_MS = 320;
const GHOST = 0.16;
const GHOST_HEAT = 0.6;
const SWOOP_LIFT = 1.2;
const SWOOP_CROSS = 0.3;
const SWOOP_END_X = 0.15;
const SWOOP_END_Y = 0.65;
const SWOOP_AHEAD = 1.6;
const GHOST_BLAST = 0.35;
// the huge ghost rising at the end, swaying, shot three times
const BIG_LAG = 150;
const BIG_Z = 7.6;
const BIG_RISE_MS = 300;
const BIG_Y: [number, number] = [-0.4, 0.8];
const BIG_SWAY = 0.15;
const BIG_SHOTS = [350, 500, 650];
const BIG_GHOST = 1.2;
const BIG_HEAT = 0.8;
const BIG_HIT_BLAST = 0.4;
const BIG_BLAST = 1.2;
// coins out of each popped ghost, and out of the big one
const POP_COINS = 16;
const BIG_COINS = 60;
const COIN_SPEED: [number, number] = [0.6, 1.6];
const COIN_LIFE_MS = 900;
// the curtain: strips falling, each starting up to STRIP_LAG late
const STRIPS = 12;
const STRIP_LAG = 120;
const RUSH_LAG = 350;
const GUN_UP_MS = 250;
const SHOT_SHAKE = 0.6;
const POP_SHAKE = 1.2;
const BIG_SHAKE = 3;
const CURTAIN_SHAKE = 0.6;

interface Ghost {
  side: number;
  out: number;
  hit: number;
  pops: number;
  // where it's popped, its swoop in the world and on screen, through the
  // frame's view
  to: { x: number; y: number; z: number };
  world: (ms: number) => { x: number; y: number; z: number };
  at: (ms: number) => Point | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startGhostHall,
  },
  { label: "Ghost Hall", color: COLOR.white },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Ghost Hall
export function forceGhostHallEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the hall's shell, far to near: the end wall with its great portrait, the
// planks, ceiling and walls hung with portraits and candles
function drawHall(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  floors: ScreenCopy,
  aspect: number,
  greatW: number,
  now: number,
): void {
  drawFpsSky(ctx, fps, COLOR.black);
  drawFpsGround(ctx, fps, COLOR.woodOutline);
  drawFpsFace(ctx, fps, END, -HALF, HALF, 0, HIGH, COLOR.amberMutedShadow);
  drawFpsFace(
    ctx,
    fps,
    END,
    -greatW / 2 - GREAT_FRAME,
    greatW / 2 + GREAT_FRAME,
    GREAT_SILL - GREAT_FRAME,
    GREAT_SILL + greatW * aspect + GREAT_FRAME,
    COLOR.heavenlyGold,
  );
  drawFpsOpening(ctx, fps, floors, END, greatW, GREAT_SILL, aspect);
  for (let z = END - PLANK_EVERY; z > fps.cam.z; z -= PLANK_EVERY)
    drawFpsFlat(ctx, fps, 0, -HALF, HALF, z, z + PLANK, COLOR.black, 0.4);
  drawFpsFlat(ctx, fps, HIGH, -HALF, HALF, -FOCAL, END, COLOR.black, 0.5);
  ctx.save();
  for (const x of [-HALF, HALF]) {
    drawFpsWall(ctx, fps, x, 0, HIGH, -FOCAL, END, COLOR.amberMutedShadow);
    const fx = x * 0.99;
    for (const z of PORTRAITS) {
      drawFpsWall(
        ctx,
        fps,
        fx,
        FRAME_Y[0],
        FRAME_Y[1],
        z - FRAME_HALF,
        z + FRAME_HALF,
        COLOR.heavenlyGold,
      );
      drawFpsWall(
        ctx,
        fps,
        fx * 0.995,
        FRAME_Y[0] + CANVAS_IN,
        FRAME_Y[1] - CANVAS_IN,
        z - FRAME_HALF + CANVAS_IN,
        z + FRAME_HALF - CANVAS_IN,
        COLOR.black,
      );
    }
  }
  ctx.globalCompositeOperation = "lighter";
  for (const x of [-HALF, HALF])
    for (const z of PORTRAITS) {
      const candle = fpsSight(fps, x * CANDLE_X, CANDLE_Y, z + CANDLE_ALONG);
      if (candle)
        stampGlimmer(
          ctx,
          candle.x,
          candle.y,
          CANDLE * candle.s,
          now * 0.004 + z,
          COLOR.heavenlyGold,
        );
    }
  ctx.restore();
}

function startGhostHall(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { dropMs, glideMs, flyMs, payoutsPerGhost, payoutsBig } =
    meta.values;
  const { arriveMs } = FLIGHT_STAGE;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the great portrait's width, so it fits under the ceiling
  const greatW = Math.min(GREAT_W, (HIGH - GREAT_SILL - GREAT_ROOM) / aspect);
  const land = fpsOpeningLanding(FOCAL, END, greatW, GREAT_SILL, aspect);
  const camZ = (ms: number) =>
    lerp([-FOCAL, GLIDE_TO], clamp01((ms - dropMs) / glideMs));
  // the frame of view each ghost's swoop is seen through, set every frame
  const seen: { fps: Fps | null } = { fps: null };

  const ghosts: Ghost[] = [];
  let t = dropMs + FIRST;
  GAPS.forEach((gap, k) => {
    const side = k % 2 ? 1 : -1;
    const from = {
      x: side * (HALF - 0.02),
      y: (FRAME_Y[0] + FRAME_Y[1]) / 2,
      z: PORTRAITS[k],
    };
    const out = t;
    const hit = out + SWOOP_MS;
    const pops = hit + FPS_ROUND_MS;
    const toZ = camZ(pops) + SWOOP_AHEAD;
    const mid = {
      x: -side * SWOOP_CROSS,
      y: SWOOP_LIFT,
      z: (from.z + toZ) / 2,
    };
    const to = { x: side * SWOOP_END_X, y: SWOOP_END_Y, z: toZ };
    // its swoop in the world: out of the frame, over and in at the view
    const world = (ms: number) => {
      const u = clamp01((ms - out) / (pops - out));
      const p = (1 - u) ** 2;
      const q = 2 * (1 - u) * u;
      const r = u * u;
      return {
        x: p * from.x + q * mid.x + r * to.x,
        y: p * from.y + q * mid.y + r * to.y,
        z: p * from.z + q * mid.z + r * to.z,
      };
    };
    ghosts.push({
      side,
      out,
      hit,
      pops,
      to,
      world,
      at: (ms) => {
        const w = world(ms);
        const p = seen.fps && fpsSight(seen.fps, w.x, w.y, w.z);
        return p ? { x: p.x, y: p.y } : null;
      },
    });
    t += gap;
  });
  const lastGhost = ghosts[ghosts.length - 1];
  const bigAt = lastGhost.pops + BIG_LAG;
  const bigHits = BIG_SHOTS.map((s) => bigAt + s);
  const bigPops = bigHits[bigHits.length - 1] + FPS_ROUND_MS;
  const bigY = (ms: number) =>
    lerp(BIG_Y, smoothstep(clamp01((ms - bigAt) / BIG_RISE_MS)));
  const bigAtScreen = (ms: number): Point | null => {
    const p =
      seen.fps &&
      fpsSight(seen.fps, Math.sin(ms * 0.004) * BIG_SWAY, bigY(ms), BIG_Z);
    return p ? { x: p.x, y: p.y } : null;
  };
  const enterMs = bigPops + RUSH_LAG;
  const rushMs = flyMs + arriveMs;

  const shots: FpsShot[] = [
    ...ghosts.map((g) =>
      createFpsShot(g.hit, g.to.x, g.to.y, g.to.z, GHOST_BLAST),
    ),
    ...bigHits.map((ms, i) =>
      createFpsShot(
        ms,
        0,
        BIG_Y[1],
        BIG_Z,
        i === bigHits.length - 1 ? BIG_BLAST : BIG_HIT_BLAST,
      ),
    ),
  ];
  const coins: FpsCoin[] = [];
  const burst = (
    x: number,
    y: number,
    z: number,
    at: number,
    n: number,
    salt: number,
  ) => {
    for (let k = 0; k < n; k++) {
      const seed = salt * 100 + k;
      const a = hash01(seed, 7701) * Math.PI * 2;
      const speed = lerp(COIN_SPEED, hash01(seed, 7702));
      coins.push(
        createFpsCoin(
          x,
          y,
          z,
          Math.cos(a) * speed,
          Math.abs(Math.sin(a)) * speed,
          (hash01(seed, 7703) - 0.5) * speed,
          at,
          seed,
          true,
        ),
      );
    }
  };
  ghosts.forEach((g, i) => burst(g.to.x, g.to.y, g.to.z, g.pops, POP_COINS, i));
  burst(0, BIG_Y[1], BIG_Z, bigPops, BIG_COINS, 99);

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const rush = clamp01((ms - enterMs) / rushMs);
    const z = lerp([camZ(ms), land.z], rush * rush);
    const bob = Math.abs(Math.sin(z * BOB_RATE)) * BOB * (1 - rush);
    const fps: Fps = {
      view,
      lens: LENS,
      cam: { x: 0, y: lerp([EYE, land.y], rush) + bob, z, tip: 0 },
    };
    seen.fps = fps;
    drawHall(ctx, fps, floors, aspect, greatW, now);
    if (ms >= bigAt && ms < bigPops) {
      const p = fpsSight(fps, 0, BIG_Y[1], BIG_Z);
      if (p) drawWisp(ctx, bigAtScreen, ms, now, BIG_GHOST * p.s, BIG_HEAT);
    }
    for (const g of ghosts) {
      if (ms < g.out || ms >= g.pops) continue;
      const w = g.world(ms);
      const p = fpsSight(fps, w.x, w.y, w.z);
      if (p) drawWisp(ctx, g.at, ms, now, GHOST * p.s, GHOST_HEAT);
    }
    drawFpsCoins(ctx, fps, coins, ms, COIN_LIFE_MS);
    const lower =
      ms >= enterMs
        ? clamp01(rush * 3)
        : 1 - clamp01((ms - dropMs) / GUN_UP_MS);
    drawFpsShots(ctx, fps, shots, ms, now, z * BOB_RATE, lower);
    // the floors' screen dropping away in strips like a curtain
    if (ms < dropMs) {
      const sw = view.w / STRIPS;
      for (let i = 0; i < STRIPS; i++) {
        const u = clamp01(
          (ms - hash01(i, 7704) * STRIP_LAG) / (dropMs - STRIP_LAG),
        );
        drawScreenPart(
          ctx,
          floors,
          view.x + i * sw,
          view.y,
          sw,
          view.h,
          view.x + i * sw,
          view.y + view.h * u * u,
          sw,
          view.h,
        );
      }
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
      ownLanding: true,
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
  beat(dropMs - enterMs, () => shakeScreen(CURTAIN_SHAKE));
  for (const g of ghosts) {
    beat(g.out - enterMs, playSwoosh);
    beat(g.hit - enterMs, () => {
      playExplosion();
      shakeScreen(SHOT_SHAKE);
    });
    beat(g.pops - enterMs, () => {
      shakeScreen(POP_SHAKE);
      pay(payoutsPerGhost);
    });
  }
  beat(bigAt - enterMs, playSwoosh);
  for (const ms of bigHits)
    beat(ms - enterMs, () => {
      playExplosion();
      shakeScreen(SHOT_SHAKE);
    });
  beat(bigPops - enterMs, () => {
    playCritExplosion();
    shakeScreen(BIG_SHAKE);
    pay(payoutsBig);
  });
  beat(0, playSwoosh);
}
