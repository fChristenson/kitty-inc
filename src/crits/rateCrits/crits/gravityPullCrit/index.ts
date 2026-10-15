// Gravity Pull, a rate crit: the number sinks into a heavy dark-gold point
// that opens beside its own bar and starts to pull: the glow of every readout
// in view leans and stretches towards it along bending gold field lines, and
// its glitter is dragged off in streaking streams, a trickle then a flood,
// the nearest readouts first; the point swells, trembles and rumbles as it
// drinks, the stolen glitter crusting round it, until it takes the last,
// collapses to a pin and bursts, the crust flung off as sparks and heavy
// golden lumps lobbed back onto every readout down the building, quicker
// each, its own last in the big blast. Each readout turns over: for a while
// its payouts get heavier the slower its bar runs
import meta from "./meta";
import { defineBarEffect, rateCritSpeed } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import { officeUpgradeSpeedMultiplier } from "../../../../shared/income";
import {
  drawFieldLines,
  flingAt,
  planSnaps,
  snapAt,
  type Snap,
} from "../../../../shared/animationStyles/pull";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the point GAP px left of its own bar's left end, kept EDGE px on screen
const GAP = 80;
const EDGE = 90;
const OPEN_MS = 180;
const CORE: [number, number] = [12, 46];
const RIM = 5;
const GLOW = 300;
const TREMBLE = 13;
// a readout READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// its glow, READ_GLOW across, leaning LEAN of the way to the point
const READ_GLOW = 150;
const LEAN = [0.22, 0.45];
// the glitter: PER_BAR specks round each readout, dragged in from PULL_MS
// (the nearest readouts STAGGER_MS sooner), the last landing at PULL_END,
// crusting CRUST px round the point; streaks TAIL_MS long
const PER_BAR = 20;
const BOX = { left: -70, top: -50, right: 70, bottom: 22 };
const PULL_MS = 200;
const STAGGER_MS = 160;
const PULL_END = 1060;
const CRUST: [number, number] = [14, 46];
const SPECK = 20;
const TAIL_MS = 22;
const JITTER = 6;
const FIELD = 26;
// the collapse to a pin, then the burst: the crust flung FLING px a ms over
// FLING_MS, lumps lobbed one every GAP_MS (closing), each FLY_MS (quicker),
// arcing LIFT up; its own OWN_AFTER after the last other
const COLLAPSE_GAP_MS = 40;
const COLLAPSE_MS = 100;
const BURST_BLAST = 260;
const FLING = 1.7;
const FLING_MS = 260;
const GAP_MS: [number, number] = [70, 32];
const FLY_MS: [number, number] = [210, 150];
const OWN_AFTER = 60;
const OWN_FLY_MS = 230;
const LIFT = 150;
const LUMP = 44;
const LUMP_CORE = 20;
const TRAIL = 3;
const TRAIL_STEP = 0.07;
const HIT_FLASH = 130;
const HIT_FLASH_MS = 140;
const OWN_BLAST = 340;
// shakes by step: the burst, a readout, its own
const SHAKES = [2.4, 0.8, 2.8];

const GOLD = COLOR.heavenlyGold;
const WHITE = COLOR.white;
const READ_STOPS = fadeStops(GOLD);
const DARK = "#2b1c04";

interface State {
  point: Point;
  charge: Charge;
  snaps: Snap[];
  snapBar: Int16Array;
  barStart: Float32Array;
  collapseMs: number;
  burstMs: number;
  lumpBar: Int16Array;
  lumpFrom: Float32Array;
  lumpLands: Float32Array;
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const readout: Point = { x: 0, y: 0 };
const rel: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };
const own: Point = { x: 0, y: 0 };

// the point beside its own bar, written into `into`
function pointAt(r: Running, bars: Point[], into: Point): Point {
  into.x = Math.max(
    -r.viewportWidth / 2 + EDGE,
    bars[0].x - r.play.barHalfWidth - GAP,
  );
  into.y = bars[0].y;
  return into;
}

// heavier payouts the slower the bar runs, till `until`
interface Heavy {
  floor: Floor;
  until: number;
}
function heavyAt(floor: Floor, now: number): number {
  const { min, max, k } = meta.values;
  const speed = officeUpgradeSpeedMultiplier(floor) * rateCritSpeed(floor, now);
  return Math.min(max, Math.max(min, k / speed));
}
const heavy = defineBarEffect<Heavy>({
  payout: (v, now) => heavyAt(v.floor, now),
  ended: (v, now) => now >= v.until,
});

registerFloorCrit("gravityPullCrit", {
  reward(t) {
    t.flipRate();
    const until = t.now + (t.own ? meta.values.ownMs : meta.values.ms);
    const v = heavy.get(t.floor);
    if (v) v.until = Math.max(v.until, until);
    else heavy.set(t.floor, { floor: t.floor, until });
    t.punch(`x${Math.round(heavyAt(t.floor, t.now) * 10) / 10} Heavy`);
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const point = pointAt(r, bars, { x: 0, y: 0 });
    const n = bars.length;
    // the nearest readouts give up their glitter first
    const near: number[] = [];
    for (let b = 0; b < n; b++) near.push(b);
    const dist = (b: number) =>
      Math.hypot(bars[b].x + half * READOUT - point.x, bars[b].y - point.y);
    near.sort((a, b) => dist(a) - dist(b));
    const barStart = new Float32Array(n);
    near.forEach((b, rank) => {
      barStart[b] = PULL_MS + STAGGER_MS * (rank / Math.max(1, n - 1));
    });
    const snaps: Snap[] = [];
    const snapBar = new Int16Array(n * PER_BAR);
    for (let b = 0; b < n; b++) {
      const planned = planSnaps(PER_BAR, BOX, 1, barStart[b], PULL_END, CRUST);
      for (let j = 0; j < planned.length; j++) {
        snapBar[snaps.length] = b;
        snaps.push(planned[j]);
      }
    }
    const collapseMs = PULL_END + COLLAPSE_GAP_MS;
    const burstMs = collapseMs + COLLAPSE_MS;
    hit(0, burstMs, 0);
    // the lumps, nearest the point first, its own last
    const order = ownLast(bars);
    const others = order.slice(0, -1).sort((a, b) => dist(a) - dist(b));
    const m = others.length;
    const lumpBar = new Int16Array(m + 1);
    const lumpFrom = new Float32Array(m + 1);
    const lumpLands = new Float32Array(m + 1);
    let at = burstMs;
    for (let k = 0; k < m; k++) {
      const u = m > 1 ? k / (m - 1) : 0;
      lumpBar[k] = others[k];
      lumpFrom[k] = at;
      lumpLands[k] = at + lerp(FLY_MS[0], FLY_MS[1], u);
      hit(others[k], lumpLands[k], 1);
      at += lerp(GAP_MS[0], GAP_MS[1], u);
    }
    lumpBar[m] = 0;
    lumpFrom[m] = m > 0 ? lumpFrom[m - 1] + OWN_AFTER : burstMs;
    lumpLands[m] = lumpFrom[m] + OWN_FLY_MS;
    hit(0, lumpLands[m], 2);
    states.set(r, {
      point,
      charge: planCharge(PULL_MS, collapseMs - PULL_MS, {
        bang: false,
        climaxShake: 1.4,
      }),
      snaps,
      snapBar,
      barStart,
      collapseMs,
      burstMs,
      lumpBar,
      lumpFrom,
      lumpLands,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const n = bars.length;
    if (n === 0) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    const readX = half * READOUT;
    const point = pointAt(r, bars, s.point);
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, point.x, p),
        lerp(0, point.y, p),
        r.flashFont * lerp(1, 0.25, p),
      );
    }
    tickCharge(s.charge, ms, r.shake);
    const c = chargeAt(s.charge, ms);
    const pulling = ms < s.burstMs;
    const shrink =
      ms < s.collapseMs ? 1 : clamp01(1 - (ms - s.collapseMs) / COLLAPSE_MS);
    trembleAt(c, ms, TREMBLE, shiver);
    core.x = point.x + shiver.x;
    core.y = point.y + shiver.y;
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;

    // every readout's glow, leaning and stretching towards the point as it
    // drains, along bending field lines
    if (pulling && ms >= IN_MS) {
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < n; b++) {
        readout.x = bars[b].x + readX;
        readout.y = bars[b].y + CONTACT_Y;
        const u = clamp01((ms - s.barStart[b]) / (PULL_END - s.barStart[b]));
        const left = 1 - u * u;
        const lean = c * (0.4 + 0.6 * u);
        ctx.globalAlpha = alpha * (0.55 + 0.45 * c) * left;
        drawGlow(ctx, READ_STOPS, readout.x, readout.y, READ_GLOW * left);
        for (let j = 0; j < LEAN.length; j++) {
          const k = LEAN[j] * lean;
          drawGlow(
            ctx,
            READ_STOPS,
            lerp(readout.x, core.x, k),
            lerp(readout.y, core.y, k),
            READ_GLOW * left * (0.7 - 0.2 * j),
          );
        }
        ctx.globalAlpha = alpha;
        drawFieldLines(ctx, readout, core, c * shrink * left, ms, FIELD, 3);
      }
      ctx.globalCompositeOperation = previous;
    }

    // the point: its glow swelling, a heavy dark core ringed in gold
    if (pulling && ms >= IN_MS) {
      const grow = clamp01((ms - IN_MS) / OPEN_MS);
      drawChargeGlow(ctx, core, Math.max(0.15, c), GLOW * shrink, now);
      const radius = lerp(CORE[0], CORE[1], c) * grow * shrink;
      if (radius > 0.5) {
        ctx.fillStyle = DARK;
        ctx.beginPath();
        ctx.arc(core.x, core.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = RIM * (0.6 + 0.8 * c);
        ctx.stroke();
      }
    }

    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // the glitter: lying on its readout, streaking in, crusting, then flung
    const since = ms - s.burstMs;
    if (ms >= IN_MS && since < FLING_MS)
      for (let i = 0; i < s.snaps.length; i++) {
        const snap = s.snaps[i];
        const b = s.snapBar[i];
        if (b >= n) continue;
        const color = i % 3 ? GOLD : WHITE;
        if (since >= 0) {
          flingAt(snap, since, core, FLING, spot);
          stampGlimmer(
            ctx,
            spot.x,
            spot.y,
            SPECK * (1 - since / FLING_MS),
            i,
            color,
          );
          continue;
        }
        if (ms >= snap.landMs) {
          spot.x = core.x + Math.cos(snap.angle) * snap.reach * shrink;
          spot.y = core.y + Math.sin(snap.angle) * snap.reach * 0.8 * shrink;
          stampGlimmer(ctx, spot.x, spot.y, SPECK * 0.8, i, color);
          continue;
        }
        const rx = bars[b].x + readX;
        const ry = bars[b].y + CONTACT_Y;
        rel.x = core.x - rx;
        rel.y = core.y - ry;
        snapAt(snap, ms, rel, SPECK, spot);
        if (ms < snap.startMs) {
          const j = JITTER * c;
          stampGlimmer(
            ctx,
            rx + spot.x + Math.sin(ms * 0.05 + i) * j,
            ry + spot.y + Math.cos(ms * 0.06 + i * 1.7) * j,
            SPECK,
            i,
            color,
          );
          continue;
        }
        snapAt(snap, ms - TAIL_MS, rel, SPECK, tail);
        stampGlimmer(ctx, rx + tail.x, ry + tail.y, SPECK * 0.6, i + 7, GOLD);
        stampGlimmer(
          ctx,
          lerp(rx + tail.x, rx + spot.x, 0.5),
          lerp(ry + tail.y, ry + spot.y, 0.5),
          SPECK * 0.8,
          i + 3,
          GOLD,
        );
        stampGlimmer(ctx, rx + spot.x, ry + spot.y, SPECK * 1.15, i, color);
      }
    // the collapse: a white-hot pin
    if (ms >= s.collapseMs && pulling)
      stampGlimmer(ctx, core.x, core.y, 90 * (1.2 - shrink), 1, WHITE);
    // the lumps lobbed back onto every readout, each landing in a flash
    for (let k = 0; k < s.lumpBar.length; k++) {
      const b = s.lumpBar[k];
      if (b >= n || ms < s.lumpFrom[k]) continue;
      const fly = s.lumpLands[k] - s.lumpFrom[k];
      const rx = bars[b].x + readX;
      const ry = bars[b].y + CONTACT_Y;
      const u = (ms - s.lumpFrom[k]) / fly;
      if (u < 1) {
        const lift = LIFT + Math.abs(rx - point.x) * 0.12;
        for (let j = TRAIL; j >= 0; j--) {
          const v = u - j * TRAIL_STEP;
          if (v < 0) continue;
          const e = v ** 1.3;
          const x = lerp(point.x, rx, e);
          const y = lerp(point.y, ry, e) - lift * 4 * e * (1 - e);
          const big = b === 0 ? 1.35 : 1;
          stampGlimmer(ctx, x, y, LUMP * big * (1 - j * 0.22), k + j, GOLD);
          if (j === 0) stampGlimmer(ctx, x, y, LUMP_CORE * big, k, WHITE);
        }
        continue;
      }
      const flash = ms - s.lumpLands[k];
      if (b !== 0 && flash < HIT_FLASH_MS)
        stampGlimmer(
          ctx,
          rx,
          ry,
          HIT_FLASH * (1 - flash / HIT_FLASH_MS),
          k,
          WHITE,
        );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    drawDetonation(ctx, point, since, BURST_BLAST, now);
    own.x = bars[0].x + readX;
    own.y = bars[0].y + CONTACT_Y;
    drawDetonation(
      ctx,
      own,
      ms - s.lumpLands[s.lumpLands.length - 1],
      OWN_BLAST,
      now,
    );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
