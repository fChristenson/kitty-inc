// Undertow, an income crit: the green amount arcs up under the total and
// shatters into a cloud of glitter; the readout starts to pull, the specks
// torn loose one by one and dragged up into it on spiralling, stretching
// streaks, a trickle then a flood, the strays breaking away and yanked back;
// its glow swells and trembles as it swallows, the rumble rising, until it
// takes the last, collapses to a point and bursts across the total
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
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, readoutSpot } from "../shared";

// the amount arcing up to BELOW under the total, bowed ARCH aside
const UP_MS = 200;
const BELOW = 290;
const ARCH = 280;
const SHATTER_BLAST = 180;
const SHATTER_SHAKE = 1;
// the cloud it shatters into, CLOUD across and tall, flung out over BURST_MS
const SPECKS = 120;
const CLOUD_W = 430;
const CLOUD_H = 130;
const BURST_MS = 180;
// lying, a speck trembles JITTER px and leans TUG px towards the pull
const JITTER = 9;
const TUG = 26;
// torn loose from PULL_MS, nearest first, the last SPAN_MS on; each flies
// FLY_MS (quicker as the flood comes), wound TURN radians round the readout,
// every STRAY_EVERY-th breaking STRAY of its way back out before it's yanked in
const PULL_MS = UP_MS + 160;
const SPAN_MS = 880;
const FLY_MS: [number, number] = [540, 170];
const TURN = 4.2;
const STRAY_EVERY = 5;
const STRAY = 0.5;
const SPECK = 24;
// the streak behind a flying speck: samples TRAIL of its flight back
const TRAIL = [0.07, 0.14];
const TRAIL_SIZE = [0.65, 0.4];
const TRAIL_ALPHA = [0.6, 0.3];
// the readout swallowing: its glow and streaks, trembling; WAVES blasts
// across it as the flood lands
const GLOW = 460;
const STREAKS = 380;
const TREMBLE = 12;
const WAVES = 8;
const WAVE_BLAST = 110;
// the last swallowed, it collapses to a point over COLLAPSE_MS, then bursts
const COLLAPSE_GAP_MS = 40;
const COLLAPSE_MS = 90;
const POINT = 70;
// shakes by step: a wave, the collapse, the burst
const SHAKES = [0.5, 1.2, 2.8];

interface Speck {
  // its spot in the cloud, from the total
  x: number;
  y: number;
  angle: number;
  reach: number;
  startMs: number;
  flyMs: number;
  turn: number;
  stray: number;
}

interface Plan {
  specks: Speck[];
  waves: number[];
  pops: Point[];
  charge: Charge;
  collapseMs: number;
  endMs: number;
  shattered: boolean;
}
const plans = new WeakMap<Running, Plan>();
const spot: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

function planUndertow(to: Point): Plan {
  const specks: Speck[] = [];
  for (let i = 0; i < SPECKS; i++) {
    const a = holeHash(i, 1810) * Math.PI * 2;
    const d = Math.sqrt(holeHash(i, 1811));
    const x = Math.cos(a) * d * CLOUD_W;
    const y = BELOW + Math.sin(a) * d * CLOUD_H;
    specks.push({
      x,
      y,
      angle: Math.atan2(y, x),
      reach: Math.hypot(x, y),
      startMs: 0,
      flyMs: 0,
      turn: holeHash(i, 1812) < 0.5 ? -TURN : TURN,
      stray: i % STRAY_EVERY === 0 ? STRAY : 0,
    });
  }
  specks.sort((a, b) => a.reach - b.reach);
  const lands: number[] = [];
  specks.forEach((speck, i) => {
    const u = i / (SPECKS - 1);
    speck.startMs = PULL_MS + SPAN_MS * Math.sqrt(u);
    speck.flyMs = lerp(FLY_MS[0], FLY_MS[1], u);
    lands.push(speck.startMs + speck.flyMs);
  });
  lands.sort((a, b) => a - b);
  const collapseMs = lands[lands.length - 1] + COLLAPSE_GAP_MS;
  return {
    specks,
    waves: Array.from(
      { length: WAVES },
      (_, k) => lands[Math.floor(((k + 1) * SPECKS) / (WAVES + 1))],
    ),
    pops: Array.from({ length: WAVES }, (_, k) => readoutSpot(to, k, 1813)),
    charge: planCharge(PULL_MS, collapseMs - PULL_MS, {
      climaxShake: 0.6,
      bang: false,
    }),
    collapseMs,
    endMs: collapseMs + COLLAPSE_MS,
    shattered: false,
  };
}

// where a torn-loose speck is u (0..1) of its way up, from the total
function flightAt(speck: Speck, u: number, to: Point, into: Point): Point {
  const e = u * u;
  const bulge = speck.stray * Math.sin(Math.PI * Math.min(1, u * 2));
  const a = speck.angle + speck.turn * e;
  const d = speck.reach * (1 - e) * (1 + bulge);
  into.x = to.x + Math.cos(a) * d;
  into.y = to.y + Math.sin(a) * d;
  return into;
}

registerFloorCrit("undertowCrit", {
  plan(r, bars, hit) {
    const plan = planUndertow(bars[0]);
    plans.set(r, plan);
    for (const at of plan.waves) hit(0, at);
    hit(0, plan.collapseMs, 1);
    hit(0, plan.endMs, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const cx = to.x;
    const cy = to.y + BELOW;

    if (ms < UP_MS) {
      const p = (ms / UP_MS) ** 2;
      const bx = cx / 2 + ARCH;
      const by = cy / 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        2 * (1 - p) * p * bx + p * p * cx,
        2 * (1 - p) * p * by + p * p * cy,
        r.flashFont,
      );
      return;
    }
    if (!plan.shattered) {
      plan.shattered = true;
      r.shake(SHATTER_SHAKE);
    }
    tickCharge(plan.charge, ms, r.shake);
    const c = chargeAt(plan.charge, ms);

    // the readout swallowing, trembling harder as it fills
    if (ms < plan.collapseMs) {
      trembleAt(c, ms, TREMBLE, shiver);
      core.x = to.x + shiver.x;
      core.y = to.y + shiver.y;
      drawChargeStreaks(ctx, core, c, STREAKS, ms);
      drawChargeGlow(ctx, core, c, GLOW, now);
    } else if (ms < plan.endMs) {
      const p = (ms - plan.collapseMs) / COLLAPSE_MS;
      drawChargeGlow(ctx, to, 1, GLOW * (1 - p) ** 2, now);
    }

    // the glitter: flung out, lying and trembling, or streaking up
    const burst = 1 - (1 - clamp01((ms - UP_MS) / BURST_MS)) ** 3;
    const jitter = JITTER * (0.3 + c);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < plan.specks.length; i++) {
      const speck = plan.specks[i];
      const color = i % 3 ? COLOR.heavenlyGold : COLOR.white;
      const since = ms - speck.startMs;
      if (since >= speck.flyMs) continue;
      if (since < 0) {
        const keep = 1 - (TUG * c) / Math.max(1, speck.reach);
        ctx.globalAlpha = 1;
        stampGlimmer(
          ctx,
          to.x + speck.x * burst * keep + Math.sin(ms * 0.05 + i) * jitter,
          to.y +
            (BELOW + (speck.y - BELOW) * burst) * keep +
            Math.cos(ms * 0.06 + i * 1.7) * jitter,
          SPECK,
          i,
          color,
        );
        continue;
      }
      const u = since / speck.flyMs;
      for (let k = TRAIL.length - 1; k >= 0; k--) {
        const back = u - TRAIL[k];
        if (back < 0) continue;
        flightAt(speck, back, to, spot);
        ctx.globalAlpha = TRAIL_ALPHA[k];
        stampGlimmer(
          ctx,
          spot.x,
          spot.y,
          SPECK * TRAIL_SIZE[k] * (1 - 0.5 * back),
          i + k,
          color,
        );
      }
      flightAt(speck, u, to, spot);
      ctx.globalAlpha = 1;
      stampGlimmer(ctx, spot.x, spot.y, SPECK * (1 - 0.5 * u), i, color);
    }
    // the collapse: a white-hot point
    if (ms >= plan.collapseMs && ms < plan.endMs) {
      const p = (ms - plan.collapseMs) / COLLAPSE_MS;
      ctx.globalAlpha = 1;
      stampGlimmer(ctx, to.x, to.y, POINT * (1 + p), 0, COLOR.white);
    }
    endLightBatch(ctx);
    ctx.restore();

    spot.x = cx;
    spot.y = cy;
    drawDetonation(ctx, spot, ms - UP_MS, SHATTER_BLAST, now);
    for (let k = 0; k < WAVES; k++)
      drawDetonation(ctx, plan.pops[k], ms - plan.waves[k], WAVE_BLAST, now);
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS + 200,
  shake: (step) => SHAKES[step],
});
