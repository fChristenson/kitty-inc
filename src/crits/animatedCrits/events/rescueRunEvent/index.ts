// the "Rescue Run" event (rail shooter; free hires), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with
// shared/animationStyles/railShooter's plain and shared/animationStyles/race's
// racer wisp in shared/animationStyles/fps's world: its crit's click drops the
// floors' screen away in columns onto a night street, the ship racing low
// between the buildings. Glowing cages hang off the walls, a cat-wisp in
// each; the ship locks on and shoots each open in a blast, a chime and a
// jolt, and the freed cat leaps out and streaks off into the giant screen of
// the floors at the street's end: a free hire on a floor in view, landing on
// the hit. Cages come faster and in clusters; last a big cage over the street
// is blown open in a chain of blasts, a cat out of each, and the ship flies
// into the floors' screen, where the new hires cheer
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSimonNote, playSpinTick, playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawFpsFace,
  drawFpsGround,
  drawFpsOpening,
  drawFpsSky,
  drawFpsWall,
  drawFpsWallLines,
  fpsHorizon,
  fpsOpeningLanding,
  FPS_NEAR,
  type Fps,
  type FpsLens,
} from "../../../../shared/animationStyles/fps";
import { createRaceWisp } from "../../../../shared/animationStyles/race";
import { drawCheckerPlain } from "../../../../shared/animationStyles/railShooter";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { celebrateWorkerBoost } from "../../../../floors/worker";
import { findRewardHires, giveHire, type RewardHire } from "../../eventRewards";
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

const KEY = "rescueRun";

// the view rides BEHIND the ship and RIDE above it, leaning after it by
// FOLLOW; the ship's speed down the street (world units a second)
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.42 };
const BEHIND = 1.5;
const RIDE = 0.4;
const FOLLOW = 0.5;
const SPEED = 7;
// the racer: its weave across and up and down, its wisp's size, its nose
const WEAVE_X = 0.35;
const WEAVE_X_RATE = 0.0024;
const HOVER = 0.45;
const WEAVE_Y = 0.1;
const WEAVE_Y_RATE = 0.0037;
const RACER = 0.08;
const NOSE = 0.5;
const NOSE_UP = 0.04;
// the night street: its half width, the buildings along both sides back to
// back, each BLOCK long, DEPTH deep and HIGH tall, lit floor lines down
// their walls; drawn out to REACH ahead
const SKY = COLOR.nightShiftIndigo;
const ROAD = COLOR.incomeTrack;
const CHECK = COLOR.disabledGrayShadow;
const PLAIN_PAST = 6;
const STREET = 1.1;
const BLOCK: [number, number] = [1.2, 2.2];
const DEPTH = 1.2;
const HIGH: [number, number] = [2.3, 3.8];
const WALL = COLOR.wallShadow;
const FRONT = COLOR.wall;
const WINDOWS = COLOR.goldenTicketYellow;
const WINDOW_FROM = 0.3;
const WINDOW_EVERY = 0.32;
const WINDOW_ALPHA = 0.7;
const REACH = 18;
// the giant screen of the floors this far past where the ship is when the
// view starts after it, its width, sill and gold frame
const SCREEN_AHEAD = 5;
const SCREEN_W = 1.4;
const SCREEN_SILL = 0.3;
const SCREEN_FRAME = 0.08;
const PULL_AHEAD = 5;
// a small cage: shot when SHOT_AT ahead, its half size, how far in off the
// wall, its height, its arm SWING above it; locked onto LOCK_MS before the
// shot, which flies SHOT_MS
const SHOT_AT = 3.2;
const CAGE = 0.2;
const CAGE_OUT = 0.35;
const CAGE_Y: [number, number] = [0.85, 1.5];
const SWING = 0.25;
const LOCK_MS = 200;
const SHOT_MS = 90;
const SHOT = 1.1;
// the big cage over the street: its half size, height, cable over it, and
// how far round it its chain of blasts goes off
const BIG = 0.42;
const BIG_Y = 1.3;
const CABLE_Y = BIG_Y + BIG + 0.35;
const CHAIN_REACH = 0.55;
// a cat-wisp: its size (world units), how far its cage trembles when locked
// on, how high it leaps on its way out
const CAT = 0.13;
const TREMBLE = 0.03;
const LEAP = 0.8;
// the blasts (world units): a small cage's, a chain blast's, the last one's
const KILL_BLAST = 0.5;
const CHAIN_BLAST = 0.7;
const FINAL_BLAST = 1.5;
const BLAST_MS = 1200;
const ARRIVE_MS = 300;
// the frozen floors' screen dropping away in columns
const COLS = 6;
const COL_STAGGER = 35;
const COL_DROP = 1.15;
const RUSH_LAG = 280;
const SPLIT_SHAKE = 0.8;
const LOCK_SHAKE = 0.3;
const SHOT_SHAKE = 0.4;
const HIT_SHAKE = 1.2;
const CHAIN_SHAKE = 1.6;
const FINAL_SHAKE = 3.2;
const FINAL_FLASH_MS = 300;
const LABEL_MS = 500;
const LABEL_STYLE = { fontSize: 40, strokeWidth: 6 };
const BIG_LABEL_STYLE = { fontSize: 56, strokeWidth: 8 };
const BIG_LABELS = [
  "",
  "+1 Hire",
  "+2 Hires",
  "+3 Hires",
  "+4 Hires",
  "+5 Hires",
  "+6 Hires",
];

interface Building {
  side: number;
  z0: number;
  z1: number;
  high: number;
}

interface Cage {
  big: boolean;
  side: number;
  x: number;
  y: number;
  z: number;
  half: number;
  lock: number;
  fire: number;
  // when it bursts (the big one's first blast)
  hit: number;
  // where the shot leaves the ship
  from: { x: number; y: number; z: number };
  shotPath: (ms: number) => Point | null;
}

interface Cat {
  index: number;
  cage: Cage;
  // where it sits trapped, and when it's freed
  x: number;
  y: number;
  z: number;
  release: number;
  hired: boolean;
  s: number;
  trappedPath: (ms: number) => Point | null;
  path: (ms: number) => Point | null;
}

interface Blast {
  x: number;
  y: number;
  z: number;
  ms: number;
  size: number;
}

// where (x, y, z) shows, into out; its px a unit there, 0 behind the view
function sightInto(fps: Fps, x: number, y: number, z: number, out: Point) {
  const dz = z - fps.cam.z;
  if (dz < FPS_NEAR) return 0;
  const s = (fps.lens.focal * fps.view.w) / dz;
  out.x = fps.view.cx + (x - fps.cam.x) * s;
  out.y = fpsHorizon(fps) + (fps.cam.y - y) * s;
  return s;
}

// a cat's two ears atop a wisp head at (x, y), r px, added to ctx's path
function addEars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  for (let side = -1; side <= 1; side += 2) {
    ctx.moveTo(x + side * r * 0.95, y - r * 0.25);
    ctx.lineTo(x + side * r * 0.65, y - r * 1.3);
    ctx.lineTo(x + side * r * 0.15, y - r * 0.8);
    ctx.closePath();
  }
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      findRewardHires(floor, context).length > 0,
    arm: startRescueRun,
  },
  { label: "Rescue Run", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Rescue Run
export function forceRescueRunEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startRescueRun(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const {
    splitMs,
    cageHitMs,
    bigHitMs,
    chainGapMs,
    bigCats,
    catMs,
    hireGapMs,
  } = meta.values;
  const { arriveMs } = FLIGHT_STAGE;
  const tier = context.critTier ?? pickCritTierByOdds();

  // the ship's run from the click, pulling ahead into the floors' screen
  // once the view starts after it
  const flown = (ms: number) => (SPEED * Math.max(0, ms)) / 1000;
  const lastChain = bigHitMs + (bigCats - 1) * chainGapMs;
  const enterMs = lastChain + RUSH_LAG;
  const rushMs = arriveMs;
  const screenZ = flown(enterMs) + SCREEN_AHEAD;
  const land = fpsOpeningLanding(FOCAL, screenZ, SCREEN_W, SCREEN_SILL, aspect);
  const landing = (ms: number) => smoothstep(clamp01((ms - enterMs) / rushMs));
  const ship = { x: 0, z: 0, hover: 0 };
  const shipAt = (ms: number) => {
    const t = Math.max(0, ms);
    const w = landing(ms);
    ship.x = WEAVE_X * Math.sin(t * WEAVE_X_RATE) * (1 - w);
    ship.z = flown(ms) + PULL_AHEAD * w * w;
    ship.hover = HOVER + WEAVE_Y * Math.sin(t * WEAVE_Y_RATE);
    return ship;
  };

  // one frame of view, its camera moved every frame
  const fps: Fps = {
    view: { x: 0, y: 0, w: 1, h: 1, cx: 0 },
    lens: LENS,
    cam: { x: 0, y: 0, z: 0, tip: 0 },
  };
  const target = {
    x: 0,
    y: SCREEN_SILL + (SCREEN_W * aspect) / 2,
    z: screenZ,
  };

  // the buildings, back to back down both sides to the floors' screen
  const buildings: Building[] = [];
  for (let side = -1; side <= 1; side += 2) {
    let z = side < 0 ? 0 : -0.6;
    for (let i = 0; z < screenZ - 1; i++) {
      const length = lerp(BLOCK, hash01(i, side < 0 ? 8101 : 8102));
      buildings.push({
        side,
        z0: z,
        z1: Math.min(z + length, screenZ - 1),
        high: lerp(HIGH, hash01(i, side < 0 ? 8103 : 8104)),
      });
      z += length;
    }
  }
  buildings.sort((a, b) => b.z0 - a.z0);

  // the cages: small ones shot at their times, alternate sides within a
  // cluster, then the big one over the street
  const cages: Cage[] = [];
  const addCage = (big: boolean, side: number, y: number, hit: number) => {
    const at = shipAt(hit - SHOT_MS);
    const from = { x: at.x, y: at.hover + NOSE_UP, z: at.z + NOSE };
    const cage: Cage = {
      big,
      side,
      x: big ? 0 : side * (STREET - CAGE_OUT),
      y,
      z: flown(hit) + SHOT_AT,
      half: big ? BIG : CAGE,
      lock: hit - SHOT_MS - LOCK_MS,
      fire: hit - SHOT_MS,
      hit,
      from,
      shotPath: () => null,
    };
    const spot: Point = { x: 0, y: 0 };
    cage.shotPath = (ms) => {
      const u = clamp01((ms - cage.fire) / SHOT_MS);
      return sightInto(
        fps,
        from.x + (cage.x - from.x) * u,
        from.y + (cage.y - from.y) * u,
        from.z + (cage.z - from.z) * u,
        spot,
      ) > 0
        ? spot
        : null;
    };
    cages.push(cage);
    return cage;
  };
  for (let k = 0; k < cageHitMs.length; k++)
    addCage(false, k % 2 ? 1 : -1, lerp(CAGE_Y, hash01(k, 8106)), cageHitMs[k]);
  const big = addCage(true, 0, BIG_Y, bigHitMs);

  // the cats: one in each small cage, bigCats in the big one, each freed by
  // its blast and streaking into the floors' screen
  const cats: Cat[] = [];
  const blasts: Blast[] = [];
  const addCat = (cage: Cage, x: number, y: number, release: number) => {
    const cat: Cat = {
      index: cats.length,
      cage,
      x,
      y,
      z: cage.z,
      release,
      hired: false,
      s: 0,
      trappedPath: () => null,
      path: () => null,
    };
    const held: Point = { x: 0, y: 0 };
    cat.trappedPath = (ms) => {
      const shake =
        ms >= cage.lock ? TREMBLE * Math.sin(ms * 0.9 + cat.index) : 0;
      cat.s = sightInto(fps, cat.x + shake, cat.y, cat.z, held);
      return cat.s > 0 ? held : null;
    };
    const flying: Point = { x: 0, y: 0 };
    cat.path = (ms) => {
      const u = clamp01((ms - release) / catMs);
      const e = u * u;
      cat.s = sightInto(
        fps,
        cat.x + (target.x - cat.x) * e,
        cat.y + (target.y - cat.y) * e + LEAP * Math.sin(Math.PI * u),
        cat.z + (target.z - cat.z) * e,
        flying,
      );
      return cat.s > 0 ? flying : null;
    };
    cats.push(cat);
  };
  for (let k = 0; k < cageHitMs.length; k++) {
    const c = cages[k];
    addCat(c, c.x, c.y, c.hit);
    blasts.push({ x: c.x, y: c.y, z: c.z, ms: c.hit, size: KILL_BLAST });
  }
  const firstBigCat = cats.length;
  for (let k = 0; k < bigCats; k++) {
    const ms = bigHitMs + k * chainGapMs;
    addCat(
      big,
      (k - (bigCats - 1) / 2) * ((BIG * 1.4) / bigCats),
      BIG_Y + (k % 2 ? 0.08 : -0.1),
      ms,
    );
    const a = k * 2.4;
    const last = k === bigCats - 1;
    blasts.push({
      x: k === 0 || last ? 0 : Math.cos(a) * CHAIN_REACH,
      y: BIG_Y + (k === 0 || last ? 0 : Math.sin(a) * CHAIN_REACH * 0.7),
      z: big.z,
      ms,
      size: last ? FINAL_BLAST : CHAIN_BLAST,
    });
  }
  const finalMs = lastChain;

  // a freed cat's hire, on whichever floor in view still has room
  const hired: RewardHire[] = [];
  const hireCat = (cat: Cat) => {
    const fresh = findRewardHires(floor, context);
    if (fresh.length === 0) return;
    const hire = fresh[cat.index % fresh.length];
    giveHire(hire);
    if (hire.workerIndex === null) return;
    cat.hired = true;
    hired.push(hire);
  };

  const racerSpot = { x: 0, y: 0, z: 0 };
  const racer = createRaceWisp((ms) => {
    const at = shipAt(ms);
    racerSpot.x = at.x;
    racerSpot.y = at.hover;
    racerSpot.z = at.z;
    return racerSpot;
  });
  const a: Point = { x: 0, y: 0 };
  const b: Point = { x: 0, y: 0 };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const at = shipAt(ms);
    const shipX = at.x;
    const shipZ = at.z;
    const hover = at.hover;
    const w = landing(ms);
    fps.view = view;
    fps.cam.x = shipX * FOLLOW;
    fps.cam.y = lerp([hover + RIDE, land.y], w);
    fps.cam.z = lerp([flown(ms) - BEHIND, land.z], w);
    const cz = fps.cam.z;
    drawFpsSky(ctx, fps, SKY);
    drawFpsGround(ctx, fps, ROAD);
    drawCheckerPlain(ctx, fps, CHECK, screenZ + PLAIN_PAST);
    drawFpsFace(
      ctx,
      fps,
      screenZ + 0.01,
      -SCREEN_W / 2 - SCREEN_FRAME,
      SCREEN_W / 2 + SCREEN_FRAME,
      SCREEN_SILL - SCREEN_FRAME,
      SCREEN_SILL + SCREEN_W * aspect + SCREEN_FRAME,
      COLOR.heavenlyGold,
    );
    drawFpsOpening(ctx, fps, floors, screenZ, SCREEN_W, SCREEN_SILL, aspect);

    // the buildings, far to near
    for (let i = 0; i < buildings.length; i++) {
      const bd = buildings[i];
      if (bd.z1 < cz + FPS_NEAR || bd.z0 > cz + REACH) continue;
      const wx = bd.side * STREET;
      drawFpsFace(
        ctx,
        fps,
        bd.z0,
        Math.min(wx, wx + bd.side * DEPTH),
        Math.max(wx, wx + bd.side * DEPTH),
        0,
        bd.high,
        FRONT,
      );
      drawFpsWall(ctx, fps, wx, 0, bd.high, bd.z0, bd.z1, WALL);
      drawFpsWallLines(
        ctx,
        fps,
        wx,
        WINDOW_FROM,
        bd.high,
        WINDOW_EVERY,
        bd.z0,
        bd.z1,
        WINDOWS,
        WINDOW_ALPHA,
      );
    }

    // the arms and the big cage's cable, one path
    ctx.beginPath();
    for (let i = 0; i < cages.length; i++) {
      const c = cages[i];
      if (c.z < cz + FPS_NEAR || c.z > cz + REACH) continue;
      const top = c.y + c.half;
      if (c.big) {
        if (
          sightInto(fps, -STREET, CABLE_Y, c.z, a) > 0 &&
          sightInto(fps, STREET, CABLE_Y, c.z, b) > 0
        ) {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        if (ms < c.hit && sightInto(fps, 0, top, c.z, b) > 0) {
          sightInto(fps, 0, CABLE_Y, c.z, a);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        continue;
      }
      if (sightInto(fps, c.side * STREET, top + SWING, c.z, a) === 0) continue;
      ctx.moveTo(a.x, a.y);
      sightInto(fps, c.x, top + SWING, c.z, a);
      ctx.lineTo(a.x, a.y);
      if (ms < c.hit && sightInto(fps, c.x, top, c.z, b) > 0)
        ctx.lineTo(b.x, b.y);
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR.silverTicketGray;
    ctx.stroke();

    // the cages still shut, glowing, a cat-wisp in each
    for (let i = 0; i < cages.length; i++) {
      const c = cages[i];
      if (ms >= c.hit) continue;
      const s = sightInto(fps, c.x, c.y, c.z, a);
      if (s === 0 || c.z > cz + REACH) continue;
      const r = c.half * s;
      const locked = ms >= c.lock;
      if (locked) a.x += TREMBLE * s * Math.sin(ms * 0.9 + i);
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.02 + i);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = COLOR.nightShiftIndigo;
      ctx.fillRect(a.x - r, a.y - r, r * 2, r * 2);
      ctx.globalAlpha = locked ? 1 : 0.7 + 0.3 * pulse;
      ctx.beginPath();
      ctx.rect(a.x - r, a.y - r, r * 2, r * 2);
      for (let k = 1; k < 4; k++) {
        const x = a.x - r + (r * 2 * k) / 4;
        ctx.moveTo(x, a.y - r);
        ctx.lineTo(x, a.y + r);
      }
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.strokeStyle =
        locked && (ms - c.lock) % 80 < 40 ? COLOR.white : COLOR.heavenlyGold;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      if (ms >= cat.release || cat.z > cz + REACH) continue;
      if (!cat.trappedPath(ms)) continue;
      const heat = ms >= cat.cage.lock ? 1 : 0.4;
      drawWisp(ctx, cat.trappedPath, ms, now, CAT * cat.s, heat);
    }

    // the lock-on brackets closing in, flashing white once fired
    for (let i = 0; i < cages.length; i++) {
      const c = cages[i];
      if (ms < c.lock || ms >= c.hit) continue;
      const s = sightInto(fps, c.x, c.y, c.z, a);
      if (s === 0) continue;
      const u = clamp01((ms - c.lock) / LOCK_MS);
      const r = c.half * s * (1.3 + 1.4 * (1 - u) * (1 - u));
      const arm = r * 0.4;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const sx = k % 2 ? 1 : -1;
        const sy = k < 2 ? -1 : 1;
        ctx.moveTo(a.x + sx * r, a.y + sy * (r - arm));
        ctx.lineTo(a.x + sx * r, a.y + sy * r);
        ctx.lineTo(a.x + sx * (r - arm), a.y + sy * r);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = ms >= c.fire ? COLOR.white : COLOR.fullHouseCrimson;
      ctx.stroke();
    }

    if (shipZ < screenZ) racer(ctx, fps, ms, now, RACER);
    for (let i = 0; i < cages.length; i++) {
      const c = cages[i];
      const size = WISP_SIZE * SHOT;
      drawWispBetween(ctx, c.shotPath, ms, now, size, 1, c.fire, c.hit);
    }

    // the freed cats streaking off into the floors' screen
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      const end = cat.release + catMs;
      if (ms < cat.release || ms > end + ARRIVE_MS) continue;
      cat.path(Math.min(ms, end));
      if (cat.s > 0)
        drawWispBetween(
          ctx,
          cat.path,
          ms,
          now,
          CAT * cat.s,
          1,
          cat.release,
          end,
        );
      const since = ms - end;
      if (since > 0 && sightInto(fps, target.x, target.y, target.z, a) > 0)
        drawWhiteBurst(ctx, a.x, a.y, since / ARRIVE_MS, 0.25);
    }

    // cat ears on every cat-wisp, trapped or flying, one path
    ctx.beginPath();
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      if (cat.z > cz + REACH) continue;
      const p =
        ms < cat.release
          ? cat.trappedPath(ms)
          : ms < cat.release + catMs
            ? cat.path(ms)
            : null;
      if (p) addEars(ctx, p.x, p.y, CAT * cat.s * 0.6);
    }
    ctx.fillStyle = COLOR.heavenlyGold;
    ctx.fill();

    // the blasts
    for (let i = 0; i < blasts.length; i++) {
      const bl = blasts[i];
      const since = ms - bl.ms;
      if (since < 0 || since >= BLAST_MS) continue;
      const s = sightInto(fps, bl.x, bl.y, bl.z, a);
      if (s === 0) continue;
      drawDetonation(ctx, a, since, bl.size * s, now);
      if (since < ARRIVE_MS)
        drawWhiteBurst(ctx, a.x, a.y, since / ARRIVE_MS, bl.size);
    }

    // each hire's tally over its cage, the big cage's counting up
    for (let i = 0; i < firstBigCat; i++) {
      const cat = cats[i];
      const since = ms - cat.release;
      if (!cat.hired || since < 0 || since >= LABEL_MS) continue;
      const c = cat.cage;
      const rise = c.y + c.half + 0.2 + 0.3 * (since / LABEL_MS);
      if (sightInto(fps, c.x, rise, c.z, a) === 0) continue;
      const t = since / LABEL_MS;
      ctx.globalAlpha = 1 - smoothstep(clamp01((t - 0.6) / 0.4));
      drawPoppingCritText(
        ctx,
        BIG_LABELS[1],
        a.x,
        a.y,
        COLOR.heavenlyGold,
        now - since,
        now,
        LABEL_STYLE,
      );
      ctx.globalAlpha = 1;
    }
    let count = 0;
    let lastAt = 0;
    for (let i = firstBigCat; i < cats.length; i++)
      if (cats[i].hired && ms >= cats[i].release) {
        count++;
        lastAt = cats[i].release;
      }
    if (count > 0 && ms - finalMs < LABEL_MS * 2) {
      const since = ms - lastAt;
      const s = sightInto(fps, 0, CABLE_Y + 0.15, big.z, a);
      if (s > 0) {
        ctx.globalAlpha =
          1 - smoothstep(clamp01((ms - finalMs) / (LABEL_MS * 2)));
        drawPoppingCritText(
          ctx,
          BIG_LABELS[Math.min(count, BIG_LABELS.length - 1)],
          a.x,
          a.y,
          COLOR.heavenlyGold,
          now - since,
          now,
          BIG_LABEL_STYLE,
        );
        ctx.globalAlpha = 1;
      }
    }

    // the last blast's white flash over the whole view
    const flash = ms - finalMs;
    if (flash >= 0 && flash < FINAL_FLASH_MS) {
      ctx.globalAlpha = 0.8 * (1 - flash / FINAL_FLASH_MS) ** 2;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(view.x, view.y, view.w, view.h);
      ctx.globalAlpha = 1;
    }

    // the floors' screen dropping away in columns, middle first
    if (ms < splitMs) {
      const cw = view.w / COLS;
      const run = splitMs - COL_STAGGER * Math.ceil(COLS / 2);
      for (let i = 0; i < COLS; i++) {
        const order = Math.floor(Math.abs(i - (COLS - 1) / 2));
        const u = clamp01((ms - order * COL_STAGGER) / run);
        const x = view.x + i * cw;
        drawScreenPart(
          ctx,
          floors,
          x,
          view.y,
          cw,
          view.h,
          x,
          view.y + view.h * COL_DROP * u * u,
          cw,
          view.h,
        );
      }
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs: 0,
    enter: { ms: enterMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, enterMs + ms, now, floors),
    onEnd: () => {
      hired.forEach((hire, k) =>
        setTimeout(() => {
          if (hire.workerIndex !== null)
            celebrateWorkerBoost(hire.floor, hire.workerIndex, Date.now());
        }, k * hireGapMs),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(SPLIT_SHAKE);
  });
  for (let i = 0; i < cages.length; i++) {
    const c = cages[i];
    beat(c.lock - enterMs, () => {
      playSpinTick(1 + 0.1 * i);
      shakeScreen(LOCK_SHAKE);
    });
    beat(c.fire - enterMs, () => shakeScreen(SHOT_SHAKE));
  }
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const k = i - firstBigCat;
    beat(cat.release - enterMs, () => {
      hireCat(cat);
      if (k === bigCats - 1) {
        playSlamExplosion();
        playCritExplosion();
        shakeScreen(FINAL_SHAKE);
      } else {
        playExplosion();
        shakeScreen(k >= 0 ? CHAIN_SHAKE : HIT_SHAKE);
      }
      playSimonNote(k >= 0 ? k : i);
    });
  }
  beat(0, playSwoosh);
}
