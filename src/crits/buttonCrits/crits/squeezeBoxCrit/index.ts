// Squeeze Box, a button crit: the number bursts into a ball of glitter
// beside every button; a slab of light rams in from the side and slams it
// against the button's edge, again and again, quicker and harder, each slam
// a white-hot line with glitter squeezed out top and bottom, the ball
// squashing thinner and taller; the last slam crushes it flat, jets of
// glitter blasting out, and the button turns over: each of its next taps
// also hires a worker on the floor with the fewest; button by button,
// quicker each, its own last and hardest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import {
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawSlab,
  planCrush,
  squashScale,
  tickCrush,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the ball GAP px left of a button, BALL px round (its own OWN_BALL), BITS
// specks; the slab THICK px, wound up LIFT px off it
const GAP = 30;
const BALL = 60;
const OWN_BALL = 80;
const BITS = 36;
const SPECK = 16;
const THICK = 26;
const LIFT = 180;
const SLAB = 2.2;
// the slams: SLAMS per button GAPS_MS apart (closing), a button STAGGER of
// its crush after the last (quicker each)
const SLAMS = 4;
const GAPS_MS: [number, number] = [240, 110];
const STAGGER = 0.45;
const BLAST = 120;
const OWN_BLAST = 260;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1, 2.6];

interface Press {
  bar: number;
  own: boolean;
  crush: Crush;
  pose: CrushPose;
  ball: number;
  burstMs: number;
  // this frame: the ball's middle and its half width and height
  at: Point;
  half: number;
  tall: number;
}
interface State {
  presses: Press[];
  // each speck's spot in a ball, from its middle, of a unit ball
  bits: Point[];
}
const states = new WeakMap<Running, State>();
const squash: Point = { x: 1, y: 1 };
const stretch: Point = { x: 1, y: 1 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };

// each tap also hiring on the open floor with the fewest workers
const squeezeTaps = defineTapPerk("Squeeze", (t) => {
  let fewest: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor.unlocked &&
      (!fewest || (floor.workerCount ?? 1) < (fewest.workerCount ?? 1))
    )
      fewest = floor;
  if (fewest) t.hire(fewest);
});

registerFloorCrit("squeezeBoxCrit", {
  reward(t) {
    squeezeTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const presses: Press[] = [];
    let t = IN_MS + 180;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 2);
      const gaps: [number, number] = own
        ? GAPS_MS
        : [lerp(GAPS_MS[0], GAPS_MS[1], u), GAPS_MS[1] * 0.8];
      const crush = planCrush(t, own ? SLAMS + 1 : SLAMS, gaps, 1.5, {
        bang: false,
      });
      const burstMs = crush.slams[crush.slams.length - 1];
      presses.push({
        bar,
        own,
        crush,
        pose: { crush: 0, lift: 0, since: Infinity, press: -1 },
        ball: own ? OWN_BALL : BALL,
        burstMs,
        at: { x: 0, y: 0 },
        half: 0,
        tall: 0,
      });
      hit(bar, burstMs, own ? 2 : 1);
      t += (burstMs - t) * STAGGER;
    });
    states.set(r, {
      presses,
      bits: Array.from({ length: BITS }, (_, i) => {
        const angle = holeHash(i, 4310) * Math.PI * 2;
        const d = Math.sqrt(holeHash(i, 4311));
        return { x: Math.cos(angle) * d, y: Math.sin(angle) * d };
      }),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    for (const p of state.presses) {
      tickCrush(p.crush, ms, r.shake);
      crushAt(p.crush, ms, p.pose);
      squashScale(p.pose.crush, squash);
      const button = bars[p.bar];
      // the ball pressed against the button's left edge
      const half = p.ball * squash.y;
      const tall = p.ball * squash.x;
      const centre = p.at;
      centre.x = button.x - BTN_W / 2 - GAP - half;
      centre.y = button.y;
      p.half = half;
      p.tall = tall;
      if (ms >= IN_MS && ms < p.burstMs) {
        crusherScale(p.crush, ms, stretch);
        a.x = b.x = centre.x - half - THICK / 2 - p.pose.lift * LIFT;
        a.y = centre.y - (tall * SLAB * stretch.x) / 2;
        b.y = centre.y + (tall * SLAB * stretch.x) / 2;
        drawSlab(ctx, a, b, THICK * stretch.y, 1, now);
      }
      if (p.pose.press >= 0) {
        contact.x = centre.x - half;
        contact.y = centre.y;
        drawCrushContact(
          ctx,
          contact,
          Math.PI,
          tall * 2,
          p.pose.since,
          (p.pose.press + 1) / p.crush.slams.length,
          now,
        );
      }
      drawCrushBurst(ctx, centre, 0, tall * 2, ms - p.burstMs, now);
      drawDetonation(
        ctx,
        button,
        ms - p.burstMs,
        p.own ? OWN_BLAST : BLAST,
        now,
      );
    }
    // every ball's specks, one flat loop
    const { presses, bits } = state;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let n = 0; n < presses.length * BITS; n++) {
      const p = presses[(n / BITS) | 0];
      if (ms < IN_MS || ms >= p.burstMs) continue;
      const i = n % BITS;
      stampGlimmer(
        ctx,
        p.at.x + bits[i].x * p.half,
        p.at.y + bits[i].y * p.tall,
        SPECK,
        n,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
