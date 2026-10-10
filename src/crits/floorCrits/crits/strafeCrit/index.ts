// the strafe floor crit: the number shoots off the top and comes screaming
// back as a fighter, diving across the building on a steep diagonal, guns
// blazing, blasts rattling where its stream crosses each bar in view; it dives
// back the other way, crossing its own track in an X, then roars in low along
// its own bar strafing it end to end and a huge blast
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { groundY } from "../../critPlayer/shared";

const SF_IN_MS = 220;
// the two dives, a loop round between them, then the low run
const SF_DIVES_MS = [360, 300];
const SF_LOOP_MS = 140;
const SF_LOW_MS = 280;
// the dives come in from off the top (of the viewport's width over its middle)
// and out under the lowest bar, past the bars' ends by these
const SF_TOP = 1.1;
const SF_BELOW = 300;
const SF_PAST_RIGHT = 60;
const SF_PAST_LEFT = 80;
// the low run: over its own bar, from past one side of the screen to the other
const SF_LOW = 90;
const SF_LOW_REACH = 0.6;
const SF_FIGHTER = 1.4;
const SF_KICK = 0.6;
// its guns: a tracer streak ahead, flickering, and a muzzle flash a burst
const SF_TRACER = 180;
const SF_TRACER_W = 14;
const SF_TRACER_DROP = 60;
const SF_BURST_MS = 60;
const SF_FLICKER_MS = 30;
const SF_MUZZLE = 180;
// a dive's three blasts where it crosses a bar, apart along it
const SF_SPREAD = [-1, 0, 1];
const SF_SPREAD_MS = 35;
const SF_SPREAD_X = 60;
const SF_BAR_IN = 40;
const SF_BLAST = 130;
// the low run's blasts along its own bar
const SF_STRAFE = 8;
const SF_STRAFE_REACH = 0.9;
const SF_STRAFE_BLAST = 150;
const SF_BOOM_DELAY_MS = 60;
const SF_BOOM = 440;
const SF_CLUSTER = [-0.5, 0.5, -1, 1];
const SF_CLUSTER_MS = 45;
const SF_CLUSTER_BLAST = 170;
const SF_KICKED_BOOM = 1e6;
// shakes by step: a blast, the huge one
const SF_SHAKES = [0.4, 3];
const SF_TAIL_MS = 1000;

interface Pass {
  from: Point;
  to: Point;
  at: number;
  ms: number;
}
interface Blast {
  bar: number;
  // across from its bar's middle
  dx: number;
  at: number;
}
interface Run {
  passes: Pass[];
  blasts: Blast[];
  strafe: { side: number; at: number }[];
  boom: number;
}
const runs = new WeakMap<Running, Run>();

const fighterAt = (p: Pass, t: number): Point => {
  const u = clamp01((t - p.at) / p.ms);
  return { x: lerp(p.from.x, p.to.x, u), y: lerp(p.from.y, p.to.y, u) };
};

function planRun(r: Running, bars: Point[]): Run {
  const hw = r.play.barHalfWidth;
  const left = bars[0].x - hw - SF_PAST_LEFT;
  const right = bars[0].x + hw + SF_PAST_RIGHT;
  const top = -r.viewportWidth * SF_TOP;
  const bottom = groundY(r, bars, SF_BELOW);
  const firstAt = SF_IN_MS + 20;
  const secondAt = firstAt + SF_DIVES_MS[0] + SF_LOOP_MS;
  const lowAt = secondAt + SF_DIVES_MS[1] + SF_LOOP_MS;
  const lowY = bars[0].y - SF_LOW;
  const reach = r.viewportWidth * SF_LOW_REACH;
  const passes: Pass[] = [
    {
      from: { x: right, y: top },
      to: { x: left, y: bottom },
      at: firstAt,
      ms: SF_DIVES_MS[0],
    },
    {
      from: { x: left, y: top },
      to: { x: right, y: bottom },
      at: secondAt,
      ms: SF_DIVES_MS[1],
    },
    {
      from: { x: -reach, y: lowY },
      to: { x: reach, y: lowY },
      at: lowAt,
      ms: SF_LOW_MS,
    },
  ];
  // where each dive's stream crosses a bar, three blasts along it
  const blasts: Blast[] = [];
  for (const p of passes.slice(0, 2)) {
    const sign = Math.sign(p.to.x - p.from.x);
    bars.forEach((b, bar) => {
      const u = (b.y - p.from.y) / (p.to.y - p.from.y);
      if (u <= 0 || u >= 1) return;
      const x = lerp(p.from.x, p.to.x, u);
      if (Math.abs(x - b.x) > hw - SF_BAR_IN) return;
      for (const k of SF_SPREAD)
        blasts.push({
          bar,
          dx: x - b.x + k * SF_SPREAD_X * sign,
          at: p.at + u * p.ms + k * SF_SPREAD_MS,
        });
    });
  }
  const low = passes[2];
  const passing = (x: number) =>
    low.at + ((x - low.from.x) / (low.to.x - low.from.x)) * low.ms;
  const strafe = Array.from({ length: SF_STRAFE }, (_, k) => {
    const side = lerp(-SF_STRAFE_REACH, SF_STRAFE_REACH, k / (SF_STRAFE - 1));
    return { side, at: passing(bars[0].x + side * (hw - 120)) };
  });
  return {
    passes,
    blasts,
    strafe,
    boom: passing(bars[0].x + hw) + SF_BOOM_DELAY_MS,
  };
}

registerFloorCrit("strafeCrit", {
  plan(r, bars, hit) {
    const run = planRun(r, bars);
    runs.set(r, run);
    for (const b of run.blasts) hit(b.bar, b.at, 0);
    for (const s of run.strafe) hit(0, s.at, 0);
    hit(0, run.boom, 1);
    SF_CLUSTER.forEach((_, k) => hit(0, run.boom + (k + 1) * SF_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const run = runs.get(r);
    if (!run) return;
    const now = r.startedAt + ms;
    const { passes, blasts, strafe, boom } = run;
    if (ms < SF_IN_MS) {
      const p = (ms / SF_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        lerp(0, passes[0].from.y, p),
        lerp(r.flashFont, 0, p),
        { along: -Math.PI / 2, stretch: 1 + p },
      );
    }

    // a kick as each pass comes in, then the huge one's bang
    while (r.kicked < passes.length && passes[r.kicked].at <= ms) {
      r.shake(SF_KICK);
      r.kicked++;
    }
    if (ms >= boom && r.kicked < SF_KICKED_BOOM) {
      r.kicked = SF_KICKED_BOOM;
      playExplosion();
    }

    const low = passes[passes.length - 1];
    for (const p of passes) {
      drawWispBetween(
        ctx,
        (t) => fighterAt(p, t),
        ms,
        now,
        WISP_SIZE * SF_FIGHTER,
        1,
        p.at,
        p.at + p.ms,
      );
      if (ms < p.at || ms >= p.at + p.ms) continue;
      const at = fighterAt(p, ms);
      const dx = p.to.x - p.from.x;
      const dy = p.to.y - p.from.y;
      const len = Math.hypot(dx, dy);
      const flicker =
        0.5 + 0.5 * Math.abs(Math.sin(Math.floor(ms / SF_FLICKER_MS) * 7.3));
      drawBeam(
        ctx,
        at,
        {
          x: at.x + (dx / len) * SF_TRACER,
          y: at.y + (dy / len) * SF_TRACER + (p === low ? SF_TRACER_DROP : 0),
        },
        SF_TRACER_W,
        flicker,
      );
      drawMuzzleFlash(
        ctx,
        at,
        Math.atan2(dy, dx),
        ((ms - p.at) % SF_BURST_MS) / SF_BURST_MS,
        SF_MUZZLE,
      );
    }
    for (const b of blasts)
      drawDetonation(
        ctx,
        { x: bars[b.bar].x + b.dx, y: bars[b.bar].y },
        ms - b.at,
        SF_BLAST,
        now,
      );
    for (const s of strafe)
      drawDetonation(
        ctx,
        along(r, bars, 0, s.side),
        ms - s.at,
        SF_STRAFE_BLAST,
        now,
      );
    drawDetonation(ctx, bars[0], ms - boom, SF_BOOM, now);
    SF_CLUSTER.forEach((side, k) =>
      drawDetonation(
        ctx,
        along(r, bars, 0, side),
        ms - boom - (k + 1) * SF_CLUSTER_MS,
        SF_CLUSTER_BLAST,
        now,
      ),
    );
  },
  tailMs: SF_TAIL_MS,
  shake: (step) => SF_SHAKES[step] ?? SF_SHAKES[0],
});
