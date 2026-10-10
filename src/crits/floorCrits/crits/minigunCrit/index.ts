// the minigun floor crit: the number flies to the screen's side and spins up
// into a minigun, then hoses an unbroken stream of rounds that whips across
// the bars in view in quicker and quicker passes, blasts rattling along
// wherever it lands; then it locks onto its own bar, blasts stacking, and a
// huge blast
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const MG_IN_MS = 220;
// spinning up, then a round every MG_EVERY_MS, each a blast every other
const MG_FIRST_MS = MG_IN_MS + 120;
const MG_EVERY_MS = 20;
const MG_BLAST_EVERY = 2;
const MG_FLY_MS = 70;
// passes across a bar each, quicker each time, a flick between them
const MG_PASSES = 6;
const MG_PASS_MS: [number, number] = [190, 110];
const MG_FLICK_MS = 40;
const MG_REACH = 0.9;
// then held on its own bar, jittering round its middle
const MG_HOLD_MS = 260;
const MG_JITTER = 0.2;
// the gun: across from the middle (of the viewport's width), level with the
// bars' middle, rattling as it fires
const MG_GUN_X = 0.44;
const MG_GUN = 1.3;
const MG_RATTLE = 8;
const MG_STREAK_MS = 25;
const MG_STREAK = 16;
const MG_MUZZLE_MS = 60;
const MG_MUZZLE = 220;
const MG_BLAST = 100;
const MG_HOLD_BLAST = 130;
const MG_BOOM = 440;
const MG_CLUSTER = [-0.5, 0.5, -1, 1];
const MG_CLUSTER_MS = 45;
const MG_CLUSTER_BLAST = 170;
const MG_KICKED_BOOM = 1e6;
// shakes by step: a blast, the last one
const MG_SHAKES = [0.35, 3];
const MG_TAIL_MS = 1000;

// a spot along a bar
interface Spot {
  bar: number;
  side: number;
}
interface Round {
  fired: number;
  // where it's aimed: from a towards b, u of the way (a flick between bars)
  a: Spot;
  b: Spot;
  u: number;
  blast: number;
}
interface Hosing {
  rounds: Round[];
  end: number;
}
const hosings = new WeakMap<Running, Hosing>();

const landAt = (round: Round) => round.fired + MG_FLY_MS;

function planHosing(bars: Point[]): Hosing {
  const order = ownLast(bars);
  const others = order.length > 1 ? order.slice(0, -1) : order;
  // the bars it whips across, never the same one twice running
  const passes: {
    bar: number;
    from: number;
    to: number;
    at: number;
    ms: number;
  }[] = [];
  let clock = MG_FIRST_MS;
  let previous = -1;
  for (let k = 0; k < MG_PASSES; k++) {
    let pick = Math.floor(holeHash(k, 960) * others.length);
    if (others.length > 1 && others[pick] === previous)
      pick = (pick + 1) % others.length;
    previous = others[pick];
    const ms = lerp(...MG_PASS_MS, k / (MG_PASSES - 1));
    const from = k % 2 ? -MG_REACH : MG_REACH;
    passes.push({ bar: previous, from, to: -from, at: clock, ms });
    clock += ms + MG_FLICK_MS;
  }
  const lock = clock;
  const end = lock + MG_HOLD_MS;
  const aim = (t: number, i: number): Omit<Round, "fired" | "blast"> => {
    if (t >= lock) {
      const spot = {
        bar: 0,
        side: (holeHash(i, 961) * 2 - 1) * MG_JITTER,
      };
      return { a: spot, b: spot, u: 0 };
    }
    let last: Spot | null = null;
    for (const s of passes) {
      if (t < s.at) {
        const start = { bar: s.bar, side: s.from };
        if (!last) return { a: start, b: start, u: 0 };
        return {
          a: last,
          b: start,
          u: clamp01((t - (s.at - MG_FLICK_MS)) / MG_FLICK_MS),
        };
      }
      if (t < s.at + s.ms) {
        const spot = {
          bar: s.bar,
          side: lerp(s.from, s.to, (t - s.at) / s.ms),
        };
        return { a: spot, b: spot, u: 0 };
      }
      last = { bar: s.bar, side: s.to };
    }
    const own = { bar: 0, side: 0 };
    return {
      a: last ?? own,
      b: own,
      u: clamp01((t - (lock - MG_FLICK_MS)) / MG_FLICK_MS),
    };
  };
  const rounds: Round[] = [];
  for (let i = 0; MG_FIRST_MS + i * MG_EVERY_MS < end; i++) {
    const fired = MG_FIRST_MS + i * MG_EVERY_MS;
    const aimed = aim(fired, i);
    const onBar = aimed.u === 0 && aimed.a === aimed.b;
    rounds.push({
      fired,
      ...aimed,
      blast:
        onBar && i % MG_BLAST_EVERY === 0
          ? fired >= lock
            ? MG_HOLD_BLAST
            : MG_BLAST
          : 0,
    });
  }
  return { rounds, end };
}

const spotOf = (r: Running, bars: Point[], round: Round): Point => {
  const a = along(r, bars, round.a.bar, round.a.side);
  if (round.u === 0) return a;
  const b = along(r, bars, round.b.bar, round.b.side);
  return { x: lerp(a.x, b.x, round.u), y: lerp(a.y, b.y, round.u) };
};

registerFloorCrit("minigunCrit", {
  plan(r, bars, hit) {
    const hosing = planHosing(bars);
    hosings.set(r, hosing);
    for (const round of hosing.rounds)
      if (round.blast) hit(round.a.bar, landAt(round), 0);
    const boom = hosing.end + MG_FLY_MS;
    hit(0, boom, 1);
    MG_CLUSTER.forEach((_, k) => hit(0, boom + (k + 1) * MG_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const hosing = hosings.get(r);
    if (!hosing) return;
    const now = r.startedAt + ms;
    const { rounds, end } = hosing;
    const boom = end + MG_FLY_MS;
    const gun = {
      x: r.viewportWidth * MG_GUN_X,
      y: bars.reduce((sum, b) => sum + b.y, 0) / bars.length,
    };
    if (ms < MG_IN_MS) {
      const p = (ms / MG_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        gun.x * p,
        gun.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= boom && r.kicked < MG_KICKED_BOOM) {
      r.kicked = MG_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= MG_IN_MS && ms < boom)
      drawWisp(
        ctx,
        (t) => ({
          x:
            gun.x +
            (t >= MG_FIRST_MS && t < end
              ? (holeHash(Math.floor(t / MG_EVERY_MS), 962) - 0.5) *
                2 *
                MG_RATTLE
              : 0),
          y: gun.y,
        }),
        ms,
        now,
        WISP_SIZE * MG_GUN,
        clamp01((ms - MG_IN_MS) / (MG_FIRST_MS - MG_IN_MS)),
      );

    // the rounds in flight as streaks, the latest's muzzle flash
    const firing = Math.floor((ms - MG_FIRST_MS) / MG_EVERY_MS);
    for (
      let i = Math.max(0, firing - Math.ceil(MG_FLY_MS / MG_EVERY_MS));
      i <= firing && i < rounds.length;
      i++
    ) {
      const round = rounds[i];
      const t = ms - round.fired;
      if (t < 0 || t > MG_FLY_MS) continue;
      const to = spotOf(r, bars, round);
      const head = clamp01(t / MG_FLY_MS);
      const tail = clamp01((t - MG_STREAK_MS) / MG_FLY_MS);
      drawBeam(
        ctx,
        { x: lerp(gun.x, to.x, tail), y: lerp(gun.y, to.y, tail) },
        { x: lerp(gun.x, to.x, head), y: lerp(gun.y, to.y, head) },
        MG_STREAK,
        1,
      );
    }
    const latest = rounds[Math.min(firing, rounds.length - 1)];
    if (latest && firing >= 0 && ms < end) {
      const to = spotOf(r, bars, latest);
      drawMuzzleFlash(
        ctx,
        gun,
        Math.atan2(to.y - gun.y, to.x - gun.x),
        (ms - latest.fired) / MG_MUZZLE_MS,
        MG_MUZZLE,
      );
    }

    for (const round of rounds)
      if (round.blast)
        drawDetonation(
          ctx,
          spotOf(r, bars, round),
          ms - landAt(round),
          round.blast,
          now,
        );
    drawDetonation(ctx, bars[0], ms - boom, MG_BOOM, now);
    MG_CLUSTER.forEach((side, k) =>
      drawDetonation(
        ctx,
        along(r, bars, 0, side),
        ms - boom - (k + 1) * MG_CLUSTER_MS,
        MG_CLUSTER_BLAST,
        now,
      ),
    );
  },
  tailMs: MG_TAIL_MS,
  shake: (step) => MG_SHAKES[step] ?? MG_SHAKES[0],
});
