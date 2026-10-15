// Ley Lines, a rate crit: a pen of light draws a magic circle flat under
// every bar's readout, one after another, quicker each, each its own look,
// and lines of light shoot from circle to circle, chaining them down the
// building to a bigger one under its own; the circles whip round faster and
// faster, every turn of its own a jolt, a tick and a throb down every line;
// then the first erupts in a pillar of light, a wisp tears down the line to
// the next and it erupts too, quicker and quicker down the chain, each a
// blast and its readout turning over, its own last and biggest: every bar
// surges, running faster and faster for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
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
// each circle RADIUS px round (its own OWN_RADIUS), under its readout
// (READOUT of a bar's half width out) by DOWN px, the next starting
// STAGGER_MS on (closing); the first erupting SPELL_MS after the last starts
const RADIUS = 120;
const OWN_RADIUS = 175;
const READOUT = 0.6;
const DOWN = 40;
const STAGGER_MS: [number, number] = [110, 60];
const SPELL_MS = 800;
const TURNS = 5;
const OWN_TURNS = 8;
// the chain erupting CHAIN_MS apart, closing
const CHAIN_MS: [number, number] = [190, 80];
// a line LINE px wide, shooting across in SHOOT_MS once both its circles'
// rims are drawn, throbbing THROB as wide on each of its own's turns
const RIM_MS = 240;
const SHOOT_MS = 110;
const LINE = 16;
const THROB = 2.2;
const THROB_MS = 140;
const FLARE = 3;
const FADE_MS = 220;
const RUNNER = WISP_SIZE * 1.2;
const PILLAR = 620;
const OWN_PILLAR = 960;
const BLAST = 150;
const OWN_BLAST = 360;
const REV_SHAKE = 0.5;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1.1, 3];

interface Circle {
  bar: number;
  own: boolean;
  summon: Summon;
  // its live spot
  at: Point;
}
interface State {
  circles: Circle[];
  // a line from circle k to k + 1: when it shoots, and its runner
  lines: number[];
  runners: ((ms: number) => Point)[];
  revs: number[];
}
const states = new WeakMap<Running, State>();
const tip: Point = { x: 0, y: 0 };

// a surging bar: from `from` it runs faster and faster, up to speed at `until`
const surges = defineBarEffect<{ from: number; until: number }>({
  speed: (s, now) =>
    1 + (meta.values.speed - 1) * clamp01((now - s.from) / (s.until - s.from)),
  ended: (s, now) => now >= s.until,
});

registerFloorCrit("leyLinesCrit", {
  reward(t) {
    t.flipRate();
    surges.set(t.floor, {
      from: t.now,
      until: t.now + (t.own ? meta.values.ownMs : meta.values.ms),
    });
    t.punch(`Surge to x${meta.values.speed}`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const n = order.length;
    const starts: number[] = [];
    let t = IN_MS;
    for (let k = 0; k < n; k++) {
      starts.push(t);
      t += lerp(STAGGER_MS[0], STAGGER_MS[1], k / Math.max(1, n - 1));
    }
    let erupt = starts[n - 1] + SPELL_MS;
    const circles: Circle[] = [];
    let revs: number[] = [];
    order.forEach((bar, k) => {
      const own = bar === 0;
      const summon = planSummon(
        starts[k],
        erupt,
        own ? OWN_TURNS : TURNS,
        summonLook(own ? 6 : k + 2),
      );
      if (own) revs = summon.revs;
      circles.push({ bar, own, summon, at: { x: 0, y: 0 } });
      hit(bar, erupt, own ? 2 : 1);
      erupt += lerp(CHAIN_MS[0], CHAIN_MS[1], k / Math.max(1, n - 2));
    });
    const lines: number[] = [];
    const runners: ((ms: number) => Point)[] = [];
    for (let k = 0; k + 1 < n; k++) {
      lines.push(starts[k + 1] + RIM_MS);
      const from = circles[k];
      const to = circles[k + 1];
      const at: Point = { x: 0, y: 0 };
      runners.push((ms) => {
        const u =
          clamp01(
            (ms - from.summon.eruptMs) /
              (to.summon.eruptMs - from.summon.eruptMs),
          ) ** 2;
        at.x = lerp(from.at.x, to.at.x, u);
        at.y = lerp(from.at.y, to.at.y, u);
        return at;
      });
    }
    states.set(r, { circles, lines, runners, revs });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { circles, lines, runners, revs } = state;
    const half = r.play.barHalfWidth;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    for (let k = 0; k < circles.length; k++) {
      const c = circles[k];
      const bar = bars[c.bar];
      c.at.x = bar.x + half * READOUT;
      c.at.y = bar.y + DOWN;
    }
    // a jolt, a tick and a throb down every line at each turn of its own
    while (r.kicked < revs.length && ms >= revs[r.kicked]) {
      r.shake(REV_SHAKE);
      playSpinTick(1 + r.kicked / revs.length);
      r.kicked++;
    }
    let since = Infinity;
    for (let k = revs.length - 1; k >= 0; k--)
      if (revs[k] <= ms) {
        since = ms - revs[k];
        break;
      }
    const throb = 1 + (THROB - 1) * Math.max(0, 1 - since / THROB_MS);
    for (let k = 0; k < lines.length; k++) {
      const from = circles[k];
      const to = circles[k + 1];
      if (ms < lines[k]) continue;
      // flaring as its runner tears down it, gone once the next erupts
      const fade = 1 - clamp01((ms - to.summon.eruptMs) / FADE_MS);
      if (fade <= 0) continue;
      const shoot = clamp01((ms - lines[k]) / SHOOT_MS);
      tip.x = lerp(from.at.x, to.at.x, shoot);
      tip.y = lerp(from.at.y, to.at.y, shoot);
      const flare = ms >= from.summon.eruptMs ? FLARE : throb;
      drawBeam(ctx, from.at, tip, LINE * flare, fade);
      drawWispBetween(
        ctx,
        runners[k],
        ms,
        now,
        RUNNER,
        1,
        from.summon.eruptMs,
        to.summon.eruptMs,
      );
    }
    for (let k = 0; k < circles.length; k++) {
      const c = circles[k];
      const radius = c.own ? OWN_RADIUS : RADIUS;
      drawSummon(ctx, c.summon, ms, c.at, radius);
      drawSummonPillar(
        ctx,
        c.summon,
        ms,
        c.at,
        radius,
        c.own ? OWN_PILLAR : PILLAR,
      );
      drawDetonation(
        ctx,
        c.at,
        ms - c.summon.eruptMs,
        c.own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
