// the ion cannon floor crit: the number shoots up off the top and a pillar of
// light slams down from orbit onto the top bar's end, then drags across it
// like a cutting torch, a blast every few steps; it drops to the bar below
// and cuts back the other way, quicker, zigzagging down the bars in view
// until it stops on the middle of its own, swells fat and a huge blast
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { ownLast, skyY } from "../../critPlayer/shared";

const IC_IN_MS = 220;
const IC_START_MS = IC_IN_MS + 60;
// each bar's cut, quickening down the building, and the slide between bars
const IC_CUT_MS: [number, number] = [260, 110];
const IC_DROP_MS = 70;
const IC_SWELL_MS = 180;
const IC_REACH = 0.9;
// a blast about this often along a cut
const IC_STEP_MS = 45;
const IC_ABOVE = 500;
const IC_WIDTH = 46;
const IC_FAT = 130;
const IC_LANDING = 1.6;
const IC_FLARE: [number, number] = [90, 200];
const IC_FADE_MS = 200;
const IC_SLAM_SHAKE = 1.2;
const IC_BLAST = 140;
const IC_BOOM = 440;
const IC_CLUSTER = [-0.5, 0.5, -1, 1];
const IC_CLUSTER_MS = 45;
const IC_CLUSTER_BLAST = 170;
const IC_KICKED_BOOM = 1e6;
// shakes by step: a blast along a cut, its own bar
const IC_SHAKES = [0.4, 3];
const IC_TAIL_MS = 1000;

interface Cut {
  bar: number;
  from: number;
  to: number;
  at: number;
  ms: number;
  // its blasts' places along the bar and times
  sides: number[];
  times: number[];
}
interface Cannon {
  cuts: Cut[];
  stop: number;
  boom: number;
}
const cannons = new WeakMap<Running, Cannon>();

function planCannon(bars: Point[]): Cannon {
  const order = ownLast(bars);
  let clock = IC_START_MS;
  const cuts = order.map((bar, i): Cut => {
    const at = clock + (i ? IC_DROP_MS : 0);
    const ms = lerp(...IC_CUT_MS, i / Math.max(1, order.length - 1));
    clock = at + ms;
    const from = i % 2 ? IC_REACH : -IC_REACH;
    const to = bar === 0 ? 0 : -from;
    const n = Math.max(2, Math.round(ms / IC_STEP_MS));
    const steps = Array.from({ length: n + 1 }, (_, k) => k / n);
    return {
      bar,
      from,
      to,
      at,
      ms,
      sides: steps.map((u) => lerp(from, to, u)),
      times: steps.map((u) => at + u * ms),
    };
  });
  return { cuts, stop: clock, boom: clock + IC_SWELL_MS };
}

// where the pillar's foot is at ms: along a cut, or sliding down between two
const foot = { x: 0, y: 0 };
function footAt(r: Running, bars: Point[], cuts: Cut[], ms: number): Point {
  for (let i = 0; i < cuts.length; i++) {
    const c = cuts[i];
    if (ms < c.at && i > 0) {
      const prev = cuts[i - 1];
      const a = along(r, bars, prev.bar, prev.to);
      const u = clamp01((ms - (c.at - IC_DROP_MS)) / IC_DROP_MS);
      foot.x = a.x;
      foot.y = lerp(a.y, bars[c.bar].y, u * u * (3 - 2 * u));
      return foot;
    }
    if (ms < c.at + c.ms || i === cuts.length - 1) {
      const a = along(
        r,
        bars,
        c.bar,
        lerp(c.from, c.to, clamp01((ms - c.at) / c.ms)),
      );
      foot.x = a.x;
      foot.y = a.y;
      return foot;
    }
  }
  return foot;
}

const sky = { x: 0, y: 0 };

registerFloorCrit("ionCannonCrit", {
  plan(r, bars, hit) {
    const cannon = planCannon(bars);
    cannons.set(r, cannon);
    for (const c of cannon.cuts) for (const at of c.times) hit(c.bar, at, 0);
    hit(0, cannon.boom, 1);
    IC_CLUSTER.forEach((_, k) =>
      hit(0, cannon.boom + (k + 1) * IC_CLUSTER_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const cannon = cannons.get(r);
    if (!cannon) return;
    const now = r.startedAt + ms;
    const { cuts, stop, boom } = cannon;
    if (ms < IC_IN_MS) {
      const p = (ms / IC_IN_MS) ** 2;
      const up = skyY(r, bars, IC_ABOVE);
      drawText(ctx, r.glyphs, r.label, 0, lerp(0, up, p), r.flashFont, {
        along: Math.PI / 2,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    if (r.kicked === 0 && ms >= IC_START_MS) {
      r.shake(IC_SLAM_SHAKE);
      r.kicked = 1;
    }
    if (ms >= boom && r.kicked < IC_KICKED_BOOM) {
      r.kicked = IC_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= IC_START_MS && ms < boom + IC_FADE_MS) {
      const at = footAt(r, bars, cuts, ms);
      const swell = clamp01((ms - stop) / IC_SWELL_MS);
      const fade = 1 - clamp01((ms - boom) / IC_FADE_MS);
      const landing = ms < IC_START_MS + 60 ? IC_LANDING : 1;
      sky.x = at.x;
      sky.y = -r.viewportWidth * 1.5;
      drawBeam(
        ctx,
        sky,
        at,
        lerp(IC_WIDTH, IC_FAT, swell * swell) * landing,
        fade,
      );
      drawBeamFlare(ctx, at, lerp(...IC_FLARE, swell), fade, now);
    }
    for (const c of cuts)
      for (let k = 0; k < c.times.length; k++) {
        const since = ms - c.times[k];
        if (since < 0 || since >= 1000) continue;
        drawDetonation(
          ctx,
          along(r, bars, c.bar, c.sides[k]),
          since,
          IC_BLAST,
          now,
        );
      }
    drawDetonation(ctx, bars[0], ms - boom, IC_BOOM, now);
    for (let k = 0; k < IC_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, IC_CLUSTER[k]),
        ms - boom - (k + 1) * IC_CLUSTER_MS,
        IC_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: IC_TAIL_MS,
  shake: (step) => IC_SHAKES[step] ?? IC_SHAKES[0],
});
