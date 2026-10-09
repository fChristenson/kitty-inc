// the atoms floor crit: the number bursts into glitter electrons that settle
// into two tilted orbits round every bar in view, turning the bars into
// atoms; they whirl faster and faster as the orbits tighten and the bars
// glow, then every electron collapses into its bar and the bars go off one
// after another from the top in runs of blasts, its own bar last and biggest
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
  glowStops,
} from "../../critPlayer";
import { ownLast } from "../../critPlayer/shared";

const AT_IN_MS = 260;
const AT_FLY_MS = 300;
const AT_PER_BAR = 4;
const AT_STAGGER_MS = 15;
const AT_SPIN_MS = 1300;
const AT_SINK_MS = 150;
// the orbits: across of the bar's half width, up, their tilt, and how far
// they tighten
const AT_ORBIT_X = 1.16;
const AT_ORBIT_Y = 110;
const AT_TILT = 0.22;
const AT_TIGHTEN_X = 0.7;
const AT_TIGHTEN_Y = 0.6;
// radians a ms, and its speeding up
const AT_SPEED = 0.004;
const AT_SPEED_UP = 0.0000045;
const AT_ELECTRON = 0.6;
const AT_GLOW = 0.4;
const AT_HUM_MS = 100;
const AT_HUM: [number, number] = [0.15, 0.6];
// after the collapse, a run of blasts along each bar, a bar every
// AT_BAR_MS from the top, its own bar's run longer
const AT_BAR_MS = 150;
const AT_RUN = 5;
const AT_OWN_RUN = 7;
const AT_EVERY_MS = 45;
const AT_BLAST = 140;
const AT_OWN_BLAST = 170;
const AT_BOOM = 420;
const AT_KICKED_DONE = 1e6;
// shakes by step: a run's blast, the last one
const AT_SHAKES = [1, 1, 3];
const AT_TAIL_MS = 1100;

const startAt = (k: number, i: number) =>
  AT_IN_MS + (k * AT_PER_BAR + i) * AT_STAGGER_MS;
const spinFrom = (bars: Point[]) =>
  AT_IN_MS + AT_FLY_MS + bars.length * AT_PER_BAR * AT_STAGGER_MS;
const collapseAt = (bars: Point[]) => spinFrom(bars) + AT_SPIN_MS;
const runAt = (bars: Point[], k: number) =>
  collapseAt(bars) + AT_SINK_MS + k * AT_BAR_MS;
const runOf = (k: number, bars: Point[]) =>
  k === bars.length - 1 ? AT_OWN_RUN : AT_RUN;
const boomAt = (bars: Point[]) =>
  runAt(bars, bars.length - 1) + AT_OWN_RUN * AT_EVERY_MS;

const runSpot = (
  r: Running,
  bars: Point[],
  bar: number,
  j: number,
  n: number,
) => along(r, bars, bar, (j / (n - 1)) * 2 - 1);

registerFloorCrit("atomsCrit", {
  plan(_r, bars, hit) {
    const order = ownLast(bars);
    order.forEach((bar, k) => {
      const n = runOf(k, bars);
      for (let j = 0; j < n; j++) hit(bar, runAt(bars, k) + j * AT_EVERY_MS, 1);
    });
    hit(0, boomAt(bars), 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = ownLast(bars);
    const spin0 = spinFrom(bars);
    const collapse = collapseAt(bars);
    const c = clamp01((ms - spin0) / AT_SPIN_MS);
    if (ms < AT_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, 0, (ms / AT_IN_MS) ** 2),
      );

    // the hum building as they whirl
    if (ms >= spin0 && ms < collapse) {
      const due = Math.floor((ms - spin0) / AT_HUM_MS) + 1;
      while (r.kicked < due) {
        r.kicked++;
        r.shake(lerp(...AT_HUM, c));
      }
    }
    if (ms >= collapse + AT_SINK_MS && r.kicked < AT_KICKED_DONE) {
      r.kicked = AT_KICKED_DONE;
      playExplosion();
    }

    // the bars glowing as their atoms spin up
    if (ms >= spin0 && ms < collapse + AT_SINK_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = AT_GLOW * c * (0.6 + 0.4 * Math.sin(ms * 0.05));
      for (const bar of bars)
        drawGlow(
          ctx,
          glowStops(COLOR.white),
          bar.x,
          bar.y,
          r.play.barHalfWidth * 1.1,
          0.35,
        );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    // the electrons: out of the number, into orbit, then sinking into the bars
    order.forEach((bar, k) => {
      for (let i = 0; i < AT_PER_BAR; i++) {
        const start = startAt(k, i);
        const tilt = i % 2 ? AT_TILT : -AT_TILT;
        const phase = (i / AT_PER_BAR) * Math.PI * 2;
        const at = (t: number): Point | null => {
          if (t < start || t > collapse + AT_SINK_MS) return null;
          const home = bars[bar];
          const since = t - start;
          const angle = phase + AT_SPEED * since + AT_SPEED_UP * since * since;
          const tight = clamp01((t - spin0) / AT_SPIN_MS);
          const sink =
            t < collapse ? 1 : 1 - clamp01((t - collapse) / AT_SINK_MS);
          const rx =
            r.play.barHalfWidth *
            AT_ORBIT_X *
            lerp(1, AT_TIGHTEN_X, tight) *
            sink;
          const ry = AT_ORBIT_Y * lerp(1, AT_TIGHTEN_Y, tight) * sink;
          const lx = Math.cos(angle) * rx;
          const ly = Math.sin(angle) * ry;
          const ox = home.x + lx * Math.cos(tilt) - ly * Math.sin(tilt);
          const oy = home.y + lx * Math.sin(tilt) + ly * Math.cos(tilt);
          const p = clamp01(since / AT_FLY_MS);
          const e = p * p * (3 - 2 * p);
          return { x: ox * e, y: oy * e - (1 - e) * e * 300 };
        };
        drawWispBetween(
          ctx,
          at,
          ms,
          now,
          WISP_SIZE * AT_ELECTRON,
          c,
          start,
          collapse + AT_SINK_MS,
        );
      }
    });

    order.forEach((bar, k) => {
      const n = runOf(k, bars);
      for (let j = 0; j < n; j++)
        drawDetonation(
          ctx,
          runSpot(r, bars, bar, j, n),
          ms - runAt(bars, k) - j * AT_EVERY_MS,
          k === order.length - 1 ? AT_OWN_BLAST : AT_BLAST,
          now,
        );
    });
    drawDetonation(ctx, bars[0], ms - boomAt(bars), AT_BOOM, now);
  },
  tailMs: AT_TAIL_MS,
  shake: (step) => AT_SHAKES[step] ?? AT_SHAKES[1],
});
