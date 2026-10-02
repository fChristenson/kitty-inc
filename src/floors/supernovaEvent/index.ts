// the "Supernova" event: it covers its crit, whose click freezes the screen
// while the wisp swells in the middle of the screen, pulsing ever faster as
// glitter streams into it and the screen rumbles, collapses to a point, then
// detonates: a blinding flash, a huge shake and a shockwave ring racing out
// across the screen. Every climbable worker it sweeps over lights up and
// climbs one perma tier. Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSlamExplosion, startBoostEventStreamLoop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion } from "../../shared/eventFx";
import { hash01 } from "../../shared/twinkle";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  promoteWorkerPermaTier,
} from "../worker";
import {
  drawStruckWorkers,
  findClimbers,
  spotlightWorkers,
  type OnScreenWorker,
} from "../onScreenWorkers";
import { clamp01 } from "../../shared/easing";

const KEY = "supernova";
// charging: swelling to SWELL times its size, pulsing from PULSE_HZ[0] to
// PULSE_HZ[1] by PULSE of its size, while the screen rumbles ever harder
const SWELL = 2.4;
const PULSE_HZ: [number, number] = [3, 14];
const PULSE = 0.18;
const RUMBLES = 5;
const RUMBLE_SHAKE: [number, number] = [0.15, 0.6];
// glitter streaming in from INFLOW_R px out, each taking INFLOW_MS
const INFLOW = 46;
const INFLOW_R: [number, number] = [220, 520];
const INFLOW_MS: [number, number] = [260, 520];
const INFLOW_SIZE = 9;
// the blast: a white flash over the whole screen, the explosion, and the
// shockwave ring racing out past the screen's corners
const SHAKE = 2.6;
const FLASH_MS = 280;
const BLAST_SCALE = 2;
const SPARK_SIZE = 24;
const RING_WIDTH = 26;
const RING_GLOW = 3;

interface RunningNova {
  floor: Floor;
  // the screen's middle and its reach to the farthest corner, local to floor
  center: Point;
  reach: number;
  area: { left: number; top: number; right: number; bottom: number };
  struck: { worker: OnScreenWorker; struckAt: number | null }[];
  startedAt: number;
  blastAt: number | null;
}

let running: RunningNova | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.supernovaEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      findClimbers(floor, context.getOnScreenFloors).length > 0,
    arm: startNova,
  },
  { label: "Supernova", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Supernova
export function forceSupernovaEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}


function blastMs(): number {
  const { chargeMs, collapseMs } = CONFIG.supernovaEvent;
  return chargeMs + collapseMs;
}

// the wisp's size ms in: swelling and pulsing ever faster, then collapsing
function novaSize(ms: number): number {
  const { chargeMs, collapseMs } = CONFIG.supernovaEvent;
  if (ms >= blastMs()) return 0;
  const u = clamp01(ms / chargeMs);
  const sec = ms / 1000;
  const hz = PULSE_HZ[0] + ((PULSE_HZ[1] - PULSE_HZ[0]) * u) / 2;
  const swell = 1 + (SWELL - 1) * u * u;
  const pulse = 1 + PULSE * u * Math.sin(sec * hz * Math.PI * 2);
  const collapse = 1 - clamp01((ms - chargeMs) / collapseMs) ** 0.5 * 0.9;
  return WISP_SIZE * swell * pulse * collapse;
}

// the shockwave's radius since the blast, or null once it's past the corners
function ringRadius(nova: RunningNova, since: number): number | null {
  const t = since / CONFIG.supernovaEvent.ringMs;
  if (t >= 1) return null;
  return nova.reach * (1 - (1 - t) ** 2);
}

// glitter streaming into the nova while it charges
function drawInflow(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  now: number,
): void {
  const { chargeMs } = CONFIG.supernovaEvent;
  const strength = clamp01(ms / chargeMs) * (ms < chargeMs ? 1 : 0);
  if (strength <= 0) return;
  for (let i = 0; i < INFLOW; i++) {
    const period = INFLOW_MS[0] + (INFLOW_MS[1] - INFLOW_MS[0]) * hash01(i, 81);
    const t = (ms / period + hash01(i, 82)) % 1;
    const angle = hash01(i, 83) * Math.PI * 2;
    const from = INFLOW_R[0] + (INFLOW_R[1] - INFLOW_R[0]) * hash01(i, 84);
    const r = from * (1 - t) ** 1.5;
    drawGlitterLight(
      ctx,
      at.x + Math.cos(angle) * r,
      at.y + Math.sin(angle) * r,
      INFLOW_SIZE * (0.5 + t),
      i,
      strength * Math.sin(Math.PI * t),
      now,
    );
  }
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  at: Point,
  radius: number,
  fade: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [width, color, alpha] of [
    [RING_WIDTH * RING_GLOW, COLOR.heavenlyGold, 0.25],
    [RING_WIDTH, COLOR.heavenlyGold, 0.7],
    [RING_WIDTH * 0.35, COLOR.white, 1],
  ] as const) {
    ctx.globalAlpha = alpha * fade;
    ctx.lineWidth = width * fade;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// every worker the ring has reached climbs, on the frame it's drawn reaching it
function strikeReached(
  nova: RunningNova,
  getFloorRect: FloorRectResolver,
  center: Point,
  radius: number,
  now: number,
): void {
  for (const entry of nova.struck) {
    if (entry.struckAt !== null) continue;
    const rect = getFloorRect(entry.worker.floor);
    if (!rect) continue;
    const dx = rect.left + entry.worker.center.x - center.x;
    const dy = rect.top + entry.worker.center.y - center.y;
    if (Math.hypot(dx, dy) > radius) continue;
    entry.struckAt = now;
    promoteWorkerPermaTier(entry.worker.floor, entry.worker.workerIndex);
    celebrateWorkerBoost(
      entry.worker.floor,
      entry.worker.workerIndex,
      Date.now(),
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const nova = running;
  if (!nova) return;
  const rect = getFloorRect(nova.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - nova.startedAt;
  if (nova.blastAt === null && ms >= blastMs()) blast(nova);
  const center = {
    x: rect.left + nova.center.x,
    y: rect.top + nova.center.y,
  };
  const since = nova.blastAt === null ? null : now - nova.blastAt;
  const radius = since === null ? null : ringRadius(nova, since);
  if (since !== null)
    strikeReached(nova, getFloorRect, center, radius ?? Infinity, now);

  drawStruckWorkers(ctx, getFloorRect, nova.struck, now);
  drawInflow(ctx, center, ms, now);
  drawWisp(
    ctx,
    (t) => (t >= 0 && t < blastMs() ? center : null),
    ms,
    now,
    novaSize(ms),
    clamp01(ms / CONFIG.supernovaEvent.chargeMs),
  );
  if (since === null) return;
  drawExplosion(
    ctx,
    center.x,
    center.y,
    since,
    now,
    BLAST_SCALE,
    nova.reach * 0.5,
    SPARK_SIZE,
  );
  if (radius !== null) drawRing(ctx, center, radius, 1 - radius / nova.reach);
  const flash = 1 - since / FLASH_MS;
  if (flash > 0) {
    const { area } = nova;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = flash;
    ctx.fillStyle = COLOR.white;
    ctx.fillRect(
      rect.left + area.left,
      rect.top + area.top,
      area.right - area.left,
      area.bottom - area.top,
    );
    ctx.restore();
  }
}

function blast(nova: RunningNova): void {
  nova.blastAt = nova.startedAt + blastMs();
  playSlamExplosion();
  shakeScreen(SHAKE);
}

function startNova(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  const workers = findClimbers(floor, context.getOnScreenFloors);
  if (running || isScreenFrozen() || !area || workers.length === 0) return;
  const { chargeMs, ringMs, holdMs } = CONFIG.supernovaEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const center = {
    x: (area.left + area.right) / 2,
    y: (area.top + area.bottom) / 2,
  };
  const nova: RunningNova = {
    floor,
    center,
    reach: Math.hypot(
      (area.right - area.left) / 2,
      (area.bottom - area.top) / 2,
    ),
    area,
    struck: workers.map((worker) => ({ worker, struckAt: null })),
    startedAt: performance.now(),
    blastAt: null,
  };
  running = nova;
  const isLive = () => running === nova;
  spotlightWorkers(workers);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  // the rumble building as it charges
  for (let i = 0; i < RUMBLES; i++) {
    const u = i / (RUMBLES - 1);
    setTimeout(
      () => {
        if (isLive())
          shakeScreen(
            RUMBLE_SHAKE[0] + (RUMBLE_SHAKE[1] - RUMBLE_SHAKE[0]) * u,
          );
      },
      chargeMs * (0.2 + 0.8 * u),
    );
  }

  setTimeout(
    () => {
      if (!isLive()) return;
      if (nova.blastAt === null) blast(nova);
      for (const entry of nova.struck)
        if (entry.struckAt === null) {
          entry.struckAt = performance.now();
          promoteWorkerPermaTier(entry.worker.floor, entry.worker.workerIndex);
        }
      running = null;
      stopSound();
      clearWorkerSpotlight();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    blastMs() + ringMs + holdMs,
  );
}
