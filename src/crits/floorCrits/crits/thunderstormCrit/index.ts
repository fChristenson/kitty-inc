// the thunderstorm floor crit: the number shoots up into the sky and bolts
// crack down all over the bars in view, quick-fire, every strike a flash and
// a blast; then one giant bolt onto its own bar and a huge blast
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  along,
  glowStops,
} from "../../critPlayer";
import { holeHash, skyY } from "../../critPlayer/shared";

const TS_IN_MS = 220;
const TS_FIRST_MS = TS_IN_MS + 60;
const TS_STRIKES = 16;
const TS_EVERY_MS = 50;
const TS_LAST_DELAY_MS = 140;
const TS_LAST_MS = TS_FIRST_MS + TS_STRIKES * TS_EVERY_MS + TS_LAST_DELAY_MS;
// the clouds the bolts come from, over the top bar, and how far a bolt
// leans (of the viewport's width)
const TS_ABOVE = 600;
const TS_LEAN = 0.4;
const TS_BOLT_MS = 160;
const TS_BOLT = 1;
const TS_BIG_BOLT = 2.6;
const TS_BIG_STRIKE = 2;
const TS_FLASH = 0.15;
const TS_BIG_FLASH = 0.5;
const TS_BIG_FLASH_MS = 300;
const TS_BLAST = 120;
const TS_BOOM = 420;
const TS_KICKED_LAST = 1e6;
// shakes by step: a strike, the giant one
const TS_SHAKES = [0.6, 3];
const TS_TAIL_MS = 1000;

interface Strike {
  bar: number;
  // where along its bar (-1..1), and how far its top leans across
  side: number;
  lean: number;
  at: number;
  bolt: Bolt;
}
const storms = new WeakMap<Running, Strike[]>();

function planStrikes(bars: Point[]): Strike[] {
  const strikes: Strike[] = [];
  for (let i = 0; i < TS_STRIKES; i++)
    strikes.push({
      bar: Math.floor(holeHash(i, 830) * bars.length),
      side: holeHash(i, 831) * 2 - 1,
      lean: holeHash(i, 832) - 0.5,
      at: TS_FIRST_MS + i * TS_EVERY_MS,
      bolt: createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 2),
    });
  strikes.push({
    bar: 0,
    side: 0,
    lean: 0,
    at: TS_LAST_MS,
    bolt: createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 4),
  });
  return strikes;
}

registerFloorCrit("thunderstormCrit", {
  plan(r, bars, hit) {
    const strikes = planStrikes(bars);
    storms.set(r, strikes);
    strikes.forEach((s, i) => hit(s.bar, s.at, i === TS_STRIKES ? 1 : 0));
  },
  draw(ctx, r, ms, bars) {
    const strikes = storms.get(r);
    if (!strikes) return;
    const now = r.startedAt + ms;
    const sky = skyY(r, bars, TS_ABOVE);
    if (ms < TS_IN_MS) {
      const p = (ms / TS_IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, lerp(0, sky, p), r.flashFont, {
        along: Math.PI / 2,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    if (ms >= TS_LAST_MS && r.kicked < TS_KICKED_LAST) {
      r.kicked = TS_KICKED_LAST;
      playExplosion();
    }

    // the sky lighting up with every strike
    let flash = 0;
    strikes.forEach((s, i) => {
      const big = i === TS_STRIKES;
      const dt = ms - s.at;
      const fadeMs = big ? TS_BIG_FLASH_MS : TS_BOLT_MS;
      if (dt >= 0 && dt < fadeMs)
        flash = Math.max(
          flash,
          (big ? TS_BIG_FLASH : TS_FLASH) * (1 - dt / fadeMs),
        );
    });
    if (flash > 0) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = flash;
      drawGlow(ctx, glowStops(COLOR.white), 0, 0, r.viewportWidth);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    strikes.forEach((s, i) => {
      const big = i === TS_STRIKES;
      const dt = ms - s.at;
      const to = big ? bars[0] : along(r, bars, s.bar, s.side);
      if (dt >= 0 && dt < TS_BOLT_MS) {
        // its ends kept on the bar as it scrolls
        const { bolt } = s;
        bolt.from.x = to.x + s.lean * r.viewportWidth * TS_LEAN;
        bolt.from.y = sky;
        bolt.to.x = to.x;
        bolt.to.y = to.y;
        const fade = 1 - dt / TS_BOLT_MS;
        drawBolt(ctx, bolt, fade, big ? TS_BIG_BOLT : TS_BOLT);
        drawStrike(ctx, to, fade, big ? TS_BIG_STRIKE : 1, now);
      }
      drawDetonation(ctx, to, dt, big ? TS_BOOM : TS_BLAST, now);
    });
  },
  tailMs: TS_TAIL_MS,
  shake: (step) => TS_SHAKES[step] ?? TS_SHAKES[0],
});
