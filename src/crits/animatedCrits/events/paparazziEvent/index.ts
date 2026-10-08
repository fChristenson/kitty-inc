// the "Paparazzi" event: it covers its crit, whose click freezes the screen
// while camera flashes start going off round the clicked floor's workers like
// a press scrum: white flashbulb bursts popping at random spots, ever faster,
// each a pop and a jolt, and every worker caught in one strikes a pose; a
// worker's first flash lifts it out of the dark and it climbs one perma tier.
// Then every camera fires at once in one huge flash, blast and shake, the
// screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBloop,
  playSlamExplosion,
  startBoostEventStreamLoop,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawTwinkle } from "../../../../shared/twinkle";
import {
  drawFreezeDimmed,
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  promoteWorkerPermaTier,
  WORKER_FEET_Y,
  WORKER_HEIGHT,
} from "../../../../floors/worker";
import {
  findOnScreenWorkers,
  isClimber,
  spotlightWorkers,
  type OnScreenWorker,
} from "../../onScreenWorkers";
import { lerp, clamp01 } from "../../../../shared/easing";

const KEY = "paparazzi";
// flashes per worker on the floor, at least MIN_FLASHES in all; each lands up
// to SCATTER of the worker's height from its middle
const FLASHES_PER_WORKER = 7;
const MIN_FLASHES = 18;
const SCATTER = 0.55;
// each flash: a white burst and a flashbulb glint of FLASH_GLINT px
const FLASH_BURST = 0.22;
const FLASH_MS = 220;
const FLASH_GLINT = 90;
const FLASH_SHAKE: [number, number] = [0.15, 0.5];
// a worker caught in one strikes a pose: stretching POSE tall and settling
const POSE = 0.16;
const POSE_MS = 240;
// every camera at once
const FINAL_SHAKE = 2.4;
const FINAL_GLINT = 260;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

interface Flash {
  worker: number;
  x: number;
  y: number;
  turn: number;
  // ms in that it fires, and performance.now() once it has
  at: number;
  firedAt: number | null;
}

interface Subject {
  worker: OnScreenWorker;
  climbs: boolean;
  // performance.now() of its first flash and its latest
  litAt: number | null;
  posedAt: number | null;
}

interface RunningPaparazzi {
  floor: Floor;
  subjects: Subject[];
  flashes: Flash[];
  center: { x: number; y: number };
  startedAt: number;
  finalAt: number;
  firedFinalAt: number | null;
}

let running: RunningPaparazzi | null = null;

// every worker on floor in view
function subjectsOn(floor: Floor, context: EventProcContext): OnScreenWorker[] {
  return (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []).filter(
    (w) => w.floor === floor,
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.paparazziEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      subjectsOn(floor, context).some(isClimber),
    arm: startPaparazzi,
  },
  { label: "Paparazzi", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Paparazzi
export function forcePaparazziEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the flashes at random, piling up toward the end; every worker's first
// comes early enough to be seen
function planFlashes(workers: OnScreenWorker[]): Flash[] {
  const { flashMs } = CONFIG.paparazziEvent;
  const count = Math.max(MIN_FLASHES, workers.length * FLASHES_PER_WORKER);
  const flashes: Flash[] = [];
  for (let i = 0; i < count; i++) {
    const w = i % workers.length;
    const worker = workers[w];
    const share =
      i < workers.length ? Math.random() * 0.5 : Math.sqrt(Math.random());
    flashes.push({
      worker: w,
      x: worker.center.x + (Math.random() * 2 - 1) * WORKER_HEIGHT * SCATTER,
      y: worker.center.y + (Math.random() * 2 - 1) * WORKER_HEIGHT * SCATTER,
      turn: Math.random(),
      at: share * flashMs,
      firedAt: null,
    });
  }
  return flashes.sort((a, b) => a.at - b.at);
}

// every flash, then every camera at once, on the frame each is due
function landBeats(pap: RunningPaparazzi, ms: number, now: number): void {
  const { flashMs } = CONFIG.paparazziEvent;
  for (const flash of pap.flashes) {
    if (flash.firedAt !== null || ms < flash.at) continue;
    flash.firedAt = now;
    playBloop();
    shakeScreen(lerp(FLASH_SHAKE, flash.at / flashMs));
    const subject = pap.subjects[flash.worker];
    subject.posedAt = now;
    if (subject.litAt !== null) continue;
    subject.litAt = now;
    if (!subject.climbs) continue;
    const { floor, workerIndex } = subject.worker;
    promoteWorkerPermaTier(floor, workerIndex);
    celebrateWorkerBoost(floor, workerIndex, Date.now());
  }
  if (pap.firedFinalAt === null && ms >= pap.finalAt) {
    pap.firedFinalAt = now;
    playSlamExplosion();
    shakeScreen(FINAL_SHAKE);
    for (const subject of pap.subjects) subject.posedAt = now;
  }
}

function drawSubject(
  ctx: CanvasRenderingContext2D,
  subject: Subject,
  now: number,
): void {
  const { worker } = subject;
  const t =
    subject.posedAt === null ? 1 : clamp01((now - subject.posedAt) / POSE_MS);
  const stretch = 1 + POSE * Math.sin(Math.PI * t) * (1 - t);
  ctx.save();
  ctx.translate(worker.center.x, WORKER_FEET_Y);
  ctx.scale(1 / Math.sqrt(stretch), stretch);
  ctx.translate(-worker.center.x, -WORKER_FEET_Y);
  drawWorkerSpotlight(ctx, worker.floor, worker.workerIndex, 0, 0);
  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const pap = running;
  if (!pap) return;
  const rect = getFloorRect(pap.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - pap.startedAt;
  landBeats(pap, ms, now);
  ctx.save();
  ctx.translate(rect.left, rect.top);

  // the workers stay in the dark until a flash catches them
  drawFreezeDimmed(
    ctx,
    (layer) => {
      for (const subject of pap.subjects)
        if (subject.litAt === null) drawSubject(layer, subject, now);
    },
    [pap, pap.subjects.filter((s) => s.litAt === null).length],
  );
  for (const subject of pap.subjects)
    if (subject.litAt !== null) drawSubject(ctx, subject, now);

  for (const flash of pap.flashes) {
    if (flash.firedAt === null) continue;
    const t = (now - flash.firedAt) / FLASH_MS;
    if (t >= 1) continue;
    drawWhiteBurst(ctx, flash.x, flash.y, t, FLASH_BURST);
    drawTwinkle(
      ctx,
      flash.x,
      flash.y,
      FLASH_GLINT * Math.sin(Math.PI * Math.min(1, t * 1.5)),
      flash.turn,
    );
  }
  if (pap.firedFinalAt !== null) {
    const since = now - pap.firedFinalAt;
    drawExplosion(
      ctx,
      pap.center.x,
      pap.center.y,
      since,
      now,
      BLAST_SCALE,
      SPARK_REACH,
      SPARK_SIZE,
    );
    const t = since / FLASH_MS;
    if (t < 1)
      drawTwinkle(
        ctx,
        pap.center.x,
        pap.center.y,
        FINAL_GLINT * Math.sin(Math.PI * t),
        t * 0.5,
      );
  }
  ctx.restore();
}

function startPaparazzi(floor: Floor, context: EventProcContext): void {
  const workers = subjectsOn(floor, context);
  if (running || isScreenFrozen() || workers.length === 0) return;
  const { flashMs, finalGapMs, holdMs } = CONFIG.paparazziEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const pap: RunningPaparazzi = {
    floor,
    subjects: workers.map((worker) => ({
      worker,
      climbs: isClimber(worker),
      litAt: null,
      posedAt: null,
    })),
    flashes: planFlashes(workers),
    center: {
      x: workers.reduce((sum, w) => sum + w.center.x, 0) / workers.length,
      y: workers.reduce((sum, w) => sum + w.center.y, 0) / workers.length,
    },
    startedAt: performance.now(),
    finalAt: flashMs + finalGapMs,
    firedFinalAt: null,
  };
  running = pap;
  const isLive = () => running === pap;
  spotlightWorkers(workers);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (!isLive()) return;
    for (const subject of pap.subjects)
      if (subject.litAt === null && subject.climbs)
        promoteWorkerPermaTier(
          subject.worker.floor,
          subject.worker.workerIndex,
        );
    running = null;
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the promotions
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, pap.finalAt + holdMs);
}
