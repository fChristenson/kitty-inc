// a soap bubble: a pale blue film in a white rim with a white shine, and the
// ring it bursts into. Shared by the bubble floor crit and src/bubbles
const TAU = Math.PI * 2;
const FILM = "rgba(186,230,253,0.18)";
const RIM = "rgba(255,255,255,0.85)";
const SHINE = "rgba(255,255,255,0.9)";
// the rim's width, of the radius
const RIM_WIDTH = 0.03;
// how far past its radius the burst ring flies
const POP_SPREAD = 0.8;

export function drawSoapBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  if (radius <= 0) return;
  ctx.lineWidth = radius * RIM_WIDTH;
  ctx.fillStyle = FILM;
  ctx.strokeStyle = RIM;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SHINE;
  ctx.beginPath();
  ctx.ellipse(
    x - radius * 0.4,
    y - radius * 0.45,
    radius * 0.22,
    radius * 0.12,
    -0.6,
    0,
    TAU,
  );
  ctx.fill();
}

// a bubble of radius popped at (x, y), t 0..1 through it: a ring bursting off
export function drawSoapBubblePop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  t: number,
): void {
  if (t < 0 || t >= 1) return;
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * (1 - t);
  ctx.lineWidth = radius * RIM_WIDTH;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, radius * (1 + POP_SPREAD * t), 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = alpha;
}
