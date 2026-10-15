// Locusts, a floor crit: the number bursts into a flock of hundreds of
// glitter specks led by a few wisps that pours onto the top bar in view,
// spreads over it wheeling and a wave of it dives in with a jolt and levels;
// it lifts off and pours down onto the next bar, and the next, quicker each,
// wheeling faster; then it packs into a tight ball over its own bar, whirling
// flat out, and the whole flock slams into it in a huge blast
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
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";

const IN_MS = 130;
// the flock: COUNT specks, LEADS of them wisps
const COUNT = 200;
const LEADS = 3;
const SPECK = 18;
const LEAD = WISP_SIZE * 1.1;
// its moves: onto the first bar over FIRST_MS; over each bar DWELL_MS
// (quickening), spread ENGULF of its half width, sweeping SWEEP of it; HOP_MS
// on to the next; then over its own bar (ABOVE px up) packing to PACK px
const FIRST_MS = 220;
const DWELL_MS: [number, number] = [340, 160];
const HOP_MS: [number, number] = [170, 90];
const TRAVEL = 150;
const ENGULF = 0.85;
const SWEEP = 0.35;
const ABOVE = 240;
const RISE_MS = 200;
const PACK_MS = 380;
const PACK = 45;
const SPIN_HZ: [number, number] = [0.6, 3.6];
// the dives: a wave into each bar, WAVE of its dwell in, over WAVE_SPREAD_MS,
// WAVES_SHARE of the flock in all; each FLIGHT_MS
const WAVE = 0.45;
const WAVE_SPREAD_MS = 140;
const WAVES_SHARE = 0.55;
const FLIGHT_MS = 160;
const CLIMAX_SPREAD_MS = 70;
const BLAST = 150;
const OWN_BLAST = 440;
// shakes by step: a wave in, the whole flock in
const SHAKES = [0.7, 3.2];

interface State {
  // its own bar this frame: the path follows it as it scrolls
  live: { own: Point };
  swarm: Swarm;
  dives: Dives;
  // each wave's bar, then its own; and the live spots they dive onto
  order: number[];
  targets: Point[];
  arrivals: number[];
  waveHits: number[];
  climaxHit: number;
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();

registerFloorCrit("locustsCrit", {
  plan(r, bars, hit) {
    const own = bars[0];
    const half = r.play.barHalfWidth;
    const order = bars
      .map((_, i) => i)
      .filter((i) => i > 0)
      .sort((a, b) => bars[a].y - bars[b].y);
    const path: SwarmKey[] = [{ ms: IN_MS, x: -own.x, y: -own.y, r: 40 }];
    const waves: number[] = [];
    const arrivals: number[] = [];
    let t = IN_MS + FIRST_MS;
    order.forEach((bar, k) => {
      const u = k / Math.max(1, order.length - 1);
      const x = bars[bar].x - own.x;
      const y = bars[bar].y - own.y;
      const dwell = lerp(DWELL_MS[0], DWELL_MS[1], u);
      const dir = k % 2 ? -1 : 1;
      arrivals.push(t);
      path.push({ ms: t, x: x - dir * half * SWEEP, y, r: half * ENGULF });
      path.push({
        ms: t + dwell,
        x: x + dir * half * SWEEP,
        y,
        r: half * ENGULF,
      });
      waves.push(t + dwell * WAVE);
      t += dwell + lerp(HOP_MS[0], HOP_MS[1], u);
    });
    // over its own bar, packing tight
    arrivals.push(t);
    path.push({ ms: t, x: 0, y: -ABOVE, r: TRAVEL });
    path.push({ ms: t + RISE_MS + PACK_MS, x: 0, y: -ABOVE, r: PACK });
    const climax = t + RISE_MS + PACK_MS;
    const live = { own };
    const swarm = planSwarm(
      swarmPath(path, () => live.own),
      {
        count: COUNT,
        startMs: IN_MS,
        endMs: climax,
        spread: swarmSpread(path),
        spinHz: SPIN_HZ,
        lagMs: 140,
        squash: 0.55,
      },
    );
    const dives = planDives(
      swarm,
      waves,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      order.length ? WAVES_SHARE : 0,
    );
    diveRest(dives, order.length, climax, CLIMAX_SPREAD_MS);
    const waveHits = waves.map((w) => w + WAVE_SPREAD_MS / 2 + FLIGHT_MS);
    order.forEach((bar, k) => hit(bar, waveHits[k], 0));
    const climaxHit = climax + CLIMAX_SPREAD_MS + FLIGHT_MS;
    hit(0, climaxHit, 1);
    const leads = Array.from({ length: LEADS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < IN_MS || ms >= dives.startMs[i] ? null : swarmAt(swarm, i, ms, at);
    });
    const state: State = {
      live,
      swarm,
      dives,
      order,
      targets: [...order.map((bar) => bars[bar]), own],
      arrivals,
      waveHits,
      climaxHit,
      leads,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { order, targets, swarm, dives } = state;
    state.live.own = bars[0];
    for (let k = 0; k < order.length; k++) targets[k] = bars[order[k]];
    targets[order.length] = bars[0];
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p), {
        alpha: 1 - p,
      });
    }
    // a swoosh as it pours onto each bar
    while (r.kicked < state.arrivals.length && ms >= state.arrivals[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    drawSwarm(ctx, swarm, ms, SPECK, dives);
    drawDives(ctx, swarm, dives, targets, ms, SPECK);
    for (let i = 0; i < state.leads.length; i++)
      drawWispBetween(
        ctx,
        state.leads[i],
        ms,
        now,
        LEAD,
        0.7,
        IN_MS,
        dives.startMs[i] + 1,
      );
    for (let k = 0; k < order.length; k++)
      drawDetonation(ctx, targets[k], ms - state.waveHits[k], BLAST, now);
    drawDetonation(ctx, bars[0], ms - state.climaxHit, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
