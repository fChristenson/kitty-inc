// the "Mentor" event: it covers its crit, whose click freezes the screen while
// the top-tier worker in view glows and streams glimmer lights into the
// lowest-tier one, which brightens as they land and climbs up to two perma
// tiers, never past its mentor's. Then the screen unfreezes and the crit's
// tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { startBoostEventStreamLoop } from "../../sound";
import { critTierRank, pickCritTierByOdds } from "../../shared/critTypes";
import { drawWhiteBurst } from "../../shared/eventFx";
import { drawEventStreams, streamGlimmers } from "../../shared/eventStream";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import {
  freezeScreen,
  getScreenFreezeDim,
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
  drawWorkerSpotlight,
  getBoostEventCandidates,
  getWorkerPermaTier,
  promoteWorkerPermaTier,
  setWorkerSpotlights,
  WORKER_HEIGHT,
} from "../worker";
import { findOnScreenWorkers, type OnScreenWorker } from "../onScreenWorkers";

const KEY = "mentor";
const MAX_STEPS = 2;
// the mentor's glow, and the pulse each landing light gives the student
const MENTOR_GLOW = WORKER_HEIGHT * 0.6;
const STUDENT_GLOW = WORKER_HEIGHT * 0.45;
const PULSE_MS = 250;
const BURST_MS = 500;

interface RunningMentor {
  mentor: OnScreenWorker;
  student: OnScreenWorker;
  startedAt: number;
  lastLandedAt: number;
  promotedAt: number | null;
}

let running: RunningMentor | null = null;

const rankOf = (w: OnScreenWorker) =>
  critTierRank(getWorkerPermaTier(w.floor, w.workerIndex));

const pickRandom = <T>(pool: T[]): T =>
  pool[Math.floor(Math.random() * pool.length)];

// the top-tier worker in view and the lowest climbable one below its tier
function findPair(
  floor: Floor,
  context: EventProcContext,
): { mentor: OnScreenWorker; student: OnScreenWorker } | null {
  const workers = findOnScreenWorkers(floor, context.getOnScreenFloors) ?? [];
  if (workers.length < 2) return null;
  const top = Math.max(...workers.map(rankOf));
  const students = workers.filter(
    (w) =>
      rankOf(w) < top &&
      getBoostEventCandidates(w.floor).includes(w.workerIndex),
  );
  if (top === 0 || students.length === 0) return null;
  const lowest = Math.min(...students.map(rankOf));
  return {
    mentor: pickRandom(workers.filter((w) => rankOf(w) === top)),
    student: pickRandom(students.filter((w) => rankOf(w) === lowest)),
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.mentorEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && findPair(floor, context) !== null,
    arm: startMentor,
  },
  { label: "Mentor", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Mentor
export function forceMentorEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const now = performance.now();
  const { streamMs } = CONFIG.mentorEvent;
  const progress = Math.min(1, (now - event.startedAt) / streamMs);
  const streaming = progress < 1 ? 1 : 0;
  // the student brightens out of the dimmed frame as the lights land
  const studentDim = getScreenFreezeDim() * (1 - progress);
  for (const [worker, dim] of [
    [event.mentor, 0],
    [event.student, studentDim],
  ] as const) {
    const rect = getFloorRect(worker.floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawWorkerSpotlight(ctx, worker.floor, worker.workerIndex, 0, 0, dim);
    ctx.restore();
  }

  const mentorRect = getFloorRect(event.mentor.floor);
  if (mentorRect)
    drawGoldShimmer(
      ctx,
      mentorRect.left + event.mentor.center.x,
      mentorRect.top + event.mentor.center.y,
      MENTOR_GLOW,
      streaming,
      2,
      now,
      COLOR.heavenlyGold,
    );
  const studentRect = getFloorRect(event.student.floor);
  if (studentRect) {
    const x = studentRect.left + event.student.center.x;
    const y = studentRect.top + event.student.center.y;
    const pulse = Math.max(0, 1 - (now - event.lastLandedAt) / PULSE_MS);
    if (pulse > 0)
      drawGoldShimmer(
        ctx,
        x,
        y,
        STUDENT_GLOW,
        pulse,
        3,
        now,
        COLOR.heavenlyGold,
      );
    if (event.promotedAt !== null)
      drawWhiteBurst(ctx, x, y, (now - event.promotedAt) / BURST_MS, 0.4);
  }
  drawEventStreams(ctx, getFloorRect);
}

function startMentor(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const pair = findPair(floor, context);
  const mentorRect = pair && context.getFloorRect?.(pair.mentor.floor);
  const studentRect = pair && context.getFloorRect?.(pair.student.floor);
  if (!pair || !mentorRect || !studentRect) return;
  const { mentor, student } = pair;
  const { streamMs, holdMs } = CONFIG.mentorEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningMentor = {
    mentor,
    student,
    startedAt: performance.now(),
    lastLandedAt: 0,
    promotedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlights(
    mentor.floor === student.floor
      ? [
          {
            floor: mentor.floor,
            workerIndexes: [mentor.workerIndex, student.workerIndex],
          },
        ]
      : [
          { floor: mentor.floor, workerIndexes: [mentor.workerIndex] },
          { floor: student.floor, workerIndexes: [student.workerIndex] },
        ],
  );
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  streamGlimmers(
    [
      {
        floor: mentor.floor,
        x: mentor.center.x,
        y: mentor.center.y,
        spreadX: WORKER_HEIGHT * 0.3,
        spreadY: WORKER_HEIGHT * 0.5,
      },
    ],
    {
      // local to the mentor's floor, like the lights' start
      target: {
        x: studentRect.left + student.center.x - mentorRect.left,
        y: studentRect.top + student.center.y - mentorRect.top,
      },
      durationMs: streamMs,
      isRunning: isLive,
      onEachArrive: () => {
        event.lastLandedAt = performance.now();
      },
    },
  );

  // a tier at the halfway mark and one at the end, never past the mentor's
  for (let step = 1; step <= MAX_STEPS; step++) {
    setTimeout(
      () => {
        if (!isLive() || rankOf(student) >= rankOf(mentor)) return;
        event.promotedAt = performance.now();
        promoteWorkerPermaTier(student.floor, student.workerIndex);
        celebrateWorkerBoost(student.floor, student.workerIndex, Date.now());
      },
      (streamMs * step) / MAX_STEPS,
    );
  }

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the promotion
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, streamMs + holdMs);
}
