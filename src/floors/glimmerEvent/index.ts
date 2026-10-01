// the "Glimmer" event: it covers its crit, whose click freezes the screen and
// spirals small glittering balls in from off screen into a swirling golden
// light on the left of its floor. The light then sweeps across the floor: each
// worker or manager it passes lights up, plays its boost and climbs one perma
// tier, while top-tier ones stay dimmed. Once it's across the screen unfreezes
// and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { randomInt } from "../../utils";
import { isFloorLocked } from "../../shared/detachedJob";
import {
  playExplosion,
  playSwoosh,
  startBoostEventStreamLoop,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  createEventFx,
  drawWhiteBurst,
  type EventFx,
} from "../../shared/eventFx";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import { drawGlimmer, drawGlimmerAura } from "../../shared/twinkle";
import { smoothstep } from "../../shared/easing";
import {
  freezeScreen,
  getScreenFreezeDim,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { FLOOR_W, FLOOR_X_MAX, FLOOR_X_MIN } from "../constants";
import { forceTestCrit } from "../upgradeButton";
import {
  drawStreamOverlay,
  EVENT_STREAM_DURATION_MS,
} from "../../shared/eventStream";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
  type OnScreenFloor,
} from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getBoostEventCandidates,
  getWorkerCenter,
  promoteWorkerPermaTier,
  setWorkerSpotlights,
  WORKER_HEIGHT,
} from "../worker";

const SIZE = WORKER_HEIGHT * 0.25;
const START_X = FLOOR_X_MIN;
const END_X = FLOOR_X_MAX + SIZE;
const SWIRL_GLIMMERS = 4;
const TRAIL_GLIMMERS = 6;
const TRAIL_MS = 45; // between the trail's glimmers along the light's path
// the jump to the next floor: aiming, the leap, then the landing's squash
const AIM_MS = 500;
const JUMP_MS = 260;
const LAND_MS = 450;
const HOP_MS = AIM_MS + JUMP_MS + LAND_MS;
const AIM_PULL = 0.6; // of SIZE, drawn back away from the target
const AIM_GLIMMERS = 5;
const LANDING_SHAKE = 0.8;
const FADE_OUT = 0.1; // of a sweep, shrinking away at the very end
// the intro: balls launched one after another from off screen, each spiralling
// in over INTRO_TRAVEL_MS so the last lands as the intro ends
const INTRO_BALLS = 12;
const INTRO_TRAVEL_MS = 900;
const INTRO_RADIUS = FLOOR_W * 1.6;
const INTRO_TURNS = 1.25;
const INTRO_BALL_SIZE = SIZE * 0.65;
const INTRO_TRAIL = 8;
const INTRO_TRAIL_STEP = 0.03; // of a ball's path between its trail's glimmers

interface IntroBall {
  launchAt: number;
  angle: number;
}

interface RunningGlimmer {
  // the floors it sweeps, in order
  legs: Leg[];
  balls: IntroBall[];
  startedAt: number;
  sweepAt: number | null;
  fx: EventFx;
}

// one floor the light crosses, right to left when reversed
interface Leg {
  floor: Floor;
  y: number;
  // every worker the light will pass, lit once it has
  candidates: number[];
  lit: Set<number>;
  reverse: boolean;
}

let running: RunningGlimmer | null = null;

// a sweep across floor, if it's open, in view and has a worker to promote
function planLeg(
  floor: Floor | undefined,
  onScreen: OnScreenFloor[] | undefined,
  reverse: boolean,
): Leg | null {
  if (!floor?.unlocked || isFloorLocked(floor)) return null;
  const candidates = getBoostEventCandidates(floor);
  // every worker walks at the same height
  const center = getWorkerCenter(floor, 0);
  const entry = onScreen?.find((f) => f.floor === floor);
  if (!center || !entry || !isVisibleOnFloor(entry, center.y)) return null;
  return { floor, y: center.y, candidates, lit: new Set(), reverse };
}

// the adjacent floors the light could hop to: never one with every worker maxed
function hopLegs(
  floor: Floor,
  context: EventProcContext,
  onScreen: OnScreenFloor[] | undefined,
): Leg[] {
  const index = context.floors.indexOf(floor);
  return [index - 1, index + 1]
    .map((i) => planLeg(context.floors[i], onScreen, true))
    .filter((leg): leg is Leg => leg !== null && leg.candidates.length > 0);
}

// the 50% hop, rolled when the crit is claimed so its button only shows when
// the light can promote someone; arming it (context with a tier) reuses that roll
const hopRolls = new WeakMap<Floor, boolean>();
function rollHop(floor: Floor, context: EventProcContext): boolean {
  if (context.critTier === undefined || !hopRolls.has(floor))
    hopRolls.set(floor, Math.random() < CONFIG.glimmerEvent.moveFloorChance);
  return hopRolls.get(floor)!;
}

// the proc floor sweeps even when all maxed, as long as the hop happens
function canStart(floor: Floor, context: EventProcContext): boolean {
  const onScreen = context.getOnScreenFloors?.();
  const first = planLeg(floor, onScreen, false);
  if (!first) return false;
  const canHop = hopLegs(floor, context, onScreen).length > 0;
  // rolled first, so the claim's roll always runs
  const hop = rollHop(floor, context) && canHop;
  return first.candidates.length > 0 || hop;
}

registerEventProc(
  {
    key: "glimmer",
    chance: () => CONFIG.glimmerEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && canStart(floor, context),
    arm: startGlimmer,
  },
  { label: "Glimmer", color: COLOR.gold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Glimmer
export function forceGlimmerEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc("glimmer", floor);
}

// the swirling light at (x, y), grown 0..1 and washed `white` toward white
function drawLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  growth: number,
  white: number,
  now: number,
): void {
  const size = SIZE * growth;
  if (size <= 0) return;
  drawGoldShimmer(ctx, x, y, size * 0.9, 1, 3, now);
  const spin = ((now / 1000) * 5) % (Math.PI * 2);
  for (let i = 0; i < SWIRL_GLIMMERS; i++) {
    const angle = spin + (i / SWIRL_GLIMMERS) * Math.PI * 2;
    const radius = size * (0.3 + 0.1 * Math.sin(spin * 2 + i));
    drawGlimmer(
      ctx,
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      size * 0.25,
      angle,
      COLOR.heavenlyGold,
    );
  }
  drawGlimmerAura(
    ctx,
    x,
    y + size * 0.6,
    size * 1.2,
    size * 1.2,
    size * 0.3,
    COLOR.heavenlyGold,
    SIZE,
    now,
  );
  drawGlimmer(ctx, x, y, size * (0.35 + 0.25 * white), -spin, COLOR.white);
}

// a leg's promotable workers: dimmed like the frozen frame until lit
function drawCandidates(ctx: CanvasRenderingContext2D, leg: Leg): void {
  const dim = `brightness(${1 - getScreenFreezeDim()})`;
  for (const index of leg.candidates) {
    ctx.save();
    if (!leg.lit.has(index)) ctx.filter = dim;
    drawWorkerSpotlight(ctx, leg.floor, index, 0, 0);
    ctx.restore();
  }
}

// where a ball is p (0..1) along its spiral into the light's start
function introPoint(ball: IntroBall, y: number, p: number) {
  const radius = INTRO_RADIUS * (1 - p) ** 1.5;
  const angle = ball.angle + p * INTRO_TURNS * Math.PI * 2;
  return {
    x: START_X + Math.cos(angle) * radius,
    y: y + Math.sin(angle) * radius,
  };
}

// the balls spiralling in, each with a glittering trail
function drawIntroBalls(
  ctx: CanvasRenderingContext2D,
  glimmer: RunningGlimmer,
  now: number,
): void {
  for (const ball of glimmer.balls) {
    const p = (now - ball.launchAt) / INTRO_TRAVEL_MS;
    if (p <= 0 || p >= 1) continue;
    for (let k = INTRO_TRAIL; k >= 1; k--) {
      const q = p - k * INTRO_TRAIL_STEP;
      if (q <= 0) continue;
      const point = introPoint(ball, glimmer.legs[0].y, q);
      drawGlimmer(
        ctx,
        point.x,
        point.y,
        INTRO_BALL_SIZE * (1 - k / (INTRO_TRAIL + 1)),
        now / 200 + k,
        COLOR.heavenlyGold,
      );
    }
    const head = introPoint(ball, glimmer.legs[0].y, p);
    drawGoldShimmer(ctx, head.x, head.y, INTRO_BALL_SIZE * 1.2, 1, 3, now);
    drawGlimmer(
      ctx,
      head.x,
      head.y,
      INTRO_BALL_SIZE * 1.3,
      now / 150,
      COLOR.heavenlyGold,
    );
  }
}

// the whole sweep: each leg, with a hop between floors
function sweepTotalMs(glimmer: RunningGlimmer): number {
  const legs = glimmer.legs.length;
  return CONFIG.glimmerEvent.sweepMs * legs + HOP_MS * (legs - 1);
}

// the light t (0..1) through leg, in world space
function legPoint(
  leg: Leg,
  t: number,
  getFloorRect: FloorRectResolver,
): { x: number; y: number } | null {
  const rect = getFloorRect(leg.floor);
  if (!rect) return null;
  const along = leg.reverse ? 1 - t : t;
  return {
    x: rect.left + START_X + (END_X - START_X) * along,
    y: rect.top + leg.y,
  };
}

// where the light is `elapsed` ms into its sweep, in world space, and how it's
// warped: squashed and pulled back as it aims at the next floor, stretched as
// it leaps and squashing on the landing, which bursts out `impact` (0..1)
interface LightPose {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  aim?: { x: number; y: number; strength: number };
  impact?: number;
}

function lightAt(
  glimmer: RunningGlimmer,
  elapsed: number,
  getFloorRect: FloorRectResolver,
): LightPose | null {
  const sweepMs = CONFIG.glimmerEvent.sweepMs;
  const legMs = sweepMs + HOP_MS;
  const i = Math.min(glimmer.legs.length - 1, Math.floor(elapsed / legMs));
  const inLeg = elapsed - i * legMs;
  const leg = glimmer.legs[i];
  if (inLeg <= sweepMs || i === glimmer.legs.length - 1) {
    const point = legPoint(leg, Math.min(1, inLeg / sweepMs), getFloorRect);
    return point && { ...point, scaleX: 1, scaleY: 1 };
  }
  const from = legPoint(leg, 1, getFloorRect);
  const to = legPoint(glimmer.legs[i + 1], 0, getFloorRect);
  if (!from || !to) return null;
  const dir = Math.sign(to.y - from.y) || 1;
  const pulledY = from.y - dir * SIZE * AIM_PULL;
  const hopMs = inLeg - sweepMs;
  if (hopMs < AIM_MS) {
    const a = smoothstep(hopMs / AIM_MS);
    const quiver = Math.sin(hopMs / 16) * 0.1 * a;
    return {
      x: from.x + Math.sin(hopMs / 23) * SIZE * 0.06 * a,
      y: from.y + (pulledY - from.y) * a,
      scaleX: 1 + 0.4 * a + quiver,
      scaleY: 1 - 0.4 * a - quiver,
      aim: { ...to, strength: a },
    };
  }
  if (hopMs < AIM_MS + JUMP_MS) {
    const j = (hopMs - AIM_MS) / JUMP_MS;
    const e = j * j;
    const stretch = Math.sin(Math.PI * Math.min(1, j * 1.2));
    return {
      x: from.x + (to.x - from.x) * e,
      y: pulledY + (to.y - pulledY) * e,
      scaleX: 1 - 0.35 * stretch,
      scaleY: 1 + 0.9 * stretch,
    };
  }
  const l = (hopMs - AIM_MS - JUMP_MS) / LAND_MS;
  const spring = Math.cos(l * Math.PI * 3) * (1 - l) ** 2;
  return {
    ...to,
    scaleX: 1 + 0.55 * spring,
    scaleY: 1 - 0.55 * spring,
    impact: l,
  };
}

// a line of glimmers marching from the light toward where it'll land
function drawAim(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  aim: { x: number; y: number; strength: number },
  now: number,
): void {
  for (let i = 0; i < AIM_GLIMMERS; i++) {
    const along = (i + ((now / 300) % 1)) / AIM_GLIMMERS;
    drawGlimmer(
      ctx,
      from.x + (aim.x - from.x) * along,
      from.y + (aim.y - from.y) * along,
      SIZE * 0.18 * aim.strength * Math.sin(Math.PI * along),
      now / 200 + i,
      COLOR.heavenlyGold,
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const glimmer = running;
  if (!glimmer) return;
  const first = glimmer.legs[0];
  const rect = getFloorRect(first.floor);
  if (!rect) return;
  const now = performance.now();
  for (const leg of glimmer.legs) {
    const legRect = getFloorRect(leg.floor);
    if (!legRect) continue;
    ctx.save();
    ctx.translate(legRect.left, legRect.top);
    drawCandidates(ctx, leg);
    ctx.restore();
  }
  if (glimmer.sweepAt === null) {
    const growth = smoothstep(
      Math.min(
        1,
        Math.max(
          0,
          (now - glimmer.startedAt - INTRO_TRAVEL_MS) /
            (EVENT_STREAM_DURATION_MS - INTRO_TRAVEL_MS),
        ),
      ),
    );
    drawStreamOverlay(
      ctx,
      getFloorRect,
      first.floor,
      glimmer.fx,
      START_X,
      first.y,
      (tension) => drawLight(ctx, START_X, first.y, growth, tension.white, now),
    );
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawIntroBalls(ctx, glimmer, now);
    ctx.restore();
    return;
  }
  const elapsed = now - glimmer.sweepAt;
  const remaining = sweepTotalMs(glimmer) - elapsed;
  const growth = Math.max(
    0,
    Math.min(1, remaining / (CONFIG.glimmerEvent.sweepMs * FADE_OUT)),
  );
  const light = lightAt(glimmer, elapsed, getFloorRect);
  if (!light) return;
  // glitter left behind along its path
  for (let i = 1; i <= TRAIL_GLIMMERS; i++) {
    const point = lightAt(glimmer, elapsed - i * TRAIL_MS, getFloorRect);
    if (!point || elapsed - i * TRAIL_MS < 0) continue;
    const fade = 1 - i / (TRAIL_GLIMMERS + 1);
    drawGlimmer(
      ctx,
      point.x,
      point.y + Math.sin(now / 90 + i * 1.7) * SIZE * 0.25,
      SIZE * 0.2 * fade * growth,
      now / 300 + i,
      COLOR.heavenlyGold,
    );
  }
  drawLightPose(ctx, light, growth, now);
}

function drawLightPose(
  ctx: CanvasRenderingContext2D,
  light: LightPose,
  growth: number,
  now: number,
): void {
  if (light.aim) drawAim(ctx, light, light.aim, now);
  if (light.impact !== undefined)
    drawWhiteBurst(ctx, light.x, light.y, light.impact, 0.45);
  ctx.save();
  ctx.translate(light.x, light.y);
  ctx.scale(light.scaleX, light.scaleY);
  ctx.translate(-light.x, -light.y);
  drawLight(ctx, light.x, light.y, growth, 0, now);
  ctx.restore();
}

// lights up, boosts and promotes a worker as the light passes it
function passWorker(glimmer: RunningGlimmer, leg: Leg, index: number): void {
  if (running !== glimmer) return;
  promoteWorkerPermaTier(leg.floor, index);
  celebrateWorkerBoost(leg.floor, index, Date.now());
  leg.lit.add(index);
}

function startSweep(glimmer: RunningGlimmer, onEnd: () => void): void {
  glimmer.sweepAt = performance.now();
  const sweepMs = CONFIG.glimmerEvent.sweepMs;
  glimmer.legs.forEach((leg, i) => {
    const legStart = i * (sweepMs + HOP_MS);
    if (i > 0) {
      const hopAt = legStart - HOP_MS;
      setTimeout(() => {
        if (running === glimmer) playSwoosh();
      }, hopAt + AIM_MS);
      setTimeout(
        () => {
          if (running !== glimmer) return;
          playExplosion();
          shakeScreen(LANDING_SHAKE);
        },
        hopAt + AIM_MS + JUMP_MS,
      );
    }
    for (const index of leg.candidates) {
      const center = getWorkerCenter(leg.floor, index);
      if (!center) continue;
      const along = (center.x - START_X) / (END_X - START_X);
      const t = Math.min(1, Math.max(0, leg.reverse ? 1 - along : along));
      setTimeout(() => passWorker(glimmer, leg, index), legStart + t * sweepMs);
    }
  });
  // scheduled after the passes, so the last one still lands first
  setTimeout(onEnd, sweepTotalMs(glimmer));
}

function startGlimmer(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen() || !canStart(floor, context)) return;
  const onScreen = context.getOnScreenFloors?.();
  const first = planLeg(floor, onScreen, false);
  if (!first) return;
  const legs = [first];
  if (hopRolls.get(floor)) {
    const neighbors = hopLegs(floor, context, onScreen);
    if (neighbors.length > 0)
      legs.push(neighbors[randomInt(0, neighbors.length - 1)]);
  }
  hopRolls.delete(floor);
  const tier = context.critTier ?? pickCritTierByOdds();
  const startedAt = performance.now();
  const launchSpan = EVENT_STREAM_DURATION_MS - INTRO_TRAVEL_MS;
  const firstAngle = Math.random() * Math.PI * 2;
  const glimmer: RunningGlimmer = {
    legs,
    // golden-angle spacing, so they come in from all around
    balls: Array.from({ length: INTRO_BALLS }, (_, i) => ({
      launchAt: startedAt + (launchSpan * i) / (INTRO_BALLS - 1),
      angle: firstAngle + i * 2.39996,
    })),
    startedAt,
    sweepAt: null,
    fx: createEventFx(EVENT_STREAM_DURATION_MS),
  };
  running = glimmer;
  // left out of the frozen frame: the overlay draws them, dimmed until lit
  setWorkerSpotlights(
    legs.map((leg) => ({ floor: leg.floor, workerIndexes: leg.candidates })),
  );
  freezeScreen(drawOverlay);
  // the jackpot sound lasts as long as the light is on screen
  const stopSound = startBoostEventStreamLoop();
  for (const ball of glimmer.balls)
    setTimeout(
      () => {
        if (running === glimmer) glimmer.fx.hit(performance.now());
      },
      ball.launchAt - startedAt + INTRO_TRAVEL_MS,
    );

  setTimeout(() => {
    if (running !== glimmer) return;
    startSweep(glimmer, () => {
      if (running !== glimmer) return;
      running = null;
      stopSound();
      clearWorkerSpotlight();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc("glimmer");
    });
  }, EVENT_STREAM_DURATION_MS);
}
