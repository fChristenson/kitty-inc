// Swing Shift, an income crit: the green amount bursts into a flock of
// hundreds of glitter specks that swoops out to one side of the screen
// under the total and swings across to the other and back, like a pendulum,
// wider and quicker each pass, its tail whipping after it; every time it
// swings through under the readout a wave peels off and pours up into it,
// a pop and a share; then it packs into a tight ball dead under the total
// and the whole flock drives in, then the finale
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
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

const IN_MS = 120;
const COUNT = 220;
const LEADS = 3;
const SPECK = 18;
const LEAD = WISP_SIZE * 1.1;
// the swings: SWINGS passes BELOW px under the total, out to EDGE px off
// the screen's sides (from REACH of the way), dipping DIP px at the middle,
// LEG_MS a swing (quickening); the flock RADIUS px round, packing to PACK
const SWINGS = 7;
const BELOW = 330;
const EDGE = 140;
const REACH = 0.6;
const DIP = 120;
const LEG_MS: [number, number] = [280, 130];
const RADIUS = 110;
const PACK = 40;
const PACK_MS = 220;
const SPIN_HZ: [number, number] = [0.8, 4];
// a wave of WAVES_SHARE of the flock in all at every pass, WAVE_SPREAD_MS
// wide, each dive FLIGHT_MS
const WAVES_SHARE = 0.5;
const WAVE_SPREAD_MS = 70;
const FLIGHT_MS = 120;
const CLIMAX_SPREAD_MS = 60;
const POP = 120;
const IN_BLAST = 260;
const FINALE_GAP_MS = 90;
// shakes by step: a wave in, the flock in, the finale
const SHAKES = [0.6, 1.8, 2.6];

interface State {
  live: { to: Point };
  swarm: Swarm;
  dives: Dives;
  passes: number[];
  spots: Point[];
  waveHits: number[];
  inMs: number;
  endMs: number;
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();

registerFloorCrit("swingShiftCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const side = r.viewportWidth / 2 - EDGE;
    const keys: SwarmKey[] = [
      { ms: IN_MS, x: -to.x, y: -to.y, r: 40 },
      { ms: IN_MS + 200, x: -side * REACH - to.x, y: BELOW, r: RADIUS },
    ];
    const passes: number[] = [];
    let t = IN_MS + 200;
    for (let k = 0; k < SWINGS; k++) {
      const leg = lerp(LEG_MS[0], LEG_MS[1], k / (SWINGS - 1));
      const out = lerp(REACH, 1, (k + 1) / SWINGS) * side;
      const x = (k % 2 ? -out : out) - to.x;
      // through the middle low, then out to the side
      keys.push({ ms: t + leg / 2, x: 0, y: BELOW + DIP, r: RADIUS * 0.8 });
      keys.push({ ms: t + leg, x, y: BELOW, r: RADIUS });
      passes.push(t + leg / 2);
      t += leg;
    }
    const climax = t + PACK_MS;
    keys.push({ ms: climax, x: 0, y: BELOW, r: PACK });
    const live = { to };
    const swarm = planSwarm(swarmPath(keys, () => live.to), {
      count: COUNT,
      startMs: IN_MS,
      endMs: climax,
      spread: swarmSpread(keys),
      spinHz: SPIN_HZ,
      lagMs: 160,
      squash: 0.6,
    });
    const dives = planDives(swarm, passes, WAVE_SPREAD_MS, FLIGHT_MS, WAVES_SHARE);
    diveRest(dives, SWINGS, climax, CLIMAX_SPREAD_MS);
    const waveHits = passes.map((p) => p + WAVE_SPREAD_MS / 2 + FLIGHT_MS);
    for (const at of waveHits) hit(0, at);
    const inMs = climax + CLIMAX_SPREAD_MS + FLIGHT_MS;
    hit(0, inMs, 1);
    const endMs = inMs + FINALE_GAP_MS;
    hit(0, endMs, 2);
    const leads = Array.from({ length: LEADS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < IN_MS || ms >= dives.startMs[i] ? null : swarmAt(swarm, i, ms, at);
    });
    states.set(r, {
      live,
      swarm,
      dives,
      passes,
      spots: [...passes.map((_, k) => readoutSpot(to, k, 4610)), to],
      waveHits,
      inMs,
      endMs,
      leads,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    state.live.to = to;
    state.spots[SWINGS] = to;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p), {
        alpha: 1 - p,
      });
    }
    // a whoosh as it swings through the middle
    while (r.kicked < state.passes.length && ms >= state.passes[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    const { swarm, dives } = state;
    drawSwarm(ctx, swarm, ms, SPECK, dives);
    drawDives(ctx, swarm, dives, state.spots, ms, SPECK);
    for (let i = 0; i < state.leads.length; i++)
      drawWispBetween(ctx, state.leads[i], ms, now, LEAD, 0.8, IN_MS, dives.startMs[i] + 1);
    for (let k = 0; k < SWINGS; k++)
      drawDetonation(ctx, state.spots[k], ms - state.waveHits[k], POP, now);
    drawDetonation(ctx, to, ms - state.inMs, IN_BLAST, now);
    drawFinale(ctx, to, ms - state.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
