// Mist Cannon, a floor crit: the number drops into the street under the
// building as a cannon wisp that swells, trembling, then blasts a jet of
// gold mist up into the bottom bar, the jet swelling thicker and the mist
// boiling over the bar, its gold coat building until it flashes white in a
// blast with its levels; the cannon kicks and snaps up onto the next bar,
// and the next, quicker and harder each; then it falls silent, swells and
// trembles hardest, and fires its biggest blast into its own bar
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H } from "../../critPlayer/shared";

const IN_MS = 140;
// the cannon STREET px under the lowest bar, charging CHARGE_MS (its own
// blast OWN_CHARGE_MS), trembling up to TREMBLE px, kicking KICK px a blast
const STREET = 620;
const CHARGE_MS = 280;
const OWN_CHARGE_MS = 260;
const TREMBLE = 12;
const KICK = 60;
const KICK_MS = 110;
const CANNON = WISP_SIZE * 1.6;
const GLOW = 220;
// the blasts: BLAST_MS each (quicker each, its own OWN_BLAST_MS), SNAP_MS
// between them; the jet DROP thick, swelling SWELL more as it blasts
const BLAST_MS: [number, number] = [380, 220];
const OWN_BLAST_MS = 480;
const SNAP_MS = 40;
const DROP = WISP_SIZE * 1.2;
const SWELL = 1.6;
const SPREAD = 0.07;
const FLIGHT_MS = 160;
const MIST = 110;
const FLASH_MS = 200;
const BLAST = 180;
const OWN_BLAST = 420;
// shakes by step: a bar, its own
const SHAKES = [1, 3];

interface Blast {
  bar: number;
  own: boolean;
  start: number;
  end: number;
  spray: Spray;
  // where it hits, from bars[0]
  at: Point;
}
interface State {
  blasts: Blast[];
  cannon: Point;
  // when it charges up, for each charge
  charges: { from: number; to: number }[];
}
const states = new WeakMap<Running, State>();
const head: Point = { x: 0, y: 0 };
const atHead = () => head;
const spot: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

registerFloorCrit("mistCannonCrit", {
  plan(r, bars, hit) {
    const base = bars[0];
    let lowest = 0;
    for (const bar of bars) lowest = Math.max(lowest, bar.y - base.y);
    const cannon: Point = { x: 0, y: lowest + STREET };
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[q].y - bars[p].y);
    order.push(0);
    const blasts: Blast[] = [];
    const charges = [{ from: IN_MS, to: IN_MS + CHARGE_MS }];
    let t = IN_MS + CHARGE_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      if (own && k > 0) {
        charges.push({ from: t, to: t + OWN_CHARGE_MS });
        t += OWN_CHARGE_MS;
      }
      const ms = own
        ? OWN_BLAST_MS
        : lerp(BLAST_MS[0], BLAST_MS[1], k / Math.max(1, order.length - 2));
      const at = { x: bars[bar].x - base.x, y: bars[bar].y - base.y };
      const dx = at.x - cannon.x;
      const dy = at.y + BAR_HALF_H - cannon.y;
      blasts.push({
        bar,
        own,
        start: t,
        end: t + ms,
        at,
        spray: planSpray(cannon, Math.atan2(dy, dx), {
          startMs: t,
          endMs: t + ms,
          spread: SPREAD,
          reach: Math.hypot(dx, dy),
          flightMs: FLIGHT_MS,
        }),
      });
      hit(bar, t + ms, own ? 1 : 0);
      t += ms + SNAP_MS;
    });
    states.set(r, { blasts, cannon, charges });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const base = bars[0];
    const { blasts, cannon, charges } = state;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, base.x + cannon.x, p),
        lerp(0, base.y + cannon.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
      return;
    }
    ctx.save();
    ctx.translate(base.x, base.y);
    const half = r.play.barHalfWidth;
    for (let k = 0; k < blasts.length; k++) {
      const b = blasts[k];
      spot.x = b.at.x;
      spot.y = b.at.y;
      const c = clamp01((ms - b.start) / (b.end - b.start));
      if (ms >= b.start && ms < b.end)
        drawSprayMist(
          ctx,
          spot,
          ms - b.start,
          c,
          MIST * (b.own ? 1.4 : 1),
          now,
        );
      const flash = ms >= b.end ? 1 - (ms - b.end) / FLASH_MS : 0;
      if (ms >= b.start && ms < b.end + FLASH_MS)
        drawSprayCoat(
          ctx,
          spot,
          half * 2,
          BAR_HALF_H * 2,
          ms < b.end ? c : flash,
          flash,
        );
      drawDetonation(ctx, spot, ms - b.end, b.own ? OWN_BLAST : BLAST, now);
    }
    // the jets, swelling as each blasts
    const previous = ctx.globalCompositeOperation;
    beginLightBatch(ctx);
    let kick = 0;
    for (let k = 0; k < blasts.length; k++) {
      const b = blasts[k];
      const c = clamp01((ms - b.start) / (b.end - b.start));
      drawSpray(
        ctx,
        b.spray,
        ms,
        now,
        DROP * (1 + SWELL * c) * (b.own ? 1.3 : 1),
      );
      const since = ms - b.start;
      if (since >= 0 && since < KICK_MS) kick = KICK * (1 - since / KICK_MS);
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the cannon charging (trembling, swelling) and kicking at every blast
    let charge = 0;
    for (const ch of charges)
      if (ms >= ch.from && ms < ch.to)
        charge = (ms - ch.from) / (ch.to - ch.from);
    trembleAt(charge, ms, TREMBLE, shiver);
    head.x = cannon.x + shiver.x;
    head.y = cannon.y + shiver.y + kick;
    const last = blasts[blasts.length - 1];
    if (ms < last.end) {
      if (charge > 0) drawChargeGlow(ctx, head, charge, GLOW, now);
      drawWispHead(
        ctx,
        atHead,
        ms,
        now,
        CANNON * (1 + 0.4 * charge),
        Math.max(charge, 0.6),
      );
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
