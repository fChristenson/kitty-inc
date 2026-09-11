// shared scaffolding for a full-screen canvas mini-game dialog (see
// hud/pressConferenceGame and hud/liquidateAssetsGame) — the mechanical bits
// every such game needs (DPR-aware canvas sizing, a clamped-delta rAF loop,
// elapsed-time formatting, a button press-bounce curve) extracted out once a
// second game needed the exact same code pressConferenceGame already had
import { getEffectiveDpr } from "../devicePixelRatio";

// DPR-aware canvas sizing: keeps canvas.width/height in sync with its own CSS
// box (via ResizeObserver) and returns the CSS-space size every draw call
// needs. Call resize() once immediately after wiring (the observer's first
// callback fires async, too late for a draw that happens before then)
export function setupResizableCanvas(canvas: HTMLCanvasElement): {
  resize: () => void;
  getSize: () => { cssW: number; cssH: number };
  destroy: () => void;
} {
  const ctx = canvas.getContext("2d")!;
  let cssW = 0;
  let cssH = 0;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    const dpr = getEffectiveDpr();
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  return {
    resize,
    getSize: () => ({ cssW, cssH }),
    destroy: () => resizeObserver.disconnect(),
  };
}

// a requestAnimationFrame loop that hands the caller a clamped delta (never
// more than 50ms, so a stalled/backgrounded tab resuming doesn't feed a huge
// dt into physics and teleport everything forward) instead of raw timestamps
export function createRafLoop(onFrame: (now: number, dtMs: number) => void): {
  start: () => void;
  stop: () => void;
} {
  let rafId: number | null = null;
  let lastFrameTime = 0;

  function tick(now: number): void {
    const dtMs = lastFrameTime ? Math.min(now - lastFrameTime, 50) : 0;
    lastFrameTime = now;
    onFrame(now, dtMs);
    rafId = requestAnimationFrame(tick);
  }

  return {
    start: () => {
      // cancels any already-running loop first — calling start() again
      // without an intervening stop() (e.g. a game reopened before its
      // previous round's own close() ever ran) would otherwise leave the
      // OLD scheduled frame's own id un-cancelable once rafId gets
      // overwritten below, leaking a second self-perpetuating tick chain
      // that keeps calling onFrame forever alongside the new one —
      // compounding once more each time this happens, which is exactly
      // what made physics/animations (e.g. liquidateAssetsGame's coin
      // bursts) run visibly faster with every extra unclosed replay
      if (rafId !== null) cancelAnimationFrame(rafId);
      lastFrameTime = 0;
      rafId = requestAnimationFrame(tick);
    },
    stop: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

export function formatElapsedSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// identical to floors/upgradeButton's own press/pressScale curve: a quick
// squash-in followed by a springy overshoot past full size before settling —
// shared here for any mini-game's own on-canvas button (e.g. pressConferenceGame's
// End button) that wants the same tactile bounce on press
const PRESS_DURATION_MS = 450;
const PRESS_AMPLITUDE = 0.18;
const PRESS_DECAY = 9;
const PRESS_FREQUENCY = 26;

export function computePressBounceScale(
  pressedAt: number | null,
  now: number,
): number {
  if (pressedAt === null) return 1;
  const elapsedMs = now - pressedAt;
  if (elapsedMs >= PRESS_DURATION_MS) return 1;
  const t = elapsedMs / 1000;
  return (
    1 -
    PRESS_AMPLITUDE * Math.exp(-PRESS_DECAY * t) * Math.cos(PRESS_FREQUENCY * t)
  );
}

// "the line head": a trailing line behind a fixed-x head, sampled every
// sampleDx px of world scroll (independent of frame rate) instead of once per
// frame — shared by any endless-runner-style mini game whose head leaves this
// same trail behind it (see hud/pressConferenceGame, hud/liquidateAssetsGame)
export interface TrailTracker {
  trail: number[];
  worldX: number;
}

export function createTrailTracker(): TrailTracker {
  return { trail: [], worldX: 0 };
}

// call once per step with how far the world scrolled this frame (scrollSpeedPxS
// * dt) and the y this trail should currently be sampling (usually a lagged/
// eased copy of the head's own y, not its raw position, so the tail visibly
// trails a beat behind instead of tracking 1:1) — pushes 0+ new samples and
// trims down to maxLength from the front
export function advanceTrail(
  tracker: TrailTracker,
  scrollDeltaPx: number,
  sampleY: number,
  sampleDx: number,
  maxLength: number,
): void {
  const prevWorldX = tracker.worldX;
  tracker.worldX += scrollDeltaPx;
  const samplesDue =
    Math.floor(tracker.worldX / sampleDx) - Math.floor(prevWorldX / sampleDx);
  for (let i = 0; i < samplesDue; i++) tracker.trail.push(sampleY);
  if (tracker.trail.length > maxLength) {
    tracker.trail.splice(0, tracker.trail.length - maxLength);
  }
}

export interface TrailPoint {
  x: number;
  y: number;
}

// light neighbor-averaging over the raw trail samples (never itself smoothed,
// so this can never drift/compound across frames), then clamps every point's
// angle off its neighbor to maxAngleTan (rise/run), walking backward from the
// head — same shape pressConferenceGame's own line always had
export function computeSmoothedTrailPoints(
  tracker: TrailTracker,
  sampleDx: number,
  smoothingRadius: number,
  maxAngleTan: number,
  headX: number,
  headY: number,
): TrailPoint[] {
  const { trail, worldX } = tracker;
  if (trail.length === 0) return [];
  const partialDx = worldX % sampleDx;
  const startX = headX - (trail.length - 1) * sampleDx - partialDx;
  const smoothed = trail.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - smoothingRadius);
      j <= Math.min(trail.length - 1, i + smoothingRadius);
      j++
    ) {
      sum += trail[j];
      count++;
    }
    return sum / count;
  });
  const points: TrailPoint[] = smoothed.map((y, i) => ({
    x: startX + i * sampleDx,
    y,
  }));
  points.push({ x: headX, y: headY });
  for (let i = points.length - 1; i > 0; i--) {
    const dx = points[i].x - points[i - 1].x;
    const maxDy = dx * maxAngleTan;
    const dy = points[i - 1].y - points[i].y;
    if (dy > maxDy) points[i - 1].y = points[i].y + maxDy;
    else if (dy < -maxDy) points[i - 1].y = points[i].y - maxDy;
  }
  return points;
}

// through-point quadratic smoothing: each curve ends at the midpoint between
// two samples (a smooth point every segment shares with its neighbor), with
// the actual sample as that curve's own control point — straight lineTo
// segments between samples this close together read as visibly jagged/kinked
export function drawTrailLine(
  ctx: CanvasRenderingContext2D,
  points: TrailPoint[],
  lineWidth: number,
  color: string,
): void {
  if (points.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

export function drawTrailHead(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(headX, headY, radius, 0, Math.PI * 2);
  ctx.fill();
}
