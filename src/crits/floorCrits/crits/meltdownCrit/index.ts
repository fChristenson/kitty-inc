// the meltdown floor crit: the number hops down the building touching the
// left end of every bar in view, which starts to glow; they all heat up
// together from gold to white-hot, rattling and steaming glitter, until the
// top bar blows in a run of blasts along it that sparks over to the next one
// down, and on, its own bar's run the biggest, capped by one huge blast
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { smoothstep } from "../../../../shared/easing";
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
import { BAR_HALF_H, holeHash, ownLast } from "../../critPlayer/shared";

const MD_IN_MS = 380;
const MD_FONT = 90;
const MD_ABOVE = 200;
const MD_LIFT = 140;
// the number touches a bar every MD_HOP_MS, this far in from its left end
const MD_HOP_MS = 170;
const MD_TOUCH_IN = 50;
// then every bar heats up to white-hot, MD_HOT_MS after the last touch
const MD_HOT_MS = 700;
const MD_RUMBLE_MS = 90;
const MD_RUMBLE: [number, number] = [0.15, 0.6];
const MD_STEAM = 16;
const MD_STEAM_RISE = 150;
const MD_STEAM_SIZE = 28;
// each bar's run of blasts along it, a spark over to the next bar, and the
// last run's longer, capped by a huge blast at its end
const MD_RUN = 6;
const MD_LAST_RUN = 8;
const MD_EVERY_MS = 45;
const MD_JUMP_MS = 70;
const MD_BLAST = 170;
const MD_LAST_BLAST = 210;
const MD_BOOM = 440;
// shakes by step: a touch, a blast, the huge blast
const MD_SHAKES = [0.4, 1, 3];
const MD_TAIL_MS = 1100;

const touchAt = (k: number) => MD_IN_MS + k * MD_HOP_MS;
const hotAt = (bars: Point[]) => touchAt(bars.length - 1) + MD_HOT_MS;
const runOf = (k: number, bars: Point[]) =>
  k === bars.length - 1 ? MD_LAST_RUN : MD_RUN;
const blowAt = (k: number, bars: Point[]) =>
  hotAt(bars) + k * (MD_RUN * MD_EVERY_MS + MD_JUMP_MS);
const boomAt = (bars: Point[]) =>
  blowAt(bars.length - 1, bars) + MD_LAST_RUN * MD_EVERY_MS;

const touchSpot = (r: Running, bar: Point): Point => ({
  x: bar.x - r.play.barHalfWidth + MD_TOUCH_IN,
  y: bar.y,
});
// blast j of a run of n along a bar, left to right
const blastSpot = (
  r: Running,
  bars: Point[],
  bar: number,
  j: number,
  n: number,
) => {
  const at = along(r, bars, bar, (j / (n - 1)) * 2 - 1);
  at.y += (j % 2 ? -0.5 : 0.5) * BAR_HALF_H;
  return at;
};

// 0..1, as the bar's own heat (see incomePanel's heatIncomeBar)
function heatAt(k: number, bars: Point[], ms: number): number {
  const from = touchAt(k);
  if (ms < from || ms >= blowAt(k, bars)) return 0;
  return clamp01((ms - from) / (hotAt(bars) - from)) ** 1.5;
}

// where the number is as it hops down onto each bar's left end
function numberAt(r: Running, bars: Point[], order: number[], ms: number) {
  if (ms < MD_IN_MS || ms >= touchAt(order.length - 1)) return null;
  const k = Math.floor((ms - MD_IN_MS) / MD_HOP_MS);
  const from = touchSpot(r, bars[order[k]]);
  const to = touchSpot(r, bars[order[k + 1]]);
  const p = (ms - touchAt(k)) / MD_HOP_MS;
  const c = {
    x: (from.x + to.x) / 2,
    y: Math.min(from.y, to.y) - MD_LIFT,
  };
  return {
    x: (1 - p) ** 2 * from.x + 2 * (1 - p) * p * c.x + p * p * to.x,
    y: (1 - p) ** 2 * from.y + 2 * (1 - p) * p * c.y + p * p * to.y,
  };
}

registerFloorCrit("meltdownCrit", {
  plan(_r, bars, hit, _lift, _crumble, _rocket, heat) {
    const order = ownLast(bars);
    const last = order.length - 1;
    order.forEach((bar, k) => {
      hit(bar, touchAt(k), 0);
      heat(
        bar,
        touchAt(k),
        hotAt(bars) - touchAt(k),
        blowAt(k, bars) - hotAt(bars),
      );
      const n = runOf(k, bars);
      for (let j = 0; j < n; j++)
        hit(bar, blowAt(k, bars) + j * MD_EVERY_MS, 1);
    });
    hit(order[last], boomAt(bars), 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = ownLast(bars);
    const first = touchSpot(r, bars[order[0]]);
    const start = { x: first.x, y: first.y - MD_ABOVE };
    if (ms < MD_IN_MS) {
      // into the air over the top bar's left end
      const p = smoothstep(ms / MD_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        start.x * p,
        start.y * p,
        lerp(r.flashFont, MD_FONT, p),
      );
    }
    const hop = numberAt(r, bars, order, ms);
    if (hop)
      drawText(ctx, r.glyphs, r.label, hop.x, hop.y - MD_FONT * 0.6, MD_FONT);

    // the rumble building with the heat
    const hot = hotAt(bars);
    if (ms >= touchAt(0) && ms < hot) {
      const due = Math.floor((ms - touchAt(0)) / MD_RUMBLE_MS) + 1;
      while (r.kicked < due) {
        r.kicked++;
        r.shake(
          lerp(...MD_RUMBLE, clamp01((ms - touchAt(0)) / (hot - touchAt(0)))),
        );
      }
    }

    // steam glitter rising off every heated bar
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    order.forEach((bar, k) => {
      const heat = heatAt(k, bars, ms);
      if (heat < 0.15) return;
      const b = bars[bar];
      for (let i = 0; i < MD_STEAM; i++) {
        const rise = (ms * 0.0012 * (1 + heat) + holeHash(i, bar + 40)) % 1;
        stampGlimmer(
          ctx,
          b.x + (holeHash(i, bar + 41) * 2 - 1) * (r.play.barHalfWidth - 30),
          b.y - BAR_HALF_H - rise * MD_STEAM_RISE,
          MD_STEAM_SIZE * (1 - rise) * heat,
          now * 0.004 + i,
          heat > 0.7 && i % 2 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
    });
    ctx.globalCompositeOperation = previous;

    // each run of blasts, and the spark over to the next bar
    order.forEach((bar, k) => {
      const n = runOf(k, bars);
      const size = k === order.length - 1 ? MD_LAST_BLAST : MD_BLAST;
      for (let j = 0; j < n; j++)
        drawDetonation(
          ctx,
          blastSpot(r, bars, bar, j, n),
          ms - blowAt(k, bars) - j * MD_EVERY_MS,
          size,
          now,
        );
      if (k === order.length - 1) return;
      const from = blastSpot(r, bars, bar, n - 1, n);
      const next = order[k + 1];
      const to = blastSpot(r, bars, next, 0, runOf(k + 1, bars));
      const leaves = blowAt(k, bars) + (n - 1) * MD_EVERY_MS;
      const lands = blowAt(k + 1, bars);
      drawWispBetween(
        ctx,
        (t) => {
          if (t < leaves) return null;
          const p = clamp01((t - leaves) / (lands - leaves));
          return { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p) };
        },
        ms,
        now,
        WISP_SIZE,
        1,
        leaves,
        lands,
      );
    });
    const boom = boomAt(bars);
    const end = blastSpot(
      r,
      bars,
      order[order.length - 1],
      MD_LAST_RUN - 1,
      MD_LAST_RUN,
    );
    drawDetonation(ctx, end, ms - boom, MD_BOOM, now);
    if (ms >= boom && r.kicked >= 0) {
      r.kicked = -1;
      playExplosion();
    }
  },
  tailMs: MD_TAIL_MS,
  shake: (step) => MD_SHAKES[step] ?? MD_SHAKES[1],
});
