// the "Mothership" event (shmup; perma tiers), a flight-stage event (see
// ../../flightStage) with its own way in, on the Shmup look
// (shared/animationStyles/shmup): its crit's click zooms the floors away and
// a colossal saucer looms down from the top, wider than the screen, slamming
// to a stop over the wisp; its underside is ringed with hatches. Hatches
// blink red faster and faster, burst open and spit drone wisps diving at the
// wisp in quickening waves; it weaves and shoots each down in a flash, a
// crack and a jolt, and every wave cleared promotes workers in view a perma
// tier, tallied where its last drone fell. Then the saucer's core irises
// open, throbbing ever faster as the hull shudders, and sweeps a beam after
// the wisp, which darts just ahead of it, charging, trembling, light pulled
// in; its volley and a lance pierce the core in one huge blast (the last
// perma tiers), a chain of blasts runs along the rim, the saucer breaks in
// two and falls away, and the wisp streaks off the top as the floors rush
// back up, where the promoted workers celebrate
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSimonNote, playSpinTick, playSwoosh } from "../../../../sound";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Box,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import {
  drawAimLaser,
  drawBeam,
  drawBeamFlare,
} from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawStarfield,
  enemySpot,
  planShipGuns,
  shotHeat,
  type ShipShot,
  type ShmupEnemy,
} from "../../../../shared/animationStyles/shmup";
import { createBeats, type Beats } from "../../../../shared/eventBeats";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import {
  clamp01,
  easeIn,
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
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
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

const KEY = "mothership";

// the wisp: its height down the view, size, swell and tremble (of the
// view's width) while charging, the charge's length, its kick back (of the
// view's height)
const SHIP_Y = 0.8;
const RACER = WISP_SIZE * 1.6;
const CHARGE_SWELL = 0.45;
const TREMBLE = 0.012;
const CHARGE_MS = 420;
const RECOIL = 0.05;
const RECOIL_MS = 300;
// its weave (of the view's width) and rates (rad a ms), and how long it
// takes to switch between weaving, dodging and centring
const WEAVE: [number, number] = [0.2, 0.05];
const WEAVE_RATE: [number, number] = [0.0045, 0.012];
const BLEND_MS = 200;
// the beam's foot along the wisp's row (of the width): its middle and
// swing, its sweeps a second rising, the wisp's lead on it and how much it
// closes as the beam lunges right; the beam's width, aim laser and flare
const BEAM_MID = 0.38;
const BEAM_SWING = 0.26;
const BEAM_HZ: [number, number] = [0.9, 2.6];
const DODGE_GAP = 0.22;
const LUNGE = 0.08;
const BEAM_W = 0.11;
const AIM_MS = 200;
const BEAM_FLARE = 0.06;
// the saucer, in widths round its middle (SAUCER_Y of the height down): hull,
// dome, underside band, panel lines; how far above and how big it starts
// looming down
const SAUCER_Y = 0.12;
const HULL: [number, number] = [0.72, 0.12];
const DOME: [number, number] = [0.3, 0.17];
const DOME_Y = -0.04;
const UNDER: [number, number] = [0.56, 0.085];
const UNDER_Y = 0.035;
const PANELS = 14;
const LOOM_FROM = -0.5;
const LOOM_SCALE = 1.3;
const OUTLINE = 5;
// rim lights chasing round the hull
const RIM_LIGHTS = 18;
const RIM_LIGHT = 14;
const RIM_CHASE_MS = 60;
// the hatches, two arcs of them either side of the core (angles round the
// underside, rad), their size (of the width), squash, how long they blink
// before and stay open after spitting a drone, the blink's quickening
const HATCH_ARCS: [number, number][] = [
  [0.12 * Math.PI, 0.4 * Math.PI],
  [0.6 * Math.PI, 0.88 * Math.PI],
];
const HATCHES_AN_ARC = 4;
const HATCHES = HATCH_ARCS.length * HATCHES_AN_ARC;
const HATCH_SPREAD = 0.82;
const HATCH_DROP = 0.7;
const HATCH_R = 0.032;
const HATCH_SQUASH = 0.5;
const HATCH_WARN = 260;
const HATCH_OPEN = 90;
const HATCH_CLOSE = 220;
const HATCH_BLINKS = 6;
const HATCH_GLOW = 0.1;
// the drones: size, the dive's length if never shot, its swing out (of the
// width) and drop (of the height) before curving onto the wisp
const DRONE = WISP_SIZE * 0.85;
const DIVE_MS = 440;
const DIVE_SWING = 0.22;
const DIVE_DROP = 0.25;
// the core: its radius and glow (of the width), the iris opening, the throb
// quickening, how hard the hull shudders at full throb
const CORE_R = 0.06;
const CORE_Y = UNDER_Y + UNDER[1] * 0.85;
const CORE_GLOW = 0.28;
const IRIS_MS = 200;
const THROB_HZ: [number, number] = [3, 16];
const SHUDDER = 0.008;
// the guns: shot speed (of the width a ms), size, twin muzzles' gap and nose
// (of the width), the stream's gap and lead, how long a hit glows
const SHOT_SPEED = 0.0038;
const SHOT_SIZE = WISP_SIZE * 0.3;
const TWIN = 0.02;
const NOSE = 0.05;
const STREAM_FROM = 150;
const STREAM_EVERY = 85;
const STREAM_LEAD = 120;
const HEAT_MS = 100;
// the volley: muzzles on an arc over the wisp (of the width), how wide
// (rad), speed and size; the lance through the core; the muzzle flashes
const VOLLEY = 11;
const VOLLEY_ARC = 0.15;
const VOLLEY_WIDE = 1.8;
const VOLLEY_SPEED = 0.009;
const VOLLEY_SIZE = WISP_SIZE * 0.6;
const LANCE_W = 0.14;
const LANCE_FADE_MS = 240;
const MUZZLE_MS = 200;
const MUZZLE = 0.1;
// light pulled into the wisp while charging, and the rumble's ticks
const SPECKS = 22;
const SPECK_MS = 240;
const SPECK_REACH = 0.32;
const SPECK_SIZE = 16;
const CHARGE_TICKS = [-360, -250, -160, -80, 0];
// blasts (of the width): a drone's, a wave's last, the core's and its chain
// along the rim
const DRONE_BLAST = 0.24;
const CLEAR_BLAST = 0.36;
const FINALE_BLAST = 1.2;
const CHAIN = 8;
const CHAIN_EVERY = 60;
const CHAIN_BLAST = 0.42;
// the saucer breaking in two: how long, how far the halves fly apart (of the
// width) and fall (of the height), their tilt (rad)
const BREAK_MS = 750;
const BREAK_OUT = 0.35;
const BREAK_DROP = 0.6;
const BREAK_TILT = 0.3;
// debris flung out of the core and falling
const SHARDS = 50;
const SHARD_OUT_MS = 220;
const SHARD_OUT: [number, number] = [0.15, 0.5];
const SHARD_FALL = 0.0000012;
const SHARD_MS = 900;
const SHARD_SIZE = 18;
// white flashes over the view
const FLASH_MS = 260;
const KILL_FLASH = 0.1;
const CLEAR_FLASH = 0.22;
const BEAM_FLASH = 0.3;
const VOLLEY_FLASH = 0.4;
const FINALE_FLASH = 0.85;
const KILL_BURST_MS = 320;
// a tally: how far above, how long, how far it rises
const LABEL_UP = 0.04;
const LABEL_MS = 650;
const LABEL_RISE = 0.05;
const LABEL_STYLE = { fontSize: 40, strokeWidth: 6 };
const LAST_LABEL_STYLE = { fontSize: 56, strokeWidth: 8 };
const WARN_STOPS = fadeStops(COLOR.red);
const OPEN_STOPS = fadeStops(COLOR.heavenlyGold);
const CORE_STOPS = fadeStops(COLOR.fullHouseCrimson);

interface Drone {
  hatch: number;
  wave: number;
  spawn: number;
  killAt: number;
  last: boolean;
}

// a wave cleared (or, last, the core) and its share of the workers
interface Slot {
  ms: number;
  at: Point;
  workers: RewardWorker[];
  label: string | null;
  paid: boolean;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  // 0 silent, 1 a bang, 2 the finale
  sound: number;
  // the slot it pays, or -1
  slot: number;
  flash: number;
}

interface Plan {
  hatchX: number[];
  hatchY: number[];
  hatchOpen: Float32Array;
  hatchWarn: Float32Array;
  core: Point;
  enemies: ShmupEnemy[];
  shots: ShipShot[];
  shotBullets: Bullet[];
  heat: number[];
  volley: Bullet[];
  muzzles: Point[];
  muzzleAims: number[];
  lanceFrom: Point;
  blasts: Blast[];
  finale: Blast;
  dome: Path2D;
  hull: Path2D;
  under: Path2D;
  panels: Path2D;
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
    arm: startMothership,
  },
  { label: meta.label, color: COLOR.cyan },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Mothership
export function forceMothershipEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startMothership(floor: Floor, context: EventProcContext): void {
  const {
    enterMs,
    flyMs,
    loomMs,
    waveAtMs,
    waveDrones,
    droneGapMs,
    killAfterMs,
    coreOpenAtMs,
    beamFromMs,
    beamToMs,
    fireAtMs,
    leaveAtMs,
    maxTiersPerWorker,
    promoteGapMs,
  } = meta.values;
  const tier = context.critTier ?? pickCritTierByOdds();
  const waves = Math.min(
    waveAtMs.length,
    waveDrones.length,
    droneGapMs.length,
    killAfterMs.length,
  );

  // the drones, wave by wave, each from its own hatch (3 steps round the
  // ring, so a wave's hatches never repeat)
  const drones: Drone[] = [];
  for (let k = 0; k < waves; k++)
    for (let j = 0; j < waveDrones[k]; j++) {
      const spawn = waveAtMs[k] + j * droneGapMs[k];
      drones.push({
        hatch: (j * 3 + k) % HATCHES,
        wave: k,
        spawn,
        killAt: spawn + killAfterMs[k],
        last: j === waveDrones[k] - 1,
      });
    }

  // every wave cleared, then the core; the workers in view shared out over
  // them, each up to maxTiersPerWorker times
  const slots: Slot[] = [];
  for (const d of drones)
    if (d.last)
      slots.push({
        ms: d.killAt,
        at: { x: 0, y: 0 },
        workers: [],
        label: null,
        paid: false,
      });
  const coreSlot: Slot = {
    ms: fireAtMs,
    at: { x: 0, y: 0 },
    workers: [],
    label: null,
    paid: false,
  };
  slots.push(coreSlot);
  const workers = findRewardWorkers(floor, context);
  const n = slots.length;
  const total = Math.min(
    Math.max(workers.length, n),
    workers.length * maxTiersPerWorker,
  );
  for (let i = 0; i < total; i++)
    slots[Math.min(n - 1, Math.floor((i * n) / total))].workers.push(
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

  // the charge 0..1 as the volley nears, fading fast once it's fired
  const chargeAt = (ms: number) =>
    ms < fireAtMs
      ? clamp01((ms - (fireAtMs - CHARGE_MS)) / CHARGE_MS)
      : Math.max(0, 1 - (ms - fireAtMs) / 150);

  // the beam's sweep phase at ms, quickening over its span
  const beamSpan = Math.max(1, beamToMs - beamFromMs) / 1000;
  const beamPhase = (ms: number) => {
    const s = Math.max(0, Math.min(ms - beamFromMs, beamToMs - beamFromMs));
    const t = s / 1000;
    return (
      -Math.PI / 2 +
      Math.PI *
        2 *
        (BEAM_HZ[0] * t + (0.5 * (BEAM_HZ[1] - BEAM_HZ[0]) * t * t) / beamSpan)
    );
  };
  // the beam's foot along the wisp's row, of the width
  const beamFootAt = (ms: number) =>
    BEAM_MID + BEAM_SWING * Math.sin(beamPhase(ms));

  // the wisp across the view (of the width): weaving through the drones,
  // darting just ahead of the beam, then centring for the volley
  const shipXAt = (ms: number): number => {
    const weave =
      0.5 +
      WEAVE[0] * Math.sin(ms * WEAVE_RATE[0] + 0.3) +
      WEAVE[1] * Math.sin(ms * WEAVE_RATE[1]);
    const lunge = Math.max(0, Math.sin(beamPhase(ms)));
    const dodge = beamFootAt(ms) + DODGE_GAP - LUNGE * lunge;
    let x =
      weave +
      (dodge - weave) *
        smoothstep(clamp01((ms - beamFromMs + BLEND_MS) / BLEND_MS));
    x += (0.5 - x) * smoothstep(clamp01((ms - beamToMs) / BLEND_MS));
    return x;
  };
  // the wisp's height down the view (rising in, recoiling, streaking off)
  const shipY = (ms: number): number => {
    if (ms < 0)
      return (
        1.25 + (SHIP_Y - 1.25) * easeOutCubic(clamp01((ms + enterMs) / enterMs))
      );
    const u = clamp01((ms - fireAtMs) / RECOIL_MS);
    return (
      SHIP_Y +
      (u > 0 && u < 1 ? RECOIL * Math.sin(Math.PI * u) * (1 - u) : 0) -
      (SHIP_Y + 0.35) *
        easeIn(clamp01((ms - leaveAtMs) / Math.max(1, flyMs - leaveAtMs)))
    );
  };
  const shipAt = (view: FlightView, ms: number, into: Point): Point => {
    const shake = TREMBLE * view.w * chargeAt(ms);
    into.x = view.x + view.w * shipXAt(ms) + shake * Math.sin(ms * 0.11);
    into.y = view.y + view.h * shipY(ms) + shake * Math.cos(ms * 0.13);
    return into;
  };

  // the saucer's middle and scale at ms: looming down, then shuddering as
  // the core throbs
  const saucer = { x: 0, y: 0, scale: 1 };
  const throbAt = (ms: number, finaleMs: number) => {
    if (ms < coreOpenAtMs || ms >= finaleMs) return 0;
    const span = Math.max(1, fireAtMs - coreOpenAtMs) / 1000;
    const s = (ms - coreOpenAtMs) / 1000;
    return (
      0.5 +
      0.5 *
        Math.sin(
          Math.PI *
            2 *
            (THROB_HZ[0] * s +
              (0.5 * (THROB_HZ[1] - THROB_HZ[0]) * s * s) / span),
        )
    );
  };
  const placeSaucer = (view: FlightView, ms: number, now: number) => {
    const l = easeOutCubic(clamp01(ms / loomMs));
    const shudder =
      ms >= coreOpenAtMs
        ? SHUDDER *
          view.w *
          clamp01((ms - coreOpenAtMs) / Math.max(1, fireAtMs - coreOpenAtMs))
        : 0;
    saucer.x = view.cx + shudder * Math.sin(now * 0.09);
    saucer.y =
      view.y +
      view.h * (LOOM_FROM + (SAUCER_Y - LOOM_FROM) * l) +
      shudder * Math.cos(now * 0.11);
    saucer.scale = LOOM_SCALE + (1 - LOOM_SCALE) * l;
  };

  // the saucer's shapes round its middle, in px
  const buildSaucer = (w: number) => {
    const dome = new Path2D();
    dome.ellipse(
      0,
      DOME_Y * w,
      DOME[0] * w,
      DOME[1] * w,
      0,
      Math.PI,
      Math.PI * 2,
    );
    dome.closePath();
    const hull = new Path2D();
    hull.ellipse(0, 0, HULL[0] * w, HULL[1] * w, 0, 0, Math.PI * 2);
    const under = new Path2D();
    under.ellipse(0, UNDER_Y * w, UNDER[0] * w, UNDER[1] * w, 0, 0, Math.PI);
    under.closePath();
    const panels = new Path2D();
    for (let i = 1; i < PANELS; i++) {
      const a = (i / PANELS) * Math.PI;
      const c = Math.cos(a);
      const s = Math.sin(a);
      panels.moveTo(c * UNDER[0] * w, UNDER_Y * w + s * UNDER[1] * w);
      panels.lineTo(c * HULL[0] * w, s * HULL[1] * w);
    }
    panels.moveTo(-DOME[0] * w * 0.6, DOME_Y * w - DOME[1] * w * 0.55);
    panels.lineTo(DOME[0] * w * 0.6, DOME_Y * w - DOME[1] * w * 0.55);
    return { dome, hull, under, panels };
  };

  // every hatch, drone, shot and blast, planned once the view's known
  const plan = (view: FlightView): Plan => {
    const { w, h } = view;
    const cx = view.cx;
    const cy = view.y + h * SAUCER_Y;
    const hatchX: number[] = [];
    const hatchY: number[] = [];
    for (let a = 0; a < HATCH_ARCS.length; a++) {
      const [a0, a1] = HATCH_ARCS[a];
      for (let i = 0; i < HATCHES_AN_ARC; i++) {
        const t = a0 + ((a1 - a0) * i) / Math.max(1, HATCHES_AN_ARC - 1);
        hatchX.push(Math.cos(t) * UNDER[0] * HATCH_SPREAD * w);
        hatchY.push(UNDER_Y * w + Math.sin(t) * UNDER[1] * HATCH_DROP * w);
      }
    }
    const core: Point = { x: cx, y: cy + CORE_Y * w };
    const box: Box = {
      left: view.x - 30,
      right: view.x + w + 30,
      top: core.y,
      bottom: view.y + h + 30,
    };
    const speed = SHOT_SPEED * w;

    // each drone bursting out of its hatch, swinging out and curving down
    // onto where the wisp will be
    const enemies: ShmupEnemy[] = [];
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      const fx = cx + hatchX[d.hatch];
      const fy = cy + hatchY[d.hatch];
      const end = shipAt(view, d.spawn + DIVE_MS, { x: 0, y: 0 });
      const side = hatchX[d.hatch] < 0 ? -1 : 1;
      const mx = fx + side * DIVE_SWING * w;
      const my = fy + DIVE_DROP * h;
      const spot: Point = { x: 0, y: 0 };
      enemies.push({
        size: DRONE,
        enterAt: d.spawn,
        killAt: d.killAt,
        at: (ms) => {
          if (ms < d.spawn || ms >= d.killAt) return null;
          const u0 = (ms - d.spawn) / DIVE_MS;
          const u = u0 * (0.6 + 0.4 * u0);
          const a = (1 - u) * (1 - u);
          const b = 2 * u * (1 - u);
          const c = u * u;
          spot.x = a * fx + b * mx + c * end.x;
          spot.y = a * fy + b * my + c * end.y;
          return spot;
        },
      });
    }

    // the twin guns' stream at the drone due next (straight up into the
    // hull between waves), plus a shot timed to land on each kill
    const shots = planShipGuns(
      (t) => shipAt(view, t, { x: 0, y: 0 }),
      enemies,
      {
        fromMs: STREAM_FROM,
        toMs: fireAtMs - CHARGE_MS,
        every: STREAM_EVERY,
        speed,
        twin: TWIN * w,
        nose: NOSE * w,
        lead: STREAM_LEAD,
      },
      box,
    );
    const nose: Point = { x: 0, y: 0 };
    const blasts: Blast[] = [];
    let wave = 0;
    for (let i = 0; i < enemies.length; i++) {
      const d = drones[i];
      const aim = enemySpot(enemies[i], d.killAt);
      let fireAt = d.killAt - 150;
      let from: Point = { x: 0, y: 0 };
      for (let k = 0; k < 3; k++) {
        shipAt(view, fireAt, nose);
        from = { x: nose.x + (i % 2 ? TWIN : -TWIN) * w, y: nose.y - NOSE * w };
        fireAt = d.killAt - Math.hypot(aim.x - from.x, aim.y - from.y) / speed;
      }
      shots.push({ bullet: aimBullet(from, aim, fireAt, speed), target: i });
      let slot = -1;
      if (d.last && wave < slots.length - 1) {
        slot = wave++;
        slots[slot].at.x = aim.x;
        slots[slot].at.y = aim.y;
      }
      blasts.push({
        at: aim,
        ms: d.killAt,
        size: (d.last ? CLEAR_BLAST : DRONE_BLAST) * w,
        shake: d.last ? 1.4 : 0.7 + 0.1 * d.wave,
        sound: 1,
        slot,
        flash: d.last ? CLEAR_FLASH : KILL_FLASH,
      });
    }

    // the volley from an arc over the wisp, all on the core
    shipAt(view, fireAtMs, nose);
    const lanceFrom: Point = { x: nose.x, y: nose.y - NOSE * w };
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
      at: core,
      ms: Math.round(lastHit),
      size: FINALE_BLAST * w,
      shake: 3.4,
      sound: 2,
      slot: slots.length - 1,
      flash: 0,
    };
    blasts.push(finale);
    coreSlot.ms = finale.ms;
    coreSlot.at.x = core.x;
    coreSlot.at.y = core.y;
    for (let k = 0; k < CHAIN; k++) {
      const out = (k % 2 ? 1 : -1) * (0.12 + (0.36 * Math.floor(k / 2)) / 3);
      blasts.push({
        at: {
          x: cx + out * w,
          y: cy + (hash01(k, 44) - 0.5) * HULL[1] * w,
        },
        ms: finale.ms + (k + 1) * CHAIN_EVERY,
        size: CHAIN_BLAST * w,
        shake: 1.6,
        sound: 1,
        slot: -1,
        flash: 0,
      });
    }

    const shotBullets: Bullet[] = [];
    const heat: number[] = [];
    for (let i = 0; i < shots.length; i++) shotBullets.push(shots[i].bullet);
    for (let i = 0; i < enemies.length; i++) heat.push(0);
    const shipPoint: Point = { x: 0, y: 0 };
    return {
      hatchX,
      hatchY,
      hatchOpen: new Float32Array(HATCHES),
      hatchWarn: new Float32Array(HATCHES),
      core,
      enemies,
      shots,
      shotBullets,
      heat,
      volley,
      muzzles,
      muzzleAims,
      lanceFrom,
      blasts,
      finale,
      ...buildSaucer(w),
      shipPath: (t) => shipAt(view, t, shipPoint),
    };
  };

  // the saucer slamming to a stop, each drone spat out, the beam
  const loomBeats = createBeats(
    [loomMs],
    (t) => t,
    () => {
      playSlamExplosion();
      shakeScreen(1.8);
    },
  );
  const spitBeats = createBeats(
    drones,
    (d) => d.spawn,
    (d, i) => {
      playSpinTick(1 + 0.06 * i);
      shakeScreen(0.3 + 0.1 * d.wave);
    },
  );
  const coreBeats = createBeats(
    [coreOpenAtMs, beamFromMs, beamToMs],
    (t) => t,
    (_, i) => {
      if (i === 0) {
        playSwoosh();
        shakeScreen(1.2);
      } else if (i === 1) {
        playSlamExplosion();
        shakeScreen(1.8);
      } else playSwoosh();
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

  let planned: Plan | null = null;
  let blastBeats: Beats<Blast> | null = null;
  const ship: Point = { x: 0, y: 0 };
  const spot: Point = { x: 0, y: 0 };
  const beamEnd: Point = { x: 0, y: 0 };

  const flash = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    since: number,
    strength: number,
  ) => {
    if (strength <= 0 || since < 0 || since >= FLASH_MS) return;
    ctx.globalAlpha = strength * (1 - since / FLASH_MS) ** 2;
    ctx.fillStyle = COLOR.white;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.globalAlpha = 1;
  };

  // the hull's shapes, filled and outlined under the current transform
  const fillSaucer = (ctx: CanvasRenderingContext2D, p: Plan, k: number) => {
    ctx.lineWidth = OUTLINE / k;
    ctx.strokeStyle = COLOR.black;
    ctx.fillStyle = COLOR.cyan;
    ctx.fill(p.dome);
    ctx.stroke(p.dome);
    ctx.fillStyle = COLOR.silverTicketGray;
    ctx.fill(p.hull);
    ctx.stroke(p.hull);
    ctx.fillStyle = COLOR.unionBossSlate;
    ctx.fill(p.under);
    ctx.stroke(p.under);
    ctx.lineWidth = 2 / k;
    ctx.stroke(p.panels);
  };

  // the saucer whole, or after the finale its two halves flung apart and
  // falling away
  const drawSaucer = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    p: Plan,
    ms: number,
    now: number,
  ) => {
    const k = saucer.scale;
    const since = ms - p.finale.ms;
    if (since < 0) {
      ctx.save();
      ctx.translate(saucer.x, saucer.y);
      ctx.scale(k, k);
      fillSaucer(ctx, p, k);
      ctx.restore();
      // the rim lights chasing round
      const step = Math.floor(now / RIM_CHASE_MS);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < RIM_LIGHTS; i++) {
        if ((i + step) % 3 !== 0) continue;
        const a = (i / RIM_LIGHTS) * Math.PI;
        stampGlimmer(
          ctx,
          saucer.x + Math.cos(a) * HULL[0] * view.w * 0.97 * k,
          saucer.y + Math.sin(a) * HULL[1] * view.w * 0.97 * k,
          RIM_LIGHT,
          now * 0.004 + i,
          i % 2 ? COLOR.cyan : COLOR.heavenlyGold,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      return;
    }
    const e = clamp01(since / BREAK_MS);
    if (e >= 1) return;
    const out = easeOutCubic(e) * BREAK_OUT * view.w;
    const drop = e * e * BREAK_DROP * view.h;
    ctx.globalAlpha = 1 - e * e;
    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        side < 0 ? saucer.x - view.w * 2 : saucer.x,
        view.y - view.h,
        view.w * 2,
        view.h * 3,
      );
      ctx.clip();
      ctx.translate(saucer.x + side * out, saucer.y + drop);
      ctx.rotate(side * BREAK_TILT * easeOutCubic(e));
      fillSaucer(ctx, p, 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  // the hatches: dark, then blinking red faster and faster, bursting open
  // white-hot as a drone flies out
  const drawHatches = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    p: Plan,
    ms: number,
  ) => {
    if (ms >= p.finale.ms) return;
    const open = p.hatchOpen;
    const warn = p.hatchWarn;
    open.fill(0);
    warn.fill(0);
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      const t = ms - d.spawn;
      if (t < -HATCH_WARN || t > HATCH_CLOSE) continue;
      const wv = clamp01((t + HATCH_WARN) / HATCH_WARN);
      const blink = 0.5 + 0.5 * Math.sin(wv * wv * Math.PI * 2 * HATCH_BLINKS);
      if (t < 0) warn[d.hatch] = Math.max(warn[d.hatch], wv * blink);
      const o =
        t < 0
          ? clamp01((t + HATCH_OPEN) / HATCH_OPEN)
          : 1 - clamp01(t / HATCH_CLOSE);
      open[d.hatch] = Math.max(open[d.hatch], o);
    }
    const k = saucer.scale;
    const r = HATCH_R * view.w * k;
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLOR.black;
    for (let i = 0; i < HATCHES; i++) {
      const x = saucer.x + p.hatchX[i] * k;
      const y = saucer.y + p.hatchY[i] * k;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * HATCH_SQUASH, 0, 0, Math.PI * 2);
      ctx.fillStyle = warn[i] > 0.5 ? COLOR.red : COLOR.black;
      ctx.fill();
      ctx.stroke();
      const o = open[i];
      if (o > 0) {
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          Math.max(0.5, r * o),
          Math.max(0.5, r * HATCH_SQUASH * o),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = COLOR.white;
        ctx.fill();
      }
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < HATCHES; i++) {
      const x = saucer.x + p.hatchX[i] * k;
      const y = saucer.y + p.hatchY[i] * k;
      if (warn[i] > 0) {
        ctx.globalAlpha = warn[i];
        drawGlow(ctx, WARN_STOPS, x, y, HATCH_GLOW * view.w * (0.6 + warn[i]));
      }
      if (open[i] > 0) {
        ctx.globalAlpha = open[i];
        drawGlow(ctx, OPEN_STOPS, x, y, HATCH_GLOW * view.w * 1.4 * open[i]);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  };

  // the core: a sealed plate, then irising open, throbbing ever faster and
  // hotter until the volley lands
  const drawCore = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    p: Plan,
    ms: number,
  ) => {
    if (ms >= p.finale.ms) return;
    const k = saucer.scale;
    const x = saucer.x;
    const y = saucer.y + CORE_Y * view.w * k;
    p.core.x = x;
    p.core.y = y;
    const r = CORE_R * view.w * k;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.unionBossSlate;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = COLOR.black;
    ctx.stroke();
    if (ms < coreOpenAtMs) return;
    const iris = easeOutCubic(clamp01((ms - coreOpenAtMs) / IRIS_MS));
    const throb = throbAt(ms, p.finale.ms);
    const build = clamp01(
      (ms - coreOpenAtMs) / Math.max(1, fireAtMs - coreOpenAtMs),
    );
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, r * 0.85 * iris), 0, Math.PI * 2);
    ctx.fillStyle = COLOR.fullHouseCrimson;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      Math.max(0.5, r * iris * (0.35 + 0.35 * throb * (0.5 + build))),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = iris * (0.45 + 0.55 * throb);
    drawGlow(
      ctx,
      CORE_STOPS,
      x,
      y,
      CORE_GLOW * view.w * (0.5 + 0.5 * build + 0.35 * throb),
    );
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  };

  // the core's beam sweeping after the wisp, its aim laser flickering first
  const drawCoreBeam = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    p: Plan,
    ms: number,
    now: number,
  ) => {
    if (ms < beamFromMs - AIM_MS || ms >= beamToMs) return;
    const row = view.y + view.h * SHIP_Y;
    const fx = view.x + view.w * beamFootAt(ms);
    const dy = row - p.core.y;
    if (dy <= 1) return;
    const reach = (view.y + view.h + 40 - p.core.y) / dy;
    beamEnd.x = p.core.x + (fx - p.core.x) * reach;
    beamEnd.y = p.core.y + dy * reach;
    if (ms < beamFromMs) {
      drawAimLaser(ctx, p.core, beamEnd);
      return;
    }
    drawBeam(
      ctx,
      p.core,
      beamEnd,
      BEAM_W * view.w * (0.85 + 0.15 * Math.sin(now * 0.05)),
    );
    drawBeamFlare(ctx, p.core, BEAM_FLARE * view.w, 1, now);
  };

  // the core's debris i: flung out of the blast, then falling
  const shardAt = (view: FlightView, p: Plan, i: number, t: number): Point => {
    const a = hash01(i, 60) * Math.PI * 2;
    const out =
      view.w *
      (SHARD_OUT[0] + (SHARD_OUT[1] - SHARD_OUT[0]) * hash01(i, 61)) *
      easeOutCubic(clamp01(t / SHARD_OUT_MS));
    spot.x = p.finale.at.x + Math.cos(a) * out;
    spot.y =
      p.finale.at.y + Math.sin(a) * out * 0.7 + SHARD_FALL * view.h * t * t;
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
          if (b.slot >= 0 && b.slot < slots.length) pay(slots[b.slot], b.slot);
          if (b.sound === 2) {
            playSlamExplosion();
            playCritExplosion();
          } else if (b.sound === 1) playExplosion();
          if (b.shake > 0) shakeScreen(b.shake);
        },
      );
    }
    const p = planned;
    const w = view.w;
    loomBeats.tick(ms, now);
    spitBeats.tick(ms, now);
    coreBeats.tick(ms, now);
    chargeBeats.tick(ms, now);
    blastBeats?.tick(ms, now);

    drawStarfield(ctx, view, ms, now);
    placeSaucer(view, ms, now);
    drawSaucer(ctx, view, p, ms, now);
    drawHatches(ctx, view, p, ms);
    drawCore(ctx, view, p, ms);
    drawCoreBeam(ctx, view, p, ms, now);

    // the drones, white as shots land, and the stream
    shotHeat(p.shots, ms, p.heat, HEAT_MS);
    for (let i = 0; i < p.enemies.length; i++) {
      const e = p.enemies[i];
      drawWispBetween(
        ctx,
        e.at,
        ms,
        now,
        e.size,
        p.heat[i],
        e.enterAt,
        e.killAt,
      );
    }
    drawBullets(ctx, p.shotBullets, ms, now, SHOT_SIZE);

    // the volley and the lance through the core
    if (ms >= fireAtMs) {
      const lanceT = ms - p.finale.ms;
      if (lanceT < LANCE_FADE_MS)
        drawBeam(
          ctx,
          p.lanceFrom,
          p.finale.at,
          LANCE_W * w * clamp01((ms - fireAtMs) / 60),
          lanceT < 0 ? 1 : 1 - lanceT / LANCE_FADE_MS,
        );
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

    // the blasts, each kill's burst and flash
    const blasts = p.blasts;
    for (let i = 0; i < blasts.length; i++) {
      const b = blasts[i];
      const since = ms - b.ms;
      if (since < 0 || since >= DETONATION_MS) continue;
      drawDetonation(ctx, b.at, since, b.size, now);
      if (b.flash > 0 && since < KILL_BURST_MS) {
        drawWhiteBurst(ctx, b.at.x, b.at.y, since / KILL_BURST_MS, 0.4);
        flash(ctx, view, since, b.flash);
      }
    }

    // the core's debris flung out and falling
    const since = ms - p.finale.ms;
    if (since >= 0 && since < SHARD_MS) {
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < SHARDS; i++) {
        const d = shardAt(view, p, i, since);
        if (d.y > view.y + view.h + SHARD_SIZE) continue;
        stampGlimmer(
          ctx,
          d.x,
          d.y,
          SHARD_SIZE *
            (0.5 + 0.5 * hash01(i, 64)) *
            (1 - 0.5 * (since / SHARD_MS)),
          now * 0.004 + i,
          i % 3 ? (i % 2 ? COLOR.cyan : COLOR.heavenlyGold) : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }

    // each tally where it landed
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const t = ms - s.ms;
      if (t < 0 || t >= LABEL_MS || s.label === null) continue;
      const u = t / LABEL_MS;
      ctx.globalAlpha = 1 - smoothstep(clamp01((u - 0.6) / 0.4));
      drawPoppingCritText(
        ctx,
        s.label,
        s.at.x,
        s.at.y - view.h * (LABEL_UP + LABEL_RISE * u),
        COLOR.heavenlyGold,
        now - t,
        now,
        s === coreSlot ? LAST_LABEL_STYLE : LABEL_STYLE,
      );
      ctx.globalAlpha = 1;
    }
    flash(ctx, view, ms - beamFromMs, BEAM_FLASH);
    flash(ctx, view, ms - fireAtMs, VOLLEY_FLASH);
    if (since >= 0) {
      drawWhiteBurst(
        ctx,
        p.finale.at.x,
        p.finale.at.y,
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
        // the floors zooming away below as the saucer looms in
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
      // any kill or blast a dropped frame skipped still lands
      const now = performance.now();
      blastBeats?.tick(Infinity, now);
      for (let i = 0; i < slots.length; i++) pay(slots[i], i);
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
