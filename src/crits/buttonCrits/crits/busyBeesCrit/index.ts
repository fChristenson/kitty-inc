// Busy Bees, a button crit: the number bursts into a swarm of hundreds of
// glitter specks and a few lead wisps that swoops down beside the top
// button, a wave peeling off and pouring into its end in a pop, the button
// turning over; it surges on down to the next and the next, quicker each;
// then it wheels round beside its own button, packs into a tight whirling
// ball and the whole swarm drives in: each of their next taps also hires a
// worker on the top floor
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import {
  diveRest,
  drawDives,
  drawSwarm,
  planDives,
  planSwarm,
  swarmAt,
  swarmPath,
  swarmSpread,
  type Dives,
  type Swarm,
  type SwarmKey,
} from "../../../../shared/animationStyles/swarm";
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
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 120;
const COUNT = 200;
const LEADS = 3;
const SPECK = 17;
const LEAD = WISP_SIZE * 1.1;
// beside each button OFF px off its left end, RADIUS px round, LEG_MS from
// one to the next (quickening); wheeling round beside its own over WHEEL_MS
// and packing to PACK px over PACK_MS
const OFF = 190;
const RADIUS = 90;
const LEG_MS: [number, number] = [260, 120];
const WHEEL_MS = 240;
const PACK = 35;
const PACK_MS = 200;
const SPIN_HZ: [number, number] = [0.6, 4];
// a wave of WAVES_SHARE of the swarm in all into the buttons it passes,
// WAVE_SPREAD_MS wide, each dive FLIGHT_MS
const WAVES_SHARE = 0.5;
const WAVE_SPREAD_MS = 80;
const FLIGHT_MS = 110;
const CLIMAX_SPREAD_MS = 60;
const POP = 140;
const OWN_BLAST = 380;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1, 3];

interface State {
  live: { own: Point };
  swarm: Swarm;
  dives: Dives;
  // the buttons it pours into, its own last, and their ends, live
  order: number[];
  ends: Point[];
  passes: number[];
  hits: number[];
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();

// the top floor that's open
function topFloor(floors: Floor[]): Floor | null {
  for (let i = floors.length - 1; i >= 0; i--)
    if (floors[i].unlocked) return floors[i];
  return null;
}

// each tap also hiring on the top floor
const buzzTaps = defineTapPerk("Buzz", (t) => {
  const floor = topFloor(t.floors);
  if (floor) t.hire(floor);
});

registerFloorCrit("busyBeesCrit", {
  reward(t) {
    buzzTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const own = bars[0];
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[p].y - bars[q].y);
    const keys: SwarmKey[] = [{ ms: IN_MS, x: -own.x, y: -own.y, r: 40 }];
    const passes: number[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      t += lerp(LEG_MS[0], LEG_MS[1], k / Math.max(1, order.length - 1));
      keys.push({
        ms: t,
        x: bars[bar].x - own.x - BTN_W / 2 - OFF,
        y: bars[bar].y - own.y,
        r: RADIUS,
      });
      passes.push(t);
    });
    const wheel = t + WHEEL_MS;
    keys.push({ ms: wheel, x: -BTN_W / 2 - OFF, y: 0, r: RADIUS });
    const climax = wheel + PACK_MS;
    keys.push({ ms: climax, x: -BTN_W / 2 - OFF * 0.7, y: 0, r: PACK });
    const live = { own };
    const swarm = planSwarm(
      swarmPath(keys, () => live.own),
      {
        count: COUNT,
        startMs: IN_MS,
        endMs: climax,
        spread: swarmSpread(keys),
        spinHz: SPIN_HZ,
        lagMs: 140,
        squash: 0.7,
      },
    );
    const dives = planDives(
      swarm,
      passes,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      passes.length ? WAVES_SHARE : 0,
    );
    diveRest(dives, order.length, climax, CLIMAX_SPREAD_MS);
    const hits = passes.map((p) => p + WAVE_SPREAD_MS / 2 + FLIGHT_MS);
    order.forEach((bar, k) => hit(bar, hits[k], 1));
    const ownHit = climax + CLIMAX_SPREAD_MS + FLIGHT_MS;
    hits.push(ownHit);
    hit(0, ownHit, 2);
    order.push(0);
    const leads = Array.from({ length: LEADS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < IN_MS || ms >= dives.startMs[i] ? null : swarmAt(swarm, i, ms, at);
    });
    states.set(r, {
      live,
      swarm,
      dives,
      order,
      ends: order.map(() => ({ x: 0, y: 0 })),
      passes,
      hits,
      leads,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { order, ends, swarm, dives } = state;
    state.live.own = bars[0];
    for (let k = 0; k < order.length; k++) {
      ends[k].x = bars[order[k]].x - BTN_W / 2;
      ends[k].y = bars[order[k]].y;
    }
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p), {
        alpha: 1 - p,
      });
    }
    // a whoosh as it swoops onto each button
    while (r.kicked < state.passes.length && ms >= state.passes[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    drawSwarm(ctx, swarm, ms, SPECK, dives);
    drawDives(ctx, swarm, dives, ends, ms, SPECK);
    for (let i = 0; i < state.leads.length; i++)
      drawWispBetween(
        ctx,
        state.leads[i],
        ms,
        now,
        LEAD,
        0.8,
        IN_MS,
        dives.startMs[i] + 1,
      );
    for (let k = 0; k < order.length; k++)
      drawDetonation(
        ctx,
        ends[k],
        ms - state.hits[k],
        order[k] === 0 ? OWN_BLAST : POP,
        now,
      );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
