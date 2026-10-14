// Starshot, a floor crit: the number swells into a tilted disk of stars
// turning round the middle of the screen; one clump after another gathers,
// its stars drifting off their own orbits onto one and bunching up, then
// slingshots off the way it's heading, swinging round onto a bar with a
// wisp at its head and a blast, quicker and quicker; then the whole rest of
// the disk sinks into its core and is flung onto its own bar at once
import { COLOR } from "../../../../palette";
import {
  drawStars,
  planDisk,
  scatterDisk,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const IN_MS = 160;
const GROW_MS = 320;
// the disk: STARS on it, INNER to OUTER px round, tilted
const STARS = 240;
const INNER = 50;
const OUTER = 360;
const SQUASH = 0.42;
const TILT = -0.2;
const RIM_HZ = 0.5;
const STAR = 18;
// the clumps: CLUMP stars each, gathering over DRIFT_MS (quicker each) from
// FIRST_MS, the next GAP_MS on (closing), bunched KNOT px and rad tight
const CLUMP = 22;
const FIRST_MS = IN_MS + GROW_MS + 120;
const DRIFT_MS: [number, number] = [380, 220];
const GAP_MS: [number, number] = [260, 120];
const KNOT = 22;
const KNOT_TURN = 0.12;
// the fling: off along its heading SLING px, swinging onto its bar over
// FLY_MS, landing JITTER px about its middle
const SLING = 240;
const FLY_MS = 280;
const JITTER = 70;
const FLUNG = 24;
const WISP = WISP_SIZE * 1.3;
const BLAST = 150;
// the rest of the disk: sinking into the core over SINK_MS, OWN_GAP_MS after
// the last clump flies, then flung onto its own bar
const OWN_GAP_MS = 100;
const SINK_MS = 420;
const CORE = 30;
const OWN_BLAST = 320;
// shakes by step: unused, a clump landing, its own
const SHAKES = [0.4, 1.1, 2.8];

interface Group {
  bar: number;
  driftMs: number;
  flingMs: number;
  // its lead star's flight, for the wisp at its head
  lead: number;
  wisp: (ms: number) => Point | null;
}
interface State {
  disk: Disk;
  stars: Orbit[];
  // each star's group and the orbit it gathers onto
  groupOf: Int16Array;
  to: Orbit[];
  groups: Group[];
  bars: Point[];
}
const states = new WeakMap<Running, State>();
const star: Point = { x: 0, y: 0 };
const launch: Point = { x: 0, y: 0 };

// where star i is at ms: on its orbit, drifting onto its group's, or flung
// along its heading onto its group's bar; null once it has landed
function starAt(
  state: State,
  i: number,
  ms: number,
  into: Point,
): Point | null {
  const { disk, stars, to, groups } = state;
  const group = groups[state.groupOf[i]];
  const grow = clamp01((ms - IN_MS) / GROW_MS);
  if (ms < group.driftMs) return disk.at(stars[i], ms, into, grow);
  if (ms < group.flingMs) {
    const u = (ms - group.driftMs) / (group.flingMs - group.driftMs);
    return disk.drift(stars[i], to[i], u * u * (3 - 2 * u), ms, into, grow);
  }
  const u = (ms - group.flingMs) / FLY_MS;
  if (u >= 1) return null;
  disk.drift(stars[i], to[i], 1, group.flingMs, launch);
  const heading = disk.heading(to[i], group.flingMs);
  const bar = state.bars[group.bar];
  const cx = launch.x + Math.cos(heading) * SLING;
  const cy = launch.y + Math.sin(heading) * SLING;
  const ex = bar.x + (holeHash(i, 2610) - 0.5) * 2 * JITTER;
  const ey = bar.y + (holeHash(i, 2611) - 0.5) * JITTER * 0.4;
  const e = u ** 1.4;
  const v = 1 - e;
  into.x = v * v * launch.x + 2 * v * e * cx + e * e * ex;
  into.y = v * v * launch.y + 2 * v * e * cy + e * e * ey;
  return into;
}

registerFloorCrit("starshotCrit", {
  plan(r, bars, hit) {
    const disk = planDisk(
      { x: 0, y: 0 },
      {
        inner: INNER,
        outer: OUTER,
        squash: SQUASH,
        tilt: TILT,
        rimHz: RIM_HZ,
      },
    );
    const stars = scatterDisk(disk, STARS);
    const others = bars
      .map((_, i) => i)
      .filter((bar) => bar !== 0)
      .sort((a, b) => holeHash(a, 2612) - holeHash(b, 2612));
    const groupOf = new Int16Array(STARS);
    const to: Orbit[] = [];
    const groups: Group[] = [];
    const state: State = { disk, stars, groupOf, to, groups, bars };
    let t = FIRST_MS;
    const addGroup = (
      bar: number,
      first: number,
      count: number,
      driftMs: number,
      gather: number,
      core: Orbit,
    ) => {
      const g = groups.length;
      const at: Point = { x: 0, y: 0 };
      const group: Group = {
        bar,
        driftMs,
        flingMs: driftMs + gather,
        lead: first,
        wisp: (ms) =>
          ms < group.flingMs ? null : starAt(state, group.lead, ms, at),
      };
      groups.push(group);
      for (let i = first; i < first + count; i++) {
        groupOf[i] = g;
        to[i] = {
          radius: core.radius + (holeHash(i, 2613) - 0.5) * KNOT,
          phase: core.phase + (holeHash(i, 2614) - 0.5) * KNOT_TURN,
        };
      }
      hit(bar, group.flingMs + FLY_MS, bar === 0 ? 2 : 1);
      return group;
    };
    others.forEach((bar, k) => {
      const u = k / Math.max(1, others.length - 1);
      const first = k * CLUMP;
      addGroup(
        bar,
        first,
        CLUMP,
        t,
        lerp(DRIFT_MS[0], DRIFT_MS[1], u),
        stars[first],
      );
      t += lerp(GAP_MS[0], GAP_MS[1], u);
    });
    const lastFling = groups.length
      ? groups[groups.length - 1].flingMs
      : FIRST_MS;
    const rest = others.length * CLUMP;
    addGroup(0, rest, STARS - rest, lastFling + OWN_GAP_MS, SINK_MS, {
      radius: CORE,
      phase: 0,
    });
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const { groups } = state;
    if (ms < groups[0].driftMs) {
      drawStars(
        ctx,
        state.disk,
        state.stars,
        ms,
        STAR,
        clamp01((ms - IN_MS) / GROW_MS),
      );
    } else {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < state.stars.length; i++) {
        if (!starAt(state, i, ms, star)) continue;
        const flung = ms >= groups[state.groupOf[i]].flingMs;
        stampGlimmer(
          ctx,
          star.x,
          star.y,
          flung ? FLUNG : STAR,
          i,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    for (const group of groups) {
      drawWispBetween(
        ctx,
        group.wisp,
        ms,
        now,
        group.bar === 0 ? WISP * 1.6 : WISP,
        0.6,
        group.flingMs,
        group.flingMs + FLY_MS,
      );
      drawDetonation(
        ctx,
        bars[group.bar],
        ms - group.flingMs - FLY_MS,
        group.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
