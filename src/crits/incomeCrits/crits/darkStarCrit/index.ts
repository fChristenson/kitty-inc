// Dark Star, an income crit: the green amount shrinks away as a dark orb
// ringed in violet-gold light opens just under the total; it starts to
// pull, streaks of light and gold sparks torn off the screen round it and
// curling in, a trickle then a flood, gold field lines bowing up to the
// readout; every few it gulps, throbs and spits a share of the amount up
// onto the readout in a green flash; it swells and trembles, its ring
// blazing and light bending round it, until it takes the last, collapses to
// a white pinpoint and bursts in a ring of light that slams the readout:
// the last share, the big blast and hardest shake
import { COLOR } from "../../../../palette";
import { easeIn, easeOutBack, easeOutCubic } from "../../../../shared/easing";
import {
  drawFieldLines,
  planSnaps,
  type Snap,
} from "../../../../shared/animationStyles/pull";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawNumberShrink, readoutSpot } from "../shared";

// the orb: ORB_DROP px under the total, opening over OPEN_MS, swelling from
// ORB_R[0] to [1] px as it swallows, trembling up to TREMBLE px
const ORB_DROP = 200;
const OPEN_MS = 160;
const ORB_R: [number, number] = [40, 92];
const TREMBLE = 14;
// the light it pulls: SPECKS from the screen round it (EDGE px in from the
// sides, TOP above it to BOTTOM under it, never nearer than NEAR), from
// PULL_MS over PULL_FOR_MS, each curling CURL radians on its way in; every
// SPARK_EVERY one a gold spark
const SPECKS = 210;
const EDGE = 40;
const TOP = -90;
const BOTTOM = 1150;
const NEAR = 150;
const PULL_MS = 120;
const PULL_FOR_MS = 1250;
const CURL = 1.7;
const TAIL = 0.22;
const SPARK_EVERY = 3;
const SPARK = 22;
// gulps: SHARES of them, each throbbing it THROB bigger over THROB_MS and
// spitting a share up onto the readout over SPIT_MS, bowed SPIT_BOW px
const SHARES = 6;
const THROB = 0.22;
const THROB_MS = 150;
const SPIT_MS = 110;
const SPIT_BOW = 90;
const SPIT_FONT: [number, number] = [0.5, 0.3];
const FLASH_MS = 170;
const FLASH = 130;
// collapsing over COLLAPSE_MS, then the ring bursting out to RING_R over
// RING_MS, slamming the readout RING_HIT_MS in
const COLLAPSE_MS = 130;
const RING_R = 560;
const RING_MS = 380;
const RING_W = 46;
const RING_HIT_MS = 60;
const FINALE_BLAST = 470;
const FINALE_FLASH = 440;
// shakes by step: a share, the finale
const SHAKES = [0.8, 2.9];

const VIOLET = COLOR.purple;
const HALO = fadeStops(VIOLET);
const GREEN = fadeStops(COLOR.moneyGreen);
const WHITE = fadeStops(COLOR.white, 0.2);
const CORE = [
  [0, "#000000"],
  [0.62, "#05010cee"],
  [1, "#05010c00"],
] as const;
const RIM = [
  [0, `${COLOR.heavenlyGold}00`],
  [0.6, `${COLOR.heavenlyGold}00`],
  [0.74, COLOR.heavenlyGold],
  [0.84, `${VIOLET}cc`],
  [1, `${VIOLET}00`],
] as const;

interface State {
  snaps: Snap[];
  dist: Float32Array;
  turn: Float32Array;
  gulps: Float32Array;
  spots: Point[];
  lastIn: number;
  endMs: number;
  hitMs: number;
  first: number;
}
const states = new WeakMap<Running, State>();
const orb: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const p: Point = { x: 0, y: 0 };
const TEXT = { alpha: 1 };

// a speck's spot `e` (0..1) of its curling way in from its start onto the rim
function speckAt(
  dist: number,
  turn: number,
  bow: number,
  rim: number,
  e: number,
): Point {
  const d = rim + (dist - rim) * (1 - e);
  const a = turn + bow * CURL * e;
  p.x = orb.x + Math.cos(a) * d;
  p.y = orb.y + Math.sin(a) * d;
  return p;
}

// the current path stroked as light: violet haze, gold, white-hot edge
function strokeRing(
  ctx: CanvasRenderingContext2D,
  width: number,
  alpha: number,
): void {
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = width * 2.2;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = width * 0.35;
  ctx.stroke();
}

registerFloorCrit("darkStarCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const half = r.viewportWidth / 2 - EDGE;
    const ox = to.x;
    const snaps = planSnaps(
      SPECKS,
      { left: -half - ox, right: half - ox, top: TOP, bottom: BOTTOM },
      1,
      PULL_MS,
      PULL_MS + PULL_FOR_MS,
      [0, 0],
    );
    const dist = new Float32Array(SPECKS);
    const turn = new Float32Array(SPECKS);
    for (let i = 0; i < SPECKS; i++) {
      const f = snaps[i].from;
      dist[i] = Math.max(NEAR, Math.hypot(f.x, f.y));
      turn[i] = Math.atan2(f.y, f.x);
    }
    const gulps = new Float32Array(SHARES);
    const spots: Point[] = [];
    for (let k = 0; k < SHARES; k++) {
      const at =
        snaps[Math.round(((k + 1) * SPECKS) / (SHARES + 1)) - 1].landMs;
      gulps[k] = at;
      spots.push(readoutSpot(to, k, 8130));
      hit(0, at + SPIT_MS, 0);
    }
    const lastIn = snaps[SPECKS - 1].landMs;
    const endMs = lastIn + COLLAPSE_MS;
    const hitMs = endMs + RING_HIT_MS;
    hit(0, hitMs, 1);
    states.set(r, {
      snaps,
      dist,
      turn,
      gulps,
      spots,
      lastIn,
      endMs,
      hitMs,
      first: 0,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { snaps, dist, turn, gulps, spots, lastIn, endMs } = s;
    drawNumberShrink(ctx, r, ms);
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    const c = clamp01((ms - PULL_MS) / (lastIn - PULL_MS));
    const collapse = clamp01((ms - lastIn) / COLLAPSE_MS);
    trembleAt(c, ms, TREMBLE * (1 + collapse), shiver);
    orb.x = to.x + shiver.x;
    orb.y = to.y + ORB_DROP + shiver.y;
    let throb = 0;
    for (let k = 0; k < SHARES; k++) {
      const since = ms - gulps[k];
      if (since >= 0 && since < THROB_MS)
        throb = Math.max(throb, 1 - since / THROB_MS);
    }
    const open = easeOutBack(clamp01(ms / OPEN_MS));
    const rad = Math.max(
      0,
      lerp(ORB_R[0], ORB_R[1], c) *
        open *
        (1 + THROB * throb) *
        (1 - collapse * collapse),
    );

    if (ms < endMs) {
      ctx.globalCompositeOperation = "lighter";
      drawFieldLines(ctx, orb, to, c * (1 - collapse) * 0.9, ms, 70, 5);
      // the light curling in: violet haze, gold, white-hot streaks
      while (s.first < SPECKS && snaps[s.first].landMs <= ms) s.first++;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = s.first; i < SPECKS; i++) {
        const snap = snaps[i];
        if (ms < snap.startMs) break;
        const u = (ms - snap.startMs) / (snap.landMs - snap.startMs);
        speckAt(dist[i], turn[i], snap.bow, rad, easeIn(Math.max(0, u - TAIL)));
        ctx.moveTo(p.x, p.y);
        speckAt(
          dist[i],
          turn[i],
          snap.bow,
          rad,
          easeIn(Math.max(0, u - TAIL / 2)),
        );
        ctx.lineTo(p.x, p.y);
        speckAt(dist[i], turn[i], snap.bow, rad, easeIn(u));
        ctx.lineTo(p.x, p.y);
      }
      strokeRing(ctx, 4, alpha * 0.85);
      // the gold sparks at the heads, and the orb's violet halo and rim
      beginLightBatch(ctx);
      ctx.globalAlpha = alpha;
      for (let i = s.first; i < SPECKS; i++) {
        const snap = snaps[i];
        if (ms < snap.startMs) break;
        if (i % SPARK_EVERY) continue;
        const e = easeIn((ms - snap.startMs) / (snap.landMs - snap.startMs));
        speckAt(dist[i], turn[i], snap.bow, rad, e);
        stampGlimmer(
          ctx,
          p.x,
          p.y,
          SPARK * (1 - 0.5 * e),
          ms * 0.01 + i,
          COLOR.heavenlyGold,
        );
      }
      const flicker = 1 + 0.1 * c * Math.sin(now * (0.03 + 0.05 * c));
      ctx.globalAlpha = alpha * (0.45 + 0.55 * c) * Math.min(1, open);
      drawGlow(ctx, HALO, orb.x, orb.y, rad * (2.3 + 0.6 * throb) * flicker);
      ctx.globalAlpha = alpha * Math.min(1, open);
      drawGlow(ctx, RIM, orb.x, orb.y, rad * 1.5 * flicker);
      endLightBatch(ctx);
      // the dark core
      ctx.globalCompositeOperation = previous;
      drawGlow(ctx, CORE, orb.x, orb.y, rad * 1.15);
      // its blazing ring, and light bending round it in turning arcs
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, rad, 0, Math.PI * 2);
      strokeRing(ctx, 3 + 6 * c + 6 * throb, alpha * (0.6 + 0.4 * c));
      const spin = ms * (0.004 + 0.014 * c);
      const span = 0.9 + 1.1 * c;
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        const a = (j % 2 ? -spin : spin) + j * 2.1;
        const out = rad * (1.45 + 0.2 * j);
        ctx.moveTo(orb.x + Math.cos(a) * out, orb.y + Math.sin(a) * out);
        ctx.arc(orb.x, orb.y, out, a, a + span);
      }
      strokeRing(ctx, 2 + 3 * c, alpha * (0.35 + 0.65 * c));
      // collapsing to a white pinpoint
      if (collapse > 0) {
        beginLightBatch(ctx);
        ctx.globalAlpha = alpha * collapse;
        drawGlow(ctx, WHITE, orb.x, orb.y, 24 + 70 * collapse);
        drawGlow(ctx, HALO, orb.x, orb.y, 260 * (1 - collapse) + 60);
        endLightBatch(ctx);
      }
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }

    // the shares spat up onto the readout, each landing in a green flash
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < SHARES; k++) {
      const since = ms - gulps[k];
      if (since < 0) break;
      const spot = spots[k];
      if (since < SPIT_MS) {
        const t = easeIn(since / SPIT_MS);
        const mx = (orb.x + spot.x) / 2 + (k % 2 ? SPIT_BOW : -SPIT_BOW);
        const my = (orb.y + spot.y) / 2;
        const v = 1 - t;
        const x = v * v * orb.x + 2 * v * t * mx + t * t * spot.x;
        const y = v * v * orb.y + 2 * v * t * my + t * t * spot.y;
        ctx.globalAlpha = alpha * 0.8;
        drawGlow(ctx, GREEN, x, y, 70);
      } else if (since < SPIT_MS + FLASH_MS) {
        const fade = 1 - (since - SPIT_MS) / FLASH_MS;
        ctx.globalAlpha = alpha * fade;
        drawGlow(ctx, GREEN, spot.x, spot.y, FLASH * (1.3 - 0.3 * fade), 0.5);
        drawGlow(ctx, WHITE, spot.x, spot.y, FLASH * 0.35 * fade);
      }
    }
    // the burst: a white flash where it was and a green one on the readout
    const sinceEnd = ms - endMs;
    if (sinceEnd >= 0 && sinceEnd < RING_MS) {
      const fade = 1 - sinceEnd / RING_MS;
      ctx.globalAlpha = alpha * fade;
      drawGlow(ctx, WHITE, orb.x, orb.y, 200 * fade + 40);
      const sinceHit = ms - s.hitMs;
      if (sinceHit >= 0) {
        const f = 1 - sinceHit / (RING_MS - RING_HIT_MS);
        ctx.globalAlpha = alpha * Math.max(0, f);
        drawGlow(ctx, GREEN, to.x, to.y, FINALE_FLASH * (1.4 - 0.4 * f), 0.45);
      }
    }
    endLightBatch(ctx);
    ctx.globalAlpha = alpha;
    // the ring of light bursting out over the readout
    if (sinceEnd >= 0 && sinceEnd < RING_MS) {
      const u = sinceEnd / RING_MS;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 20 + RING_R * easeOutCubic(u), 0, Math.PI * 2);
      strokeRing(ctx, RING_W * (1 - u) + 2, alpha * (1 - u * u));
      ctx.globalAlpha = alpha;
    }
    ctx.globalCompositeOperation = previous;
    // the amount's shares in flight
    for (let k = 0; k < SHARES; k++) {
      const since = ms - gulps[k];
      if (since < 0) break;
      if (since >= SPIT_MS) continue;
      const spot = spots[k];
      const t = easeIn(since / SPIT_MS);
      const mx = (orb.x + spot.x) / 2 + (k % 2 ? SPIT_BOW : -SPIT_BOW);
      const my = (orb.y + spot.y) / 2;
      const v = 1 - t;
      TEXT.alpha = Math.min(1, since / 30);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        v * v * orb.x + 2 * v * t * mx + t * t * spot.x,
        v * v * orb.y + 2 * v * t * my + t * t * spot.y,
        r.flashFont * lerp(SPIT_FONT[0], SPIT_FONT[1], t),
        TEXT,
      );
    }
    drawDetonation(ctx, to, ms - s.hitMs, FINALE_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
