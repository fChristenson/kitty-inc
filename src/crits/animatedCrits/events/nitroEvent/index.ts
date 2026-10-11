// the "Nitro" event (road race; crit tiers), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/race's street and
// racer wisp in shared/fps's world: its crit's click zooms the floors away into a
// street race already flat out, a run of gold boost pads down the street.
// The ship hits them one after another, each a surge: the view punching
// wide, speed lines tearing past, its flames roaring; through a tunnel under
// a building, its lights streaking past, and out; the last pad cracks a
// sonic boom. It shoots through the finish gate's window in a chain of
// blasts, the view rushes through onto the floors and every bar in view goes
// a crit tier up
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import {
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsSky,
  drawFpsWall,
  fillFpsQuad,
  fpsSight,
  type Fps,
  type FpsCorner,
  type FpsScreen,
} from "../../../../shared/fps";
import {
  createRaceWisp,
  drawFinishGate,
  drawRoadStreet,
  ROAD_STREET,
} from "../../../../shared/race";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardBars } from "../../eventRewards";
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

const KEY = "nitro";

// the view: its lens (narrowing by up to SURGE_WIDE in a surge), how far
// behind the ship and how high it rides, how far it leans after the ship
const FOCAL = 1.2;
const HORIZON = 0.42;
const SURGE_WIDE = 0.22;
const BEHIND = 1.5;
const EYE = 0.625;
const FOLLOW = 0.5;
// the finish gate at the road's end and its window, as wide as the road
const GATE_Z = 40;
const OPEN_W = ROAD_STREET.half * 2;
// the race: its speed at the start and how much it picks up by the end, how
// much a surge adds and how fast it fades; the share of it spent turning to
// the gate's window and how far the ship pulls ahead into it
const SPEED = 0.6;
const PICK_UP = 0.8;
const SURGE_SPEED = 1.6;
const SURGE_MS = 320;
const SURGE_MAX = 1.4;
const STEP_MS = 8;
const LAND_FROM = 0.86;
const PULL_AHEAD = 0.8;
// the pads, each hit at its share of the race, and their size
const PADS = [0.15, 0.29, 0.42, 0.55, 0.67];
const PAD_HALF = 0.3;
const PAD_LONG = 0.9;
const CHEVRONS = 3;
const CHEVRON_FROM = 0.1;
const CHEVRON_EVERY = 0.25;
const PAD_GLOW_MS = 300;
const PAD_GLOW = 0.5;
// the tunnel under a building spanning the road, from TUNNEL_FROM past the
// third pad to TUNNEL_TO past the fourth: its roof, lights and the building
const TUNNEL_FROM = 3;
const TUNNEL_TO = 2.5;
const TUNNEL_HIGH = 1.4;
const TUNNEL_TRIM = 0.1;
const BUILDING_HIGH = 2.6;
const LIGHT_EVERY = 0.8;
const LIGHT_LONG = 0.3;
const LIGHT_HALF = 0.35;
// the racer: weave, hover, bob, its wisp swelling in a surge
const WEAVE = 0.3;
const WEAVE_RATE = 0.0019;
const HOVER = 0.18;
const BOB = 0.012;
const BOB_RATE = 0.012;
const RACER = 0.07;
const RACER_SURGE = 0.4;
// speed lines tearing out from the horizon in a surge (of the view's width)
const LINES = 22;
const LINE_FROM = 0.24;
const LINE_REACH = 0.72;
const LINE_LONG = 0.21;
const LINE_SPEED = 0.002;
const LINE_SQUASH = 1.3;
const LINE_WIDTH = 10;
const LINE_ALPHA = 0.7;
// the sonic boom off the last pad: a ring bursting out and a flash
const BOOM_MS = 450;
const BOOM_RING = 60;
const BOOM_FLASH = 0.5;
const BOOM_SQUASH = 0.7;
// the finish: blasts round the gate's window as the ship gets FINISH_FROM
// short of it, a huge one in the middle
const FINISH_FROM = 1.5;
const FINISH_SPOTS: [number, number][] = [
  [-0.7, 0.2],
  [0.7, 0.5],
  [-0.4, 0.7],
  [0.5, 0.15],
];
const FINISH_GAP = 45;
const FINISH_BLAST = 0.35;
const FINISH_BIG = 0.7;
const ZOOM = 1.2;
const START_SHAKE = 1.2;
const PAD_SHAKE = 1.4;
const BOOM_SHAKE = 2.6;
const FINISH_SHAKE = 1.2;
const FINISH_BIG_SHAKE = 3;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.nitroEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.applyTierCrit !== undefined,
    arm: startNitro,
  },
  { label: "Nitro", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Nitro
export function forceNitroEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the window's height, so it has the screen's shape and fills it on landing
const openHigh = (view: FpsScreen) => (OPEN_W * view.h) / view.w;

// a chevron pointing down the road at (x, z)
const chevron = (x: number, z: number): FpsCorner[] => [
  [x - 0.22, 0.01, z],
  [x, 0.01, z + 0.2],
  [x + 0.22, 0.01, z],
  [x + 0.22, 0.01, z + 0.09],
  [x, 0.01, z + 0.29],
  [x - 0.22, 0.01, z + 0.09],
];

function startNitro(floor: Floor, context: EventProcContext): void {
  const { enterMs, flyMs, tierGapMs } = CONFIG.nitroEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the race's clock runs from the click, through the way in, to the crash
  const raceMs = enterMs + flyMs + CONFIG.flightStage.arriveMs;
  const landZ = GATE_Z - FOCAL * OPEN_W;
  const u = (ms: number) => clamp01(ms / raceMs);
  const padMs = PADS.map((share) => share * raceMs);
  const surgeAt = (ms: number) => {
    let s = 0;
    for (const p of padMs) if (ms >= p) s += Math.exp(-(ms - p) / SURGE_MS);
    return Math.min(SURGE_MAX, s);
  };
  // the view's run: faster and faster, every pad a surge, ending on landZ
  const run: number[] = [];
  let z = 0;
  for (let ms = 0; ms <= raceMs + STEP_MS; ms += STEP_MS) {
    run.push(z);
    z += (SPEED + PICK_UP * u(ms) + SURGE_SPEED * surgeAt(ms)) * STEP_MS;
  }
  const scale = landZ / run[Math.round(raceMs / STEP_MS)];
  const camZ = (ms: number) =>
    run[Math.max(0, Math.min(run.length - 1, Math.round(ms / STEP_MS)))] *
    scale;
  const landing = (ms: number) =>
    smoothstep(clamp01((u(ms) - LAND_FROM) / (1 - LAND_FROM)));
  const shipZ = (ms: number) =>
    camZ(ms) + BEHIND + PULL_AHEAD * landing(ms) ** 2;
  const shipX = (ms: number) =>
    WEAVE * Math.sin(ms * WEAVE_RATE) * (1 - landing(ms));
  const pads = padMs.map((ms) => ({ ms, x: shipX(ms), z: shipZ(ms) }));
  const racer = createRaceWisp((ms) => ({
    x: shipX(ms),
    y: HOVER + Math.sin(ms * BOB_RATE) * BOB,
    z: shipZ(ms),
  }));
  const tunnel: [number, number] = [
    pads[2].z + TUNNEL_FROM,
    pads[3].z + TUNNEL_TO,
  ];
  const boomMs = padMs[padMs.length - 1];
  let gateMs = raceMs;
  for (let ms = 0; ms < raceMs; ms += STEP_MS)
    if (shipZ(ms) >= GATE_Z - FINISH_FROM) {
      gateMs = ms;
      break;
    }
  const finish = FINISH_SPOTS.map((spot, k) => ({
    spot,
    ms: gateMs + k * FINISH_GAP,
  }));
  const bigMs = gateMs + FINISH_SPOTS.length * FINISH_GAP;
  const wall = ROAD_STREET.half + ROAD_STREET.kerb + ROAD_STREET.pavement;
  const outer = wall + ROAD_STREET.depth;

  // the tunnel's inside from `from` on, and the building over its mouth
  const drawTunnel = (fps: Fps, ctx: CanvasRenderingContext2D) => {
    const [t0, t1] = tunnel;
    const from = Math.max(t0, fps.cam.z);
    for (const side of [-1, 1])
      drawFpsWall(
        ctx,
        fps,
        side * wall,
        0,
        TUNNEL_HIGH,
        from,
        t1,
        COLOR.cauldronIronDark,
      );
    drawFpsFlat(ctx, fps, TUNNEL_HIGH, -wall, wall, from, t1, COLOR.black);
    for (let lz = t0 + LIGHT_LONG; lz < t1; lz += LIGHT_EVERY)
      drawFpsFlat(
        ctx,
        fps,
        TUNNEL_HIGH - 0.01,
        -LIGHT_HALF,
        LIGHT_HALF,
        lz,
        lz + LIGHT_LONG,
        COLOR.white,
      );
    if (t0 <= fps.cam.z) return;
    drawFpsFace(
      ctx,
      fps,
      t0,
      -outer,
      -wall,
      0,
      BUILDING_HIGH,
      COLOR.wallShadow,
    );
    drawFpsFace(ctx, fps, t0, wall, outer, 0, BUILDING_HIGH, COLOR.wallShadow);
    drawFpsFace(
      ctx,
      fps,
      t0,
      -wall,
      wall,
      TUNNEL_HIGH,
      BUILDING_HIGH,
      COLOR.wallShadow,
    );
    drawFpsFace(
      ctx,
      fps,
      t0,
      -wall,
      wall,
      TUNNEL_HIGH,
      TUNNEL_HIGH + TUNNEL_TRIM,
      COLOR.heavenlyGold,
    );
  };

  // the race at ms on its clock
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FpsScreen,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const land = landing(ms);
    const surge = surgeAt(ms);
    const wide = Math.min(1, surge) * (1 - land);
    const x = shipX(ms);
    const sz = shipZ(ms);
    const fps: Fps = {
      view,
      lens: { focal: FOCAL * (1 - SURGE_WIDE * wide), horizon: HORIZON },
      cam: {
        x: x * FOLLOW * (1 - land),
        y: lerp([EYE, openHigh(view) / 2], land),
        z: camZ(ms),
        tip: 0,
      },
    };
    drawFpsSky(ctx, fps, COLOR.revealSky);
    drawFpsGround(ctx, fps, COLOR.shareholdersGreen);
    drawFinishGate(ctx, fps, GATE_Z, OPEN_W, openHigh(view), (a, b) =>
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
      ),
    );
    // the street past the tunnel's mouth, the tunnel, then the street this
    // side of it, so the building over the mouth stays in depth
    const mouthAhead = tunnel[0] > fps.cam.z;
    drawRoadStreet(
      ctx,
      fps,
      ROAD_STREET,
      GATE_Z,
      mouthAhead ? tunnel[0] : -Infinity,
    );
    if (tunnel[1] > fps.cam.z) drawTunnel(fps, ctx);
    if (mouthAhead) drawRoadStreet(ctx, fps, ROAD_STREET, tunnel[0]);
    // the pads, a glow off each as the ship hits it
    for (const p of pads) {
      if (p.z + PAD_LONG < fps.cam.z) continue;
      drawFpsFlat(
        ctx,
        fps,
        0.005,
        p.x - PAD_HALF,
        p.x + PAD_HALF,
        p.z,
        p.z + PAD_LONG,
        COLOR.heavenlyGold,
      );
      for (let c = 0; c < CHEVRONS; c++)
        fillFpsQuad(
          ctx,
          fps,
          chevron(p.x, p.z + CHEVRON_FROM + c * CHEVRON_EVERY),
          COLOR.white,
        );
      const since = ms - p.ms;
      const at =
        since >= 0 && since < PAD_GLOW_MS && fpsSight(fps, p.x, 0.05, p.z);
      if (!at) continue;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      stampGlimmer(
        ctx,
        at.x,
        at.y,
        PAD_GLOW * at.s * (1 - since / PAD_GLOW_MS),
        now * 0.01,
        COLOR.white,
      );
      ctx.restore();
    }
    if (sz < GATE_Z) {
      const boost = Math.min(1, surge);
      racer(ctx, fps, ms, now, RACER * (1 + RACER_SURGE * boost), 0.5 + boost);
    }
    // speed lines tearing out from the horizon in a surge
    if (wide > 0.05) {
      const hx = view.cx;
      const hy = view.y + view.h * HORIZON;
      for (let i = 0; i < LINES; i++) {
        const a = hash01(i, 8101) * Math.PI * 2;
        const r =
          view.w *
          (LINE_FROM + ((now * LINE_SPEED + hash01(i, 8102)) % 1) * LINE_REACH);
        const r2 = r + view.w * LINE_LONG;
        drawBeam(
          ctx,
          { x: hx + Math.cos(a) * r, y: hy + Math.sin(a) * r * LINE_SQUASH },
          { x: hx + Math.cos(a) * r2, y: hy + Math.sin(a) * r2 * LINE_SQUASH },
          LINE_WIDTH,
          LINE_ALPHA * wide,
        );
      }
    }
    // the sonic boom
    const since = ms - boomMs;
    if (since >= 0 && since < BOOM_MS) {
      const b = since / BOOM_MS;
      const cy = view.y + view.h * 0.45;
      ctx.save();
      ctx.strokeStyle = COLOR.white;
      ctx.globalAlpha = 0.9 * (1 - b);
      ctx.lineWidth = BOOM_RING * (1 - b) + 6;
      ctx.beginPath();
      ctx.ellipse(
        view.cx,
        cy,
        view.w * (0.08 + b),
        view.w * (0.08 + b) * BOOM_SQUASH,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.globalAlpha = BOOM_FLASH * (1 - b) ** 2;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(view.x, view.y, view.w, view.h);
      ctx.restore();
    }
    // the finish's blasts round the window
    const high = openHigh(view);
    for (const f of finish) {
      const p = fpsSight(
        fps,
        (f.spot[0] * OPEN_W) / 2,
        f.spot[1] * high,
        GATE_Z,
      );
      if (p) drawDetonation(ctx, p, ms - f.ms, FINISH_BLAST * p.s, now);
    }
    const middle = fpsSight(fps, 0, high / 2, GATE_Z);
    if (middle)
      drawDetonation(ctx, middle, ms - bigMs, FINISH_BIG * middle.s, now);
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        drawScene(ctx, view, ms, now, floors);
        // the floors zooming past the view and fading into the race
        const p = smoothstep(clamp01(ms / enterMs));
        const k = 1 + ZOOM * p;
        ctx.globalAlpha = 1 - p;
        drawScreenPart(
          ctx,
          floors,
          view.x,
          view.y,
          view.w,
          view.h,
          view.x + (view.w * (1 - k)) / 2,
          view.y + (view.h * (1 - k)) / 2,
          view.w * k,
          view.h * k,
        );
        ctx.globalAlpha = 1;
      },
    },
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
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(START_SHAKE);
  });
  for (const ms of padMs)
    beat(ms - enterMs, () => {
      playSwoosh();
      shakeScreen(ms === boomMs ? BOOM_SHAKE : PAD_SHAKE);
      if (ms === boomMs) playExplosion();
    });
  for (const f of finish)
    beat(f.ms - enterMs, () => {
      playExplosion();
      shakeScreen(FINISH_SHAKE);
    });
  beat(bigMs - enterMs, () => {
    playCritExplosion();
    shakeScreen(FINISH_BIG_SHAKE);
  });
}
