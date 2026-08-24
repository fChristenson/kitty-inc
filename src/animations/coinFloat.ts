import { randomInt } from "../utils";

// a handful of small coins that bubble straight up from a point, gently swaying,
// and fade out — a quieter alternative to coins.ts's outward/gravity burst

interface FloatingCoin {
  x: number;
  originX: number; // fixed horizontal spawn point; x is computed from this each frame
  startOffset: number; // how far out this coin starts, at the wide base of the cone
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  wobblePhase: number;
}

const coins: FloatingCoin[] = [];
let animationFrameId: number | null = null;
let lastTick = 0;

export function hasActiveFloatingCoins(): boolean {
  return coins.length > 0;
}

export function drawFloatingCoins(ctx: CanvasRenderingContext2D): void {
  for (const c of coins) {
    const t = c.life / c.maxLife;
    const radius = c.size * (1 - t * 0.3);
    ctx.globalAlpha = Math.max(0, 1 - t);

    // flat coin face (no directional shading, so it reads as a 2D disc, not a sphere)
    ctx.fillStyle = "#F5C542";
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1, radius * 0.16);
    ctx.strokeStyle = "#8A5A12";
    ctx.stroke();

    // embossed inner ring
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = "#D9A521";
    ctx.lineWidth = Math.max(1, radius * 0.1);
    ctx.stroke();

    // flat gloss sheen band across the top of the disc, clipped to its circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.clip();
    const gloss = ctx.createLinearGradient(c.x, c.y - radius, c.x, c.y);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.7)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.ellipse(
      c.x,
      c.y - radius * 0.35,
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
    ctx.fillText("$", c.x, c.y + radius * 0.05);
  }
  ctx.globalAlpha = 1;
}

function updateFloatingCoins(dt: number): void {
  for (const c of coins) {
    c.y += c.vy * dt;
    c.life += dt;
    // cone shape: each coin converges from its wide starting offset toward the
    // center as it rises, with a small sway layered on top for an organic wobble
    const t = Math.min(c.life / c.maxLife, 1);
    const coneOffset = c.startOffset * (1 - t);
    const wobble = Math.sin(c.life * 0.15 + c.wobblePhase) * 6;
    c.x = c.originX + coneOffset + wobble;
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    if (coins[i].life >= coins[i].maxLife) coins.splice(i, 1);
  }
}

// spawns a few coins that bubble up from (x, y) and disappear; drives its own rAF
// loop, calling onFrame after each physics step
export function spawnFloatingCoins(
  x: number,
  y: number,
  onFrame: () => void,
): void {
  const count = randomInt(2, 4);
  const spacing = 22; // gap between each coin's starting column, i.e. the cone's base width
  for (let i = 0; i < count; i++) {
    const startOffset =
      (i - (count - 1) / 2) * spacing + (Math.random() - 0.5) * 15;
    coins.push({
      x: x + startOffset,
      originX: x,
      startOffset,
      y: y + (Math.random() - 0.5) * 20,
      vy: -(0.6 + Math.random() * 0.6),
      life: 0,
      maxLife: 110 + Math.random() * 40,
      size: 16 + Math.random() * 8,
      wobblePhase: Math.random() * Math.PI * 2,
    });
  }

  if (animationFrameId !== null) return;
  lastTick = performance.now();
  const tick = (now: number) => {
    const dt = Math.max(0, Math.min((now - lastTick) / 16.67, 3));
    lastTick = now;
    updateFloatingCoins(dt);
    onFrame();
    animationFrameId = coins.length > 0 ? requestAnimationFrame(tick) : null;
  };
  animationFrameId = requestAnimationFrame(tick);
}
