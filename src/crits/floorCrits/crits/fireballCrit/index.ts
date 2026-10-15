// the fireball floor crit: the number shrinks into an ember wisp beside the
// top bar in view, which swells into a roaring fireball, trembling harder,
// flames licking up off it, sparks and light streaking in and the rumble
// rising as it turns from orange to white-hot; at the climax it launches
// and tears straight down through every bar in one plunge, each flaring and
// levelling as it passes, and bursts on the last in one big blast
import { COLOR } from "../../../../palette";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  byHeight,
} from "../../critPlayer";
import { skyY } from "../../critPlayer/shared";

const FB_IN_MS = 220;
const FB_EMBER_AT = 120;
const FB_CHARGE_MS = 1100;
const FB_LAUNCH_AT = FB_EMBER_AT + FB_CHARGE_MS;
const FB_PLUNGE_MS = 250;
const FB_BLAST_AT = FB_LAUNCH_AT + FB_PLUNGE_MS;
// where the ember hovers: this far above the top bar, this share of the
// bar's half width out from its middle
const FB_ABOVE = 130;
const FB_MIN_ABOVE = 70;
const FB_SIDE = 0.55;
const FB_RADIUS: [number, number] = [12, 72];
const FB_TREMBLE = 16;
const FB_STREAK_REACH: [number, number] = [240, 420];
const FB_WISP: [number, number] = [0.5, 2.4];
const FB_PLUNGE_WISP = 2.8;
const FB_FLAMES = 12;
const FB_EMBERS = 16;
const FB_TRAIL = 420;
const FB_LAUNCH_FLASH_MS = 140;
// a bar it passes: a flare along it and sparks flung both ways
const FB_FLARE_MS = 320;
const FB_FLARE_WIDTH = 100;
const FB_SPARKS = 16;
const FB_BLAST = 460;
const FB_FLASH_MS = 260;
const FB_FLASH = 620;
const FB_SHAKES = [1, 3.4];
const FB_TAIL_MS = DETONATION_MS + 100;

const RED = fadeStops(COLOR.roundUpOrange);
const ORANGE = fadeStops(COLOR.orange);
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

// each spark's reach (share of the half width) and drift off the bar
const SPARK_REACH: number[] = [];
const SPARK_DRIFT: number[] = [];
for (let j = 0; j < FB_SPARKS; j++) {
  SPARK_REACH.push(0.3 + 0.7 * hash01(j, 11));
  SPARK_DRIFT.push(hash01(j, 12) - 0.5);
}

// planned at launch: the bars top to bottom, when the plunge hits each
const order: number[] = [];
const hitAt: number[] = [];
let charge: Charge = planCharge(FB_EMBER_AT, FB_CHARGE_MS);
// kept each frame for fireballAt: the ember's spot and the plunge's end
let baseX = 0;
let baseY = 0;
let endY = 0;
const slots: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];
let slot = 0;
const here: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

const startYOf = (r: Running, bars: Point[], topY: number) =>
  Math.min(skyY(r, bars, FB_ABOVE), topY - FB_MIN_ABOVE);

function fireballAt(t: number): Point | null {
  if (t < FB_EMBER_AT || t > FB_BLAST_AT) return null;
  slot = (slot + 1) & 3;
  const p = slots[slot];
  if (t < FB_LAUNCH_AT) {
    trembleAt(chargeAt(charge, t), t, FB_TREMBLE, p);
    p.x += baseX;
    p.y += baseY;
  } else {
    p.x = baseX;
    p.y = lerp(baseY, endY, (t - FB_LAUNCH_AT) / FB_PLUNGE_MS);
  }
  return p;
}

function drawCharging(
  ctx: CanvasRenderingContext2D,
  c: number,
  ms: number,
  now: number,
): void {
  const { x, y } = here;
  const radius = lerp(FB_RADIUS[0], FB_RADIUS[1], c);
  drawChargeStreaks(
    ctx,
    here,
    c,
    lerp(FB_STREAK_REACH[0], FB_STREAK_REACH[1], c),
    ms,
  );
  drawChargeGlow(ctx, here, c, radius * 5, now);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  // orange outside, a white-hot heart swelling through it
  ctx.globalAlpha = 0.9 - 0.4 * c;
  drawGlow(ctx, RED, x, y, radius * 2.4);
  ctx.globalAlpha = 0.85;
  drawGlow(ctx, ORANGE, x, y, radius * 1.7);
  ctx.globalAlpha = 0.3 + 0.7 * c;
  drawGlow(ctx, GOLD, x, y, radius * 1.2);
  ctx.globalAlpha = c;
  drawGlow(ctx, WHITE, x, y, radius * lerp(0.3, 1, c));
  // flames licking up off it, quicker as it charges
  const lick = lerp(0.0018, 0.006, c);
  for (let i = 0; i < FB_FLAMES; i++) {
    const u = (now * lick + i / FB_FLAMES + hash01(i, 3) * 0.3) % 1;
    const side = Math.sin(i * 2.39);
    ctx.globalAlpha = 1 - u;
    drawGlow(
      ctx,
      u < 0.35 ? GOLD : ORANGE,
      x + side * radius * 0.8 * (1 - u) + Math.sin(now * 0.02 + i) * radius * 0.15,
      y - radius * (0.2 + 1.6 * u) * (0.8 + 0.4 * c),
      radius * 0.6 * (1 - 0.6 * u),
      1.6,
    );
  }
  // embers spiralling in from far out
  const pull = lerp(0.0007, 0.0028, c);
  ctx.globalAlpha = 0.4 + 0.6 * c;
  for (let i = 0; i < FB_EMBERS; i++) {
    const u = (ms * pull + i / FB_EMBERS) % 1;
    const reach = lerp(FB_STREAK_REACH[1], radius, u * u);
    const a = i * 2.4 + u * 3;
    stampGlimmer(
      ctx,
      x + Math.cos(a) * reach,
      y + Math.sin(a) * reach,
      18 + 10 * c,
      now * 0.004 + i,
      i % 3 ? COLOR.orange : COLOR.heavenlyGold,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

function drawPlunge(ctx: CanvasRenderingContext2D, ms: number): void {
  const { x, y } = here;
  const radius = FB_RADIUS[1];
  from.x = x;
  from.y = Math.max(baseY, y - FB_TRAIL);
  drawBeam(ctx, from, here, radius * 1.6, 0.9);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  // the launch's flash where it hung
  const launched = (ms - FB_LAUNCH_AT) / FB_LAUNCH_FLASH_MS;
  if (launched < 1) {
    ctx.globalAlpha = (1 - launched) ** 2;
    drawGlow(ctx, WHITE, baseX, baseY, radius * 4);
  }
  // flames streaming off behind it
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.9 - i * 0.13;
    drawGlow(
      ctx,
      i < 2 ? GOLD : ORANGE,
      x + Math.sin(ms * 0.05 + i * 1.7) * radius * 0.2,
      y - i * radius * 0.7,
      radius * (1.5 - i * 0.18),
      1.4,
    );
  }
  ctx.globalAlpha = 1;
  drawGlow(ctx, RED, x, y, radius * 2.6);
  drawGlow(ctx, WHITE, x, y, radius * 1.1);
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// each bar it passes flaring along its length, sparks flung both ways
function drawFlares(
  ctx: CanvasRenderingContext2D,
  r: Running,
  ms: number,
  bars: Point[],
  now: number,
): void {
  const half = r.play.barHalfWidth;
  for (let k = 0; k < order.length; k++) {
    const bar = order[k];
    const since = ms - hitAt[bar];
    if (since < 0 || since >= FB_FLARE_MS || bar >= bars.length) continue;
    const t = since / FB_FLARE_MS;
    const left = 1 - t;
    const at = bars[bar];
    from.x = at.x - half;
    from.y = to.y = at.y;
    to.x = at.x + half;
    drawBeam(ctx, from, to, FB_FLARE_WIDTH * left, left);
  }
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let k = 0; k < order.length; k++) {
    const bar = order[k];
    const since = ms - hitAt[bar];
    if (since < 0 || since >= FB_FLARE_MS || bar >= bars.length) continue;
    const t = since / FB_FLARE_MS;
    const left = 1 - t;
    const y = bars[bar].y;
    ctx.globalAlpha = left * left;
    drawGlow(ctx, WHITE, baseX, y, 200 * left);
    ctx.globalAlpha = left;
    const out = Math.sqrt(t) * half * 1.4;
    for (let j = 0; j < FB_SPARKS; j++)
      stampGlimmer(
        ctx,
        baseX + (j & 1 ? 1 : -1) * out * SPARK_REACH[j],
        y + SPARK_DRIFT[j] * 70 + 90 * t * t,
        26 * left,
        now * 0.005 + j,
        j % 3 ? COLOR.orange : COLOR.white,
      );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

registerFloorCrit("fireballCrit", {
  plan(r, bars, hit) {
    order.length = 0;
    for (const bar of byHeight(bars)) order.push(bar);
    hitAt.length = bars.length;
    const startY = startYOf(r, bars, bars[order[0]].y);
    const lastY = bars[order[order.length - 1]].y;
    charge = planCharge(FB_EMBER_AT, FB_CHARGE_MS, {
      shake: [0.1, 0.9],
      everyMs: [190, 50],
      climaxShake: 1.5,
      bang: false,
    });
    order.forEach((bar, k) => {
      const share = (bars[bar].y - startY) / Math.max(1, lastY - startY);
      const last = k === order.length - 1;
      hitAt[bar] = last ? FB_BLAST_AT : FB_LAUNCH_AT + share * FB_PLUNGE_MS;
      hit(bar, hitAt[bar], last ? 1 : 0);
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const top = bars[order[0]] ?? bars[0];
    const last = bars[order[order.length - 1]] ?? bars[0];
    baseX = top.x + r.play.barHalfWidth * FB_SIDE;
    baseY = startYOf(r, bars, top.y);
    endY = last.y;
    tickCharge(charge, ms, r.shake);
    if (ms >= FB_BLAST_AT && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
    }

    // the number shrinking into the ember
    if (ms < FB_IN_MS) {
      const t = (ms / FB_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        baseX * t,
        baseY * t,
        lerp(r.flashFont, 0, t),
      );
    }

    drawFlares(ctx, r, ms, bars, now);
    const c = chargeAt(charge, ms);
    const at = fireballAt(ms);
    if (at) {
      here.x = at.x;
      here.y = at.y;
      if (ms < FB_LAUNCH_AT) drawCharging(ctx, c, ms, now);
      else drawPlunge(ctx, ms);
    }
    drawWispBetween(
      ctx,
      fireballAt,
      ms,
      now,
      WISP_SIZE *
        (ms < FB_LAUNCH_AT ? lerp(FB_WISP[0], FB_WISP[1], c) : FB_PLUNGE_WISP),
      ms < FB_LAUNCH_AT ? c : 1,
      FB_EMBER_AT,
      FB_BLAST_AT,
    );

    // the burst on the last bar
    const since = ms - FB_BLAST_AT;
    if (since >= 0 && since < FB_FLASH_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (1 - since / FB_FLASH_MS) ** 2;
      drawGlow(ctx, WHITE, baseX, endY, FB_FLASH);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
    here.x = baseX;
    here.y = endY;
    drawDetonation(ctx, here, since, FB_BLAST, now);
  },
  tailMs: FB_TAIL_MS,
  shake: (step) => FB_SHAKES[step] ?? FB_SHAKES[0],
});
