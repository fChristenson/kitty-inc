// Power Surge, a button crit: the number shrinks into an orb hanging beside
// the column of buttons, and it charges: threads of light are drawn out of
// every button into it, streaks racing in quicker and quicker, the orb
// swelling, trembling harder and glowing white-hot as the rumble builds;
// at the climax it bursts with a bang and lashes a beam into each button in
// turn, down the column, each a blast, the button turning over: each of
// their next taps also pays out the top and bottom floors; its own last,
// the fattest beam and the biggest blast
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 140;
// the orb OFF px off the buttons' left ends, level with their middle;
// charging CHARGE_MS, trembling up to TREMBLE px, glowing GLOW across
const OFF = 380;
const CHARGE_MS = 1200;
const TREMBLE = 18;
const GLOW = 360;
const ORB = WISP_SIZE * 1.4;
const STREAKS = 520;
const THREAD = 10;
// the lashes: LASH_MS each, GAPS_MS apart (closing), BEAM px wide (its own
// OWN_BEAM)
const LASH_MS = 150;
const GAPS_MS: [number, number] = [55, 25];
const BEAM = 50;
const OWN_BEAM = 110;
const BLAST = 180;
const OWN_BLAST = 400;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1.1, 3];

interface State {
  charge: Charge;
  // the buttons top down, its own last, and when each is lashed
  order: number[];
  lashes: number[];
  orb: Point;
  ends: Point[];
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const atHead = () => head;

// the top and bottom open floors
function ends(floors: Floor[]): Floor[] {
  let bottom: Floor | null = null;
  let top: Floor | null = null;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    bottom ??= floor;
    top = floor;
  }
  return bottom && top && bottom !== top
    ? [bottom, top]
    : bottom
      ? [bottom]
      : [];
}

// each tap also paying out the top and bottom floors
const surgeTaps = defineTapPerk("Surge", (t) => {
  for (const floor of ends(t.floors)) t.payout(floor, 1);
});

registerFloorCrit("powerSurgeCrit", {
  reward(t) {
    surgeTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[p].y - bars[q].y);
    order.push(0);
    const charge = planCharge(IN_MS, CHARGE_MS, { bang: true });
    const lashes: number[] = [];
    let t = charge.climaxMs;
    order.forEach((bar, k) => {
      lashes.push(t);
      hit(bar, t + 40, bar === 0 ? 2 : 1);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / Math.max(1, order.length - 2));
    });
    states.set(r, {
      charge,
      order,
      lashes,
      orb: { x: 0, y: 0 },
      ends: order.map(() => ({ x: 0, y: 0 })),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { charge, order, lashes, orb, ends: tips } = state;
    if (ms < IN_MS) {
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.6 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
      return;
    }
    // the orb beside the buttons' middle
    let top = Infinity;
    let bottom = -Infinity;
    for (let k = 0; k < order.length; k++) {
      const button = bars[order[k]];
      tips[k].x = button.x - BTN_W / 2;
      tips[k].y = button.y;
      top = Math.min(top, button.y);
      bottom = Math.max(bottom, button.y);
    }
    orb.x = tips[0].x - OFF;
    orb.y = (top + bottom) / 2;
    tickCharge(charge, ms, r.shake);
    const c = chargeAt(charge, ms);
    const climax = charge.climaxMs;
    if (ms < climax) {
      trembleAt(c, ms, TREMBLE, shiver);
      head.x = orb.x + shiver.x;
      head.y = orb.y + shiver.y;
      // threads of light drawn out of every button into it
      for (let k = 0; k < tips.length; k++)
        drawBeam(
          ctx,
          tips[k],
          head,
          THREAD * (0.3 + c),
          0.15 + 0.5 * c * (0.7 + 0.3 * Math.sin(now * 0.05 + k)),
        );
      drawChargeStreaks(ctx, head, c, STREAKS, ms);
      drawChargeGlow(ctx, head, c, GLOW, now);
      drawWispHead(ctx, atHead, ms, now, ORB * (1 + c), c);
    }
    drawDetonation(ctx, orb, ms - climax, OWN_BLAST, now);
    // the lashes down the column
    for (let k = 0; k < lashes.length; k++) {
      const since = ms - lashes[k];
      const own = order[k] === 0;
      if (since >= 0 && since < LASH_MS)
        drawBeam(
          ctx,
          orb,
          tips[k],
          (own ? OWN_BEAM : BEAM) * (1 - since / LASH_MS),
          1,
        );
      drawDetonation(ctx, tips[k], since - 40, own ? OWN_BLAST : BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
