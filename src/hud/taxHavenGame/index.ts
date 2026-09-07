import { drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import {
  drawTrailLine,
  drawTrailHead,
  type TrailPoint,
} from "../../shared/canvasGame";
import { drawActiveCoinBursts } from "../../coinBurst";
import {
  wireConferenceMinigame,
  TRAIL_SAMPLE_DX,
  LINE_WIDTH,
  LINE_COLOR,
  HEAD_RADIUS,
  HEAD_X_OFFSET_FROM_CENTER,
  computeMaxTrailLength,
  type MinigameState,
  type ConferenceMinigame,
} from "../../shared/conferenceMinigame";
import { addAssetsMovedPercent } from "../corporationBoostMenu";

// "Tax Haven": copied from hud/payTaxes's own drag-controlled ship (see that
// file for the base mechanic), but with no double tap at all — instead, a
// fixed swarm of Taxes words buzzes near the screen edges, only actually
// homing in (at twice the line's own scroll speed) once the ship strays off
// the purple "safe line" (the same purple CRIT_TIER_CONFIG's x5 tier uses);
// harmless and idle the whole time it's on that line. The safe line itself
// scrolls left with everything else and keeps its own queue extended well
// past the right edge, so new turns are always visible before the ship ever
// reaches them — flat for its own first stretch, then a bounded random walk.
// Hitting either the left/right edge, or a Taxes word while off the safe
// line, ends the round; the vertical position is just clamped to the
// playable area
const SCROLL_SPEED_PX_S = 160;
// spaceship-style easing: the ship accelerates toward wherever the drag
// target (state.headX/headY, moved 1:1 by the shared engine's own
// pointermove handling) currently is, rather than snapping straight to it —
// SHIP_SPRING_PER_S2 pulls it in, SHIP_DAMPING_PER_S bleeds off velocity so
// it settles instead of oscillating forever
const SHIP_SPRING_PER_S2 = 30;
const SHIP_DAMPING_PER_S = 5;
// "Assets moved %" (see hud/corporationBoostMenu's own persisted stat) —
// flat rate per second survived, same ambient-only convention every other
// minigame's own modifier starts from
const ASSETS_MOVED_PERCENT_PER_SECOND = 0.05;
// "Taxes" obstacles: same big bold red/white cartoon-text style
// pressConferenceGame's own MARKET_CRASH_TEXT uses — the shared "danger red
// text" convention
const TAXES_FONT = '900 15px "Fredoka", system-ui, sans-serif';
const TAXES_STROKE_WIDTH = 6;

// pre-rendered once and reused every frame after — re-running strokeText +
// fillText for every one of the swarm's words every frame is real, avoidable
// canvas cost, especially on mobile; the text/style never changes, so a
// small cached bitmap drawImage'd in its place is far cheaper (same idea
// screenShake's own bloom-text caching uses)
let taxesLabelBitmap: HTMLCanvasElement | null = null;

function getTaxesLabelBitmap(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  if (taxesLabelBitmap) return taxesLabelBitmap;
  ctx.font = TAXES_FONT;
  const metrics = ctx.measureText("Taxes");
  const padding = TAXES_STROKE_WIDTH;
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(
    (metrics.actualBoundingBoxAscent || 12) +
      (metrics.actualBoundingBoxDescent || 4) +
      padding * 2,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const bitmapCtx = canvas.getContext("2d")!;
  bitmapCtx.font = TAXES_FONT;
  bitmapCtx.textAlign = "center";
  bitmapCtx.textBaseline = "middle";
  drawCartoonText(
    bitmapCtx,
    "Taxes",
    width / 2,
    height / 2,
    COLOR.red,
    COLOR.white,
    TAXES_STROKE_WIDTH,
  );
  taxesLabelBitmap = canvas;
  return canvas;
}
const SWARM_SIZE = 8;
// halved from the old flat 2x-scroll-speed baseline, then halved again
// (slower overall), then ramps back up over time (see
// getTaxesHomingSpeedPxS) up to 3x this new base once fully ramped — only
// applies while actually attacking (see step's own onSafeLine gating)
const TAXES_HOMING_SPEED_BASE_PX_S = SCROLL_SPEED_PX_S / 2;
const TAXES_HOMING_SPEED_MAX_MULTIPLIER = 3;
const TAXES_HOMING_SPEED_RAMP_DURATION_S = 60;
// idle "buzzing fly" motion while the ship is safe: circles its own edge
// anchor at a random radius/angular speed, with extra random jitter layered
// on top for an erratic, fly-like wobble instead of a smooth orbit — both
// halved (slower overall) along with the attack speed above
const BUZZ_JITTER_PX_S = 120;
const BUZZ_ORBIT_RADIUS_MIN_PX = 30;
const BUZZ_ORBIT_RADIUS_MAX_PX = 60;
const BUZZ_ORBIT_ANGULAR_SPEED_RAD_PER_S = 1.5;
// proportional "seek" gain converting the idle orbit's own position error
// into a desired velocity (see step) — same units/role as the attack speed,
// just for idling instead of homing
const BUZZ_ORBIT_SEEK_RATE_PER_S = 4;
// how fast a word's actual velocity blends toward whatever direction/speed
// the current mode wants — lower reads as more sluggish to turn, higher as
// snappier; either way it's always a blend, never an instant snap
const TAXES_STEER_RATE_PER_S = 5;
// approximates the rendered text's own half-size for a circle-vs-circle
// touch check against the head
const TAXES_COLLISION_RADIUS = 13;
// the safe path: starts thicker than the profit line itself (LINE_WIDTH),
// colored the same purple CRIT_TIER_CONFIG's x5 crit tier uses
// (floors/upgradeButton), then shrinks as the round goes on (see
// getSafeLineThickness) down to just 2px over the profit line's own width
const SAFE_LINE_MAX_THICKNESS = 30; // 20, +50%
const SAFE_LINE_MIN_THICKNESS = LINE_WIDTH + 2;
const SAFE_LINE_SHRINK_DURATION_S = 45;
const SAFE_LINE_COLOR = COLOR.purple;
// spacing between consecutive generated safe-path points
const SAFE_PATH_SAMPLE_SPACING_PX = 16;
// each new sample bends the path's own heading by up to this many degrees
// (growing over the distance spent past the straight zone, see
// getSafePathMaxBendDeg) instead of a flat per-sample pixel wander — reads
// as gentle, wide curves early on that tighten into sharper turns later
const SAFE_PATH_BEND_START_DEG = 5;
const SAFE_PATH_BEND_MAX_DEG = 35;
const SAFE_PATH_BEND_GROWTH_DURATION_S = 60;
// heading itself is clamped to this range so it can never fold back past
// vertical (which would make the path stop advancing rightward at all)
const SAFE_PATH_HEADING_CLAMP_DEG = 60;
// the queue is always kept extended this far past the right edge, so a turn
// is already on screen (approaching, not yet reached) well before the ship
// gets there
const SAFE_PATH_LOOKAHEAD_BUFFER_PX = 260;
// how much of the path (in world distance, ~2s worth at SCROLL_SPEED_PX_S)
// stays flat before it starts wandering — always stretched to at least cover
// the ship's own starting x too, so it isn't already curvy right at open
const SAFE_PATH_BASE_STRAIGHT_DISTANCE_PX = SCROLL_SPEED_PX_S * 2;

interface TaxWord {
  x: number;
  y: number;
  // this word's own current velocity — always eased toward whatever
  // direction/speed the current mode wants (see step's own steering), never
  // snapped straight there, so switching between idling and attacking turns
  // smoothly instead of instantly reversing course
  vx: number;
  vy: number;
  // orbited around while safe (see step) — picked once at spawn, along the
  // screen's own edge
  homeX: number;
  homeY: number;
  // this word's own current angle/radius around homeX/homeY (see step's own
  // idle-orbit update) — radius randomized once at spawn so every word
  // circles at a different distance
  idleAngle: number;
  idleRadius: number;
}

// spawns along a random edge of the canvas — both its start position and its
// own buzz-home anchor, so an idle word reads as patrolling that edge
function spawnSwarmWord(cssW: number, cssH: number): TaxWord {
  const side = Math.floor(Math.random() * 4);
  const margin = 20;
  let x: number;
  let y: number;
  switch (side) {
    case 0: // top
      x = Math.random() * cssW;
      y = margin;
      break;
    case 1: // bottom
      x = Math.random() * cssW;
      y = cssH - margin;
      break;
    case 2: // left
      x = margin;
      y = Math.random() * cssH;
      break;
    default: // right
      x = cssW - margin;
      y = Math.random() * cssH;
  }
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    homeX: x,
    homeY: y,
    idleAngle: Math.random() * Math.PI * 2,
    idleRadius:
      BUZZ_ORBIT_RADIUS_MIN_PX +
      Math.random() * (BUZZ_ORBIT_RADIUS_MAX_PX - BUZZ_ORBIT_RADIUS_MIN_PX),
  };
}

// extends a scrolling safe-path queue rightward until it reaches
// cssW + SAFE_PATH_LOOKAHEAD_BUFFER_PX, flat until straightUntilPx of world
// distance has been generated, then wandering by at most
// SAFE_PATH_MAX_STEP_PX per sample — clamped within the playable [0,
function getTaxesHomingSpeedPxS(survivedMs: number): number {
  const t = Math.min(1, survivedMs / 1000 / TAXES_HOMING_SPEED_RAMP_DURATION_S);
  const multiplier = 1 + (TAXES_HOMING_SPEED_MAX_MULTIPLIER - 1) * t;
  return TAXES_HOMING_SPEED_BASE_PX_S * multiplier;
}

function getSafeLineThickness(survivedMs: number): number {
  const t = Math.min(1, survivedMs / 1000 / SAFE_LINE_SHRINK_DURATION_S);
  return (
    SAFE_LINE_MAX_THICKNESS -
    (SAFE_LINE_MAX_THICKNESS - SAFE_LINE_MIN_THICKNESS) * t
  );
}

// this stretch's own max bend, growing from SAFE_PATH_BEND_START_DEG toward
// SAFE_PATH_BEND_MAX_DEG the further past the straight zone it's traveled —
// distancePastStraightPx converted to seconds via SCROLL_SPEED_PX_S, same
// world-distance-as-time convention SAFE_PATH_BASE_STRAIGHT_DISTANCE_PX uses
function getSafePathMaxBendDeg(distancePastStraightPx: number): number {
  const t = Math.min(
    1,
    distancePastStraightPx /
      SCROLL_SPEED_PX_S /
      SAFE_PATH_BEND_GROWTH_DURATION_S,
  );
  return (
    SAFE_PATH_BEND_START_DEG +
    (SAFE_PATH_BEND_MAX_DEG - SAFE_PATH_BEND_START_DEG) * t
  );
}

// tracks the safe path's own generation progress across calls — mutated in
// place by extendSafePath, since both its own total length and current
// heading need to persist across frames (the queue only ever grows/trims,
// never regenerates from scratch)
interface SafePathGrowth {
  lengthPx: number;
  headingRad: number;
}

// extends a scrolling safe-path queue rightward until it reaches
// cssW + SAFE_PATH_LOOKAHEAD_BUFFER_PX: flat until straightUntilPx of world
// distance has been generated, then bending its own heading by up to
// getSafePathMaxBendDeg() per sample (see that function's own comment) —
// clamped within the playable [0, floorTopY] band throughout
function extendSafePath(
  path: TrailPoint[],
  growth: SafePathGrowth,
  straightUntilPx: number,
  cssW: number,
  floorTopY: number,
): void {
  let guard = 0;
  while (guard++ < 400) {
    const last = path[path.length - 1];
    if (!last || last.x >= cssW + SAFE_PATH_LOOKAHEAD_BUFFER_PX) break;
    growth.lengthPx += SAFE_PATH_SAMPLE_SPACING_PX;
    if (growth.lengthPx >= straightUntilPx) {
      const maxBendDeg = getSafePathMaxBendDeg(
        growth.lengthPx - straightUntilPx,
      );
      const bendRad = ((Math.random() * 2 - 1) * maxBendDeg * Math.PI) / 180;
      const clampRad = (SAFE_PATH_HEADING_CLAMP_DEG * Math.PI) / 180;
      growth.headingRad = Math.max(
        -clampRad,
        Math.min(clampRad, growth.headingRad + bendRad),
      );
    }
    const dx = Math.cos(growth.headingRad) * SAFE_PATH_SAMPLE_SPACING_PX;
    const dy = Math.sin(growth.headingRad) * SAFE_PATH_SAMPLE_SPACING_PX;
    const nextY = Math.max(
      SAFE_LINE_MAX_THICKNESS,
      Math.min(floorTopY - SAFE_LINE_MAX_THICKNESS, last.y + dy),
    );
    const point: TrailPoint = { x: last.x + dx, y: nextY };
    path.push(point);
  }
}

// linearly interpolates the safe path's own y at world-x — the path is
// always kept x-sorted (see extendSafePath), so this is a plain bracket scan
function getSafePathYAtX(path: TrailPoint[], x: number): number {
  if (path.length === 0) return 0;
  if (x <= path[0].x) return path[0].y;
  for (let i = 1; i < path.length; i++) {
    if (x <= path[i].x) {
      const a = path[i - 1];
      const b = path[i];
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return path[path.length - 1].y;
}

export function createTaxHavenGameMarkup(): string {
  return `
    <div class="press-conference-game tax-haven-game" id="tax-haven-game" hidden>
      <div class="press-conference-game__header">
        <h2>Tax Haven</h2>
      </div>
      <div class="press-conference-game__score" id="tax-haven-game-score">
        <div id="tax-haven-game-timer">0.0s</div>
      </div>
      <div class="press-conference-game__influence" id="tax-haven-game-influence">
        <span class="press-conference-game__influence-label">Assets moved</span>
        <span id="tax-haven-game-influence-value">+0.00% ▲</span>
      </div>
      <canvas class="press-conference-game__canvas" id="tax-haven-game-canvas"></canvas>
    </div>
  `;
}

export type TaxHavenGame = ConferenceMinigame;

interface TaxHavenState extends MinigameState {
  // world-anchored breadcrumbs left behind by the ship's own actual path —
  // each point is fixed in place once recorded, then only ever shifted left
  // by the same constant scroll the grid moves by (see step), so it stays
  // exactly where the ship actually passed instead of being redrawn relative
  // to wherever it's since moved to
  breadcrumbs: TrailPoint[];
  // the ship's own actual rendered position/velocity — state.headX/headY is
  // just the raw drag target (see the shared engine's pointermove
  // handling); the ship eases toward it with its own momentum instead of
  // snapping there 1:1 (see step)
  shipX: number;
  shipY: number;
  shipVelX: number;
  shipVelY: number;
  taxWords: TaxWord[];
  // the safe path's own queue, scrolling left like breadcrumbs and kept
  // extended past the right edge (see extendSafePath)
  safePath: TrailPoint[];
  // persists across trims, so extendSafePath's own progress (length
  // generated so far, current heading) never resets just because old
  // points scrolled off
  safePathGrowth: SafePathGrowth;
  safePathStraightUntilPx: number;
}

export function wireTaxHavenGame(
  container: HTMLElement,
  onClose?: () => void,
): TaxHavenGame {
  function freshState(): TaxHavenState {
    return {
      headY: 0,
      worldX: 0,
      survivedMs: 0,
      started: false,
      running: true,
      gameOver: false,
      holding: false,
      marketInfluencePercent: 0,
      breadcrumbs: [],
      shipX: 0,
      shipY: 0,
      shipVelX: 0,
      shipVelY: 0,
      taxWords: [],
      safePath: [],
      safePathGrowth: { lengthPx: 0, headingRad: 0 },
      safePathStraightUntilPx: SAFE_PATH_BASE_STRAIGHT_DISTANCE_PX,
    };
  }

  return wireConferenceMinigame<TaxHavenState>(container, {
    elements: {
      screenId: "tax-haven-game",
      canvasId: "tax-haven-game-canvas",
      timerId: "tax-haven-game-timer",
      scoreId: "tax-haven-game-score",
      influenceValueId: "tax-haven-game-influence-value",
    },
    createState: freshState,

    onOpen: (state, cssW, cssH, getFloorTopY) => {
      // same starting x the shared engine's own fixed-head default uses, so
      // opening looks identical to before — just draggable from here on
      const startX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;
      state.headX = startX;
      state.shipX = startX;
      // the engine already set state.headY to its own default before
      // calling onOpen — start the ship there too, no lag on the very first
      // frame
      state.shipY = state.headY;
      state.taxWords = Array.from({ length: SWARM_SIZE }, () =>
        spawnSwarmWord(cssW, cssH),
      );
      // stretched past the ship's own starting x too, so it never starts
      // off already-wandering right under the ship
      state.safePathStraightUntilPx = Math.max(
        SAFE_PATH_BASE_STRAIGHT_DISTANCE_PX,
        startX + 100,
      );
      state.safePath = [{ x: 0, y: state.shipY }];
      state.safePathGrowth = { lengthPx: 0, headingRad: 0 };
      extendSafePath(
        state.safePath,
        state.safePathGrowth,
        state.safePathStraightUntilPx,
        cssW,
        getFloorTopY(),
      );
    },

    step: (state, dtMs, cssW, _cssH, getFloorTopY, _ctx) => {
      const dt = dtMs / 1000;
      // clamped here (not just the ship below) so a fast drag/flick can't
      // leave the target sitting far outside the canvas — chasing a target
      // that far away builds up enough momentum to overshoot straight
      // through the opposite edge moments after the drag actually stops
      state.headX = Math.max(0, Math.min(cssW, state.headX!));
      state.headY = Math.max(0, Math.min(getFloorTopY(), state.headY));
      const targetX = state.headX;
      const targetY = state.headY;

      // damped-spring chase: pulled toward the target, bleeding off velocity
      // each frame instead of accelerating forever — gives the ship a
      // "heavier", slightly-behind feel instead of tracking the drag exactly
      state.shipVelX += (targetX - state.shipX) * SHIP_SPRING_PER_S2 * dt;
      state.shipVelY += (targetY - state.shipY) * SHIP_SPRING_PER_S2 * dt;
      const damping = Math.exp(-SHIP_DAMPING_PER_S * dt);
      state.shipVelX *= damping;
      state.shipVelY *= damping;
      state.shipX += state.shipVelX * dt;
      state.shipY += state.shipVelY * dt;
      state.shipY = Math.max(0, Math.min(getFloorTopY(), state.shipY));

      if (state.shipX <= 0 || state.shipX >= cssW) {
        state.shipX = Math.max(0, Math.min(cssW, state.shipX));
        state.running = false;
        state.gameOver = true;
      }
      const scrollDeltaPx = SCROLL_SPEED_PX_S * dt;
      const prevWorldX = state.worldX;
      state.worldX += scrollDeltaPx;
      for (const point of state.breadcrumbs) point.x -= scrollDeltaPx;
      const samplesDue =
        Math.floor(state.worldX / TRAIL_SAMPLE_DX) -
        Math.floor(prevWorldX / TRAIL_SAMPLE_DX);
      for (let i = 0; i < samplesDue; i++) {
        state.breadcrumbs.push({ x: state.shipX, y: state.shipY });
      }
      const maxLength = computeMaxTrailLength(cssW);
      if (state.breadcrumbs.length > maxLength) {
        state.breadcrumbs.splice(0, state.breadcrumbs.length - maxLength);
      }
      state.survivedMs += dtMs;
      if (state.running) {
        state.marketInfluencePercent += ASSETS_MOVED_PERCENT_PER_SECOND * dt;
      }

      // scrolls left in lockstep with everything else, then tops the queue
      // back up past the right edge so a turn is always visible in advance
      for (const point of state.safePath) point.x -= scrollDeltaPx;
      state.safePath = state.safePath.filter(
        (point) => point.x > -SAFE_PATH_SAMPLE_SPACING_PX,
      );
      extendSafePath(
        state.safePath,
        state.safePathGrowth,
        state.safePathStraightUntilPx,
        cssW,
        getFloorTopY(),
      );

      const safeLineThickness = getSafeLineThickness(state.survivedMs);
      const onSafeLine =
        Math.abs(state.shipY - getSafePathYAtX(state.safePath, state.shipX)) <=
        safeLineThickness / 2;

      const taxesSpeed = getTaxesHomingSpeedPxS(state.survivedMs);
      for (const word of state.taxWords) {
        let desiredVX: number;
        let desiredVY: number;
        if (onSafeLine) {
          // circles its own edge anchor instead of attacking — harmless.
          // Steered toward like everything else below (a seek velocity
          // proportional to the position error), not snapped to it directly
          word.idleAngle += BUZZ_ORBIT_ANGULAR_SPEED_RAD_PER_S * dt;
          const orbitX =
            word.homeX + Math.cos(word.idleAngle) * word.idleRadius;
          const orbitY =
            word.homeY + Math.sin(word.idleAngle) * word.idleRadius;
          desiredVX =
            (orbitX - word.x) * BUZZ_ORBIT_SEEK_RATE_PER_S +
            (Math.random() - 0.5) * BUZZ_JITTER_PX_S;
          desiredVY =
            (orbitY - word.y) * BUZZ_ORBIT_SEEK_RATE_PER_S +
            (Math.random() - 0.5) * BUZZ_JITTER_PX_S;
        } else {
          const dx = state.shipX - word.x;
          const dy = state.shipY - word.y;
          const dist = Math.hypot(dx, dy) || 1;
          desiredVX = (dx / dist) * taxesSpeed;
          desiredVY = (dy / dist) * taxesSpeed;
        }
        // eased toward the desired velocity, never snapped to it — same
        // idea the ship's own spring easing uses
        word.vx += (desiredVX - word.vx) * TAXES_STEER_RATE_PER_S * dt;
        word.vy += (desiredVY - word.vy) * TAXES_STEER_RATE_PER_S * dt;
        word.x += word.vx * dt;
        word.y += word.vy * dt;
        if (!onSafeLine) {
          const dist = Math.hypot(state.shipX - word.x, state.shipY - word.y);
          if (dist <= TAXES_COLLISION_RADIUS + HEAD_RADIUS) {
            state.running = false;
            state.gameOver = true;
          }
        }
      }
    },

    renderGraph: (ctx, state, _headX, now) => {
      drawActiveCoinBursts(ctx, now);
      // same through-point quadratic smoothing the profit line's own trail
      // uses — plain lineTo segments between samples read as visibly jagged
      drawTrailLine(
        ctx,
        state.safePath,
        getSafeLineThickness(state.survivedMs),
        SAFE_LINE_COLOR,
      );
      const bitmap = getTaxesLabelBitmap(ctx);
      for (const word of state.taxWords) {
        ctx.drawImage(
          bitmap,
          word.x - bitmap.width / 2,
          word.y - bitmap.height / 2,
        );
      }
      const points = [...state.breadcrumbs, { x: state.shipX, y: state.shipY }];
      drawTrailLine(ctx, points, LINE_WIDTH, LINE_COLOR);
      drawTrailHead(ctx, state.shipX, state.shipY, HEAD_RADIUS, LINE_COLOR);
    },

    // no tap mechanic in this variant — movement is entirely drag-based
    onTap: () => {},

    onGameOver: (state) => {
      addAssetsMovedPercent(state.marketInfluencePercent);
    },

    onClose,
  });
}
