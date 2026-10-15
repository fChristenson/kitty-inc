// the "Canyon Run" event (shmup; perma tiers), a flight-stage event (see
// ../../flightStage) with its own way in, on the Shmup look
// (shared/animationStyles/shmup): its crit's click zooms the floors away and
// the wisp streaks up a narrow canyon at full speed, rock walls rushing past
// either side as it weaves along the bends. Gun pods mounted on the walls
// blink faster and faster as they charge, and the wisp's side shots light
// each one, then blow it off the wall in a flash, a crack and a jolt that
// promotes workers in view a perma tier, tallied on the wall; the pods come
// faster as the canyon narrows. Then a glowing barrier gate slams shut across
// the canyon and the run brakes hard before it; every shot spreads its
// glowing cracks as it throbs faster and faster while the wisp charges,
// trembling, light pulled in; one last volley from an arc of muzzles bursts
// it in one big blast and a chain along it (the last perma tiers), and the
// wisp punches through the gap off the top as the floors rush back up, where
// the promoted workers celebrate
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSimonNote, playSpinTick, playSwoosh } from "../../../../sound";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Box,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { shotHeat, type ShipShot } from "../../../../shared/animationStyles/shmup";
import { createBeats, type Beats } from "../../../../shared/eventBeats";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutCubic,
  smoothstep,
} from "../../../../shared/easing";
import {
  playCritExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawScreenPart } from "../../../../shared/screenCopy";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { CRIT_TIER_ORDER, pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  celebrateWorkerBoost,
  getWorkerPermaTier,
  promoteWorkerPermaTier,
} from "../../../../floors/worker";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";
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

const KEY = "canyonRun";

// the wisp: its height down the view, its size, its swell and tremble (of
// the view's width) while charging, how long the charge takes, its kick back
// (of the view's height)
const SHIP_Y = 0.78;
const RACER = WISP_SIZE * 1.6;
const CHARGE_SWELL = 0.45;
const TREMBLE = 0.012;
const CHARGE_MS = 350;
const RECOIL = 0.05;
const RECOIL_MS = 300;
// the run's speed (view heights a ms), and how long it takes to get back up
// to it once the gate bursts
const SPEED = 0.0017;
const LAUNCH_MS = 220;
// the canyon (distances along it in view heights, across it of the view's
// width): its half width from the start to the gate, its bends' rates and
// the room they keep off the screen's edges, how far before the gate the
// bends straighten out, the crags along its edges
const HALF: [number, number] = [0.34, 0.2];
const BEND_F: [number, number] = [2.4, 5.7];
const BEND_ROOM = 0.1;
const STRAIGHT_FROM = 1.4;
const STRAIGHT_OVER = 1;
const CRAG = 0.02;
const CRAG_F: [number, number] = [19, 43];
// the walls, built once in strips CHUNK long sampled every STEP: from where,
// how far past the screen's edges (px), the shadow they cast on the floor
// and their lit lip (of the width), lines (px), strata lines a strip a side
const FROM_U = -1.5;
const CHUNK = 1;
const STEP = 0.025;
const PAD = 30;
const SHADOW = 0.035;
const LIP = 0.012;
const RIM = 3;
const EDGE = 4;
const STRATA = 6;
const STRATA_LINE = 3;
// dust streaking down the floor: how many, how fast against the walls, how
// long against the run's speed (ms of travel)
const DUST = 34;
const DUST_PARALLAX = 0.7;
const DUST_MS = 40;
// the gate's height down the view once it seals the canyon
const GATE_Y = 0.22;
// the pods: their height down the view when blown off, plate radius, how
// far sunk into the wall, barrel (of the width), how long they blink and
// charge before, the blink's rate rising, the lamp and its glow, how far
// and how long a pod is tossed off the wall, its scorch lines
const KILL_Y = 0.4;
const POD_R = 0.032;
const POD_SINK = 0.008;
const BARREL_L = 0.05;
const BARREL_W = 0.016;
const POD_WARN = 260;
const BLINK_HZ: [number, number] = [4, 18];
const LAMP = 0.012;
const LAMP_GLOW = 0.09;
const TOSS = 0.14;
const TOSS_MS = 220;
const SCORCH = 6;
const SCORCH_R = 0.06;
// the guns: shot speed (of the width a ms), size, the twin muzzles' gap and
// nose (of the width), the lighting shot's lead on a pod's blow, how long a
// hit glows, the straight-up stream's gap
const SHOT_SPEED = 0.0035;
const SHOT_SIZE = WISP_SIZE * 0.3;
const TWIN = 0.02;
const NOSE = 0.05;
const LIGHT_LEAD = 90;
const HEAT_MS = 100;
const STREAM_EVERY = 80;
// the gate: its bar's thickness and posts (of the width), how long it takes
// to seal, hits every ms, cracks and their segments, its throb quickening
// over the hits and swelling the bar
const GATE_H = 0.045;
const POST_R = 0.035;
const SEAL_MS = 220;
const GATE_HIT_EVERY = 50;
const CRACKS = 9;
const CRACK_SEGS = 4;
const THROB_HZ: [number, number] = [2, 12];
const THROB = 0.5;
const GATE_GLOWS = 3;
const GATE_GLOW = 0.22;
// the last volley: muzzles on an arc over the wisp (of the width), how wide
// (rad), their speed and size, the muzzle flashes
const VOLLEY = 13;
const VOLLEY_ARC = 0.16;
const VOLLEY_WIDE = 1.7;
const VOLLEY_SPEED = 0.008;
const VOLLEY_SIZE = WISP_SIZE * 0.6;
const MUZZLE_MS = 200;
const MUZZLE = 0.1;
// light pulled into the wisp while charging, and the rumble's ticks
const SPECKS = 22;
const SPECK_MS = 240;
const SPECK_REACH = 0.32;
const SPECK_SIZE = 16;
const CHARGE_TICKS = [-300, -200, -120, -55, 0];
// blasts (of the width): a pod's, the finale's and its chain along the bar
const POD_BLAST = 0.3;
const FINALE_BLAST = 1.15;
const CHAIN = 6;
const CHAIN_EVERY = 55;
const CHAIN_BLAST = 0.38;
// white flashes over the view: a pod's, the volley's, the finale's
const FLASH_MS = 260;
const POD_FLASH = 0.14;
const VOLLEY_FLASH = 0.4;
const FINALE_FLASH = 0.85;
const POD_BURST_MS = 380;
// the gate's shards bursting out, then rushing down past the view
const SHARDS = 60;
const SHARD_OUT_MS = 200;
const SHARD_OUT: [number, number] = [0.12, 0.42];
const SHARD_MS = 900;
const SHARD_SIZE = 18;
// a tally: how far above, how long, how far it rises
const LABEL_UP = 0.04;
const LABEL_MS = 650;
const LABEL_RISE = 0.05;
const LABEL_STYLE = { fontSize: 40, strokeWidth: 6 };
const LAMP_GLOW_STOPS = fadeStops(COLOR.red);
const GATE_GLOW_STOPS = fadeStops(COLOR.cyan);

// a pod (or, last, the gate) and its share of the workers
interface Slot {
  ms: number;
  // where along the canyon, and across it (of the width), and which wall
  u: number;
  x: number;
  side: number;
  workers: RewardWorker[];
  label: string | null;
  paid: boolean;
}

interface Blast {
  u: number;
  x: number;
  ms: number;
  size: number;
  shake: number;
  // 0 silent, 1 a bang, 2 the finale
  sound: number;
}

// a strip of both walls, in px across and -u * the view's height down
interface Strip {
  u0: number;
  u1: number;
  body: Path2D;
  shadow: Path2D;
  lip: Path2D;
  edge: Path2D;
  strata: Path2D;
}

interface Plan {
  strips: Strip[];
  podX: number[];
  heat: number[];
  shots: ShipShot[];
  shotBullets: Bullet[];
  gateHits: number[];
  gateL: number;
  gateR: number;
  cracks: Float32Array;
  volley: Bullet[];
  muzzles: Point[];
  muzzleAims: number[];
  blasts: Blast[];
  finale: Blast;
  shipPath: (ms: number) => Point;
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      findRewardWorkers(floor, context).length > 0,
    arm: startCanyonRun,
  },
  { label: meta.label, color: COLOR.cyan },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Canyon Run
export function forceCanyonRunEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startCanyonRun(floor: Floor, context: EventProcContext): void {
  const {
    enterMs,
    flyMs,
    pods,
    podFromMs,
    podGapMs,
    brakeAtMs,
    brakeMs,
    gateHitFromMs,
    fireAtMs,
    leaveAtMs,
    maxTiersPerWorker,
    promoteGapMs,
  } = meta.values;
  const tier = context.critTier ?? pickCritTierByOdds();

  // how far up the canyon the wisp is at ms: full speed, braking hard to a
  // stop before the gate, then punching back up to speed once it bursts
  const braked = SPEED * brakeAtMs;
  const held = braked + (SPEED * brakeMs) / 2;
  let launchAt = Infinity;
  const distAt = (ms: number): number => {
    if (ms < brakeAtMs) return SPEED * ms;
    if (ms < brakeAtMs + brakeMs) {
      const t = (ms - brakeAtMs) / brakeMs;
      return braked + ((SPEED * brakeMs) / 2) * (1 - (1 - t) * (1 - t));
    }
    if (ms < launchAt) return held;
    const t = ms - launchAt;
    if (t < LAUNCH_MS) return held + (SPEED * t * t) / (2 * LAUNCH_MS);
    return held + SPEED * (t - LAUNCH_MS / 2);
  };
  const speedAt = (ms: number): number => {
    if (ms < brakeAtMs) return SPEED;
    if (ms < brakeAtMs + brakeMs)
      return SPEED * (1 - (ms - brakeAtMs) / brakeMs);
    if (ms < launchAt) return 0;
    return SPEED * Math.min(1, (ms - launchAt) / LAUNCH_MS);
  };
  const gateU = held + SHIP_Y - GATE_Y;

  // the canyon's half width and middle at u, and its wall's edge on side
  const halfAt = (u: number) =>
    HALF[0] + (HALF[1] - HALF[0]) * smoothstep(clamp01(u / gateU));
  const midAt = (u: number) => {
    const straight = smoothstep(
      clamp01((u - gateU + STRAIGHT_FROM) / STRAIGHT_OVER),
    );
    const room = (0.5 - halfAt(u) - BEND_ROOM) * (1 - straight);
    return (
      0.5 +
      room *
        (0.75 * Math.sin(u * BEND_F[0]) + 0.25 * Math.sin(u * BEND_F[1] + 1))
    );
  };
  const edgeAt = (side: number, u: number) =>
    midAt(u) +
    side *
      (halfAt(u) +
        CRAG *
          (0.6 * Math.sin(u * CRAG_F[0] + side * 2) +
            0.4 * Math.sin(u * CRAG_F[1] + side)));

  // the pods, faster and faster, alternating walls, each where it's blown
  // off KILL_Y down the view; then the gate; the workers in view shared out
  // over them, each up to maxTiersPerWorker times
  const slots: Slot[] = [];
  let killAt = podFromMs;
  for (let i = 0; i < pods; i++) {
    const side = i % 2 ? 1 : -1;
    const u = distAt(killAt) + SHIP_Y - KILL_Y;
    slots.push({
      ms: killAt,
      u,
      x: edgeAt(side, u) - side * 0.1,
      side,
      workers: [],
      label: null,
      paid: false,
    });
    killAt +=
      podGapMs[0] + ((podGapMs[1] - podGapMs[0]) * i) / Math.max(1, pods - 2);
  }
  const gateSlot: Slot = {
    ms: fireAtMs,
    u: gateU,
    x: 0.5,
    side: 0,
    workers: [],
    label: null,
    paid: false,
  };
  slots.push(gateSlot);
  const workers = findRewardWorkers(floor, context);
  const n = slots.length;
  const total = Math.min(
    Math.max(workers.length, n),
    workers.length * maxTiersPerWorker,
  );
  for (let i = 0; i < total; i++)
    slots[Math.floor((i * n) / total)].workers.push(
      workers[i % workers.length],
    );

  // a slot's perma tiers, each worker one up while it can climb
  const pay = (slot: Slot, i: number) => {
    if (slot.paid) return;
    slot.paid = true;
    let given = 0;
    for (const w of slot.workers) {
      const { floor: f, workerIndex: wi } = w.worker;
      if (getWorkerPermaTier(f, wi) === CRIT_TIER_ORDER[0]) continue;
      promoteWorkerPermaTier(f, wi);
      given++;
    }
    slot.label = given > 0 ? `+${given} Perma` : null;
    if (given > 0) playSimonNote(i);
  };

  // each pod blown off: a crack and a jolt, and its perma tiers
  const podBeats = createBeats(
    slots.slice(0, pods),
    (s) => s.ms,
    (s, i) => {
      pay(s, i);
      playExplosion();
      shakeScreen(1 + (0.6 * i) / pods);
    },
  );
  // the gate slamming shut ahead as the run brakes
  const gateBeats = createBeats(
    [brakeAtMs, brakeAtMs + SEAL_MS],
    (t) => t,
    (_, i) => {
      if (i === 0) playSwoosh();
      else {
        playSlamExplosion();
        shakeScreen(1.8);
      }
    },
  );
  // the charge's rumble rising, then the volley
  const chargeBeats = createBeats(
    CHARGE_TICKS,
    (offset) => fireAtMs + offset,
    (_, i) => {
      if (i === CHARGE_TICKS.length - 1) {
        playCritExplosion();
        shakeScreen(2.2);
      } else {
        playSpinTick(1.2 + 0.25 * i);
        shakeScreen(0.6 + 0.25 * i);
      }
    },
  );

  // the charge 0..1 as the volley nears, fading fast once it's fired
  const chargeAt = (ms: number) =>
    ms < fireAtMs
      ? clamp01((ms - (fireAtMs - CHARGE_MS)) / CHARGE_MS)
      : Math.max(0, 1 - (ms - fireAtMs) / 150);

  // the wisp's own height down the view at ms (negative on the way in)
  const shipY = (ms: number): number => {
    if (ms < 0)
      return (
        1.25 + (SHIP_Y - 1.25) * easeOutCubic(clamp01((ms + enterMs) / enterMs))
      );
    const u = clamp01((ms - fireAtMs) / RECOIL_MS);
    return (
      SHIP_Y +
      (u > 0 && u < 1 ? RECOIL * Math.sin(Math.PI * u) * (1 - u) : 0) -
      (SHIP_Y + 0.35) * easeIn(clamp01((ms - leaveAtMs) / (flyMs - leaveAtMs)))
    );
  };
  // the wisp's middle at ms, riding the canyon's middle
  const shipAt = (view: FlightView, ms: number, into: Point): Point => {
    const shake = TREMBLE * view.w * chargeAt(ms);
    const weave = smoothstep(clamp01((ms + enterMs) / enterMs));
    into.x =
      view.cx +
      (view.x + view.w * midAt(distAt(ms)) - view.cx) * weave +
      shake * Math.sin(ms * 0.11);
    into.y = view.y + view.h * shipY(ms) + shake * Math.cos(ms * 0.13);
    return into;
  };
  // where u is down the view at ms
  const screenY = (view: FlightView, u: number, ms: number) =>
    view.y + view.h * (SHIP_Y - (u - distAt(ms)));

  // both walls from u0 to u1, rock out past the screen's edges
  const buildStrip = (view: FlightView, u0: number, u1: number): Strip => {
    const { x, w, h } = view;
    const body = new Path2D();
    const shadow = new Path2D();
    const lip = new Path2D();
    const edge = new Path2D();
    const strata = new Path2D();
    const from = u0 - STEP;
    const steps = Math.ceil((u1 - u0) / STEP) + 2;
    for (let side = -1; side <= 1; side += 2) {
      const outer = side < 0 ? x - PAD : x + w + PAD;
      body.moveTo(outer, -from * h);
      for (let s = 0; s <= steps; s++) {
        const u = from + s * STEP;
        const ex = x + w * edgeAt(side, u);
        body.lineTo(ex, -u * h);
        if (s === 0) {
          edge.moveTo(ex, -u * h);
          lip.moveTo(ex + side * LIP * w, -u * h);
          shadow.moveTo(ex, -u * h);
        } else {
          edge.lineTo(ex, -u * h);
          lip.lineTo(ex + side * LIP * w, -u * h);
          shadow.lineTo(ex, -u * h);
        }
      }
      body.lineTo(outer, -(from + steps * STEP) * h);
      body.closePath();
      for (let s = steps; s >= 0; s--) {
        const u = from + s * STEP;
        shadow.lineTo(x + w * (edgeAt(side, u) - side * SHADOW), -u * h);
      }
      shadow.closePath();
      for (let j = 0; j < STRATA; j++) {
        const seed = Math.round(u0 * 10) * 31 + j * 2 + side;
        const u = u0 + (u1 - u0) * hash01(seed, 1);
        const sx = x + w * (edgeAt(side, u) + side * (0.05 + 0.2 * hash01(seed, 2)));
        strata.moveTo(sx, -u * h);
        strata.lineTo(sx + side * 0.05 * w, -(u + 0.025) * h);
      }
    }
    return { u0, u1, body, shadow, lip, edge, strata };
  };

  // the gate's cracks in px from its middle: CRACKS runs of CRACK_SEGS + 1
  // points zigzagging across its bar
  const buildCracks = (half: number, bar: number): Float32Array => {
    const cracks = new Float32Array(CRACKS * (CRACK_SEGS + 1) * 2);
    for (let c = 0; c < CRACKS; c++) {
      let cx = half * 0.9 * (((c + 0.5 + 0.4 * (hash01(c, 81) - 0.5)) / CRACKS) * 2 - 1);
      const down = c % 2 ? 1 : -1;
      for (let s = 0; s <= CRACK_SEGS; s++) {
        const i = (c * (CRACK_SEGS + 1) + s) * 2;
        cracks[i] = cx;
        cracks[i + 1] = down * bar * (0.8 - (1.6 * s) / CRACK_SEGS);
        cx += (hash01(c, s + 82) - 0.5) * half * 0.16;
      }
    }
    return cracks;
  };

  // the walls, every shot and blast, planned once the view's known
  const plan = (view: FlightView): Plan => {
    const { w, h } = view;
    const box: Box = {
      left: view.x - 30,
      right: view.x + w + 30,
      top: view.y - 30,
      bottom: view.y + h + 30,
    };
    const speed = SHOT_SPEED * w;
    const nose: Point = { x: 0, y: 0 };

    const podX: number[] = [];
    for (let i = 0; i < pods; i++) {
      const s = slots[i];
      podX.push(view.x + w * (edgeAt(s.side, s.u) + s.side * POD_SINK));
    }
    const gateL = view.x + w * edgeAt(-1, gateU);
    const gateR = view.x + w * edgeAt(1, gateU);
    const gateMid = (gateL + gateR) / 2;
    gateSlot.x = (gateMid - view.x) / w;

    // the wisp's side shots: one to light each pod, one to blow it off,
    // timed back from when they land on it
    const shots: ShipShot[] = [];
    const shotBullets: Bullet[] = [];
    const shootAt = (aim: Point, hitMs: number, side: number, target: number) => {
      let fireAt = hitMs - 150;
      let from: Point = { x: 0, y: 0 };
      for (let k = 0; k < 3; k++) {
        shipAt(view, fireAt, nose);
        from = { x: nose.x + side * TWIN * w, y: nose.y - NOSE * w };
        fireAt = hitMs - Math.hypot(aim.x - from.x, aim.y - from.y) / speed;
      }
      const bullet = aimBullet(from, aim, fireAt, speed);
      shotBullets.push(bullet);
      if (target >= 0) shots.push({ bullet, target });
    };
    const blasts: Blast[] = [];
    for (let i = 0; i < pods; i++) {
      const s = slots[i];
      for (const lead of [LIGHT_LEAD, 0]) {
        const t = s.ms - lead;
        shootAt({ x: podX[i], y: screenY(view, s.u, t) }, t, s.side, i);
      }
      blasts.push({
        u: s.u,
        x: (podX[i] - view.x) / w,
        ms: s.ms,
        size: POD_BLAST * w,
        shake: 0,
        sound: 0,
      });
    }
    // the straight-up stream until the gate, then shot after shot on its bar
    for (let t = 0; t < gateHitFromMs - 150; t += STREAM_EVERY) {
      shipAt(view, t, nose);
      for (let side = -1; side <= 1; side += 2)
        shotBullets.push(
          fireBullet(
            { x: nose.x + side * TWIN * w, y: nose.y - NOSE * w },
            -Math.PI / 2,
            t,
            speed,
            box,
          ),
        );
    }
    const gateHits: number[] = [];
    const gateY = view.y + view.h * GATE_Y;
    const half = (gateR - gateL) / 2;
    for (let t = gateHitFromMs, i = 0; t < fireAtMs - 40; t += GATE_HIT_EVERY, i++) {
      shootAt(
        { x: gateMid + (hash01(i, 40) * 2 - 1) * half * 0.8, y: gateY },
        t,
        i % 2 ? 1 : -1,
        -1,
      );
      gateHits.push(t);
    }

    // the last volley from an arc over the wisp, all on the gate's middle
    shipAt(view, fireAtMs, nose);
    const core: Point = { x: gateMid, y: gateY };
    const muzzles: Point[] = [];
    const muzzleAims: number[] = [];
    const volley: Bullet[] = [];
    let lastHit: number = fireAtMs;
    for (let i = 0; i < VOLLEY; i++) {
      const a = -Math.PI / 2 + VOLLEY_WIDE * (i / (VOLLEY - 1) - 0.5);
      const m = {
        x: nose.x + Math.cos(a) * VOLLEY_ARC * w,
        y: nose.y + Math.sin(a) * VOLLEY_ARC * w,
      };
      const b = aimBullet(m, core, fireAtMs, VOLLEY_SPEED * w);
      muzzles.push(m);
      muzzleAims.push(Math.atan2(core.y - m.y, core.x - m.x));
      volley.push(b);
      lastHit = Math.max(lastHit, b.hitAt);
    }
    const finale: Blast = {
      u: gateU,
      x: gateSlot.x,
      ms: Math.round(lastHit),
      size: FINALE_BLAST * w,
      shake: 3.4,
      sound: 2,
    };
    blasts.push(finale);
    gateSlot.ms = finale.ms;
    launchAt = finale.ms;
    for (let k = 0; k < CHAIN; k++) {
      const out = (k % 2 ? 1 : -1) * (0.3 + (0.7 * Math.floor(k / 2)) / 2);
      blasts.push({
        u: gateU + 0.03 * (hash01(k, 44) - 0.5),
        x: (gateMid + out * half - view.x) / w,
        ms: finale.ms + (k + 1) * CHAIN_EVERY,
        size: CHAIN_BLAST * w,
        shake: 1.5,
        sound: 1,
      });
    }

    // the walls in strips, far enough to see the floors rush up
    const strips: Strip[] = [];
    const lastU = distAt(flyMs + 1500) + SHIP_Y + CHUNK;
    for (let u = FROM_U; u < lastU; u += CHUNK)
      strips.push(buildStrip(view, u, u + CHUNK));

    const heat: number[] = [];
    for (let i = 0; i < pods; i++) heat.push(0);
    const trail: Point = { x: 0, y: 0 };
    return {
      strips,
      podX,
      heat,
      shots,
      shotBullets,
      gateHits,
      gateL,
      gateR,
      cracks: buildCracks(half, (GATE_H * w) / 2),
      volley,
      muzzles,
      muzzleAims,
      blasts,
      finale,
      // where the wisp was, carried down the view with the walls since
      shipPath: (t) => {
        shipAt(view, t, trail);
        trail.y += view.h * (distAt(trailNow) - distAt(t));
        return trail;
      },
    };
  };

  let planned: Plan | null = null;
  let blastBeats: Beats<Blast> | null = null;
  let hitBeats: Beats<number> | null = null;
  let trailNow = 0;
  const ship: Point = { x: 0, y: 0 };
  const spot: Point = { x: 0, y: 0 };

  const flash = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    since: number,
    strength: number,
  ) => {
    if (since < 0 || since >= FLASH_MS) return;
    ctx.globalAlpha = strength * (1 - since / FLASH_MS) ** 2;
    ctx.fillStyle = COLOR.white;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.globalAlpha = 1;
  };

  // the canyon floor, its dust streaking down, and the walls rushing past
  const drawCanyon = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    p: Plan,
    ms: number,
  ) => {
    const { x, y, w, h } = view;
    const dist = distAt(ms);
    ctx.fillStyle = COLOR.woodOutline;
    ctx.fillRect(x, y, w, h);
    const len = h * speedAt(ms) * DUST_MS;
    if (len > 1) {
      const mid = midAt(dist);
      const half = halfAt(dist);
      ctx.beginPath();
      for (let i = 0; i < DUST; i++) {
        const f = (hash01(i, 11) + dist * DUST_PARALLAX) % 1;
        const dx = x + w * (mid + half * 0.9 * (hash01(i, 12) * 2 - 1));
        const dy = y + h * (f < 0 ? f + 1 : f);
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx, dy - len * (0.6 + 0.4 * hash01(i, 13)));
      }
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      ctx.strokeStyle = COLOR.woodFill;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const top = dist + SHIP_Y;
    const bottom = dist - (1 - SHIP_Y);
    ctx.save();
    ctx.translate(0, y + h * (SHIP_Y + dist));
    ctx.lineJoin = "round";
    for (let i = 0; i < p.strips.length; i++) {
      const s = p.strips[i];
      if (s.u1 < bottom || s.u0 > top) continue;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = COLOR.black;
      ctx.fill(s.shadow);
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLOR.hourglassWood;
      ctx.fill(s.body);
      ctx.lineWidth = STRATA_LINE;
      ctx.strokeStyle = COLOR.hourglassWoodDark;
      ctx.stroke(s.strata);
      ctx.lineWidth = RIM;
      ctx.strokeStyle = COLOR.woodFill;
      ctx.stroke(s.lip);
      ctx.lineWidth = EDGE;
      ctx.strokeStyle = COLOR.black;
      ctx.stroke(s.edge);
    }
    ctx.restore();
  };

  // the pods on the walls: blinking faster and charging, white as shots
  // land, then tossed off, leaving a scorch on the wall
  const drawPods = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    p: Plan,
    ms: number,
    now: number,
  ) => {
    const w = view.w;
    const r = POD_R * w;
    const top = view.y - r * 3;
    const bottom = view.y + view.h + r * 3;
    shotHeat(p.shots, ms, p.heat, HEAT_MS);
    ctx.beginPath();
    for (let i = 0; i < pods; i++) {
      const s = slots[i];
      if (ms < s.ms) continue;
      const py = screenY(view, s.u, ms);
      if (py < top || py > bottom) continue;
      for (let k = 0; k < SCORCH; k++) {
        const a = ((k + hash01(i, k + 20)) / SCORCH) * Math.PI * 2;
        const reach = SCORCH_R * w * (0.5 + 0.5 * hash01(i, k + 30));
        ctx.moveTo(p.podX[i], py);
        ctx.lineTo(p.podX[i] + Math.cos(a) * reach, py + Math.sin(a) * reach);
      }
    }
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = COLOR.black;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    for (let i = 0; i < pods; i++) {
      const s = slots[i];
      const since = ms - s.ms;
      if (since >= TOSS_MS) continue;
      let px = p.podX[i];
      let py = screenY(view, s.u, ms);
      if (py < top || py > bottom) continue;
      const heat = p.heat[i];
      const charge = clamp01((ms - (s.ms - POD_WARN)) / POD_WARN);
      if (since >= 0) {
        const e = easeOut(since / TOSS_MS);
        px -= s.side * TOSS * w * e;
        py -= 0.05 * view.h * e;
        ctx.globalAlpha = 1 - e;
      } else {
        const jolt = heat * r * 0.25;
        px += jolt * Math.sin(now * 0.09);
        py += jolt * Math.cos(now * 0.11);
        ctx.fillStyle = COLOR.unionBossSlate;
        ctx.fillRect(
          s.side < 0 ? px : px - BARREL_L * w,
          py - (BARREL_W * w) / 2,
          BARREL_L * w,
          BARREL_W * w,
        );
        ctx.strokeStyle = COLOR.black;
        ctx.strokeRect(
          s.side < 0 ? px : px - BARREL_L * w,
          py - (BARREL_W * w) / 2,
          BARREL_L * w,
          BARREL_W * w,
        );
      }
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = heat > 0 || since >= 0 ? COLOR.white : COLOR.unionBossSlate;
      ctx.fill();
      ctx.strokeStyle = COLOR.black;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (since >= 0 || charge <= 0) continue;
      // the lamp blinking faster as it charges, its glow swelling
      const t = (ms - (s.ms - POD_WARN)) / 1000;
      const phase =
        Math.PI *
        2 *
        (BLINK_HZ[0] * t +
          (0.5 * (BLINK_HZ[1] - BLINK_HZ[0]) * t * t) / (POD_WARN / 1000));
      const on = Math.sin(phase) > 0 ? 1 : 0.25;
      ctx.beginPath();
      ctx.arc(px, py, LAMP * w * (1 + 0.5 * charge), 0, Math.PI * 2);
      ctx.fillStyle = on === 1 ? COLOR.white : COLOR.red;
      ctx.fill();
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = on * (0.4 + 0.6 * charge);
      drawGlow(ctx, LAMP_GLOW_STOPS, px, py, LAMP_GLOW * w * (0.5 + charge));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
  };

  // the gate: posts on the walls, its bar sealing the canyon, cracks
  // spreading with each hit as it throbs faster and glows hotter, every
  // crack filled as the volley lands
  const drawGate = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    p: Plan,
    ms: number,
    now: number,
  ) => {
    const w = view.w;
    const gy = screenY(view, gateU, ms);
    if (gy < view.y - POST_R * w * 3 || gy > view.y + view.h + POST_R * w * 3)
      return;
    const mid = (p.gateL + p.gateR) / 2;
    const half = (p.gateR - p.gateL) / 2;
    if (ms >= brakeAtMs && ms < p.finale.ms) {
      const hits = p.gateHits;
      let landed = 0;
      let heat = 0;
      for (let i = 0; i < hits.length; i++)
        if (ms >= hits[i]) {
          landed++;
          if (ms < hits[i] + HEAT_MS) heat = 1 - (ms - hits[i]) / HEAT_MS;
        }
      const damage =
        (0.85 * landed) / Math.max(1, hits.length) +
        0.15 * clamp01((ms - fireAtMs) / (p.finale.ms - fireAtMs));
      const span = (fireAtMs - gateHitFromMs) / 1000;
      const s =
        Math.max(0, Math.min(ms, p.finale.ms) - gateHitFromMs) / 1000;
      const phase =
        Math.PI *
        2 *
        (THROB_HZ[0] * s + (0.5 * (THROB_HZ[1] - THROB_HZ[0]) * s * s) / span);
      const pulse = s > 0 ? 0.5 + 0.5 * Math.sin(phase) : 0;
      const seal = easeOutCubic(clamp01((ms - brakeAtMs) / SEAL_MS));
      const bar = GATE_H * w * (1 + THROB * damage * pulse) * (0.4 + 0.6 * seal);
      const reach = half * seal;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.35 + 0.65 * Math.max(damage * pulse, heat)) * seal;
      for (let g = 0; g < GATE_GLOWS; g++)
        drawGlow(
          ctx,
          GATE_GLOW_STOPS,
          p.gateL + ((g + 0.5) / GATE_GLOWS) * half * 2,
          gy,
          GATE_GLOW * w * (1 + damage * pulse),
        );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      ctx.fillStyle = COLOR.cyan;
      ctx.fillRect(p.gateL, gy - bar / 2, reach, bar);
      ctx.fillRect(p.gateR - reach, gy - bar / 2, reach, bar);
      ctx.fillStyle = COLOR.white;
      ctx.globalAlpha = 0.6 + 0.4 * Math.max(pulse * damage, heat);
      ctx.fillRect(p.gateL, gy - bar * 0.18, reach, bar * 0.36);
      ctx.fillRect(p.gateR - reach, gy - bar * 0.18, reach, bar * 0.36);
      ctx.globalAlpha = 1;
      if (damage > 0) {
        const cracks = p.cracks;
        const jx = heat * bar * 0.15 * Math.sin(now * 0.09);
        ctx.beginPath();
        for (let c = 0; c < CRACKS; c++) {
          const grown = clamp01(damage * CRACKS - c) * CRACK_SEGS;
          if (grown <= 0) continue;
          const i0 = c * (CRACK_SEGS + 1) * 2;
          ctx.moveTo(mid + jx + cracks[i0], gy + cracks[i0 + 1]);
          for (let k = 1; k <= CRACK_SEGS && k - 1 < grown; k++) {
            const f = Math.min(1, grown - (k - 1));
            const i = i0 + k * 2;
            ctx.lineTo(
              mid + jx + cracks[i - 2] + (cracks[i] - cracks[i - 2]) * f,
              gy + cracks[i - 1] + (cracks[i + 1] - cracks[i - 1]) * f,
            );
          }
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.lineWidth = 6 + 3 * pulse;
        ctx.stroke();
        ctx.strokeStyle = COLOR.black;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    // the posts, lit while the gate holds, dark once it's burst
    const lit = ms >= brakeAtMs && ms < p.finale.ms;
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLOR.black;
    for (let side = 0; side < 2; side++) {
      ctx.beginPath();
      ctx.arc(side ? p.gateR : p.gateL, gy, POST_R * w, 0, Math.PI * 2);
      ctx.fillStyle = lit ? COLOR.cyan : COLOR.unionBossSlate;
      ctx.fill();
      ctx.stroke();
    }
  };

  // the gate's shard i, t ms after it burst: flung out, then rushing down
  // past the view with the walls as the run punches off
  const shardAt = (view: FlightView, p: Plan, i: number, ms: number): Point => {
    const t = ms - p.finale.ms;
    const a = hash01(i, 60) * Math.PI * 2;
    const out =
      view.w *
      (SHARD_OUT[0] + (SHARD_OUT[1] - SHARD_OUT[0]) * hash01(i, 61)) *
      easeOutCubic(clamp01(t / SHARD_OUT_MS));
    spot.x = view.x + view.w * p.finale.x + Math.cos(a) * out;
    spot.y = screenY(view, gateU, ms) + Math.sin(a) * out * 0.6;
    return spot;
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
  ): void => {
    if (!planned) {
      const p = plan(view);
      planned = p;
      blastBeats = createBeats(
        p.blasts,
        (b) => b.ms,
        (b) => {
          if (b.sound === 2) {
            pay(gateSlot, pods);
            playSlamExplosion();
            playCritExplosion();
          } else if (b.sound === 1) playExplosion();
          if (b.shake > 0) shakeScreen(b.shake);
        },
      );
      hitBeats = createBeats(
        p.gateHits,
        (t) => t,
        (_, i) => {
          playSpinTick(1 + 0.08 * i);
          shakeScreen(0.4 + 0.08 * i);
        },
      );
    }
    const p = planned;
    const w = view.w;
    podBeats.tick(ms, now);
    gateBeats.tick(ms, now);
    hitBeats?.tick(ms, now);
    chargeBeats.tick(ms, now);
    blastBeats?.tick(ms, now);

    drawCanyon(ctx, view, p, ms);
    drawGate(ctx, view, p, ms, now);
    drawPods(ctx, view, p, ms, now);
    drawBullets(ctx, p.shotBullets, ms, now, SHOT_SIZE);

    if (ms >= fireAtMs) {
      drawBullets(ctx, p.volley, ms, now, VOLLEY_SIZE);
      for (let i = 0; i < p.muzzles.length; i++)
        drawMuzzleFlash(
          ctx,
          p.muzzles[i],
          p.muzzleAims[i],
          (ms - fireAtMs) / MUZZLE_MS,
          MUZZLE * w,
        );
    }

    // the wisp, swelling as it charges, light pulled into it
    const charge = chargeAt(ms);
    shipAt(view, ms, ship);
    trailNow = ms;
    if (ship.y > view.y - RACER * 2)
      drawWisp(
        ctx,
        p.shipPath,
        ms,
        now,
        RACER * (1 + CHARGE_SWELL * charge),
        charge,
      );
    const previous = ctx.globalCompositeOperation;
    if (charge > 0 && ms < fireAtMs) {
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < SPECKS; i++) {
        const f = ((ms + hash01(i, 1) * SPECK_MS) % SPECK_MS) / SPECK_MS;
        const a = hash01(i, 2) * Math.PI * 2;
        const r = SPECK_REACH * w * (1 - f) ** 1.6;
        stampGlimmer(
          ctx,
          ship.x + Math.cos(a) * r,
          ship.y + Math.sin(a) * r,
          SPECK_SIZE * charge * (0.3 + 0.7 * f),
          now * 0.004 + i,
          i % 3 ? COLOR.cyan : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }

    const blasts = p.blasts;
    for (let i = 0; i < blasts.length; i++) {
      const b = blasts[i];
      const since = ms - b.ms;
      if (since < 0 || since >= DETONATION_MS) continue;
      spot.x = view.x + w * b.x;
      spot.y = screenY(view, b.u, ms);
      drawDetonation(ctx, spot, since, b.size, now);
    }

    // the gate's shards flung out and rushing down past the view
    const since = ms - p.finale.ms;
    if (since >= 0 && since < SHARD_MS) {
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < SHARDS; i++) {
        const d = shardAt(view, p, i, ms);
        if (d.y > view.y + view.h + SHARD_SIZE) continue;
        stampGlimmer(
          ctx,
          d.x,
          d.y,
          SHARD_SIZE * (0.5 + 0.5 * hash01(i, 64)) * (1 - 0.5 * (since / SHARD_MS)),
          now * 0.004 + i,
          i % 3 ? COLOR.cyan : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }

    // each hit's burst and tally where it landed, riding the walls
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const t = ms - s.ms;
      if (t < 0 || t >= LABEL_MS) continue;
      const lx = view.x + w * s.x;
      const ly = screenY(view, s.u, ms);
      if (s.side !== 0) {
        drawWhiteBurst(ctx, lx, ly, t / POD_BURST_MS, 0.45);
        flash(ctx, view, t, POD_FLASH);
      }
      if (s.label !== null) {
        const u = t / LABEL_MS;
        ctx.globalAlpha = 1 - smoothstep(clamp01((u - 0.6) / 0.4));
        drawPoppingCritText(
          ctx,
          s.label,
          lx,
          ly - view.h * (LABEL_UP + LABEL_RISE * u),
          COLOR.heavenlyGold,
          now - t,
          now,
          LABEL_STYLE,
        );
        ctx.globalAlpha = 1;
      }
    }
    flash(ctx, view, ms - fireAtMs, VOLLEY_FLASH);
    if (since >= 0) {
      drawWhiteBurst(
        ctx,
        view.x + w * p.finale.x,
        screenY(view, gateU, ms),
        since / (FLASH_MS * 2),
        1.8,
      );
      flash(ctx, view, since, FINALE_FLASH);
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        drawScene(ctx, view, ms - enterMs, now);
        // the floors zooming away below as the wisp streaks up
        const s = smoothstep(clamp01(ms / enterMs));
        const k = 1 - 0.9 * s;
        ctx.globalAlpha = 1 - s;
        drawScreenPart(
          ctx,
          floors,
          view.x,
          view.y,
          view.w,
          view.h,
          view.cx - (view.w * k) / 2,
          view.cy - (view.h * k) / 2,
          view.w * k,
          view.h * k,
        );
        ctx.globalAlpha = 1;
      },
    },
    draw: (ctx, view, ms, now) => drawScene(ctx, view, ms, now),
    onEnd: () => {
      // any pod or blast a dropped frame skipped still lands
      const now = performance.now();
      podBeats.tick(Infinity, now);
      blastBeats?.tick(Infinity, now);
      pay(gateSlot, pods);
      workers.forEach((w, k) =>
        setTimeout(
          () =>
            celebrateWorkerBoost(
              w.worker.floor,
              w.worker.workerIndex,
              Date.now(),
            ),
          k * promoteGapMs,
        ),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(0.8);
  });
}
