// Magnetar, a rate crit: the number shrinks into a tiny star beside the bars
// that ignites with a pop and spins, two beams sweeping round it; it tears
// the glowing sparks off every readout along bowed field lines, the nearest
// first, a trickle then a flood, each readout flashing and turning over as
// its sparks rip away; the star swells, trembles and spins faster and faster
// as they crust round it, then collapses to a white-hot pin and bursts,
// flinging every spark home onto its own bar's readout, its own bar's last,
// whirled round the blast first and slammed in with the big one. The bars
// are magnetized: every payout of one jolts all the others ahead
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import {
  drawFieldLines,
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

const IN_MS = 140;
// the star GAP px left of the bars' left end, kept EDGE px on screen, level
// with the middle of the bars in view
const GAP = 70;
const EDGE = 80;
// it ignites over IGNITE_MS in a pop IGNITE_FLASH px across
const IGNITE_MS = 160;
const IGNITE_FLASH = 170;
const CORE: [number, number] = [5, 17];
const RIM = 3;
const GLOW = 280;
const TREMBLE = 11;
// its spin (rad) at ms: SPIN[0] * ms + SPIN[1] * ms², ever quicker; the
// beams sweep a disk TILT tall, BEAM_LEN long and BEAM_W wide as it charges
const SPIN: [number, number] = [0.006, 0.000012];
const TILT = 0.45;
const BEAM_LEN: [number, number] = [130, 360];
const BEAM_W: [number, number] = [14, 40];
const SPRITE_W = 256;
const SPRITE_H = 64;
// a readout READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
const READ_GLOW = 130;
// the sparks: PER_BAR round each readout, torn off from a bar's tear (the
// nearest at TEAR[0], the farthest at TEAR[1], the gaps closing up), the
// last crusting CRUST px round the star at PULL_END and orbiting it ORBIT of
// its spin; each readout flashes TEAR_FLASH px for FLASH_MS, its reward
// landing TEAR_HIT after its tear
const PER_BAR = 16;
const BOX = { left: -64, top: -46, right: 64, bottom: 20 };
const TEAR: [number, number] = [300, 860];
const TEAR_HIT = 50;
const PULL_END = 1150;
const CRUST: [number, number] = [12, 40];
const ORBIT = 0.35;
const SPARK = 19;
const TAIL_MS = 22;
const JITTER = 5;
const FIELD = 24;
const TEAR_FLASH = 120;
const FLASH_MS = 150;
// the collapse to a pin PIN px across, then the burst: the sparks flung
// home FLING_SPEED px a ms (FLY ms at most and least), bowed FLY_BOW of the
// way off the straight line, trailing TRAIL stamps TRAIL_STEP apart; its own
// whirled round the blast from OWN_RING[0] to [1] px out, slammed home
// OWN_FLY ms after OWN_AFTER past the last other landing
const COLLAPSE_MS = 1180;
const BURST_MS = 1290;
const PIN = 110;
const BURST_BLAST = 280;
const FLING_SPEED = 2.4;
const FLY: [number, number] = [110, 260];
const FLY_BOW = 0.22;
const TRAIL = 2;
const TRAIL_STEP = 0.09;
const LAND_FLASH = 110;
const OWN_RING: [number, number] = [30, 75];
const OWN_AFTER = 70;
const OWN_FLY = 170;
const OWN_BLAST = 360;
// shakes by step: a jolt, a readout torn, its own slammed
const SHAKES = [1, 0.9, 3];

const GOLD = COLOR.heavenlyGold;
const WHITE = COLOR.white;
const READ_STOPS = fadeStops(GOLD);
const CORE_FILL = "#fffbe8";

// magnetized bars: each payout of one runs all the others fast for a burst
interface Magnet {
  floor: Floor;
  until: number;
}
let kickAt = -Infinity;
let kickFloor: Floor | null = null;
const field: Magnet[] = [];
let countedAt = -1;
let counted = 0;
function liveMagnets(now: number): number {
  if (now === countedAt) return counted;
  countedAt = now;
  counted = 0;
  for (let i = 0; i < field.length; i++) {
    const m = field[i];
    if (now < m.until && magnets.get(m.floor) === m) counted++;
  }
  return counted;
}
const magnets = defineBarEffect<Magnet>({
  speed: (v, now) =>
    now - kickAt < meta.values.burstMs &&
    (v.floor !== kickFloor || liveMagnets(now) < 2)
      ? meta.values.speed
      : 1,
  onPayout: (v, now) => {
    kickAt = now;
    kickFloor = v.floor;
    return v;
  },
  ended: (v, now) => now >= v.until,
});

interface State {
  point: Point;
  charge: Charge;
  snaps: Snap[];
  snapBar: Int16Array;
  tear: Float32Array;
  land: Float32Array;
  ownLaunch: number;
  ownLand: number;
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const readout: Point = { x: 0, y: 0 };
const rel: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };
const own: Point = { x: 0, y: 0 };

const spinAt = (ms: number) => SPIN[0] * ms + SPIN[1] * ms * ms;

// the star left of the bars, level with the middle of them, into `into`
function pointAt(r: Running, bars: Point[], into: Point): Point {
  let top = bars[0].y;
  let bottom = bars[0].y;
  for (let b = 1; b < bars.length; b++) {
    if (bars[b].y < top) top = bars[b].y;
    if (bars[b].y > bottom) bottom = bars[b].y;
  }
  into.x = Math.max(
    -r.viewportWidth / 2 + EDGE,
    bars[0].x - r.play.barHalfWidth - GAP,
  );
  into.y = (top + bottom) / 2;
  return into;
}

// a beam: white at the star fading out through gold, flaring wider
let beamSprite: HTMLCanvasElement | null = null;
function beam(): HTMLCanvasElement {
  if (beamSprite) return beamSprite;
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const g = canvas.getContext("2d")!;
  const fade = g.createLinearGradient(0, 0, SPRITE_W, 0);
  fade.addColorStop(0, WHITE);
  fade.addColorStop(0.25, GOLD);
  fade.addColorStop(1, "rgba(255, 210, 80, 0)");
  g.fillStyle = fade;
  g.beginPath();
  g.moveTo(0, SPRITE_H / 2 - 3);
  g.lineTo(SPRITE_W, 0);
  g.lineTo(SPRITE_W, SPRITE_H);
  g.lineTo(0, SPRITE_H / 2 + 3);
  g.closePath();
  g.fill();
  beamSprite = canvas;
  return canvas;
}

// the two beams out of `at`, sweeping a tilted disk as the star spins
function drawBeams(
  ctx: CanvasRenderingContext2D,
  at: Point,
  spin: number,
  len: number,
  width: number,
  alpha: number,
): void {
  const dx = Math.cos(spin);
  const dy = Math.sin(spin) * TILT;
  const reach = len * Math.hypot(dx, dy);
  if (reach < 1 || width < 1 || alpha <= 0) return;
  const sprite = beam();
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(at.x, at.y);
  ctx.rotate(Math.atan2(dy, dx));
  for (let side = 0; side < 2; side++) {
    ctx.globalAlpha = base * alpha * 0.45;
    ctx.drawImage(sprite, 0, -width / 2, reach, width);
    ctx.globalAlpha = base * alpha;
    ctx.drawImage(sprite, 0, -width * 0.17, reach, width * 0.34);
    ctx.rotate(Math.PI);
  }
  ctx.restore();
}

registerFloorCrit("magnetarCrit", {
  reward(t) {
    t.flipRate();
    const until = t.now + (t.own ? meta.values.ownMs : meta.values.ms);
    const v = magnets.get(t.floor);
    if (v) v.until = Math.max(v.until, until);
    else {
      let kept = 0;
      for (let i = 0; i < field.length; i++) {
        const m = field[i];
        if (t.now < m.until && magnets.get(m.floor) === m) field[kept++] = m;
      }
      field.length = kept;
      const m = { floor: t.floor, until };
      magnets.set(t.floor, m);
      field.push(m);
    }
    countedAt = -1;
    t.punch(`x${meta.values.speed} Magnetized`);
  },
  plan(r, bars, hit) {
    const n = bars.length;
    if (n === 0) return;
    const readX = r.play.barHalfWidth * READOUT;
    const point = pointAt(r, bars, { x: 0, y: 0 });
    const dist = new Float32Array(n);
    const near: number[] = [];
    for (let b = 0; b < n; b++) {
      dist[b] = Math.hypot(
        bars[b].x + readX - point.x,
        bars[b].y + CONTACT_Y - point.y,
      );
      near.push(b);
    }
    near.sort((a, b) => dist[a] - dist[b]);
    // the nearest readouts torn first, the gaps closing up into a flood
    const tear = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const u = n > 1 ? k / (n - 1) : 0;
      tear[near[k]] = lerp(TEAR[0], TEAR[1], 1 - (1 - u) * (1 - u));
    }
    const snaps: Snap[] = [];
    const snapBar = new Int16Array(n * PER_BAR);
    for (let b = 0; b < n; b++) {
      const planned = planSnaps(PER_BAR, BOX, 1, tear[b], PULL_END, CRUST);
      for (let j = 0; j < planned.length; j++) {
        snapBar[snaps.length] = b;
        snaps.push(planned[j]);
      }
      hit(b, tear[b] + TEAR_HIT, b === 0 ? 0 : 1);
    }
    hit(0, BURST_MS, 0);
    // flung home at speed, the nearest landing first, its own last
    const land = new Float32Array(n);
    let last = BURST_MS;
    for (let b = 1; b < n; b++) {
      land[b] =
        BURST_MS + Math.min(FLY[1], Math.max(FLY[0], dist[b] / FLING_SPEED));
      last = Math.max(last, land[b]);
      hit(b, land[b], 0);
    }
    const ownLand = Math.max(last + OWN_AFTER, BURST_MS + OWN_FLY + 80);
    land[0] = ownLand;
    hit(0, ownLand, 2);
    states.set(r, {
      point,
      charge: planCharge(IN_MS, BURST_MS - IN_MS, {
        bang: false,
        climaxShake: 2.6,
      }),
      snaps,
      snapBar,
      tear,
      land,
      ownLaunch: ownLand - OWN_FLY,
      ownLand,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const n = bars.length;
    if (n === 0) return;
    const now = r.startedAt + ms;
    const readX = r.play.barHalfWidth * READOUT;
    const point = pointAt(r, bars, s.point);
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, point.x, p),
        lerp(0, point.y, p),
        r.flashFont * lerp(1, 0.2, p),
      );
    }
    tickCharge(s.charge, ms, r.shake);
    const c = chargeAt(s.charge, ms);
    const lit = ms >= IN_MS && ms < BURST_MS;
    const grow = clamp01((ms - IN_MS) / IGNITE_MS);
    const fold = clamp01((ms - COLLAPSE_MS) / (BURST_MS - COLLAPSE_MS));
    const shrink = 1 - fold * fold;
    const spin = spinAt(ms);
    trembleAt(Math.max(c, fold), ms, TREMBLE, shiver);
    core.x = point.x + shiver.x;
    core.y = point.y + shiver.y;
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;

    // every readout's glow draining along the field lines into the star
    if (lit) {
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < n; b++) {
        readout.x = bars[b].x + readX;
        readout.y = bars[b].y + CONTACT_Y;
        const u = clamp01((ms - s.tear[b]) / (PULL_END - s.tear[b]));
        const left = 1 - u * u;
        ctx.globalAlpha = alpha * (0.4 + 0.6 * c) * left * grow;
        drawGlow(ctx, READ_STOPS, readout.x, readout.y, READ_GLOW * left);
        ctx.globalAlpha = alpha;
        if (ms >= s.tear[b] - 120)
          drawFieldLines(
            ctx,
            readout,
            core,
            (0.5 + 0.5 * c) * shrink * left,
            ms,
            FIELD,
            3,
          );
      }
      ctx.globalCompositeOperation = previous;
    }

    // the star: its glow swelling, two beams sweeping, a white-hot core
    if (lit) {
      drawChargeGlow(ctx, core, Math.max(0.2, c) * grow, GLOW * shrink, now);
      drawBeams(
        ctx,
        core,
        spin,
        lerp(BEAM_LEN[0], BEAM_LEN[1], c) * grow * shrink,
        lerp(BEAM_W[0], BEAM_W[1], c) * (0.4 + 0.6 * shrink),
        0.55 + 0.45 * c,
      );
      const radius = Math.max(0, lerp(CORE[0], CORE[1], c) * grow * shrink);
      if (radius > 0.5) {
        ctx.fillStyle = CORE_FILL;
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
    // the ignition pop
    if (lit && ms < IN_MS + IGNITE_MS)
      stampGlimmer(ctx, core.x, core.y, IGNITE_FLASH * (1 - grow), 2, WHITE);
    // each readout flashing as its sparks tear away, and again as they land
    for (let b = 0; b < n; b++) {
      const rx = bars[b].x + readX;
      const ry = bars[b].y + CONTACT_Y;
      const torn = ms - s.tear[b];
      if (torn >= 0 && torn < FLASH_MS)
        stampGlimmer(ctx, rx, ry, TEAR_FLASH * (1 - torn / FLASH_MS), b, WHITE);
      const landed = ms - s.land[b];
      if (b !== 0 && landed >= 0 && landed < FLASH_MS)
        stampGlimmer(
          ctx,
          rx,
          ry,
          LAND_FLASH * (1 - landed / FLASH_MS),
          b + 5,
          WHITE,
        );
    }
    // the sparks: lying on their readout, streaking in, orbiting, flung home
    if (ms >= IN_MS)
      for (let i = 0; i < s.snaps.length; i++) {
        const snap = s.snaps[i];
        const b = s.snapBar[i];
        if (b >= n) continue;
        const color = i % 3 ? GOLD : WHITE;
        const rx = bars[b].x + readX;
        const ry = bars[b].y + CONTACT_Y;
        if (ms >= BURST_MS) {
          const landMs = s.land[b];
          if (ms >= landMs) continue;
          const isOwn = b === 0;
          const launch = isOwn ? s.ownLaunch : BURST_MS;
          if (ms < launch) {
            // its own whirled round the blast, spinning out
            const out = lerp(
              OWN_RING[0],
              OWN_RING[1],
              clamp01((ms - BURST_MS) / (launch - BURST_MS)),
            );
            const a = snap.angle + spin;
            stampGlimmer(
              ctx,
              point.x + Math.cos(a) * out,
              point.y + Math.sin(a) * out * 0.8,
              SPARK * 1.2,
              i,
              color,
            );
            continue;
          }
          let fx: number;
          let fy: number;
          if (isOwn) {
            const a = snap.angle + spinAt(launch);
            fx = point.x + Math.cos(a) * OWN_RING[1];
            fy = point.y + Math.sin(a) * OWN_RING[1] * 0.8;
          } else {
            fx = point.x + Math.cos(snap.angle) * snap.reach * 0.5;
            fy = point.y + Math.sin(snap.angle) * snap.reach * 0.4;
          }
          const tx = rx + snap.from.x * 0.3;
          const ty = ry + snap.from.y * 0.3;
          const bow = FLY_BOW * snap.bow;
          const mx = (fx + tx) / 2 - (ty - fy) * bow;
          const my = (fy + ty) / 2 + (tx - fx) * bow;
          const u = (ms - launch) / (landMs - launch);
          const big = isOwn ? 1.35 : 1;
          for (let j = TRAIL; j >= 0; j--) {
            const v = u - j * TRAIL_STEP;
            if (v < 0) continue;
            const e = v ** 1.4;
            const w = 1 - e;
            stampGlimmer(
              ctx,
              w * w * fx + 2 * w * e * mx + e * e * tx,
              w * w * fy + 2 * w * e * my + e * e * ty,
              SPARK * big * (1 - j * 0.25),
              i + j,
              j === 0 ? color : GOLD,
            );
          }
          continue;
        }
        if (ms >= snap.landMs) {
          // crusting round the star, orbiting with its spin
          const a = snap.angle + ORBIT * (spin - spinAt(snap.landMs));
          stampGlimmer(
            ctx,
            core.x + Math.cos(a) * snap.reach * shrink,
            core.y + Math.sin(a) * snap.reach * 0.8 * shrink,
            SPARK * (0.4 + 0.5 * shrink),
            i,
            color,
          );
          continue;
        }
        rel.x = core.x - rx;
        rel.y = core.y - ry;
        snapAt(snap, ms, rel, SPARK, spot);
        if (ms < snap.startMs) {
          const j = JITTER * (0.3 + c);
          stampGlimmer(
            ctx,
            rx + spot.x + Math.sin(ms * 0.05 + i) * j,
            ry + spot.y + Math.cos(ms * 0.06 + i * 1.7) * j,
            SPARK * grow,
            i,
            color,
          );
          continue;
        }
        snapAt(snap, ms - TAIL_MS, rel, SPARK, tail);
        stampGlimmer(ctx, rx + tail.x, ry + tail.y, SPARK * 0.6, i + 7, GOLD);
        stampGlimmer(
          ctx,
          lerp(rx + tail.x, rx + spot.x, 0.5),
          lerp(ry + tail.y, ry + spot.y, 0.5),
          SPARK * 0.8,
          i + 3,
          GOLD,
        );
        stampGlimmer(ctx, rx + spot.x, ry + spot.y, SPARK * 1.15, i, color);
      }
    // the collapse: a white-hot pin, brighter the smaller it gets
    if (ms >= COLLAPSE_MS && ms < BURST_MS) {
      stampGlimmer(ctx, core.x, core.y, PIN * (0.4 + 0.8 * fold), 1, GOLD);
      stampGlimmer(ctx, core.x, core.y, PIN * (0.2 + 0.6 * fold), 3, WHITE);
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    drawDetonation(ctx, point, ms - BURST_MS, BURST_BLAST, now);
    own.x = bars[0].x + readX;
    own.y = bars[0].y + CONTACT_Y;
    drawDetonation(ctx, own, ms - s.ownLand, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
