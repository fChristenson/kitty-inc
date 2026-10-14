// Spring Loaded, a button crit: a wisp beside each button gathers power,
// trembling harder and harder, its glow swelling, light racing into it
// quicker, the rumble building, until it bursts with a bang and darts into
// the button, which turns over gold: each of its next taps also hires a
// worker; quicker button by button, its own last and biggest
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
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the wisp charges SIDE px left of a button's middle
const SIDE = -(BTN_W / 2 + 70);
// each charge's ms, from CHARGE_MS[0] to [1] (its own OWN_CHARGE_MS), the
// next starting STAGGER of the way into the last
const CHARGE_MS: [number, number] = [560, 380];
const OWN_CHARGE_MS = 760;
const STAGGER = 0.55;
const DART_MS = 90;
const TREMBLE = 10;
const OWN_TREMBLE = 14;
const STREAKS = 240;
const OWN_STREAKS = 320;
const GLOW = 190;
const OWN_GLOW = 260;
const CLIMAX_SHAKE = 1.8;
const OWN_CLIMAX_SHAKE = 3;
const CLIMAX_BLAST = 70;
const OWN_CLIMAX_BLAST = 120;
const LAND_BLAST = 60;
const OWN_LAND_BLAST = 110;
const WISP = WISP_SIZE * 0.7;
const WISP_GROW = WISP_SIZE * 0.7;
const TAIL_MS = 900;
// shakes by step: a jolt, a button, its own
const SHAKES = [0.3, 0.8, 1.6];

interface Spring {
  bar: number;
  own: boolean;
  charge: Charge;
  lands: number;
}
interface State {
  bars: Point[];
  springs: Spring[];
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const wisp: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("springLoadedCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const springs: Spring[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const ms = own
        ? OWN_CHARGE_MS
        : lerp(CHARGE_MS[0], CHARGE_MS[1], k / Math.max(1, order.length - 2));
      const charge = planCharge(t, ms, {
        climaxShake: own ? OWN_CLIMAX_SHAKE : CLIMAX_SHAKE,
      });
      const lands = charge.climaxMs + DART_MS;
      springs.push({ bar, own, charge, lands });
      hit(bar, lands, own ? 2 : 1);
      t += ms * STAGGER;
    });
    states.set(r, { bars, springs });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    for (const s of state.springs) {
      tickCharge(s.charge, ms, r.shake);
      const button = bars[s.bar];
      spot.x = button.x + SIDE;
      spot.y = button.y;
      if (ms >= s.charge.startMs && ms <= s.lands) {
        const c = chargeAt(s.charge, ms);
        if (ms < s.charge.climaxMs) {
          trembleAt(c, ms, s.own ? OWN_TREMBLE : TREMBLE, shiver);
          wisp.x = spot.x + shiver.x;
          wisp.y = spot.y + shiver.y;
          drawChargeStreaks(ctx, spot, c, s.own ? OWN_STREAKS : STREAKS, ms);
          drawChargeGlow(ctx, wisp, c, s.own ? OWN_GLOW : GLOW, now);
        } else {
          const u = (ms - s.charge.climaxMs) / DART_MS;
          wisp.x = lerp(spot.x, button.x, u * u);
          wisp.y = spot.y;
        }
        drawWispHead(ctx, () => wisp, ms, now, WISP + WISP_GROW * c, c);
      }
      drawDetonation(
        ctx,
        spot,
        ms - s.charge.climaxMs,
        s.own ? OWN_CLIMAX_BLAST : CLIMAX_BLAST,
        now,
      );
      drawDetonation(
        ctx,
        button,
        ms - s.lands,
        s.own ? OWN_LAND_BLAST : LAND_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
