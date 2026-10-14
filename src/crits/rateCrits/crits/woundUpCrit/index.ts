// Wound Up, a rate crit: a wisp on each bar's readout gathers power,
// trembling harder and harder, its glow swelling, light racing into it
// quicker, the rumble building, until it bursts with a bang and the readout
// turns over: every payout half as big again for a while; quicker bar by
// bar, its own last and biggest
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// each charge's ms, from CHARGE_MS[0] to [1] (its own OWN_CHARGE_MS), the
// next starting STAGGER of the way into the last
const CHARGE_MS: [number, number] = [520, 380];
const OWN_CHARGE_MS = 700;
const STAGGER = 0.5;
const TREMBLE = 10;
const OWN_TREMBLE = 14;
const STREAKS = 240;
const OWN_STREAKS = 320;
const GLOW = 220;
const OWN_GLOW = 300;
const CLIMAX_SHAKE = 1.8;
const OWN_CLIMAX_SHAKE = 3;
const BLAST = 80;
const OWN_BLAST = 160;
const WISP = WISP_SIZE * 0.6;
const WISP_GROW = WISP_SIZE * 0.8;
const TAIL_MS = 900;
// the climax shakes itself; the hit only jolts the bar
const SHAKES = [0.3, 0.3, 0.6];

interface Windup {
  bar: number;
  own: boolean;
  charge: Charge;
}
const states = new WeakMap<Running, Windup[]>();
const shiver: Point = { x: 0, y: 0 };
const wisp: Point = { x: 0, y: 0 };

registerFloorCrit("woundUpCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const ups: Windup[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const ms = own
        ? OWN_CHARGE_MS
        : lerp(CHARGE_MS[0], CHARGE_MS[1], k / Math.max(1, order.length - 2));
      const charge = planCharge(t, ms, {
        climaxShake: own ? OWN_CLIMAX_SHAKE : CLIMAX_SHAKE,
      });
      ups.push({ bar, own, charge });
      hit(bar, charge.climaxMs, own ? 2 : 1);
      t += ms * STAGGER;
    });
    states.set(r, ups);
  },
  draw(ctx, r, ms, bars) {
    const ups = states.get(r);
    if (!ups) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    for (const u of ups) {
      tickCharge(u.charge, ms, r.shake);
      const at = bars[u.bar];
      if (ms >= u.charge.startMs && ms < u.charge.climaxMs) {
        const c = chargeAt(u.charge, ms);
        trembleAt(c, ms, u.own ? OWN_TREMBLE : TREMBLE, shiver);
        wisp.x = at.x + shiver.x;
        wisp.y = at.y + shiver.y;
        drawChargeStreaks(ctx, at, c, u.own ? OWN_STREAKS : STREAKS, ms);
        drawChargeGlow(ctx, wisp, c, u.own ? OWN_GLOW : GLOW, now);
        drawWispHead(ctx, () => wisp, ms, now, WISP + WISP_GROW * c, c);
      }
      drawDetonation(
        ctx,
        at,
        ms - u.charge.climaxMs,
        u.own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
