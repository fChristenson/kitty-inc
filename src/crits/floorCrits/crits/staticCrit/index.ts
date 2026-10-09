// the static floor crit: the number hangs over the building as a charged
// wisp while static builds in the bars in view: arcs crackle between their
// ends, along them and up to the wisp, more and faster; then one giant bolt
// cracks down from the sky through the bars onto its own, every bar blowing
// apart as it strikes, into a huge blast
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
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
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
import { holeHash, ownLast, skyY } from "../../critPlayer/shared";

const ST_IN_MS = 260;
const ST_ABOVE = 330;
const ST_WISP: [number, number] = [1.4, 2.4];
// arcs from ST_ARCS_MS for ST_BUILD_MS, their gaps closing, each lit ST_ARC_MS
const ST_ARCS_MS = ST_IN_MS + 150;
const ST_BUILD_MS = 1500;
const ST_GAP: [number, number] = [220, 45];
const ST_ARC_MS = 90;
const ST_ARC_SCALE: [number, number] = [0.5, 1];
const ST_STRIKE_MS = ST_ARCS_MS + ST_BUILD_MS;
// the strike: from this far over the screen, its bolt this thick, lit this long
const ST_SKY = 1.2;
const ST_BOLT = 2.4;
const ST_BOLT_MS = 350;
const ST_FLASH = 0.7;
// each bar blowing as the bolt hits, a bar every ST_EVERY_MS from the top
const ST_EVERY_MS = 45;
const ST_SIDES = [-0.6, 0, 0.6];
const ST_SIDE_MS = 15;
const ST_BLAST = 140;
const ST_OWN_BLAST = 180;
const ST_BOOM_MS = 60;
const ST_BOOM = 420;
const ST_STRIKE_SHAKE = 2.4;
const ST_KICKED_STRIKE = 1e6;
// shakes by step: an arc, a bar blowing, the last one
const ST_SHAKES = [0.4, 1.2, 3];
const ST_TAIL_MS = 1100;

// an arc's end: a spot along a bar (side -1..1 of its half width from its
// middle) or, if null, the wisp
type End = { bar: number; side: number } | null;
interface Arc {
  at: number;
  from: End;
  to: End;
  // the bar it jolts
  bar: number;
  bolt: Bolt;
}
interface Charge {
  arcs: Arc[];
  strike: Bolt;
}
const charges = new WeakMap<Running, Charge>();

function planArcs(bars: Point[]): Arc[] {
  const order = ownLast(bars);
  const arcs: Arc[] = [];
  for (let t = ST_ARCS_MS, k = 0; t < ST_STRIKE_MS - 40; k++) {
    const i = Math.floor(holeHash(k, 901) * order.length);
    const bar = order[i];
    const next = order[i + 1] ?? order[i - 1];
    const end = holeHash(k, 902) < 0.5 ? -1 : 1;
    const kind = Math.floor(holeHash(k, 900) * 4);
    const spot = (salt: number) => holeHash(k, salt) * 1.6 - 0.8;
    let from: End;
    let to: End;
    if (kind === 0 && next !== undefined) {
      from = { bar, side: end };
      to = { bar: next, side: end };
    } else if (kind === 2) {
      from = null;
      to = { bar: order[0], side: spot(903) };
    } else if (kind === 3 && next !== undefined) {
      from = { bar, side: spot(904) };
      to = { bar: next, side: spot(905) };
    } else {
      from = { bar, side: -1 };
      to = { bar, side: 1 };
    }
    const target = to ?? from;
    arcs.push({
      at: t,
      from,
      to,
      bar: target ? target.bar : bar,
      bolt: createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 1),
    });
    t += lerp(...ST_GAP, (t - ST_ARCS_MS) / ST_BUILD_MS);
  }
  return arcs;
}

function placeEnd(
  r: Running,
  bars: Point[],
  end: End,
  wisp: Point,
  into: Point,
): void {
  if (!end) {
    into.x = wisp.x;
    into.y = wisp.y;
    return;
  }
  into.x = bars[end.bar].x + end.side * r.play.barHalfWidth;
  into.y = bars[end.bar].y;
}

registerFloorCrit("staticCrit", {
  plan(r, bars, hit) {
    const arcs = planArcs(bars);
    charges.set(r, {
      arcs,
      strike: createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 4),
    });
    for (const arc of arcs) hit(arc.bar, arc.at, 0);
    ownLast(bars).forEach((bar, k) =>
      hit(bar, ST_STRIKE_MS + k * ST_EVERY_MS, 1),
    );
    hit(0, ST_STRIKE_MS + bars.length * ST_EVERY_MS + ST_BOOM_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const charge = charges.get(r);
    if (!charge) return;
    const now = r.startedAt + ms;
    const order = ownLast(bars);
    const top = bars[order[0]];
    const wisp = { x: top.x, y: skyY(r, bars, ST_ABOVE) };
    const build = clamp01((ms - ST_ARCS_MS) / ST_BUILD_MS);
    if (ms < ST_IN_MS) {
      const p = (ms / ST_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        wisp.x * p,
        wisp.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= ST_IN_MS && ms < ST_STRIKE_MS) {
      const size = WISP_SIZE * lerp(...ST_WISP, build);
      drawWisp(ctx, () => wisp, ms, now, size, build);
    }

    for (const arc of charge.arcs) {
      const dt = ms - arc.at;
      if (dt < 0 || dt > ST_ARC_MS) continue;
      placeEnd(r, bars, arc.from, wisp, arc.bolt.from);
      placeEnd(r, bars, arc.to, wisp, arc.bolt.to);
      const fade = 1 - dt / ST_ARC_MS;
      drawBolt(ctx, arc.bolt, fade, lerp(...ST_ARC_SCALE, build));
      drawStrike(ctx, arc.bolt.to, fade, 0.6, now);
    }

    // the strike, from the sky onto its own bar
    const sdt = ms - ST_STRIKE_MS;
    if (sdt >= 0 && r.kicked < ST_KICKED_STRIKE) {
      r.kicked = ST_KICKED_STRIKE;
      r.shake(ST_STRIKE_SHAKE);
      playExplosion();
    }
    if (sdt >= 0 && sdt < ST_BOLT_MS) {
      const { strike } = charge;
      strike.from.x = bars[0].x;
      strike.from.y = -r.viewportWidth * ST_SKY;
      strike.to.x = bars[0].x;
      strike.to.y = bars[0].y;
      const fade = 1 - sdt / ST_BOLT_MS;
      drawBolt(ctx, strike, fade, ST_BOLT);
      drawStrike(ctx, bars[0], fade, 2, now);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = ST_FLASH * fade;
      drawGlow(ctx, glowStops(COLOR.white), 0, 0, r.viewportWidth);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    order.forEach((bar, k) => {
      ST_SIDES.forEach((side, j) =>
        drawDetonation(
          ctx,
          along(r, bars, bar, side),
          ms - ST_STRIKE_MS - k * ST_EVERY_MS - j * ST_SIDE_MS,
          bar === 0 ? ST_OWN_BLAST : ST_BLAST,
          now,
        ),
      );
    });
    drawDetonation(
      ctx,
      bars[0],
      ms - ST_STRIKE_MS - bars.length * ST_EVERY_MS - ST_BOOM_MS,
      ST_BOOM,
      now,
    );
  },
  tailMs: ST_TAIL_MS,
  shake: (step) => ST_SHAKES[step] ?? ST_SHAKES[1],
});
