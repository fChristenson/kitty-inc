// Hive Mind, an income crit: the green amount bursts into a flock of
// hundreds of glitter specks that streams up to the total and spreads into a
// flat whirling vortex round the readout, wheeling faster and faster; waves
// of it peel off and pour into the readout, quicker and quicker, a pop and a
// share each; then the whole vortex crushes inward into a tight ball and
// drives into the readout at once, then the finale
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
// up to BELOW under the total over UP_MS, spreading into the vortex RING
// px round over SPREAD_MS; crushing in to PACK px over PACK_MS
const UP_MS = 220;
const BELOW = 160;
const SPREAD_MS = 180;
const RING = 380;
const PACK = 40;
const PACK_MS = 260;
const SPIN_HZ: [number, number] = [0.8, 5];
// the waves: WAVES from FIRST_MS, GAPS_MS apart (closing), WAVES_SHARE of the
// flock in all, each WAVE_SPREAD_MS wide; each dive FLIGHT_MS
const WAVES = 8;
const FIRST_MS = IN_MS + UP_MS + SPREAD_MS + 120;
const GAPS_MS: [number, number] = [220, 70];
const WAVES_SHARE = 0.5;
const WAVE_SPREAD_MS = 90;
const FLIGHT_MS = 140;
const CLIMAX_SPREAD_MS = 60;
const POP = 110;
const IN_BLAST = 260;
const FINALE_GAP_MS = 100;
// shakes by step: a wave in, the flock in, the finale
const SHAKES = [0.5, 1.8, 2.6];

interface State {
  live: { to: Point };
  swarm: Swarm;
  dives: Dives;
  // where each wave lands on the readout, then the total
  spots: Point[];
  waveHits: number[];
  inMs: number;
  endMs: number;
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();

registerFloorCrit("hiveMindCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const waves: number[] = [];
    let t = FIRST_MS;
    for (let k = 0; k < WAVES; k++) {
      waves.push(t);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (WAVES - 1));
    }
    const climax = t;
    const keys: SwarmKey[] = [
      { ms: IN_MS, x: -to.x, y: -to.y, r: 40 },
      { ms: IN_MS + UP_MS, x: 0, y: BELOW, r: 160 },
      { ms: IN_MS + UP_MS + SPREAD_MS, x: 0, y: 0, r: RING },
      { ms: climax - PACK_MS, x: 0, y: 0, r: RING },
      { ms: climax, x: 0, y: 0, r: PACK },
    ];
    const live = { to };
    const swarm = planSwarm(
      swarmPath(keys, () => live.to),
      {
        count: COUNT,
        startMs: IN_MS,
        endMs: climax,
        spread: swarmSpread(keys),
        spinHz: SPIN_HZ,
        lagMs: 120,
        squash: 0.24,
      },
    );
    const dives = planDives(
      swarm,
      waves,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      WAVES_SHARE,
    );
    diveRest(dives, WAVES, climax, CLIMAX_SPREAD_MS);
    const waveHits = waves.map((w) => w + WAVE_SPREAD_MS / 2 + FLIGHT_MS);
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
      spots: [...waves.map((_, k) => readoutSpot(to, k, 4210)), to],
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
    state.spots[WAVES] = to;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p), {
        alpha: 1 - p,
      });
    }
    const { swarm, dives } = state;
    drawSwarm(ctx, swarm, ms, SPECK, dives);
    drawDives(ctx, swarm, dives, state.spots, ms, SPECK);
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
    for (let k = 0; k < WAVES; k++)
      drawDetonation(ctx, state.spots[k], ms - state.waveHits[k], POP, now);
    drawDetonation(ctx, to, ms - state.inMs, IN_BLAST, now);
    drawFinale(ctx, to, ms - state.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
