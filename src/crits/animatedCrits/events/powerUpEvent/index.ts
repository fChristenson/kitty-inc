// the "Power-Up" event (shmup; perma tiers), a flight-stage event (see
// ../../flightStage) with its own way in, on the Shmup look
// (shared/animationStyles/shmup): its crit's click lifts the view off the
// floors into space and the ship (a wisp) rises in from the bottom. Drone
// trains snake across the screen, each faster and longer than the last, and
// the ship shoots them down; every train wiped drops a glowing capsule the
// ship swoops up to grab in a flash, a chime and a jolt: an option wisp
// spins out round it, copying its fire from then on, and workers in view
// climb a perma tier, tallied over the ship. The fourth grab sets the ship
// and its options charging, trembling, light pulled into them, as a wall of
// drones drops in; they fire one huge combined spread through it, the wall
// goes up in a chain of blasts, the ship streaks off the top and the floors
// rush up onto the view, where the promoted workers celebrate
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
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawStarfield,
  enemySpot,
  shmupEnemy,
  shotHeat,
  type ShipShot,
  type ShmupEnemy,
} from "../../../../shared/animationStyles/shmup";
import { createBeats, type Beats } from "../../../../shared/eventBeats";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { clamp01, easeOutCubic, smoothstep } from "../../../../shared/easing";
import {
  playCritExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
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

const KEY = "powerUp";

// the ship: its height down the view, its wisp, its swell and tremble (of
// the view's width) while charging, how long the charge takes
const SHIP_Y = 0.8;
const RACER = WISP_SIZE * 1.6;
const CHARGE_SWELL = 0.4;
const TREMBLE = 0.012;
const CHARGE_MS = 300;
// its options: their wisp, orbit (of the view's width, squashed), spin (rad
// a ms) and how fast one spins out of the grabbed capsule
const OPTION = WISP_SIZE * 1.05;
const ORBIT = 0.12;
const ORBIT_SQUASH = 0.8;
const ORBIT_SPIN = 0.0065;
const OPTION_OUT_MS = 160;
// the drone trains, one a wave: drones in each, ms between them snaking in,
// ms between kills, ms to cross the screen, their height and weave (of the
// view's height), and the first kill after the train starts
const WAVE_DRONES = [5, 6, 7, 8];
const TRAIN_GAP = [100, 85, 70, 55];
const KILL_GAP = [120, 95, 75, 60];
const CROSS_MS = [1500, 1300, 1100, 950];
const WAVE_Y = [0.22, 0.3, 0.17, 0.26];
const WAVE_AMP = 0.06;
const KILL_DELAY = 380;
const DRONE = WISP_SIZE * 0.8;
// a capsule: how far it floats toward the ship before it's grabbed, kept off
// the edges; its pill's half length and radius (of the view's width); the
// ship's swerve after each grab, and how long it takes
const GRAB_PULL = 0.45;
const GRAB_EDGE = 0.15;
const CAPSULE_HALF = 0.035;
const CAPSULE_R = 0.03;
const CAPSULE_WISP = WISP_SIZE * 1.1;
const SWERVE = 0.12;
const RETURN_MS = 240;
// the ship's and options' fire: every SHOT_EVERY ms at SHOT_SPEED (of the
// view's width a ms), its twin muzzles' gap and nose (of the view's width),
// how far ahead they aim
const SHOOT_FROM = 200;
const SHOT_EVERY = 90;
const SHOT_SPEED = 0.0035;
const TWIN = 0.02;
const NOSE = 0.05;
const LEAD_MS = 200;
const SHOT_SIZE = WISP_SIZE * 0.3;
// the wall: its grid, span (of the view's width), rows (of its height), and
// drones dropping in
const WALL_COLS = 7;
const WALL_ROWS = 3;
const WALL_X: [number, number] = [0.12, 0.88];
const WALL_ROW_Y = [0.1, 0.19, 0.28];
const WALL_IN_MS = 350;
const WALL = WISP_SIZE * 0.85;
// light pulled into the guns while charging: specks, each's trip, its reach
const SPECKS = 20;
const SPECK_MS = 240;
const SPECK_REACH = 0.3;
const SPECK_SIZE = 16;
// the rumble's ticks before the volley (the last the volley itself)
const CHARGE_TICKS = [-280, -190, -115, -55, 0];
// the combined spread: shots a gun, their spread (rad), speed (of the view's
// width a ms), size; each gun's middle shot a laser (of the view's width)
const VOLLEY = 7;
const VOLLEY_SPREAD = 1;
const VOLLEY_SPEED = 0.0045;
const VOLLEY_SIZE = WISP_SIZE * 0.6;
const LASER_W = 0.07;
const LASER_FADE_MS = 220;
const MUZZLE_MS = 200;
const MUZZLE = 0.14;
// blasts (of the view's width): a drone's, a train's last, the wall's, then
// the finale's and its cluster
const DRONE_BLAST = 0.26;
const CLEAR_BLAST = 0.38;
const WALL_BLAST = 0.3;
const FINALE_BLAST = 1.05;
const FINALE_AFTER = 110;
const CLUSTER = 4;
const CLUSTER_EVERY = 70;
const CLUSTER_REACH = 0.22;
const CLUSTER_BLAST = 0.4;
// the screen's white flashes: a grab's, the volley's, the finale's
const FLASH_MS = 260;
const PICK_FLASH = 0.3;
const VOLLEY_FLASH = 0.5;
const FINALE_FLASH = 0.85;
const PICK_BURST_MS = 420;
// a grab's tally over the ship: how far above, how long, how far it rises
const LABEL_UP = 0.07;
const LABEL_MS = 650;
const LABEL_RISE = 0.05;
const LABEL_STYLE = { fontSize: 44, strokeWidth: 7 };
const LAST_LABEL_STYLE = { fontSize: 56, strokeWidth: 8 };

interface Pickup {
  // when the ship grabs it, and when its train was wiped
  ms: number;
  dropMs: number;
  workers: RewardWorker[];
  label: string | null;
  // where it dropped and where it's grabbed (px), once planned
  drop: Point;
  at: Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  // 0 silent, 1 a bang, 2 the finale's slam
  sound: number;
}

interface Plan {
  enemies: ShmupEnemy[];
  shots: ShipShot[];
  shotBullets: Bullet[];
  heat: number[];
  volley: Bullet[];
  lasers: Bullet[];
  guns: Point[];
  blasts: Blast[];
  finale: Blast;
  shipPath: (ms: number) => Point;
  optionPaths: ((ms: number) => Point | null)[];
  capsulePaths: ((ms: number) => Point | null)[];
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
    arm: startPowerUp,
  },
  { label: "Power-Up", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Power-Up
export function forcePowerUpEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a uniform Catmull-Rom spline through b and c, t 0..1
function catmull(a: number, b: number, c: number, d: number, t: number) {
  const t2 = t * t;
  return (
    0.5 *
    (2 * b +
      (c - a) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (3 * b - a - 3 * c + d) * t2 * t)
  );
}

function startPowerUp(floor: Floor, context: EventProcContext): void {
  const {
    enterMs,
    flyMs,
    waveAtMs,
    grabMs,
    wallAtMs,
    fireAtMs,
    leaveAtMs,
    promoteGapMs,
  } = meta.values;
  const tier = context.critTier ?? pickCritTierByOdds();
  const waves = waveAtMs.length;

  // each train's last kill drops a capsule, grabbed grabMs later; every
  // worker in view shared out over the grabs (round again when fewer)
  const workers = findRewardWorkers(floor, context);
  const pickups: Pickup[] = [];
  for (let k = 0; k < waves; k++) {
    const dropMs =
      waveAtMs[k] + KILL_DELAY + (WAVE_DRONES[k] - 1) * KILL_GAP[k];
    pickups.push({
      ms: dropMs + grabMs,
      dropMs,
      workers: [],
      label: null,
      drop: { x: 0, y: 0 },
      at: { x: 0, y: 0 },
    });
  }
  const total = Math.max(workers.length, waves);
  for (let i = 0; i < total && workers.length > 0; i++)
    pickups[Math.floor((i * waves) / total)].workers.push(
      workers[i % workers.length],
    );

  // the charge 0..1 as the volley nears, fading fast once it's fired
  const chargeAt = (ms: number) =>
    ms < fireAtMs
      ? clamp01((ms - (fireAtMs - CHARGE_MS)) / CHARGE_MS)
      : Math.max(0, 1 - (ms - fireAtMs) / 150);

  // the ship's keyframes (ms, then shares of the view), filled once planned
  const keyMs: number[] = [];
  const keyX: number[] = [];
  const keyY: number[] = [];
  const key = (ms: number, x: number, y: number) => {
    keyMs.push(ms);
    keyX.push(x);
    keyY.push(y);
  };

  // the ship's middle at ms, through its keyframes, trembling as it charges
  const shipAt = (view: FlightView, ms: number, into: Point): Point => {
    const n = keyMs.length;
    const t = Math.max(keyMs[0], Math.min(ms, keyMs[n - 1]));
    let i = 0;
    while (i < n - 2 && t >= keyMs[i + 1]) i++;
    const u = (t - keyMs[i]) / (keyMs[i + 1] - keyMs[i]);
    const a = Math.max(0, i - 1);
    const d = Math.min(n - 1, i + 2);
    const shake = TREMBLE * view.w * chargeAt(ms);
    into.x =
      view.x +
      view.w * catmull(keyX[a], keyX[i], keyX[i + 1], keyX[d], u) +
      shake * Math.sin(ms * 0.11);
    into.y =
      view.y +
      view.h * catmull(keyY[a], keyY[i], keyY[i + 1], keyY[d], u) +
      shake * Math.cos(ms * 0.13);
    return into;
  };

  // option k orbiting the ship at ms, from its grab on
  const optionAt = (
    view: FlightView,
    k: number,
    ms: number,
    into: Point,
  ): Point | null => {
    if (ms < pickups[k].ms) return null;
    shipAt(view, ms, into);
    const r =
      ORBIT *
      view.w *
      easeOutCubic(clamp01((ms - pickups[k].ms) / OPTION_OUT_MS));
    const a = (k * Math.PI) / 2 + ms * ORBIT_SPIN;
    into.x += Math.cos(a) * r;
    into.y += Math.sin(a) * r * ORBIT_SQUASH;
    return into;
  };

  // drone j of train k snaking across from alternate sides
  const trainDrone = (
    view: FlightView,
    k: number,
    enterAt: number,
    killAt: number,
  ): ShmupEnemy => {
    const spot: Point = { x: 0, y: 0 };
    const side = k % 2 ? -1 : 1;
    return {
      size: DRONE,
      enterAt,
      killAt,
      at: (ms) => {
        if (ms < enterAt || ms >= killAt) return null;
        const u = (ms - enterAt) / CROSS_MS[k];
        spot.x =
          view.x + view.w * (side > 0 ? 1.1 - 1.25 * u : -0.1 + 1.25 * u);
        spot.y =
          view.y +
          view.h * (WAVE_Y[k] + WAVE_AMP * Math.sin(u * Math.PI * 3 + k));
        return spot;
      },
    };
  };

  // every drone, shot and blast, planned once the view's known
  const plan = (view: FlightView): Plan => {
    const { w, h } = view;
    const box: Box = {
      left: view.x - 30,
      right: view.x + w + 30,
      top: view.y - 30,
      bottom: view.y + h + 30,
    };
    const enemies: ShmupEnemy[] = [];
    const blasts: Blast[] = [];
    for (let k = 0; k < waves; k++)
      for (let j = 0; j < WAVE_DRONES[k]; j++) {
        const e = trainDrone(
          view,
          k,
          waveAtMs[k] + j * TRAIN_GAP[k],
          waveAtMs[k] + KILL_DELAY + j * KILL_GAP[k],
        );
        enemies.push(e);
        const last = j === WAVE_DRONES[k] - 1;
        blasts.push({
          at: enemySpot(e, e.killAt),
          ms: e.killAt,
          size: (last ? CLEAR_BLAST : DRONE_BLAST) * w,
          shake: last ? 1.3 : 0.7,
          sound: last || j % 2 ? 1 : 0,
        });
        if (last) {
          // the capsule drops where the train's last drone fell, floating
          // toward the ship, which swoops up to grab it
          const p = pickups[k];
          const drop = blasts[blasts.length - 1].at;
          p.drop.x = drop.x;
          p.drop.y = drop.y;
          p.at.x = Math.max(
            view.x + w * GRAB_EDGE,
            Math.min(view.x + w * (1 - GRAB_EDGE), drop.x),
          );
          p.at.y = drop.y + (view.y + h * SHIP_Y - drop.y) * GRAB_PULL;
        }
      }
    const trains = enemies.length;

    // the ship: rising in, swooping to each capsule and swerving back down,
    // charging under the wall, recoiling, then streaking off the top
    key(-enterMs, 0.5, 1.25);
    key(0, 0.5, SHIP_Y);
    key(350, 0.62, SHIP_Y);
    for (let k = 0; k < waves; k++) {
      const p = pickups[k];
      key(p.ms, (p.at.x - view.x) / w, (p.at.y - view.y) / h);
      key(
        p.ms + RETURN_MS,
        k === waves - 1 ? 0.5 : 0.5 + SWERVE * (k % 2 ? 1 : -1),
        SHIP_Y,
      );
    }
    key(fireAtMs + 120, 0.5, SHIP_Y + 0.04);
    key(leaveAtMs, 0.5, SHIP_Y - 0.04);
    key(flyMs, 0.5, -0.35);

    // the ship's twin guns and every option's copy, at the next drone due
    const shots: ShipShot[] = [];
    const speed = SHOT_SPEED * w;
    const shootTo = pickups[waves - 1].dropMs + 20;
    for (let t = SHOOT_FROM; t < shootTo; t += SHOT_EVERY) {
      let target = -1;
      for (let i = 0; i < trains; i++) {
        const e = enemies[i];
        if (t < e.enterAt + 250 || t >= e.killAt) continue;
        if (target < 0 || e.killAt < enemies[target].killAt) target = i;
      }
      const aim = target >= 0 ? enemySpot(enemies[target], t + LEAD_MS) : null;
      const fire = (from: Point) =>
        shots.push({
          target,
          bullet: aim
            ? aimBullet(from, aim, t, speed)
            : fireBullet(from, -Math.PI / 2, t, speed, box),
        });
      const nose = shipAt(view, t, { x: 0, y: 0 });
      fire({ x: nose.x - TWIN * w, y: nose.y - NOSE * w });
      fire({ x: nose.x + TWIN * w, y: nose.y - NOSE * w });
      for (let k = 0; k < waves; k++) {
        const o = optionAt(view, k, t, { x: 0, y: 0 });
        if (o) fire(o);
      }
    }

    // the combined spread from the ship and every option at once
    const guns: Point[] = [];
    const nose = shipAt(view, fireAtMs, { x: 0, y: 0 });
    guns.push({ x: nose.x, y: nose.y - NOSE * w });
    for (let k = 0; k < waves; k++) {
      const o = optionAt(view, k, fireAtMs, { x: 0, y: 0 });
      if (o) guns.push(o);
    }
    const volley: Bullet[] = [];
    const lasers: Bullet[] = [];
    const vSpeed = VOLLEY_SPEED * w;
    for (const gun of guns)
      for (let i = 0; i < VOLLEY; i++) {
        const b = fireBullet(
          gun,
          -Math.PI / 2 + VOLLEY_SPREAD * (i / (VOLLEY - 1) - 0.5),
          fireAtMs,
          vSpeed,
          box,
        );
        volley.push(b);
        if (i === (VOLLEY - 1) / 2) lasers.push(b);
      }

    // the wall dropping in, each drone blown apart as the spread reaches it
    let lastKill: number = fireAtMs;
    for (let r = 0; r < WALL_ROWS; r++)
      for (let c = 0; c < WALL_COLS; c++) {
        const x = WALL_X[0] + ((WALL_X[1] - WALL_X[0]) * c) / (WALL_COLS - 1);
        const y = WALL_ROW_Y[r];
        const px = view.x + w * x;
        const py = view.y + h * y;
        let reach = Infinity;
        for (const g of guns)
          reach = Math.min(reach, Math.hypot(px - g.x, py - g.y));
        const killAt = Math.round(fireAtMs + reach / vSpeed);
        lastKill = Math.max(lastKill, killAt);
        const e = shmupEnemy(view, {
          from: [x, y - 0.45],
          to: [x, y],
          enterAt: wallAtMs + c * 25 + r * 40,
          inMs: WALL_IN_MS,
          killAt,
          size: WALL,
          sway: 0.012,
          seed: r * 7 + c,
        });
        enemies.push(e);
        blasts.push({
          at: enemySpot(e, killAt),
          ms: killAt,
          size: WALL_BLAST * w,
          shake: 1.1,
          sound: (r * WALL_COLS + c) % 3 ? 0 : 1,
        });
      }
    const core: Point = {
      x: view.cx,
      y: view.y + h * WALL_ROW_Y[1],
    };
    const finale: Blast = {
      at: core,
      ms: lastKill + FINALE_AFTER,
      size: FINALE_BLAST * w,
      shake: 3.2,
      sound: 2,
    };
    blasts.push(finale);
    for (let k = 0; k < CLUSTER; k++) {
      const a = (k / CLUSTER) * Math.PI * 2 + 0.5;
      blasts.push({
        at: {
          x: core.x + Math.cos(a) * CLUSTER_REACH * w,
          y: core.y + Math.sin(a) * CLUSTER_REACH * w * 0.7,
        },
        ms: finale.ms + (k + 1) * CLUSTER_EVERY,
        size: CLUSTER_BLAST * w,
        shake: 1.5,
        sound: 1,
      });
    }

    const shipPoint: Point = { x: 0, y: 0 };
    const optionPaths: ((ms: number) => Point | null)[] = [];
    const capsulePaths: ((ms: number) => Point | null)[] = [];
    for (let k = 0; k < waves; k++) {
      const spot: Point = { x: 0, y: 0 };
      optionPaths.push((t) => optionAt(view, k, t, spot));
      const p = pickups[k];
      const cap: Point = { x: 0, y: 0 };
      capsulePaths.push((t) => {
        if (t < p.dropMs || t >= p.ms) return null;
        const s = easeOutCubic(clamp01((t - p.dropMs) / grabMs));
        cap.x = p.drop.x + (p.at.x - p.drop.x) * s;
        cap.y = p.drop.y + (p.at.y - p.drop.y) * s;
        return cap;
      });
    }
    return {
      enemies,
      shots,
      shotBullets: shots.map((s) => s.bullet),
      heat: enemies.map(() => 0),
      volley,
      lasers,
      guns,
      blasts,
      finale,
      shipPath: (t) => shipAt(view, t, shipPoint),
      optionPaths,
      capsulePaths,
    };
  };

  // each grab: its perma tiers, each worker one up while it can climb
  const pickupBeats = createBeats(
    pickups,
    (p) => p.ms,
    (p, k) => {
      let given = 0;
      for (const w of p.workers) {
        const { floor: f, workerIndex: i } = w.worker;
        if (getWorkerPermaTier(f, i) === CRIT_TIER_ORDER[0]) continue;
        promoteWorkerPermaTier(f, i);
        given++;
      }
      p.label = given > 0 ? `+${given} Perma` : null;
      playSimonNote(k + 1);
      shakeScreen(1 + 0.25 * k);
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
        playSpinTick(1 + 0.25 * i);
        shakeScreen(0.5 + 0.25 * i);
      }
    },
  );

  let planned: Plan | null = null;
  let blastBeats: Beats<Blast> | null = null;
  const ship: Point = { x: 0, y: 0 };

  // a white flash over the whole view, since ms after it struck
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

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
  ): void => {
    if (!planned) {
      planned = plan(view);
      blastBeats = createBeats(
        planned.blasts,
        (b) => b.ms,
        (b) => {
          if (b.sound === 2) {
            playSlamExplosion();
            playCritExplosion();
          } else if (b.sound === 1) playExplosion();
          shakeScreen(b.shake);
        },
      );
    }
    const p = planned;
    pickupBeats.tick(ms, now);
    chargeBeats.tick(ms, now);
    blastBeats?.tick(ms, now);
    drawStarfield(ctx, view, ms, now);

    // the capsules floating toward the ship, pulsing
    const w = view.w;
    for (let k = 0; k < waves; k++) {
      const cap = p.capsulePaths[k](ms);
      if (cap) {
        const half = CAPSULE_HALF * w;
        const r = CAPSULE_R * w * (1 + 0.12 * Math.sin(now * 0.025));
        ctx.beginPath();
        ctx.arc(cap.x - half, cap.y, r, Math.PI / 2, (Math.PI * 3) / 2);
        ctx.arc(cap.x + half, cap.y, r, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = COLOR.fullHouseCrimson;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.stroke();
      }
      drawWispBetween(
        ctx,
        p.capsulePaths[k],
        ms,
        now,
        CAPSULE_WISP,
        0.5 + 0.5 * Math.sin(now * 0.025),
        pickups[k].dropMs,
        pickups[k].ms,
      );
    }

    drawBullets(ctx, p.shotBullets, ms, now, SHOT_SIZE);
    shotHeat(p.shots, ms, p.heat);
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

    // the combined spread: every gun's middle shot a laser, then the shots
    if (ms >= fireAtMs) {
      for (let i = 0; i < p.lasers.length; i++) {
        const b = p.lasers[i];
        const head = b.at(ms);
        if (head) drawBeam(ctx, b.from, head, LASER_W * w, 1);
        else if (ms < b.hitAt + LASER_FADE_MS)
          drawBeam(
            ctx,
            b.from,
            b.to,
            LASER_W * w,
            1 - (ms - b.hitAt) / LASER_FADE_MS,
          );
      }
      drawBullets(ctx, p.volley, ms, now, VOLLEY_SIZE);
      for (let i = 0; i < p.guns.length; i++)
        drawMuzzleFlash(
          ctx,
          p.guns[i],
          -Math.PI / 2,
          (ms - fireAtMs) / MUZZLE_MS,
          MUZZLE * w,
        );
    }

    // the options, then the ship, swelling as they charge
    const charge = chargeAt(ms);
    for (let k = 0; k < waves; k++)
      drawWispBetween(
        ctx,
        p.optionPaths[k],
        ms,
        now,
        OPTION * (1 + CHARGE_SWELL * charge),
        charge,
        pickups[k].ms,
        Infinity,
      );
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

    // light pulled into the ship and its options while they charge
    if (charge > 0 && ms < fireAtMs) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      const gunCount = waves + 1;
      for (let i = 0; i < SPECKS; i++) {
        const g = i % gunCount;
        const at = g === 0 ? ship : p.optionPaths[g - 1](ms);
        if (!at) continue;
        const f = ((ms + hash01(i, 1) * SPECK_MS) % SPECK_MS) / SPECK_MS;
        const a = hash01(i, 2) * Math.PI * 2;
        const r = SPECK_REACH * w * (1 - f) ** 1.6;
        stampGlimmer(
          ctx,
          at.x + Math.cos(a) * r,
          at.y + Math.sin(a) * r,
          SPECK_SIZE * charge * (0.3 + 0.7 * f),
          now * 0.004 + i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }

    const blasts = p.blasts;
    for (let i = 0; i < blasts.length; i++) {
      const b = blasts[i];
      drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
    }

    // each grab's burst and tally over the ship
    for (let k = 0; k < waves; k++) {
      const pk = pickups[k];
      const since = ms - pk.ms;
      if (since < 0) continue;
      drawWhiteBurst(ctx, pk.at.x, pk.at.y, since / PICK_BURST_MS, 0.6);
      flash(ctx, view, since, PICK_FLASH);
      if (pk.label !== null && since < LABEL_MS) {
        const t = since / LABEL_MS;
        ctx.globalAlpha = 1 - smoothstep(clamp01((t - 0.6) / 0.4));
        drawPoppingCritText(
          ctx,
          pk.label,
          pk.at.x,
          pk.at.y - view.h * (LABEL_UP + LABEL_RISE * t),
          COLOR.heavenlyGold,
          now - since,
          now,
          k === waves - 1 ? LAST_LABEL_STYLE : LABEL_STYLE,
        );
        ctx.globalAlpha = 1;
      }
    }
    flash(ctx, view, ms - fireAtMs, VOLLEY_FLASH);
    const finaleSince = ms - p.finale.ms;
    if (finaleSince >= 0) {
      drawWhiteBurst(
        ctx,
        p.finale.at.x,
        p.finale.at.y,
        finaleSince / (FLASH_MS * 2),
        1.8,
      );
      flash(ctx, view, finaleSince, FINALE_FLASH);
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        drawScene(ctx, view, ms - enterMs, now);
        // the view lifting off the floors, which shrink away below
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
      // any grab or blast a dropped frame skipped still lands
      const now = performance.now();
      pickupBeats.tick(Infinity, now);
      blastBeats?.tick(Infinity, now);
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
