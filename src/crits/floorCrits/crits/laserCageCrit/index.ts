// the laser cage floor crit: the number splits into two emitter wisps that
// snap out to the screen's edges beside the bars and charge, trembling; they
// fire thin beams diagonally across the bars, each sweeping in fast and
// locking onto a bar with a crack, quicker and quicker, until the strands
// criss-cross in a glowing lattice that thickens and hums; then the whole
// cage snaps tight onto the bars in one white flash and its own bar blows
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { smoothstep } from "../../../../shared/easing";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  byHeight,
  lerp,
  clamp01,
  drawText,
  glowStops,
} from "../../critPlayer";
import { holeHash, topBarY, bottomBarY } from "../../critPlayer/shared";

const CAGE_IN_MS = 180;
const CAGE_CHARGE_END_MS = 620;
// the gap before each lock, shrinking every lock down to a floor
const CAGE_FIRST_GAP_MS = 230;
const CAGE_GAP_DECAY = 0.82;
const CAGE_MIN_GAP_MS = 65;
const CAGE_HUM_MS = 330;
const CAGE_SNAP_MS = 90;
const CAGE_FADE_MS = 240;
// the emitters: either side of the middle (of the viewport's width)
const CAGE_EDGE = 0.44;
const CAGE_TREMBLE = 18;
const CAGE_HUM_TREMBLE = 8;
// a beam sweeps in from the bar's near end, off above or below it, and
// locks on its far end (of a bar's half width), its strand reaching past it
const CAGE_SWEEP_FROM = 0.7;
const CAGE_SWEEP_DY = 240;
const CAGE_LOCK_SIDE = 0.6;
const CAGE_EXTEND = 1.18;
const CAGE_AIM_WIDTH = 9;
const CAGE_STRAND: [number, number] = [9, 30];
const CAGE_CRACK_MS = 140;
const CAGE_CRACK_WIDTH = 70;
const CAGE_CRACK_GLOW = 190;
const CAGE_NODE_GLOW = 60;
const CAGE_SNAP_WIDTH = 90;
const CAGE_FLASH = 1.3;
const CAGE_EMITTER_GLOW: [number, number] = [60, 220];
const CAGE_STREAKS = 12;
const CAGE_STREAK_REACH = 340;
const CAGE_STREAK_SPEED = 0.004;
const CAGE_BLAST = 400;
// rumbles while charging and humming, closing up, then the climax bang
const CAGE_CHARGE_RUMBLES = 3;
const CAGE_HUM_RUMBLES = 5;
const CAGE_RUMBLE_SHAKE = 0.22;
const CAGE_LOCK_SHAKE = 0.7;
const CAGE_CLIMAX_SHAKE = 3.2;
const CAGE_TIGHTEN_SHAKE = 0.1;
const CAGE_TAIL_MS = 850;

const WHITE = glowStops(COLOR.white);
const GOLD = glowStops(COLOR.heavenlyGold);

// the run's lock order and timing, laid out once by plan (one floor crit
// plays at a time)
const lockBar: number[] = [];
const lockAt: number[] = [];
const rumbleAt: number[] = [];
let lastLockAt = 0;
let climaxAt = 0;
// this frame's emitter spot, read by the wisps' paths
let edgeX = 0;
let midY = 0;
const spots: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const lock: Point = { x: 0, y: 0 };

const sweepStart = (k: number) => (k < 2 ? CAGE_CHARGE_END_MS : lockAt[k - 2]);

function tremble(ms: number): number {
  if (ms >= climaxAt) return 0;
  const charge = clamp01((ms - CAGE_IN_MS) / (CAGE_CHARGE_END_MS - CAGE_IN_MS));
  const hum = clamp01((ms - lastLockAt) / CAGE_HUM_MS);
  return Math.max(charge * charge * CAGE_TREMBLE, hum * CAGE_HUM_TREMBLE);
}

// emitter i (0 left, 1 right) snapping out of the number to its edge
function emitterAt(i: number, ms: number): Point {
  const t = clamp01(ms / CAGE_IN_MS);
  const p = 1 - (1 - t) ** 3;
  const shiver = tremble(ms);
  const j = Math.floor(ms / 24);
  const spot = spots[i];
  spot.x = (i ? 1 : -1) * edgeX * p + (holeHash(j, 41 + i) - 0.5) * shiver;
  spot.y = midY * p + (holeHash(j, 43 + i) - 0.5) * shiver;
  return spot;
}
const leftAt = (ms: number) => emitterAt(0, ms);
const rightAt = (ms: number) => emitterAt(1, ms);

registerFloorCrit("laserCageCrit", {
  plan(_r, bars, hit) {
    // outside in: top, bottom, second, second last... its own bar last
    const order = byHeight(bars);
    lockBar.length = 0;
    lockAt.length = 0;
    rumbleAt.length = 0;
    for (let lo = 0, hi = order.length - 1; lo <= hi; ) {
      const a = order[lo++];
      if (a !== 0 || bars.length === 1) lockBar.push(a);
      if (lo <= hi) {
        const b = order[hi--];
        if (b !== 0) lockBar.push(b);
      }
    }
    let at = CAGE_CHARGE_END_MS;
    for (let k = 0; k < lockBar.length; k++) {
      at += Math.max(CAGE_MIN_GAP_MS, CAGE_FIRST_GAP_MS * CAGE_GAP_DECAY ** k);
      lockAt.push(at);
      hit(lockBar[k], at, 0);
    }
    lastLockAt = at;
    climaxAt = at + CAGE_HUM_MS;
    for (let i = 0; i < CAGE_CHARGE_RUMBLES; i++)
      rumbleAt.push(
        CAGE_IN_MS + (CAGE_CHARGE_END_MS - CAGE_IN_MS) * (1 - 0.55 ** (i + 1)),
      );
    for (let i = 0; i < CAGE_HUM_RUMBLES; i++)
      rumbleAt.push(lastLockAt + CAGE_HUM_MS * (1 - 0.62 ** (i + 1)));
    rumbleAt.push(climaxAt);
    hit(0, climaxAt, 1);
    for (let bar = 1; bar < bars.length; bar++) hit(bar, climaxAt, 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const halfW = r.play.barHalfWidth;
    edgeX = r.viewportWidth * CAGE_EDGE;
    midY = (topBarY(bars) + bottomBarY(bars)) / 2;
    while (r.kicked < rumbleAt.length && rumbleAt[r.kicked] <= ms) {
      if (r.kicked++ === rumbleAt.length - 1) playExplosion();
      else r.shake(CAGE_RUMBLE_SHAKE);
    }
    if (ms < CAGE_IN_MS) {
      const p = smoothstep(ms / CAGE_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        lerp(0, midY, p),
        r.flashFont * (1 - p),
        {
          alpha: 1 - p,
        },
      );
    }
    const charge = clamp01(
      (ms - CAGE_IN_MS) / (CAGE_CHARGE_END_MS - CAGE_IN_MS),
    );
    const power = clamp01(
      (ms - CAGE_CHARGE_END_MS) / (climaxAt - CAGE_CHARGE_END_MS),
    );
    const since = ms - climaxAt;
    const fade = since < 0 ? 1 : 1 - clamp01(since / CAGE_FADE_MS);
    const tight = smoothstep(
      clamp01((ms - climaxAt + CAGE_SNAP_MS) / CAGE_SNAP_MS),
    );
    const hum = 0.85 + 0.15 * Math.sin(now / 16);

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    // the emitters' glow swelling as they charge, glitter streaking in
    if (fade > 0 && ms >= CAGE_IN_MS * 0.5) {
      for (let i = 0; i < 2; i++) {
        const e = emitterAt(i, ms);
        ctx.globalAlpha = (0.4 + 0.6 * Math.max(charge, power)) * fade;
        drawGlow(
          ctx,
          GOLD,
          e.x,
          e.y,
          lerp(CAGE_EMITTER_GLOW[0], CAGE_EMITTER_GLOW[1], charge) *
            (0.8 + 0.4 * power) *
            hum,
        );
      }
      ctx.globalAlpha = 1;
      if (ms >= CAGE_IN_MS && ms < climaxAt) {
        beginLightBatch(ctx);
        for (let i = 0; i < 2; i++) {
          const e = spots[i];
          for (let s = 0; s < CAGE_STREAKS; s++) {
            const life =
              ((ms - CAGE_IN_MS) * CAGE_STREAK_SPEED + holeHash(s, 1401 + i)) %
              1;
            const a = holeHash(s, 1403 + i) * Math.PI * 2;
            const reach = CAGE_STREAK_REACH * (1 - life);
            stampGlimmer(
              ctx,
              e.x + Math.cos(a) * reach,
              e.y + Math.sin(a) * reach,
              14 + 12 * life,
              a,
              s % 2 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
        }
        endLightBatch(ctx);
      }
    }
    ctx.globalCompositeOperation = previous;

    // the beams: sweeping in thin, then locked strands thickening and humming
    if (fade > 0) {
      const strand =
        lerp(CAGE_STRAND[0], CAGE_STRAND[1], power) * hum +
        (since >= 0 ? CAGE_SNAP_WIDTH * fade : 0);
      for (let k = 0; k < lockBar.length; k++) {
        const startMs = sweepStart(k);
        if (ms < startMs) break;
        const side = k % 2;
        const s = side ? 1 : -1;
        const e = spots[side];
        const bar = bars[lockBar[k]];
        lock.x = bar.x - s * halfW * CAGE_LOCK_SIDE * (1 - tight);
        lock.y = bar.y;
        const sinceLock = ms - lockAt[k];
        let aimX = lock.x;
        let aimY = lock.y;
        let width = strand;
        let alpha = (0.6 + 0.4 * power) * fade;
        if (sinceLock < 0) {
          const p = (ms - startMs) / (lockAt[k] - startMs);
          const pp = p * p;
          aimX = lerp(bar.x + s * halfW * CAGE_SWEEP_FROM, lock.x, pp);
          aimY = lerp(bar.y + (k % 4 < 2 ? -1 : 1) * CAGE_SWEEP_DY, lock.y, pp);
          width = CAGE_AIM_WIDTH;
          alpha = 0.5 + 0.5 * Math.random();
        } else if (sinceLock < CAGE_CRACK_MS) {
          width += CAGE_CRACK_WIDTH * (1 - sinceLock / CAGE_CRACK_MS);
        }
        const ext = lerp(CAGE_EXTEND, 1, tight);
        from.x = e.x;
        from.y = e.y;
        to.x = e.x + (aimX - e.x) * ext;
        to.y = e.y + (aimY - e.y) * ext;
        drawBeam(ctx, from, to, width, alpha);
      }
      // the nodes where strands lock on, and the crack of each lock
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < lockBar.length; k++) {
        const sinceLock = ms - lockAt[k];
        if (sinceLock < 0) break;
        const s = k % 2 ? 1 : -1;
        const bar = bars[lockBar[k]];
        const x = bar.x - s * halfW * CAGE_LOCK_SIDE * (1 - tight);
        if (sinceLock < CAGE_CRACK_MS) {
          const t = sinceLock / CAGE_CRACK_MS;
          ctx.globalAlpha = 1 - t;
          drawGlow(ctx, WHITE, x, bar.y, CAGE_CRACK_GLOW * (1.2 - t));
        }
        ctx.globalAlpha = fade * (0.5 + 0.5 * power);
        drawGlow(ctx, GOLD, x, bar.y, CAGE_NODE_GLOW * (1 + power) * hum);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    if (fade > 0 && ms >= CAGE_IN_MS * 0.5) {
      const heat = since < 0 ? Math.max(charge, power) : 1;
      drawWisp(ctx, leftAt, ms, now, WISP_SIZE * 1.4, heat, fade);
      drawWisp(ctx, rightAt, ms, now, WISP_SIZE * 1.4, heat, fade);
    }

    // the snap: one white flash over every bar in the cage
    if (since >= 0 && since < CAGE_FADE_MS) {
      const t = since / CAGE_FADE_MS;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 - t;
      for (let bar = 0; bar < bars.length; bar++)
        drawGlow(
          ctx,
          WHITE,
          bars[bar].x,
          bars[bar].y,
          halfW * CAGE_FLASH * (1 - 0.5 * t),
        );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, bars[0], since, CAGE_BLAST, now);
  },
  tailMs: CAGE_TAIL_MS,
  shake: (step) =>
    step === 1
      ? CAGE_CLIMAX_SHAKE
      : step === 2
        ? CAGE_TIGHTEN_SHAKE
        : CAGE_LOCK_SHAKE,
  // a lock levels its bar; the cage snapping tight adds a quarter more
  levels: (count, step) => (step === 2 ? Math.ceil(count / 4) : count),
});
