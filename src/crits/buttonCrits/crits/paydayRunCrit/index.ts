// Payday Run, a button crit: the number bursts into a wisp that tears down
// the building past every button, dipping into each one's end, a river of
// coins and bills pouring along behind it through every dip, each button it
// touches turning over in a blast as the river pours in; quicker each; it
// dives into its own button and the whole river crashes in after it: each
// of their next taps also pays out the least upgraded floor
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 110;
// its route: swinging out OUT px off each button's left end and UP px over
// it, then dipping to DIP px off its end; RUN_MS from one button to the next
// (quickening), DIP_MS into each
const OUT = 300;
const UP = 130;
const DIP = 14;
const RUN_MS: [number, number] = [130, 70];
const DIP_MS = 60;
const WISP = WISP_SIZE * 1.4;
// the river: COINS of them RIVER_MS long behind it, SPREAD px either side
const COINS = 140;
const RIVER_MS = 260;
const SPREAD = 26;
const COIN = 24;
const COIN_SPIN = 0.03;
const BLAST = 170;
const OWN_BLAST = 400;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1.1, 3];

interface State {
  // the route from its own button, and when it reaches each point
  route: Point[];
  times: number[];
  // the dips: their button and when the river's poured in
  dips: { bar: number; at: number; poured: number }[];
  offsets: Float32Array;
  lags: Float32Array;
  sprites: CoinBurstSprite[];
  wisp: (ms: number) => Point;
  offset: Point;
}
const states = new WeakMap<Running, State>();
const coin: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };

// the open floor with the fewest upgrades
function leastUpgraded(floors: Floor[]): Floor | null {
  let least: Floor | null = null;
  for (const floor of floors)
    if (floor.unlocked && (!least || floor.upgradeCount < least.upgradeCount))
      least = floor;
  return least;
}

// each tap also paying out the least upgraded floor
const paydayTaps = defineTapPerk("Payday", (t) => {
  const floor = leastUpgraded(t.floors);
  if (floor) t.payout(floor, 1);
});

registerFloorCrit("paydayRunCrit", {
  reward(t) {
    paydayTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const base = bars[0];
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[p].y - bars[q].y);
    order.push(0);
    const route: Point[] = [{ x: -base.x, y: -base.y }];
    const times: number[] = [IN_MS];
    const dips: State["dips"] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const end = bars[bar].x - base.x - BTN_W / 2;
      const y = bars[bar].y - base.y;
      t += lerp(RUN_MS[0], RUN_MS[1], k / Math.max(1, order.length - 1));
      route.push({ x: end - OUT, y: y - UP });
      times.push(t);
      t += DIP_MS;
      route.push({ x: end - DIP, y });
      times.push(t);
      const poured = bar === 0 ? t + RIVER_MS : t + RIVER_MS * 0.5;
      dips.push({ bar, at: t, poured });
      hit(bar, poured, bar === 0 ? 2 : 1);
    });
    const offset: Point = { x: 0, y: 0 };
    const at: Point = { x: 0, y: 0 };
    const last = times[times.length - 1];
    const wisp = (ms: number): Point => {
      const c = Math.max(times[0], Math.min(last, ms));
      let i = 0;
      while (i < times.length - 2 && c > times[i + 1]) i++;
      const u = clamp01((c - times[i]) / (times[i + 1] - times[i] || 1));
      at.x = offset.x + lerp(route[i].x, route[i + 1].x, u);
      at.y = offset.y + lerp(route[i].y, route[i + 1].y, u);
      return at;
    };
    states.set(r, {
      route,
      times,
      dips,
      offsets: Float32Array.from(
        { length: COINS },
        (_, i) => (holeHash(i, 7210) * 2 - 1) * SPREAD,
      ),
      lags: Float32Array.from(
        { length: COINS },
        (_, i) => (i / COINS) * RIVER_MS,
      ),
      sprites: Array.from({ length: COINS }, (_, i) => ({
        kind: i % 5 === 0 ? "bill" : "coin",
        spinFrame: 0,
        axisAngle: (holeHash(i, 7211) - 0.5) * Math.PI,
      })),
      wisp,
      offset,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const base = bars[0];
    state.offset.x = base.x;
    state.offset.y = base.y;
    const { times, dips, offsets, lags, sprites } = state;
    const end = times[times.length - 1];
    if (ms < IN_MS)
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
    // a whoosh as it dips into each button
    while (r.kicked < dips.length && ms >= dips[r.kicked].at) {
      playSwoosh();
      r.kicked++;
    }
    // the river pouring along behind it, into its own button at the end
    const transform = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = 0; i < offsets.length; i++) {
      const t = ms - lags[i];
      if (t < IN_MS || t > end) continue;
      const p = state.wisp(t);
      coin.x = p.x + offsets[i] * 0.6;
      coin.y = p.y + offsets[i];
      sprites[i].spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(ctx, sprites[i], coin.x, coin.y, COIN, transform);
    }
    endCoinBatch(ctx);
    drawWispBetween(
      ctx,
      state.wisp,
      ms,
      now,
      WISP,
      clamp01((ms - IN_MS) / (end - IN_MS)),
      IN_MS,
      end,
    );
    for (let k = 0; k < dips.length; k++) {
      const button = bars[dips[k].bar];
      blast.x = button.x - BTN_W / 2;
      blast.y = button.y;
      drawDetonation(
        ctx,
        blast,
        ms - dips[k].poured,
        dips[k].bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
