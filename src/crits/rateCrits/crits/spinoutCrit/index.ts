// Spinout, a rate crit: the number bursts into a tilted disk of stars whirling
// over every bar; the stars sink into each disk's core one after another,
// the inner ones first, a trickle turning into a flood, and the disks whirl
// faster and faster as they shrink (the inner orbits are quicker), a jolt
// with every wave, the cores swelling and blazing; then each core collapses
// and fires down into its bar, one after another, its own last and biggest,
// and the readout turns over: the bar runs flat out, easing back to normal
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { COLOR } from "../../../../palette";
import {
  planDisk,
  scatterDisk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import { drawChargeGlow } from "../../../../shared/animationStyles/charge";
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
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
const GROW_MS = 260;
// each disk: STARS (its own OWN_STARS) INNER to OUTER px round, UP px over
// its bar, seen tilted
const STARS = 40;
const OWN_STARS = 60;
const INNER = 24;
const OUTER = 170;
const UP = 170;
const SQUASH = 0.35;
const RIM_HZ = 0.55;
const STAR = 16;
// the stars sink in from SINK_MS, the last SPAN_MS on (a star's time share
// is its count share to PACE, so they flood in), each over DRIFT_MS onto the
// core, CORE px round; a jolt every WAVE stars
const SINK_MS = IN_MS + GROW_MS + 80;
const SPAN_MS = 820;
const PACE = 0.55;
const DRIFT_MS = 240;
const CORE = 6;
const WAVES = 6;
const WAVE_SHAKE: [number, number] = [0.25, 0.9];
const GLOW = 260;
// the cores collapsing and firing down into their bars: the first FIRE_GAP_MS
// after the last star sinks, each FIRE_STAGGER_MS after the one above, the
// shot taking SHOT_MS
const FIRE_GAP_MS = 90;
const FIRE_STAGGER_MS = 60;
const SHOT_MS = 130;
const WISP = WISP_SIZE * 1.4;
const BLAST = 160;
const OWN_BLAST = 320;
// shakes by step: unused, a bar, its own
const SHAKES = [0.4, 1.2, 2.8];

interface Star {
  bar: number;
  orbit: Orbit;
  core: Orbit;
  sinkMs: number;
}
interface Shot {
  bar: number;
  fireMs: number;
  at: (ms: number) => Point | null;
}
interface State {
  bars: Point[];
  stars: Star[];
  shots: Shot[];
  waves: number[];
}
const states = new WeakMap<Running, State>();
const DISK = planDisk(
  { x: 0, y: 0 },
  { inner: INNER, outer: OUTER, squash: SQUASH, rimHz: RIM_HZ },
);
const star: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };

// a surge: the bar runs `speed` times as fast, easing back to normal by `until`
const surges = defineBarEffect<{ from: number; until: number }>({
  speed: (s, now) =>
    1 + (meta.values.speed - 1) * clamp01((s.until - now) / (s.until - s.from)),
  ended: (s, now) => now >= s.until,
});

registerFloorCrit("spinoutCrit", {
  reward(t) {
    const { ms, ownMs } = meta.values;
    surges.set(t.floor, { from: t.now, until: t.now + (t.own ? ownMs : ms) });
  },
  plan(r, bars, hit) {
    const stars: Star[] = [];
    bars.forEach((_, bar) => {
      const orbits = scatterDisk(DISK, bar === 0 ? OWN_STARS : STARS).sort(
        (a, b) => a.radius - b.radius,
      );
      orbits.forEach((orbit, i) =>
        stars.push({
          bar,
          orbit,
          core: { radius: CORE, phase: orbit.phase },
          sinkMs: SINK_MS + SPAN_MS * (i / (orbits.length - 1)) ** PACE,
        }),
      );
    });
    const lastSink = SINK_MS + SPAN_MS + DRIFT_MS;
    const shots: Shot[] = ownLast(bars).map((bar, k) => {
      const fireMs = lastSink + FIRE_GAP_MS + k * FIRE_STAGGER_MS;
      const at: Point = { x: 0, y: 0 };
      hit(bar, fireMs + SHOT_MS, bar === 0 ? 2 : 1);
      return {
        bar,
        fireMs,
        at: (ms) => {
          if (ms < fireMs || ms > fireMs + SHOT_MS) return null;
          const b = state.bars[bar];
          at.x = b.x;
          at.y = b.y - UP * (1 - ((ms - fireMs) / SHOT_MS) ** 2);
          return at;
        },
      };
    });
    const state: State = {
      bars,
      stars,
      shots,
      waves: Array.from(
        { length: WAVES },
        (_, k) => SINK_MS + SPAN_MS * ((k + 1) / WAVES) ** PACE + DRIFT_MS,
      ),
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
      return;
    }
    // a jolt with every wave sunk, harder each
    while (r.kicked < WAVES && ms >= state.waves[r.kicked]) {
      r.shake(lerp(...WAVE_SHAKE, r.kicked / (WAVES - 1)));
      r.kicked++;
    }
    const grow = clamp01((ms - IN_MS) / GROW_MS);
    const sunk = clamp01((ms - SINK_MS) / (SPAN_MS + DRIFT_MS));
    // the cores swelling as they swallow
    for (const shot of state.shots) {
      if (ms >= shot.fireMs) continue;
      core.x = bars[shot.bar].x;
      core.y = bars[shot.bar].y - UP;
      drawChargeGlow(ctx, core, sunk, shot.bar === 0 ? GLOW * 1.3 : GLOW, now);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    const { stars } = state;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const u = (ms - s.sinkMs) / DRIFT_MS;
      if (u >= 1) continue;
      if (u <= 0) DISK.at(s.orbit, ms, star, grow);
      else DISK.drift(s.orbit, s.core, u * u, ms, star, grow);
      const bar = bars[s.bar];
      stampGlimmer(
        ctx,
        bar.x + star.x,
        bar.y - UP + star.y,
        STAR * (1 - 0.4 * Math.max(0, u)),
        i,
        i % 2 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.restore();
    for (const shot of state.shots) {
      drawWispBetween(
        ctx,
        shot.at,
        ms,
        now,
        shot.bar === 0 ? WISP * 1.5 : WISP,
        1,
        shot.fireMs,
        shot.fireMs + SHOT_MS,
      );
      drawDetonation(
        ctx,
        bars[shot.bar],
        ms - shot.fireMs - SHOT_MS,
        shot.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
