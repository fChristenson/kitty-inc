// Round Robin, an income crit: the green amount arcs up under the total and
// bursts into a ring of eight wisp gunners wheeling round under it; they
// fire up into the readout one after another round the ring, a muzzle flash
// and a pop on the total each, the ring spinning faster and the shots coming
// quicker and quicker; then all eight fire themselves in at once, slugs
// streaking up into the total for the huge blast
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

// the amount arcing up to the ring's middle, RING_Y under the total, bowed
// ARCH aside, then the gunners spreading out onto the ring over SPREAD_MS
const UP_MS = 200;
const ARCH = 240;
const RING_Y = 300;
const RX = 380;
const RY = 140;
const SPREAD_MS = 160;
const OPEN_BLAST = 160;
const GUNNERS = 8;
const GUNNER = WISP_SIZE * 1.2;
// the ring turning SPIN times round by the finale, slow then whipping
const SPIN = 2.5;
// the shots: SHOTS round the ring from FIRE_MS, GAPS_MS apart (closing),
// SPEED px a ms
const FIRE_MS = UP_MS + SPREAD_MS + 80;
const SHOTS = 24;
const GAPS_MS: [number, number] = [110, 35];
const SPEED = 2.2;
const BULLET = WISP_SIZE * 0.55;
const FLASH_MS = 90;
const FLASH = 70;
const POP_BLAST = 100;
// the finale: FINALE_GAP_MS after the last shot, every gunner at once
const FINALE_GAP_MS = 160;
const FINALE_SPEED = 2.8;
const SLUG = WISP_SIZE * 1.1;
const IN_BLAST = 240;
// shakes by step: a shot landing, the slugs in, the last blast
const SHAKES = [0.4, 1.4, 2.6];

interface Plan {
  shots: Bullet[];
  slugs: Bullet[];
  finaleMs: number;
  endMs: number;
  gunners: ((ms: number) => Point | null)[];
}
const plans = new WeakMap<Running, Plan>();
const spot: Point = { x: 0, y: 0 };

// gunner k's spot at ms, from the total, written into `into`
function gunnerAt(k: number, ms: number, finaleMs: number, into: Point): Point {
  const u = clamp01((ms - UP_MS) / (finaleMs - UP_MS));
  const out = 1 - (1 - clamp01((ms - UP_MS) / SPREAD_MS)) ** 3;
  const a = (k / GUNNERS) * Math.PI * 2 + SPIN * Math.PI * 2 * u * u;
  into.x = Math.cos(a) * RX * out;
  into.y = RING_Y + Math.sin(a) * RY * out;
  return into;
}

function planRobin(): Plan {
  const shots: Bullet[] = [];
  let t = FIRE_MS;
  const times: number[] = [];
  for (let j = 0; j < SHOTS; j++) {
    times.push(t);
    t += lerp(GAPS_MS[0], GAPS_MS[1], j / (SHOTS - 1));
  }
  const finaleMs = times[SHOTS - 1] + FINALE_GAP_MS;
  times.forEach((at, j) =>
    shots.push(
      aimBullet(
        gunnerAt(j % GUNNERS, at, finaleMs, { x: 0, y: 0 }),
        readoutSpot({ x: 0, y: 0 }, j, 2310),
        at,
        SPEED,
      ),
    ),
  );
  const slugs = Array.from({ length: GUNNERS }, (_, k) =>
    aimBullet(
      gunnerAt(k, finaleMs, finaleMs, { x: 0, y: 0 }),
      { x: 0, y: 0 },
      finaleMs,
      FINALE_SPEED,
    ),
  );
  const endMs = Math.max(...slugs.map((s) => s.hitAt));
  return {
    shots,
    slugs,
    finaleMs,
    endMs,
    gunners: Array.from({ length: GUNNERS }, (_, k) => {
      const at: Point = { x: 0, y: 0 };
      return (ms) => (ms > finaleMs ? null : gunnerAt(k, ms, finaleMs, at));
    }),
  };
}

// the flash at each gun as it fires
function drawFlashes(
  ctx: CanvasRenderingContext2D,
  shots: readonly Bullet[],
  ms: number,
): void {
  for (const shot of shots) {
    const t = (ms - shot.firedAt) / FLASH_MS;
    if (t <= 0 || t >= 1) continue;
    drawMuzzleFlash(ctx, shot.from, Math.atan2(shot.dy, shot.dx), t, FLASH);
  }
}

registerFloorCrit("roundRobinCrit", {
  plan(r, _bars, hit) {
    const plan = planRobin();
    plans.set(r, plan);
    for (const shot of plan.shots) hit(0, shot.hitAt);
    hit(0, Math.min(...plan.slugs.map((s) => s.hitAt)), 1);
    hit(0, plan.endMs, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];

    if (ms < UP_MS) {
      const p = (ms / UP_MS) ** 2;
      const cx = to.x / 2 + ARCH;
      const cy = to.y + RING_Y;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        2 * (1 - p) * p * cx + p * p * to.x,
        2 * (1 - p) * p * (cy / 2) + p * p * cy,
        r.flashFont,
      );
    }
    ctx.save();
    ctx.translate(to.x, to.y);
    spot.x = 0;
    spot.y = RING_Y;
    drawDetonation(ctx, spot, ms - UP_MS, OPEN_BLAST, now);
    for (const shot of plan.shots)
      drawDetonation(ctx, shot.to, ms - shot.hitAt, POP_BLAST, now);
    for (const gunner of plan.gunners)
      drawWispBetween(ctx, gunner, ms, now, GUNNER, 0.5, UP_MS, plan.finaleMs);
    drawBullets(ctx, plan.shots, ms, now, BULLET);
    drawBullets(ctx, plan.slugs, ms, now, SLUG, true);
    drawFlashes(ctx, plan.shots, ms);
    drawFlashes(ctx, plan.slugs, ms);
    ctx.restore();
    drawDetonation(ctx, to, ms - plan.slugs[0].hitAt, IN_BLAST, now);
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS + 200,
  shake: (step) => SHAKES[step],
});
