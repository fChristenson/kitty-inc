// the flak floor crit: the number drops below the street and flak shells
// streak up past the bars in view, bursting just over them quick-fire, every
// burst a blast in the air spraying shrapnel down into the bar below in a
// rattle; the last shell bursts right over its own bar in a huge blast
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { groundY, holeHash, otherBars } from "../../critPlayer/shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const FL_IN_MS = 220;
const FL_SHELLS = 12;
const FL_EVERY_MS = 65;
const FL_LAST_DELAY_MS = 120;
const FL_RISE_MS = 140;
// where they're fired from under the lowest bar, how far apart (of the
// viewport's width), and how high over a bar they burst
const FL_BELOW = 400;
const FL_SPREAD = 0.25;
const FL_ABOVE = 140;
const FL_LAST_ABOVE = 160;
const FL_SHELL = 0.7;
const FL_LAST_SHELL = 1.2;
const FL_SHELL_HEAT = 0.9;
const FL_BURST = 150;
const FL_BOOM = 420;
const FL_BURST_SHAKE = 0.8;
const FL_BURST_RATE = 1.3;
// the shrapnel: bits a burst, their spread along the bar (of the
// viewport's width), when they land, and the streaks flying down
const FL_BITS = 4;
const FL_LAST_BITS = 7;
const FL_BITS_SPREAD = 0.24;
const FL_LAST_BITS_SPREAD = 0.42;
const FL_BITS_AT_MS = 50;
const FL_BITS_EVERY_MS = 25;
const FL_BIT = 80;
const FL_LAST_BIT = 150;
const FL_STREAKS = 8;
const FL_STREAK_MS = 140;
const FL_STREAK_SPEED = 2.2;
const FL_STREAK_FAN = 1.6;
const FL_STREAK_SIZE = 24;
const FL_KICKED_BOOM = 1e6;
// shakes by step: a bit of shrapnel, the last burst
const FL_SHAKES = [0.3, 3];
const FL_TAIL_MS = 1000;

interface Shell {
  bar: number;
  side: number;
  // across from its burst where it's fired, and when
  lean: number;
  fired: number;
  last: boolean;
}
const salvos = new WeakMap<Running, Shell[]>();

const burstAt = (s: Shell) => s.fired + FL_RISE_MS;
const bitsOf = (s: Shell) => (s.last ? FL_LAST_BITS : FL_BITS);
const bitAt = (s: Shell, j: number) =>
  burstAt(s) + FL_BITS_AT_MS + j * FL_BITS_EVERY_MS;

function planShells(bars: Point[]): Shell[] {
  const others = otherBars(bars);
  return Array.from({ length: FL_SHELLS }, (_, i) => {
    const last = i === FL_SHELLS - 1;
    return {
      bar: last ? 0 : others[Math.floor(holeHash(i, 880) * others.length)],
      side: last ? 0 : (holeHash(i, 881) * 2 - 1) * 0.8,
      lean: holeHash(i, 882) - 0.5,
      fired: FL_IN_MS + i * FL_EVERY_MS + (last ? FL_LAST_DELAY_MS : 0),
      last,
    };
  });
}

// where shell s bursts, and bit j of its shrapnel lands
function burstSpot(r: Running, bars: Point[], s: Shell): Point {
  const at = along(r, bars, s.bar, s.side);
  at.y -= s.last ? FL_LAST_ABOVE : FL_ABOVE;
  return at;
}
function bitSpot(
  r: Running,
  bars: Point[],
  s: Shell,
  i: number,
  j: number,
): Point {
  const at = along(r, bars, s.bar, s.side);
  const spread = s.last ? FL_LAST_BITS_SPREAD : FL_BITS_SPREAD;
  at.x += (holeHash(j, i + 883) - 0.5) * spread * r.viewportWidth;
  return at;
}

registerFloorCrit("flakCrit", {
  plan(r, bars, hit) {
    const shells = planShells(bars);
    salvos.set(r, shells);
    for (const s of shells) {
      if (s.last) hit(0, burstAt(s), 1);
      for (let j = 0; j < bitsOf(s); j++) hit(s.bar, bitAt(s, j), 0);
    }
  },
  draw(ctx, r, ms, bars) {
    const shells = salvos.get(r);
    if (!shells) return;
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const ground = groundY(r, bars, FL_BELOW);
    if (ms < FL_IN_MS) {
      const p = (ms / FL_IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, ground * p, r.flashFont, {
        along: -Math.PI / 2,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }

    // a bang and a jolt on every burst but the last, which is a hit
    while (r.kicked < FL_SHELLS - 1 && burstAt(shells[r.kicked]) <= ms) {
      r.shake(FL_BURST_SHAKE);
      playBarExplosion(FL_BURST_RATE);
      r.kicked++;
    }
    if (ms >= burstAt(shells[FL_SHELLS - 1]) && r.kicked < FL_KICKED_BOOM) {
      r.kicked = FL_KICKED_BOOM;
      playExplosion();
    }

    shells.forEach((s, i) => {
      const burst = burstSpot(r, bars, s);
      const from = { x: burst.x + s.lean * w * FL_SPREAD, y: ground };
      drawWispBetween(
        ctx,
        (t) => {
          const p = clamp01((t - s.fired) / FL_RISE_MS);
          return { x: lerp(from.x, burst.x, p), y: lerp(from.y, burst.y, p) };
        },
        ms,
        now,
        WISP_SIZE * (s.last ? FL_LAST_SHELL : FL_SHELL),
        FL_SHELL_HEAT,
        s.fired,
        burstAt(s),
      );
      // shrapnel streaking down out of the burst
      const t = ms - burstAt(s);
      if (t >= 0 && t < FL_STREAK_MS) {
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        beginLightBatch(ctx);
        const d = t * FL_STREAK_SPEED;
        for (let j = 0; j < FL_STREAKS; j++) {
          const a = Math.PI / 2 + (holeHash(j, i + 884) - 0.5) * FL_STREAK_FAN;
          stampGlimmer(
            ctx,
            burst.x + Math.cos(a) * d,
            burst.y + Math.sin(a) * d,
            FL_STREAK_SIZE,
            now * 0.004 + j,
            j % 2 ? COLOR.white : COLOR.heavenlyGold,
          );
        }
        endLightBatch(ctx);
        ctx.globalCompositeOperation = previous;
      }
      drawDetonation(ctx, burst, t, s.last ? FL_BOOM : FL_BURST, now);
      for (let j = 0; j < bitsOf(s); j++)
        drawDetonation(
          ctx,
          bitSpot(r, bars, s, i, j),
          ms - bitAt(s, j),
          s.last ? FL_LAST_BIT : FL_BIT,
          now,
        );
    });
  },
  tailMs: FL_TAIL_MS,
  shake: (step) => FL_SHAKES[step] ?? FL_SHAKES[0],
});
