// Hot Button, a button crit: the number bursts into a tilted galaxy of
// glitter stars round a bright core, the inner ones whipping round; one by
// one, quicker each, a knot of stars is slung off along the disk onto a
// button, which glows hot, its next taps rolling crits more often; the core
// dives onto the crit's own last, the biggest
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const POP_MS = 90;
const POP_BLAST = 220;
const STARS = 220;
const SPREAD_MS = 200;
const FIRST_MS = POP_MS + SPREAD_MS + 260;
const GAP_MS: [number, number] = [170, 90];
const FLY_MS = 240;
// each star of a knot leaves a beat after the last, so it streams
const STREAM_MS = 90;
// the disk: over the flash's spot, seen tilted, arms winding out
const UP = 60;
const INNER = 70;
const OUTER = 400;
const SQUASH = 0.38;
const RIM_HZ = 0.9;
const ARMS = 3;
// a flung star leaves along its heading, then curves onto its button
const HEADING_PULL = 220;
const JITTER = 90;
const STAR = 24;
const FLUNG = 30;
const TWINKLE = 0.012;
const CORE = WISP_SIZE * 1.6;
const BLAST = 110;
const OWN_BLAST = 230;
const TAIL_MS = 900;

interface State {
  bars: Point[];
  disk: Disk;
  stars: Orbit[];
  // each star's knot (index into order), its start and its curve's pull
  knot: Uint8Array;
  from: Float32Array;
  pull: Float32Array;
  order: number[];
  releaseAt: number[];
  core: (ms: number) => Point;
  coreEnd: number;
}

const states = new WeakMap<Running, State>();
const star: Point = { x: 0, y: 0 };

const landsAt = (release: number, i: number) =>
  release + holeHash(i, 142) * STREAM_MS + FLY_MS;

registerFloorCrit("hotButtonCrit", {
  plan(r, bars, hit) {
    const centre = { x: 0, y: -UP };
    const disk = planDisk(centre, {
      inner: INNER,
      outer: OUTER,
      squash: SQUASH,
      rimHz: RIM_HZ,
    });
    const stars = scatterArms(disk, STARS, ARMS);
    const order = ownLast(bars);
    const releaseAt = [FIRST_MS];
    for (let k = 1; k < order.length; k++)
      releaseAt.push(
        releaseAt[k - 1] +
          lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, order.length - 1)),
      );
    const knot = new Uint8Array(STARS);
    const from = new Float32Array(STARS * 2);
    const pull = new Float32Array(STARS * 2);
    for (let i = 0; i < STARS; i++) {
      const k = Math.floor(holeHash(i, 141) * order.length);
      knot[i] = k;
      const leaves = landsAt(releaseAt[k], i) - FLY_MS;
      disk.at(stars[i], leaves, star);
      const heading = disk.heading(stars[i], leaves);
      from[i * 2] = star.x;
      from[i * 2 + 1] = star.y;
      pull[i * 2] = star.x + Math.cos(heading) * HEADING_PULL;
      pull[i * 2 + 1] = star.y + Math.sin(heading) * HEADING_PULL;
    }
    order.forEach((bar, k) =>
      hit(bar, releaseAt[k] + STREAM_MS + FLY_MS, bar === 0 ? 2 : 1),
    );
    hit(0, POP_MS, 0);
    const lastRelease = releaseAt[releaseAt.length - 1];
    const coreEnd = lastRelease + FLY_MS;
    const state: State = {
      bars,
      disk,
      stars,
      knot,
      from,
      pull,
      order,
      releaseAt,
      core: () => centre,
      coreEnd,
    };
    const spot: Point = { x: 0, y: 0 };
    // the core holds the middle, then dives onto the own button
    state.core = (ms) => {
      const u = clamp01((ms - lastRelease) / FLY_MS) ** 2;
      spot.x = lerp(centre.x, state.bars[0].x, u);
      spot.y = lerp(centre.y, state.bars[0].y, u);
      return spot;
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r)!;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { disk, stars, knot, from, pull, order, releaseAt } = state;
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, disk.center, ms - POP_MS, POP_BLAST, now);
    if (ms >= POP_MS && ms < state.coreEnd + STREAM_MS) {
      const grow = 1 - (1 - clamp01((ms - POP_MS) / SPREAD_MS)) ** 3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < STARS; i++) {
        const release = releaseAt[knot[i]];
        const leaves = landsAt(release, i) - FLY_MS;
        let size = STAR;
        if (ms < leaves) disk.at(stars[i], ms, star, grow);
        else {
          const u = (ms - leaves) / FLY_MS;
          if (u >= 1) continue;
          // from its spot, pulled along its heading, onto its button
          const to = bars[order[knot[i]]];
          const p = u * u;
          const q = 1 - p;
          const tx = to.x + (holeHash(i, 143) - 0.5) * JITTER;
          const ty = to.y + (holeHash(i, 144) - 0.5) * JITTER * 0.5;
          star.x = q * q * from[i * 2] + 2 * q * p * pull[i * 2] + p * p * tx;
          star.y =
            q * q * from[i * 2 + 1] + 2 * q * p * pull[i * 2 + 1] + p * p * ty;
          size = FLUNG;
        }
        stampGlimmer(
          ctx,
          star.x,
          star.y,
          size,
          i + ms * TWINKLE,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    drawWispBetween(ctx, state.core, ms, now, CORE, 1, POP_MS, state.coreEnd);
    for (let k = 0; k < order.length; k++)
      drawDetonation(
        ctx,
        bars[order[k]],
        ms - releaseAt[k] - STREAM_MS - FLY_MS,
        order[k] === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.4 : step === 1 ? 1 : 0.6),
});
