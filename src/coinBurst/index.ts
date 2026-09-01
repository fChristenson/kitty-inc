import { loadImage, randomInt } from "../utils";
import coinSpinUrl from "../assets/sprites/coinSpin.png";
import billFlutterUrl from "../assets/sprites/cashBillFlutter.png";

// shared coin/bill flipbook sprites + the actual particle physics/draw math —
// floors/coins (particles glued to a specific Floor's own on-screen rect) and
// hud/pressConferenceGame (its own flat canvas, no Floor at all) each own
// their own particle array (and, for floors/coins, its own extra `floor`
// field per particle), but both spawn/update/draw through the functions
// below, so the actual animation itself only exists in one place
export const COIN_SPIN_FRAME_COUNT = 6;
export const BILL_SPIN_FRAME_COUNT = 6;
// fraction of a burst's particles that are fluttering bills instead of coins
export const COIN_BILL_CHANCE = 0.3;
const MIN_SPIN_RATE = 0.04; // flipbook frames advanced per physics tick (~16.67ms)
const MAX_SPIN_RATE = 0.12;

let coinImage: HTMLImageElement | null = null;
let billImage: HTMLImageElement | null = null;

export async function loadCoinBurstImages(): Promise<HTMLImageElement> {
  const [coin] = await Promise.all([
    loadImage(coinSpinUrl),
    loadImage(billFlutterUrl).then((img) => (billImage = img)),
  ]);
  coinImage = coin;
  return coin;
}

export interface CoinBurstSprite {
  kind: "coin" | "bill";
  spinFrame: number; // fractional flipbook position, floored when drawing
  axisAngle: number; // screen-space tilt of the spin's squish axis; 0 if the caller doesn't care
}

export interface CoinBurstParticle extends CoinBurstSprite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  gravityRamp: number; // how fast gravity ramps up with age; lower for bills (paper) than coins (metal)
  spinRate: number; // this particle's own frames/tick speed
  spinDir: 1 | -1; // picked once per coin so a burst doesn't spin in lockstep
}

// one burst's worth of particles at (x, y) — same random ranges regardless of
// caller, so a burst looks identical whether it's floors/coins's own
// Floor-anchored version or hud/pressConferenceGame's flat-canvas one
export function createCoinBurstParticles(
  x: number,
  y: number,
): CoinBurstParticle[] {
  const count = randomInt(40, 85);
  const out: CoinBurstParticle[] = [];
  for (let i = 0; i < count; i++) {
    // upward/outward hemisphere only (not fully random) so coins pop up and out
    // first, then arc back down under gravity instead of scattering downward too
    const angle = -Math.random() * Math.PI;
    const speed = 3 + Math.random() * 16;
    const kind: "coin" | "bill" =
      Math.random() < COIN_BILL_CHANCE ? "bill" : "coin";
    out.push({
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
        Math.random() *
        (kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT),
      spinRate: MIN_SPIN_RATE + Math.random() * (MAX_SPIN_RATE - MIN_SPIN_RATE),
      spinDir: Math.random() < 0.5 ? 1 : -1,
      axisAngle: (Math.random() * 2 - 1) * (Math.PI / 2),
    });
  }
  return out;
}

// advances every particle by dt (in ~16.67ms "ticks", not seconds — same unit
// spawnCoinBurst's own random ranges above are tuned against) and prunes any
// that have died; mutates particles in place (including removing dead ones)
export function updateCoinBurstParticles(
  particles: CoinBurstParticle[],
  dt: number,
): void {
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

// draws one coin/bill particle centered at (x, y) with the given on-screen
// radius — a no-op (not a fallback circle) for however briefly the sprites
// are still loading, since the caller's own particle keeps ticking either way
// and will simply start being visible once loadCoinBurstImages resolves
export function drawCoinBurstFrame(
  ctx: CanvasRenderingContext2D,
  sprite: CoinBurstSprite,
  x: number,
  y: number,
  radius: number,
): void {
  const image = sprite.kind === "bill" ? billImage : coinImage;
  if (!image) return;
  const frameCount =
    sprite.kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT;
  const frameW = image.naturalWidth / frameCount;
  const frameH = image.naturalHeight;
  const frame =
    ((Math.floor(sprite.spinFrame) % frameCount) + frameCount) % frameCount;
  // frames share one cell size, so the coin's diameter maps to height and width
  // follows the cell's own aspect ratio — that's what makes thinner edge-on
  // frames actually read as the coin thinning, not just shrinking
  const destH = radius * 2;
  const destW = destH * (frameW / frameH);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sprite.axisAngle);
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

// the actually-simple API: no Floor, no ctx, no page dependency — a position
// (and, optionally, a scale — 1 is tuned for a full building-width canvas;
// pass smaller for a smaller one) is all spawning needs. Every active burst
// everywhere lives in this one module-level list, ticked/drawn by
// drawActiveCoinBursts below
const activeParticles: CoinBurstParticle[] = [];
let lastActiveUpdateAt: number | null = null;

export function hasActiveCoinBursts(): boolean {
  return activeParticles.length > 0;
}

export function spawnCoinBurstAt(x: number, y: number, scale = 1): void {
  for (const p of createCoinBurstParticles(x, y)) {
    // scales position (relative to the spawn point, so the burst still
    // starts exactly at x,y), velocity, size, and gravity together, so a
    // smaller-scale burst is a uniformly shrunk version of the same burst,
    // not just smaller sprites moving at full-size speed
    p.x = x + (p.x - x) * scale;
    p.y = y + (p.y - y) * scale;
    p.vx *= scale;
    p.vy *= scale;
    p.size *= scale;
    p.gravity *= scale;
    p.gravityRamp *= scale;
    activeParticles.push(p);
  }
}

// call once per frame from the caller's own render loop, passing whatever
// timestamp it already has (e.g. requestAnimationFrame's own) — advances
// every active burst by however long it's been since the last call, then
// draws them all straight onto ctx. A no-op once nothing's left bursting
export function drawActiveCoinBursts(
  ctx: CanvasRenderingContext2D,
  now: number,
): void {
  if (activeParticles.length === 0) {
    lastActiveUpdateAt = null;
    return;
  }
  const dt = Math.max(
    0,
    Math.min((now - (lastActiveUpdateAt ?? now)) / 16.67, 3),
  );
  lastActiveUpdateAt = now;
  updateCoinBurstParticles(activeParticles, dt);
  for (const p of activeParticles) {
    const t = p.life / p.maxLife;
    const radius = p.size * (1 - t * 0.3);
    ctx.globalAlpha = Math.max(0, 1 - t);
    drawCoinBurstFrame(ctx, p, p.x, p.y, radius);
  }
  ctx.globalAlpha = 1;
}
