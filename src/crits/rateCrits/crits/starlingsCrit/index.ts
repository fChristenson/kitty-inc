// Starlings, a rate crit: the number bursts into a flock of hundreds of
// glitter specks that streams out in a long ribbon, its tail whipping after
// it, surging from bar to bar down the building through every readout,
// quicker each; at every readout a wave peels off and pours in with a jolt,
// the readout turning over; at its own bar the ribbon coils into a tight
// whirling ball and the whole flock slams into its readout: every bar pays
// half as much again for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
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
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
const COUNT = 200;
const LEADS = 3;
const SPECK = 17;
const LEAD = WISP_SIZE * 1.1;
// the ribbon: RIBBON px across, its tail LAG_MS behind; through each readout
// (READOUT of a bar's half width out) from SWING px off either side in turn,
// LEG_MS a bar (quickening)
const RIBBON = 70;
const LAG_MS = 420;
const READOUT = 0.6;
const SWING = 260;
const LEG_MS: [number, number] = [330, 150];
// coiling into PACK px over its own readout over COIL_MS
const COIL_MS = 340;
const PACK = 35;
const SPIN_HZ: [number, number] = [0.5, 3.5];
// a wave of WAVE_SHARE of the flock into each readout as it passes, over
// WAVE_SPREAD_MS; each dive FLIGHT_MS
const WAVES_SHARE = 0.5;
const WAVE_SPREAD_MS = 110;
const FLIGHT_MS = 130;
const CLIMAX_SPREAD_MS = 60;
const BLAST = 140;
const OWN_BLAST = 380;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 0.9, 3];

interface State {
  live: { own: Point };
  swarm: Swarm;
  dives: Dives;
  // each wave's bar (its own last) and its live readout
  order: number[];
  readouts: Point[];
  passes: number[];
  hits: number[];
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();

// a lifted bar: pays `payout` times as much till then
const lifted = defineBarEffect<number>({
  payout: () => meta.values.payout,
  ended: (until, now) => now >= until,
});

registerFloorCrit("starlingsCrit", {
  reward(t) {
    t.flipRate();
    lifted.set(t.floor, t.now + (t.own ? meta.values.ownMs : meta.values.ms));
    t.punch(`x${meta.values.payout} Payouts`);
  },
  plan(r, bars, hit) {
    const own = bars[0];
    const half = r.play.barHalfWidth;
    const order = ownLast(bars);
    const keys: SwarmKey[] = [{ ms: IN_MS, x: -own.x, y: -own.y, r: 40 }];
    const passes: number[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const u = k / Math.max(1, order.length - 1);
      t += lerp(LEG_MS[0], LEG_MS[1], u);
      const x = bars[bar].x - own.x + half * READOUT;
      const y = bars[bar].y - own.y;
      // swinging in from the side, through the readout
      keys.push({
        ms: t - 60,
        x: x + (k % 2 ? SWING : -SWING) * 0.4,
        y: y - 40,
        r: RIBBON,
      });
      keys.push({ ms: t, x, y, r: RIBBON });
      passes.push(t);
    });
    const coilAt = t;
    const climax = t + COIL_MS;
    keys.push({ ms: climax, x: half * READOUT, y: -160, r: PACK });
    const live = { own };
    const swarm = planSwarm(
      swarmPath(keys, () => live.own),
      {
        count: COUNT,
        startMs: IN_MS,
        endMs: climax,
        spread: swarmSpread(keys),
        spinHz: SPIN_HZ,
        lagMs: LAG_MS,
        squash: 0.8,
      },
    );
    // a wave into every other bar as the ribbon passes; its own takes the rest
    const others = passes.slice(0, -1);
    const dives = planDives(
      swarm,
      others,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      others.length ? WAVES_SHARE : 0,
    );
    diveRest(dives, order.length - 1, climax, CLIMAX_SPREAD_MS);
    const hits = order.map((bar, k) =>
      bar === 0
        ? climax + CLIMAX_SPREAD_MS + FLIGHT_MS
        : passes[k] + WAVE_SPREAD_MS / 2 + FLIGHT_MS,
    );
    order.forEach((bar, k) => hit(bar, hits[k], bar === 0 ? 2 : 1));
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
      readouts: order.map(() => ({ x: 0, y: 0 })),
      passes: [...passes.slice(0, -1), coilAt],
      hits,
      leads,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { order, readouts, swarm, dives } = state;
    state.live.own = bars[0];
    const half = r.play.barHalfWidth;
    for (let k = 0; k < order.length; k++) {
      readouts[k].x = bars[order[k]].x + half * READOUT;
      readouts[k].y = bars[order[k]].y;
    }
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p), {
        alpha: 1 - p,
      });
    }
    // a whoosh as it surges through each readout
    while (r.kicked < state.passes.length && ms >= state.passes[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    drawSwarm(ctx, swarm, ms, SPECK, dives);
    drawDives(ctx, swarm, dives, readouts, ms, SPECK);
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
        readouts[k],
        ms - state.hits[k],
        order[k] === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
