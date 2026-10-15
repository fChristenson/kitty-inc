// Gnats, a lock crit: the number arcs onto the dark locked floor and bursts
// into a flock of hundreds of glitter specks that fills the room, wheeling
// round the lock faster and faster; waves of it batter the lock, each a
// jolt and a pop, closer and closer together; then the flock packs into a
// tight whirling ball on the lock and the whole of it slams in, bursting
// the floor open in the biggest blast; its new bar is levelled
import meta from "./meta";
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
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 170;
const ARC_RISE = 120;
const COUNT = 200;
const LEADS = 3;
const SPECK = 18;
const LEAD = WISP_SIZE * 1.1;
// filling the room to FILL of its half width over FILL_MS, then packing to
// PACK px over PACK_MS
const FILL_MS = 220;
const FILL = 0.85;
const PACK = 40;
const PACK_MS = 320;
const SPIN_HZ: [number, number] = [0.6, 4.5];
// the waves: WAVES from FIRST_MS, GAPS_MS apart (closing), WAVES_SHARE of the
// flock in all, each WAVE_SPREAD_MS wide; each dive FLIGHT_MS
const WAVES = 6;
const FIRST_MS = ARC_MS + FILL_MS + 120;
const GAPS_MS: [number, number] = [240, 80];
const WAVES_SHARE = 0.45;
const WAVE_SPREAD_MS = 90;
const FLIGHT_MS = 140;
const CLIMAX_SPREAD_MS = 60;
const POP = 110;
const OPEN_BLAST = 420;
const REWARD_GAP_MS = 280;
const REWARD_BLAST = 220;
// shakes by step: a wave in, the floor bursting open, the levels
const SHAKES = [0.6, 3.2, 1.2];

interface State {
  swarm: Swarm;
  dives: Dives;
  // the lock (every target), from the lock's middle
  targets: Point[];
  waveHits: number[];
  openAt: number;
  rewardAt: number;
  bar: Point;
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("gnatsCrit", {
  reward(t) {
    t.levelUp(t.count * meta.values.levels);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const fill = ((FLOOR_X_MAX - FLOOR_X_MIN) / 2) * FILL;
    const waves: number[] = [];
    let t = FIRST_MS;
    for (let k = 0; k < WAVES; k++) {
      waves.push(t);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (WAVES - 1));
    }
    const climax = t + PACK_MS;
    // from the lock's middle (the crit draws round it)
    const keys: SwarmKey[] = [
      { ms: ARC_MS, x: 0, y: 0, r: 40 },
      { ms: ARC_MS + FILL_MS, x: mid, y: 0, r: fill },
      { ms: t, x: mid, y: 0, r: fill },
      { ms: climax, x: 0, y: 0, r: PACK },
    ];
    const swarm = planSwarm(swarmPath(keys), {
      count: COUNT,
      startMs: ARC_MS,
      endMs: climax,
      spread: swarmSpread(keys),
      spinHz: SPIN_HZ,
      lagMs: 120,
      squash: 0.45,
    });
    const dives = planDives(
      swarm,
      waves,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      WAVES_SHARE,
    );
    diveRest(dives, 0, climax, CLIMAX_SPREAD_MS);
    const waveHits = waves.map((w) => w + WAVE_SPREAD_MS / 2 + FLIGHT_MS);
    for (const at of waveHits) hit(0, at, 0);
    const openAt = climax + CLIMAX_SPREAD_MS + FLIGHT_MS;
    const rewardAt = openAt + REWARD_GAP_MS;
    hit(0, openAt, 1);
    hit(0, rewardAt, 2);
    const box = getIncomeBarBox(false);
    const leads = Array.from({ length: LEADS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < ARC_MS || ms >= dives.startMs[i]
          ? null
          : swarmAt(swarm, i, ms, at);
    });
    states.set(r, {
      swarm,
      dives,
      targets: waves.map(() => ORIGIN),
      waveHits,
      openAt,
      rewardAt,
      bar: {
        x: box.x + box.width / 2 - lock.x,
        y: box.y + box.height / 2 - lock.y,
      },
      leads,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
    }
    const { swarm, dives } = state;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    drawSwarm(ctx, swarm, ms, SPECK, dives);
    drawDives(ctx, swarm, dives, state.targets, ms, SPECK);
    for (let i = 0; i < state.leads.length; i++)
      drawWispBetween(
        ctx,
        state.leads[i],
        ms,
        now,
        LEAD,
        0.8,
        ARC_MS,
        dives.startMs[i] + 1,
      );
    for (let k = 0; k < WAVES; k++)
      drawDetonation(ctx, ORIGIN, ms - state.waveHits[k], POP, now);
    drawDetonation(ctx, ORIGIN, ms - state.openAt, OPEN_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.rewardAt, REWARD_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
