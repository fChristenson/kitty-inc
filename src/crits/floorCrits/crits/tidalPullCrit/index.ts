// Tidal Pull, a floor crit: the number bursts into two tilted galaxies of
// stars turning opposite ways, one high on the left and one low on the
// right, that fall towards each other, faster and faster; as they close,
// their tides tear stars off the near rims, one after another, quicker and
// quicker, each slung off the way it was heading and swinging round onto a
// bar in a blast with levels; then they merge in the middle with a jolt, the
// whole crowd collapsing into one core that bursts and dives onto its own
// bar in a huge blast
import {
  drawStars,
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { bezier } from "../../../../shared/curves";
import { stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";

const IN_MS = 180;
const GROW_MS = 260;
// the galaxies: SIDE of the screen's width out and RISE above and below the
// bars' middle, falling together over FALL_MS
const SIDE = 0.28;
const RISE = 380;
const FALL_MS = 1500;
const INNER = 30;
const OUTER = 200;
const STARS = 50;
const STAR = 16;
// the flings: one a bar, from FIRST_MS on, GAPS_MS apart (closing); each
// star slung SLING px along its heading, swinging onto its bar over FLING_MS
const FIRST_MS = IN_MS + 420;
const GAPS_MS: [number, number] = [320, 140];
const SLING = 300;
const FLING_MS = 300;
const FLUNG = WISP_SIZE * 0.9;
const FLING_BLAST = 120;
// merged: collapsing to COLLAPSE of its size over COLLAPSE_MS, then bursting
// onto its own bar over DIVE_MS
const COLLAPSE_MS = 260;
const COLLAPSE = 0.12;
const DIVE_MS = 200;
const CORE = WISP_SIZE * 2.2;
const BURST_BLAST = 220;
const OWN_BLAST = 420;
const MERGE_SHAKE = 1.2;
// shakes by step: a star in, its own
const SHAKES = [0.6, 3];

interface Fling {
  bar: number;
  disk: number;
  orbit: Orbit;
  from: number;
  lands: number;
  at: (ms: number) => Point | null;
}
interface State {
  bars: Point[];
  disks: Disk[];
  // each disk's crowd, where its middle starts, and where they meet
  crowds: Orbit[][];
  starts: Point[];
  meet: Point;
  flings: Fling[];
  mergeMs: number;
  burstMs: number;
  landMs: number;
  core: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const star: Point = { x: 0, y: 0 };

// the disks' middles at ms, falling together faster and faster
function placeDisks(state: State, ms: number): void {
  const u = clamp01((ms - IN_MS) / FALL_MS) ** 2;
  for (let k = 0; k < 2; k++) {
    const c = state.disks[k].center;
    c.x = lerp(state.starts[k].x, state.meet.x, u);
    c.y = lerp(state.starts[k].y, state.meet.y, u);
  }
}

registerFloorCrit("tidalPullCrit", {
  plan(r, bars, hit) {
    let mid = 0;
    for (const bar of bars) mid += bar.y / bars.length;
    const side = r.viewportWidth * SIDE;
    const starts = [
      { x: -side, y: mid - RISE },
      { x: side, y: mid + RISE },
    ];
    const meet = { x: 0, y: mid };
    const disks = [
      planDisk(
        { ...starts[0] },
        { inner: INNER, outer: OUTER, squash: 0.5, tilt: 0.4, spin: 1 },
      ),
      planDisk(
        { ...starts[1] },
        { inner: INNER, outer: OUTER, squash: 0.55, tilt: -0.5, spin: -1 },
      ),
    ];
    const mergeMs = IN_MS + FALL_MS;
    const state: State = {
      bars,
      disks,
      crowds: disks.map((disk) => scatterArms(disk, STARS)),
      starts,
      meet,
      flings: [],
      mergeMs,
      burstMs: mergeMs + COLLAPSE_MS,
      landMs: mergeMs + COLLAPSE_MS + DIVE_MS,
      core: () => null,
    };
    // the stars torn off, each from the rim nearest the other galaxy
    const targets: number[] = [];
    for (let bar = 1; bar < bars.length; bar++) targets.push(bar);
    let t = FIRST_MS;
    targets.forEach((bar, k) => {
      const from = Math.min(t, mergeMs - 60);
      const which = k % 2;
      const disk = disks[which];
      placeDisks(state, from);
      const toward = Math.atan2(meet.y - disk.center.y, meet.x - disk.center.x);
      // an orbit that's at the near rim as it's torn off
      const orbit: Orbit = { radius: OUTER * 0.95, phase: 0 };
      orbit.phase = toward - disk.omega(orbit.radius) * from;
      const start = disk.at(orbit, from, { x: 0, y: 0 });
      const heading = disk.heading(orbit, from);
      const via = {
        x: start.x + Math.cos(heading) * SLING,
        y: start.y + Math.sin(heading) * SLING,
      };
      const lands = from + FLING_MS;
      const spot: Point = { x: 0, y: 0 };
      state.flings.push({
        bar,
        disk: which,
        orbit,
        from,
        lands,
        at: (ms) => {
          if (ms < from || ms > lands) return null;
          return bezier(
            start,
            via,
            state.bars[bar],
            (ms - from) / FLING_MS,
            spot,
          );
        },
      });
      hit(bar, lands, 0);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / Math.max(1, targets.length - 1));
    });
    const coreAt: Point = { x: 0, y: 0 };
    state.core = (ms) => {
      if (ms < state.burstMs || ms > state.landMs) return null;
      const u = ((ms - state.burstMs) / DIVE_MS) ** 2;
      const own = state.bars[0];
      coreAt.x = lerp(meet.x, own.x, u);
      coreAt.y = lerp(meet.y, own.y, u);
      return coreAt;
    };
    hit(0, state.landMs, 1);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.7 * p), {
        alpha: 1 - p,
      });
    }
    if (ms >= state.mergeMs && r.kicked === 0) {
      r.kicked = 1;
      r.shake(MERGE_SHAKE);
      playSwoosh();
    }
    placeDisks(state, ms);
    if (ms >= IN_MS && ms < state.burstMs) {
      const grow =
        Math.min(1, (ms - IN_MS) / GROW_MS) *
        lerp(1, COLLAPSE, clamp01((ms - state.mergeMs) / COLLAPSE_MS) ** 2);
      for (let k = 0; k < 2; k++)
        drawStars(ctx, state.disks[k], state.crowds[k], ms, STAR, grow);
      // the stars about to be torn off, on their orbits till then
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (const f of state.flings) {
        if (ms >= f.from) continue;
        state.disks[f.disk].at(f.orbit, ms, star, grow);
        stampGlimmer(ctx, star.x, star.y, STAR * 1.4, f.bar, COLOR.white);
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    for (const f of state.flings) {
      drawWispBetween(ctx, f.at, ms, now, FLUNG, 0.8, f.from, f.lands);
      drawDetonation(ctx, bars[f.bar], ms - f.lands, FLING_BLAST, now);
    }
    drawDetonation(ctx, state.meet, ms - state.burstMs, BURST_BLAST, now);
    drawWispBetween(
      ctx,
      state.core,
      ms,
      now,
      CORE,
      1,
      state.burstMs,
      state.landMs,
    );
    drawDetonation(ctx, bars[0], ms - state.landMs, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
