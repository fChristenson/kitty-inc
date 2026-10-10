// the beam splitter floor crit: the number flies up to a mirror over the roof
// and a beam from orbit slams into it, splitting into a fan of beams that
// sweeps across the building, blasts rattling wherever a beam crosses a bar
// in view; it swings back faster, then the fan snaps shut onto its own bar in
// one fat beam and a huge blast
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
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
import { otherBars, skyY } from "../../critPlayer/shared";

const BS_IN_MS = 220;
const BS_START_MS = BS_IN_MS + 60;
const BS_SWEEP_MS = 900;
const BS_SHUT_MS = 200;
const BS_RAYS = 5;
// the fan's half spread and how far its middle swings out (radians off
// straight down), and how often a beam crossing a bar blasts it
const BS_SPREAD = 0.42;
const BS_SWING = 0.38;
const BS_SAMPLE_MS = 120;
const BS_RAY_STAGGER_MS = 9;
const BS_HIT_EVERY = 3;
const BS_ABOVE = 420;
// the beams reach this far past the lowest bar
const BS_PAST = 600;
const BS_INPUT = 40;
const BS_INPUT_FLARE = 80;
const BS_RAY: [number, number] = [16, 34];
const BS_FAT = 120;
const BS_FADE_MS = 200;
const BS_SLAM_SHAKE = 1.2;
const BS_BLAST = 110;
const BS_BOOM = 440;
const BS_CLUSTER = [-0.5, 0.5, -1, 1];
const BS_CLUSTER_MS = 45;
const BS_CLUSTER_BLAST = 170;
const BS_KICKED_BOOM = 1e6;
// shakes by step: a blast where a beam crosses, its own bar
const BS_SHAKES = [0.3, 3];
const BS_TAIL_MS = 1000;
const BS_BOOM_MS = BS_START_MS + BS_SWEEP_MS + BS_SHUT_MS;

interface Crossing {
  bar: number;
  side: number;
  at: number;
}
const fans = new WeakMap<Running, Crossing[]>();

const mirror = { x: 0, y: 0 };
const mirrorPath = () => mirror;
function mirrorAt(r: Running, bars: Point[]): Point {
  mirror.x = bars[0].x;
  mirror.y = skyY(r, bars, BS_ABOVE);
  return mirror;
}

// beam k's angle off straight down: the fan swings out and back, quicker,
// then narrows onto its own bar
function rayAngle(k: number, ms: number): number {
  const u = clamp01((ms - BS_START_MS) / BS_SWEEP_MS);
  const shut = clamp01((ms - BS_START_MS - BS_SWEEP_MS) / BS_SHUT_MS);
  const swing = Math.sin(Math.PI * 2 * (u * 0.7 + u * u * 0.8));
  const spread = BS_SPREAD * (1 - shut * shut * (3 - 2 * shut));
  return BS_SWING * swing * (1 - shut) + (k / (BS_RAYS - 1) - 0.5) * 2 * spread;
}

function planCrossings(r: Running, bars: Point[]): Crossing[] {
  const m = mirrorAt(r, bars);
  const reach = r.play.barHalfWidth - 120;
  const crossings: Crossing[] = [];
  for (
    let t = BS_START_MS + BS_SAMPLE_MS / 2;
    t < BS_START_MS + BS_SWEEP_MS;
    t += BS_SAMPLE_MS
  )
    for (let k = 0; k < BS_RAYS; k++)
      for (const bar of otherBars(bars)) {
        const b = bars[bar];
        const x = m.x + Math.tan(rayAngle(k, t)) * (b.y - m.y);
        const side = (x - b.x) / reach;
        if (Math.abs(side) <= 1)
          crossings.push({ bar, side, at: t + k * BS_RAY_STAGGER_MS });
      }
  return crossings;
}

const top = { x: 0, y: 0 };
const end = { x: 0, y: 0 };

registerFloorCrit("beamSplitterCrit", {
  plan(r, bars, hit) {
    const crossings = planCrossings(r, bars);
    fans.set(r, crossings);
    // every crossing blasts, but only every few land a hit, so the bars'
    // levels don't churn every frame
    const seen = new Map<number, number>();
    for (const c of crossings) {
      const n = seen.get(c.bar) ?? 0;
      seen.set(c.bar, n + 1);
      if (n % BS_HIT_EVERY === 0) hit(c.bar, c.at, 0);
    }
    hit(0, BS_BOOM_MS, 1);
    BS_CLUSTER.forEach((_, k) =>
      hit(0, BS_BOOM_MS + (k + 1) * BS_CLUSTER_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const crossings = fans.get(r);
    if (!crossings) return;
    const now = r.startedAt + ms;
    const m = mirrorAt(r, bars);
    if (ms < BS_IN_MS) {
      const p = (ms / BS_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        m.x * p,
        m.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (r.kicked === 0 && ms >= BS_START_MS) {
      r.shake(BS_SLAM_SHAKE);
      r.kicked = 1;
    }
    if (ms >= BS_BOOM_MS && r.kicked < BS_KICKED_BOOM) {
      r.kicked = BS_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= BS_IN_MS && ms < BS_BOOM_MS + BS_FADE_MS)
      drawWisp(ctx, mirrorPath, ms, now, WISP_SIZE);
    if (ms >= BS_START_MS && ms < BS_BOOM_MS + BS_FADE_MS) {
      const fade = 1 - clamp01((ms - BS_BOOM_MS) / BS_FADE_MS);
      const shut = clamp01((ms - BS_START_MS - BS_SWEEP_MS) / BS_SHUT_MS);
      top.x = m.x;
      top.y = -r.viewportWidth * 1.5;
      drawBeam(ctx, top, m, BS_INPUT, fade);
      drawBeamFlare(ctx, m, BS_INPUT_FLARE, fade, now);
      let lowest = m.y;
      for (const b of bars) lowest = Math.max(lowest, b.y);
      const reach = lowest + BS_PAST - m.y;
      if (ms >= BS_BOOM_MS) drawBeam(ctx, m, bars[0], BS_FAT, fade);
      else
        for (let k = 0; k < BS_RAYS; k++) {
          const a = rayAngle(k, ms);
          end.x = m.x + Math.tan(a) * reach;
          end.y = m.y + reach;
          drawBeam(ctx, m, end, lerp(...BS_RAY, shut), fade);
        }
    }
    for (const c of crossings) {
      const since = ms - c.at;
      if (since < 0 || since >= 1000) continue;
      drawDetonation(ctx, along(r, bars, c.bar, c.side), since, BS_BLAST, now);
    }
    const t = ms - BS_BOOM_MS;
    drawDetonation(ctx, bars[0], t, BS_BOOM, now);
    for (let k = 0; k < BS_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, BS_CLUSTER[k]),
        t - (k + 1) * BS_CLUSTER_MS,
        BS_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: BS_TAIL_MS,
  shake: (step) => BS_SHAKES[step] ?? BS_SHAKES[0],
});
