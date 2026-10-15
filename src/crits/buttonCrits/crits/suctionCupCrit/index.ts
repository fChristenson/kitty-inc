// Suction Cup, a button crit: the number bursts into glitter strewn over the
// floor beside every button, tugging; a point of light opens beside each
// button's end and starts to pull, a trickle then a flood, every speck
// snapping in onto its swelling, trembling crust; it gulps the last,
// collapses to a point and bursts into the button's end in a blast, the
// glitter flung out, the button turning over: each of its next taps also
// pays out the floor with the most workers; button after button, quicker
// each, its own last and biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import {
  flingAt,
  planSnaps,
  snapAt,
  type Snap,
} from "../../../../shared/animationStyles/pull";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// the pull POLE px off the button's left end; the glitter over a box from
// the pole: BOX_LEFT..BOX_RIGHT across, BOX_UP..BOX_DOWN up and down
const POLE = 70;
const BOX_LEFT = -580;
const BOX_RIGHT = -60;
const BOX_UP = -160;
const BOX_DOWN = 120;
const SPECKS = 34;
const OWN_SPECKS = 54;
const SPECK = 18;
const CRUST: [number, number] = [8, 30];
// each pull SUCK_MS (quicker each, its own OWN_SUCK_MS), the next starting
// STAGGER_MS on; collapsing over COLLAPSE_MS, the glitter flung out FLING
// px/ms for FLING_MS
const SUCK_MS: [number, number] = [520, 380];
const OWN_SUCK_MS = 620;
const STAGGER_MS: [number, number] = [90, 50];
const COLLAPSE_MS = 70;
const FLING = 2.6;
const FLING_MS = 170;
const TREMBLE = 10;
const GLOW = 150;
const OWN_GLOW = 220;
const BLAST = 170;
const OWN_BLAST = 380;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1.1, 3];

interface Pull {
  bar: number;
  own: boolean;
  start: number;
  end: number;
  burst: number;
  // its pole, live
  pole: Point;
}
interface State {
  pulls: Pull[];
  snaps: Snap[];
  pullOf: Uint16Array;
}
const states = new WeakMap<Running, State>();
const bit: Point = { x: 0, y: 0 };
const shake: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };

// each tap also paying out the open floor with the most workers
const suctionTaps = defineTapPerk("Suction", (t) => {
  let most: Floor | null = null;
  for (const floor of t.floors)
    if (floor.unlocked && (!most || floor.workerCount > most.workerCount))
      most = floor;
  if (most) t.payout(most, 1);
});

registerFloorCrit("suctionCupCrit", {
  reward(t) {
    suctionTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const pulls: Pull[] = [];
    const snaps: Snap[] = [];
    const pullOf: number[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 2);
      const end = t + (own ? OWN_SUCK_MS : lerp(SUCK_MS[0], SUCK_MS[1], u));
      const box = {
        left: BOX_LEFT,
        right: BOX_RIGHT,
        top: BOX_UP,
        bottom: BOX_DOWN,
      };
      for (const snap of planSnaps(
        own ? OWN_SPECKS : SPECKS,
        box,
        1,
        t,
        end,
        CRUST,
      )) {
        snaps.push(snap);
        pullOf.push(k);
      }
      const burst = end + COLLAPSE_MS;
      pulls.push({ bar, own, start: t, end, burst, pole: { x: 0, y: 0 } });
      hit(bar, burst, own ? 2 : 1);
      t += lerp(STAGGER_MS[0], STAGGER_MS[1], u);
    });
    states.set(r, { pulls, snaps, pullOf: Uint16Array.from(pullOf) });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { pulls, snaps, pullOf } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    for (let k = 0; k < pulls.length; k++) {
      const p = pulls[k];
      const button = bars[p.bar];
      p.pole.x = button.x - BTN_W / 2 - POLE;
      p.pole.y = button.y;
      // the pole swelling and trembling as it pulls
      if (ms >= p.start && ms < p.burst) {
        const c = clamp01((ms - p.start) / (p.end - p.start));
        trembleAt(c, ms, TREMBLE, shake);
        shake.x += p.pole.x;
        shake.y += p.pole.y;
        drawChargeGlow(ctx, shake, c, p.own ? OWN_GLOW : GLOW, now);
      }
      blast.x = button.x - BTN_W / 2;
      blast.y = button.y;
      drawDetonation(ctx, blast, ms - p.burst, p.own ? OWN_BLAST : BLAST, now);
    }
    if (ms < IN_MS) return;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < snaps.length; i++) {
      const p = pulls[pullOf[i]];
      const since = ms - p.burst;
      if (since >= FLING_MS) continue;
      const snap = snaps[i];
      let alpha = 1;
      if (since >= 0) {
        flingAt(snap, since, p.pole, FLING, bit);
        alpha = 1 - since / FLING_MS;
      } else {
        snapAt(snap, ms, ORIGIN, SPECK, bit);
        if (ms > p.end) {
          const u = ((ms - p.end) / COLLAPSE_MS) ** 2;
          bit.x *= 1 - u;
          bit.y *= 1 - u;
        }
        bit.x += p.pole.x;
        bit.y += p.pole.y;
      }
      ctx.globalAlpha = alpha;
      stampGlimmer(
        ctx,
        bit.x,
        bit.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
