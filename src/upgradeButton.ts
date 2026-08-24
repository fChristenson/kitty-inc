import { randomInt, drawCartoonText, drawCartoonPanel } from "./utils";
import { FLOOR_W, FLOOR_H } from "./floors";
import { formatTotalIncome } from "./totalIncome";

// button placement, bottom-right corner of each floor (mirrors the income panel on the left)
export const BTN_W = 360;
export const BTN_H = 120;
const BTN_MARGIN = 24;
export const BTN_X = FLOOR_W - BTN_W - BTN_MARGIN;
export const BTN_Y = FLOOR_H - BTN_H - BTN_MARGIN;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
}

const particles: Particle[] = [];
let animationFrameId: number | null = null;
let lastTick = 0;

function isPointOnButton(x: number, localY: number): boolean {
  return (
    x >= BTN_X &&
    x <= BTN_X + BTN_W &&
    localY >= BTN_Y &&
    localY <= BTN_Y + BTN_H
  );
}

export function getButtonCenter(offsetY: number): { x: number; y: number } {
  return { x: BTN_X + BTN_W / 2, y: offsetY + BTN_Y + BTN_H / 2 };
}

// which floor row (top-to-bottom) a canvas point falls on the upgrade button for, if any
export function hitTestUpgradeButton(
  x: number,
  y: number,
  floorCount: number,
): number | null {
  const row = Math.floor(y / FLOOR_H);
  if (row < 0 || row >= floorCount) return null;
  const localY = y - row * FLOOR_H;
  return isPointOnButton(x, localY) ? row : null;
}

export function drawUpgradeButton(
  ctx: CanvasRenderingContext2D,
  offsetY: number,
  hovered: boolean,
  cost: number,
  affordable: boolean,
): void {
  const x = BTN_X;
  const y = BTN_Y + offsetY;

  ctx.save();
  if (!affordable) ctx.globalAlpha = 0.5;
  else if (hovered) ctx.filter = "brightness(0.85)";
  drawCartoonPanel(
    ctx,
    x,
    y,
    BTN_W,
    BTN_H,
    16,
    affordable ? "#22C55E" : "#6B7280",
  );

  ctx.font = "900 48px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    `$${formatTotalIncome(cost)}`,
    x + BTN_W / 2,
    y + BTN_H / 2,
  );
  ctx.restore();
}

export function hasActiveCoins(): boolean {
  return particles.length > 0;
}

export function drawCoins(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    const t = p.life / p.maxLife;
    const radius = p.size * (1 - t * 0.3);
    ctx.globalAlpha = Math.max(0, 1 - t);

    // flat coin face (no directional shading, so it reads as a 2D disc, not a sphere)
    ctx.fillStyle = "#F5C542";
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1, radius * 0.16);
    ctx.strokeStyle = "#8A5A12";
    ctx.stroke();

    // embossed inner ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = "#D9A521";
    ctx.lineWidth = Math.max(1, radius * 0.1);
    ctx.stroke();

    // flat gloss sheen band across the top of the disc, clipped to its circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.clip();
    const gloss = ctx.createLinearGradient(p.x, p.y - radius, p.x, p.y);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.7)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y - radius * 0.35,
      radius * 0.95,
      radius * 0.55,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#8A5A12";
    ctx.font = `bold ${Math.round(radius * 1.1)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", p.x, p.y + radius * 0.05);
  }
  ctx.globalAlpha = 1;
}

function updateCoins(dt: number): void {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // gravity ramps up with age so coins pop up, then drop heavily rather than floating
    p.vy += (p.gravity + p.life * 0.08) * dt;
    p.vx *= Math.pow(0.96, dt);
    p.life += dt;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life >= particles[i].maxLife) particles.splice(i, 1);
  }
}

// spawns a coin burst at (x, y) and drives its own rAF loop, calling onFrame after each physics step
export function spawnCoinBurst(
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
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 15 + Math.random() * 30,
      size: 14 + Math.random() * 30,
      gravity: 0.2 + Math.random() * 0.35,
    });
  }

  if (animationFrameId === null) {
    lastTick = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - lastTick) / 16.67, 3);
      lastTick = now;
      updateCoins(dt);
      onFrame();
      animationFrameId =
        particles.length > 0 ? requestAnimationFrame(tick) : null;
    };
    animationFrameId = requestAnimationFrame(tick);
  }
}
