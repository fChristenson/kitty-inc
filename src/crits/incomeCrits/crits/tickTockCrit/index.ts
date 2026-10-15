// Tick Tock, an income crit: the green amount drops under the total and
// shrinks into a time bomb counting down, throbbing at every beep with a
// tick and a jolt, the beeps closing up into a frantic rattle, the bomb
// trembling and swelling; it blows in the biggest blast, its shrapnel
// streaking up into the readout in a rattle of blasts, a share each, then
// the finale
import {
  DETONATION_MS,
  drawDetonation,
  drawTimeBomb,
  planTimeBomb,
  tickTimeBomb,
  type TimeBomb,
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

// the amount dropping to BELOW under the total, shrinking into the bomb
const DROP_MS = 200;
const BELOW = 420;
// the countdown: FUSE_MS, BEEPS beeps, the bomb BOMB px round
const FUSE_MS = 1700;
const BEEPS = 14;
const BOMB = 70;
const BLAST = 400;
// the shrapnel: SHARDS wisps up into the readout over SHARD_MS, SHARD_GAP_MS
// apart
const SHARDS = 10;
const SHARD_MS = 140;
const SHARD_GAP_MS = 40;
const SHARD = WISP_SIZE * 0.8;
const POP_BLAST = 120;
// shakes by step: a pop, the blast, the finale
const SHAKES = [0.5, 3, 2.6];

interface Shard {
  from: number;
  lands: number;
  to: Point;
  at: (ms: number) => Point | null;
}
interface Plan {
  bomb: TimeBomb;
  shards: Shard[];
  endMs: number;
}
const plans = new WeakMap<Running, Plan>();
const bombAt: Point = { x: 0, y: 0 };
// the total this frame: the shards read it
let total: Point = { x: 0, y: 0 };

registerFloorCrit("tickTockCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const bomb = planTimeBomb(DROP_MS, FUSE_MS, BEEPS);
    hit(0, bomb.blowMs, 1);
    const shards = Array.from({ length: SHARDS }, (_, k) => {
      const from = bomb.blowMs + k * SHARD_GAP_MS;
      const lands = from + SHARD_MS;
      const spot = readoutSpot(to, k, 3810);
      const dx = spot.x - to.x;
      const dy = spot.y - to.y;
      const at: Point = { x: 0, y: 0 };
      hit(0, lands, 0);
      return {
        from,
        lands,
        to: spot,
        at: (ms: number): Point | null => {
          if (ms < from || ms > lands) return null;
          const u = (ms - from) / SHARD_MS;
          at.x = total.x + dx * u;
          at.y = total.y + BELOW * (1 - u) + dy * u;
          return at;
        },
      };
    });
    const endMs = shards[SHARDS - 1].lands + 60;
    hit(0, endMs, 2);
    plans.set(r, { bomb, shards, endMs });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    total = to;
    bombAt.x = to.x;
    bombAt.y = to.y + BELOW;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, bombAt.x, p),
        lerp(0, bombAt.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    tickTimeBomb(plan.bomb, ms, r.shake);
    drawTimeBomb(ctx, plan.bomb, bombAt, ms, now, BOMB);
    drawDetonation(ctx, bombAt, ms - plan.bomb.blowMs, BLAST, now);
    for (const s of plan.shards) {
      drawWispBetween(ctx, s.at, ms, now, SHARD, 1, s.from, s.lands);
      drawDetonation(ctx, s.to, ms - s.lands, POP_BLAST, now);
    }
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
