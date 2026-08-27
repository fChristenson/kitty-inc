import { loadImage, randomInt } from "../../utils";
import type { Floor } from "../../gameState";
import { FLOOR_W } from "../constants";
import coinSpinUrl from "../../assets/sprites/coinSpin.png";
import billFlutterUrl from "../../assets/sprites/cashBillFlutter.png";

// shared coin-burst particle system: any UI element (upgrade button, worker, ...) can
// spawn a burst at a point and reuse the same rAF-driven physics + rendering

// coinSpin.png (scripts/process-coin-sprites.mjs) is a flipbook of 6 evenly-sized
// cells, one full spin around the coin's vertical axis, laid out left to right.
// cashBillFlutter.png (scripts/process-cash-bill.mjs) is the same kind of flipbook —
// 6 poses of a bill tumbling through the air — mixed into the same burst for variety
const SPIN_FRAME_COUNT = 6;
const BILL_FRAME_COUNT = 6;
const MIN_SPIN_RATE = 0.04; // flipbook frames advanced per physics tick (~16.67ms)
const MAX_SPIN_RATE = 0.12;
// fraction of a burst's particles that are fluttering bills instead of coins
const BILL_CHANCE = 0.3;

let coinImage: HTMLImageElement | null = null;
let billImage: HTMLImageElement | null = null;

export async function loadCoinImage(): Promise<HTMLImageElement> {
  const [coin] = await Promise.all([
    loadImage(coinSpinUrl),
    loadImage(billFlutterUrl).then((img) => (billImage = img)),
  ]);
  coinImage = coin;
  return coin;
}

interface Particle {
  floor: Floor; // which floor's screen rect to map this particle's floor-local x/y through
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  gravityRamp: number; // how fast gravity ramps up with age; lower for bills (paper) than coins (metal)
  kind: "coin" | "bill";
  spinFrame: number; // fractional flipbook position, floored when drawing
  spinRate: number; // this particle's own frames/tick speed
  spinDir: 1 | -1; // picked once per coin so a burst doesn't spin in lockstep
  // tilts which screen-space direction the spin's squish reads along, from 0 (pure
  // vertical-axis spin, squishing left-right, the sprite sheet's native look) up to
  // ±90° (squishing top-bottom instead, as if tipped onto a horizontal spin axis) —
  // picked once per coin so a burst isn't every coin spinning the exact same way
  axisAngle: number;
}

const particles: Particle[] = [];
let animationFrameId: number | null = null;
let lastTick = 0;

export function hasActiveCoins(): boolean {
  return particles.length > 0;
}

// draws every particle onto a full-viewport overlay canvas (so a burst can never be
// clipped by the floor it started on), mapping each particle's floor-local x/y through
// getFloorRect(floor) — the floor's current on-screen rect in the overlay's own CSS
// pixel space, null if that floor isn't currently mounted/visible
export function drawCoins(
  ctx: CanvasRenderingContext2D,
  getFloorRect: (
    floor: Floor,
  ) => { left: number; top: number; width: number } | null,
): void {
  for (const p of particles) {
    const rect = getFloorRect(p.floor);
    if (!rect) continue;
    const scale = rect.width / FLOOR_W;
    const px = rect.left + p.x * scale;
    const py = rect.top + p.y * scale;

    const t = p.life / p.maxLife;
    const radius = p.size * (1 - t * 0.3) * scale;
    ctx.globalAlpha = Math.max(0, 1 - t);

    const image = p.kind === "bill" ? billImage : coinImage;
    const frameCount = p.kind === "bill" ? BILL_FRAME_COUNT : SPIN_FRAME_COUNT;
    if (image) {
      const frameW = image.naturalWidth / frameCount;
      const frameH = image.naturalHeight;
      const frame =
        ((Math.floor(p.spinFrame) % frameCount) + frameCount) % frameCount;
      // frames share one cell size, so the coin's diameter maps to height and
      // width follows the cell's own aspect ratio — that's what makes thinner
      // edge-on frames actually read as the coin thinning, not just shrinking
      const destH = radius * 2;
      const destW = destH * (frameW / frameH);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.axisAngle);
      ctx.drawImage(
        image,
        frame * frameW,
        0,
        frameW,
        frameH,
        -destW / 2,
        -destH / 2,
        destW,
        destH,
      );
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

function updateCoins(dt: number): void {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // gravity ramps up with age so coins pop up, then drop heavily rather than
    // floating — bills use a much gentler ramp (see gravityRamp's own comment)
    // since paper flutters down instead of dropping like metal
    p.vy += (p.gravity + p.life * p.gravityRamp) * dt;
    p.vx *= Math.pow(0.96, dt);
    p.life += dt;
    p.spinFrame += p.spinDir * p.spinRate * dt;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life >= particles[i].maxLife) particles.splice(i, 1);
  }
}

// spawns a coin burst at (x, y) — floor-local coordinates — and drives its own rAF
// loop, calling onFrame after each physics step
export function spawnCoinBurst(
  floor: Floor,
  x: number,
  y: number,
  onFrame: () => void,
): void {
  const count = randomInt(40, 85);
  for (let i = 0; i < count; i++) {
    // upward/outward hemisphere only (not fully random) so coins pop up and out
    // first, then arc back down under gravity instead of scattering downward too
    const angle = -Math.random() * Math.PI;
    const speed = 3 + Math.random() * 16;
    const kind: "coin" | "bill" = Math.random() < BILL_CHANCE ? "bill" : "coin";
    particles.push({
      floor,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 45 + Math.random() * 75,
      size: 22 + Math.random() * 46,
      // bills are paper — they fall a flat 0.2 slower than coins, and ramp up to
      // full fall speed more gradually
      gravity: Math.max(
        0,
        0.2 + Math.random() * 0.35 - (kind === "bill" ? 0.2 : 0),
      ),
      gravityRamp: kind === "bill" ? 0.05 : 0.08,
      kind,
      spinFrame:
        Math.random() * (kind === "bill" ? BILL_FRAME_COUNT : SPIN_FRAME_COUNT),
      spinRate: MIN_SPIN_RATE + Math.random() * (MAX_SPIN_RATE - MIN_SPIN_RATE),
      spinDir: Math.random() < 0.5 ? 1 : -1,
      axisAngle: (Math.random() * 2 - 1) * (Math.PI / 2),
    });
  }

  startTickerIfNeeded(onFrame);
}

function startTickerIfNeeded(onFrame: () => void): void {
  if (animationFrameId !== null) return;
  lastTick = performance.now();
  const tick = (now: number) => {
    const dt = Math.max(0, Math.min((now - lastTick) / 16.67, 3));
    lastTick = now;
    updateCoins(dt);
    onFrame();
    animationFrameId =
      particles.length > 0 ? requestAnimationFrame(tick) : null;
  };
  animationFrameId = requestAnimationFrame(tick);
}
