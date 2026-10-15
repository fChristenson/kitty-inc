// Familiar, a button crit: one pen of light draws a magic circle flat on the
// floor beside every button in view at once, then their inner rings and
// stars; the circles turn together, slow, then whipping round faster and
// faster, every turn a jolt and a tick, until pillars of light erupt out of
// all of them in one blast; a wisp bursts up out of each pillar and leaps
// into its button, one after another down the building, quicker each, a
// blast each: the button turns over, each of its next taps also paying out
// the most upgraded floor; its own last, the biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// every circle AWAY px left of its button's middle, DOWN px under its bottom
// edge, RADIUS round (its own OWN_RADIUS), drawn from IN_MS and turning
// TURNS times till they erupt at ERUPT_MS
const AWAY = BTN_W / 2 + 130;
const DOWN = 14;
const RADIUS = 100;
const OWN_RADIUS = 130;
const ERUPT_MS = 1250;
const TURNS = 7;
const PILLAR = 560;
const OWN_PILLAR = 760;
const ERUPT_BLAST = 160;
const OWN_ERUPT_BLAST = 240;
const REV_SHAKE = 0.35;
// each wisp rising RISE px up its pillar over RISE_MS, hovering, then
// leaping into its button's left end over LEAP_MS, LEAPS_MS apart (closing)
const RISE = 300;
const RISE_MS = 150;
const LEAPS_MS: [number, number] = [110, 55];
const LEAP_MS = 110;
const BOB = 14;
const WISP = WISP_SIZE * 1.4;
const OWN_WISP = WISP_SIZE * 2;
const LAND_BLAST = 130;
const OWN_LAND_BLAST = 280;
// shakes by step: the eruption, a button, its own
const SHAKES = [1.6, 1, 2.8];

interface Familiar {
  bar: number;
  own: boolean;
  leapMs: number;
  landMs: number;
  // its flight from its button's middle
  at: (ms: number) => Point;
}
interface State {
  summons: Summon[];
  familiars: Familiar[];
}
const states = new WeakMap<Running, State>();
const circle: Point = { x: 0, y: 0 };
const landing: Point = { x: -BTN_W / 2 + 20, y: 0 };

// each tap also paying out the floor with the most upgrades
const fetchTaps = defineTapPerk("Fetch", (t) => {
  let best: Floor | null = null;
  for (const floor of t.floors)
    if (floor.unlocked && (!best || floor.upgradeCount > best.upgradeCount))
      best = floor;
  if (best) t.payout(best, meta.values.payouts);
});

// a familiar's flight, from its button's middle: up out of the circle,
// hovering, then a leap onto the button's left end, faster and faster
function flight(
  own: boolean,
  leapMs: number,
  landMs: number,
): (ms: number) => Point {
  const into: Point = { x: 0, y: 0 };
  const foot = { x: -AWAY, y: BTN_H / 2 + DOWN };
  const apex = { x: -AWAY, y: foot.y - RISE * (own ? 1.3 : 1) };
  return (ms) => {
    if (ms < ERUPT_MS + RISE_MS) {
      const u = Math.max(0, (ms - ERUPT_MS) / RISE_MS);
      const e = 1 - (1 - u) ** 2;
      into.x = foot.x;
      into.y = foot.y + (apex.y - foot.y) * e;
    } else if (ms < leapMs) {
      into.x = apex.x;
      into.y = apex.y + Math.sin((ms - ERUPT_MS) * 0.03) * BOB;
    } else {
      const u = Math.min(1, (ms - leapMs) / (landMs - leapMs));
      const e = u * u;
      // over the top, onto the button's end
      const w = 1 - e;
      const cx = (apex.x + landing.x) / 2;
      const cy = apex.y - 80;
      into.x = w * w * apex.x + 2 * w * e * cx + e * e * landing.x;
      into.y = w * w * apex.y + 2 * w * e * cy + e * e * landing.y;
    }
    return into;
  };
}

registerFloorCrit("familiarCrit", {
  reward(t) {
    fetchTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const summons = order.map((bar, k) =>
      planSummon(IN_MS, ERUPT_MS, TURNS, summonLook(bar === 0 ? 3 : k * 2 + 1)),
    );
    hit(0, ERUPT_MS, 0);
    let t = ERUPT_MS + RISE_MS + LEAPS_MS[0];
    const familiars = order.map((bar, k) => {
      const own = bar === 0;
      const leapMs = t;
      const landMs = leapMs + LEAP_MS;
      hit(bar, landMs, own ? 2 : 1);
      t += lerp(LEAPS_MS[0], LEAPS_MS[1], k / Math.max(1, order.length - 2));
      return { bar, own, leapMs, landMs, at: flight(own, leapMs, landMs) };
    });
    states.set(r, { summons, familiars });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // every circle turns at once: a jolt and a tick at every turn
    const revs = state.summons[0].revs;
    while (r.kicked < revs.length && ms >= revs[r.kicked]) {
      r.kicked++;
      r.shake(REV_SHAKE * (1 + r.kicked / revs.length));
      playSpinTick(1 + r.kicked * 0.08);
    }
    state.familiars.forEach((f, k) => {
      const bar = bars[f.bar];
      const summon = state.summons[k];
      const radius = f.own ? OWN_RADIUS : RADIUS;
      circle.x = bar.x - AWAY;
      circle.y = bar.y + BTN_H / 2 + DOWN;
      drawSummon(ctx, summon, ms, circle, radius);
      drawSummonPillar(
        ctx,
        summon,
        ms,
        circle,
        radius,
        f.own ? OWN_PILLAR : PILLAR,
      );
      drawDetonation(
        ctx,
        circle,
        ms - ERUPT_MS,
        f.own ? OWN_ERUPT_BLAST : ERUPT_BLAST,
        now,
      );
      ctx.save();
      ctx.translate(bar.x, bar.y);
      drawWispBetween(
        ctx,
        f.at,
        ms,
        now,
        f.own ? OWN_WISP : WISP,
        0.6,
        ERUPT_MS,
        f.landMs,
      );
      drawDetonation(
        ctx,
        landing,
        ms - f.landMs,
        f.own ? OWN_LAND_BLAST : LAND_BLAST,
        now,
      );
      ctx.restore();
    });
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
