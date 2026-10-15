// Ring Dance, a button crit: the number bursts into streams of wisps that
// pour out beside every button and join hands in a ring, circling one spot
// faster and faster, the ring tightening and swaying, their trails whirling
// and the rumble rising; each ring spins to a blur, collapses into one bright
// wisp with a bang and it leaps into its button in a blast, the button
// turning over: each of its next taps also boosts every worker on the tapped
// floor; rippling down the buttons, quicker each, its own last and biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { activateBoosted } from "../../../../gameState";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playBloop, playSpinTick } from "../../../../sound";
import { BTN_W } from "../../../../floors/upgradeButton";
import { clickWorker, getRenderedWorkerCount } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// DANCERS wisps a ring (its own OWN_DANCERS), pouring out of the number
// POUR_STAGGER_MS apart, each flying POUR_MS on an ARC px hop; each button's
// stream RING_STAGGER_MS after the last
const DANCERS = 6;
const OWN_DANCERS = 7;
const POUR_STAGGER_MS = 22;
const POUR_MS = 200;
const ARC = 120;
const RING_STAGGER_MS = 25;
// the ring RADIUS px across (its own OWN_RADIUS), its middle GAP px clear of
// the button's left end; seen tilted (SQUASH as tall), closing to TIGHT of
// its size, swaying up to SWAY px and TILT, spinning up through SPIN_HZ
const RADIUS = 64;
const OWN_RADIUS = 86;
const GAP = 45;
const SQUASH = 0.5;
const TIGHT = 0.35;
const SWAY = 22;
const TILT = 0.35;
const SPIN_HZ: [number, number] = [0.7, 6.5];
// the first leap DANCE_MS in, each after it RIPPLE_MS on (quicker each), its
// own OWN_EXTRA_MS later still; each ring collapsing over COLLAPSE_MS before
// its leap, the bright wisp LEAP_MS into the button with a HOP px hop
const DANCE_MS = 1_100;
const RIPPLE_MS: [number, number] = [90, 50];
const OWN_EXTRA_MS = 120;
const COLLAPSE_MS = 170;
const LEAP_MS = 90;
const HOP = 40;
const TREMBLE = 10;
// hands: links WIDTH px wide between neighbours, brightening as it spins up
const HAND_WIDTH: [number, number] = [4, 11];
const HAND_ALPHA: [number, number] = [0.3, 0.85];
const DANCER: [number, number] = [0.55, 0.75];
const LEADER: [number, number] = [0.6, 1.3];
const OWN_LEADER = 1.7;
const GLOW = 150;
const POP = 90;
const BLAST = 170;
const OWN_BLAST = 380;
// shakes by step: the collapse, a button, its own
const SHAKES = [0.7, 1.2, 3];

interface Ring {
  bar: number;
  own: boolean;
  count: number;
  radius: number;
  pourMs: number;
  // its first dancer joining (the ring starts turning), its collapse, its
  // leap and its landing
  startMs: number;
  collapseMs: number;
  leapMs: number;
  landMs: number;
  // live: its middle and the button's left end; each dancer this frame
  hub: Point;
  end: Point;
  spots: Point[];
  dancers: ((ms: number) => Point | null)[];
  leader: (ms: number) => Point | null;
}
interface State {
  bars: Point[];
  rings: Ring[];
  charge: Charge;
  // the own ring's laps ticked
  laps: number;
}
const states = new WeakMap<Running, State>();
const hub: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// each tap also boosting every worker on the tapped floor, as if each was tapped
const pepTaps = defineTapPerk("Pep", (t) => {
  const now = Date.now();
  const count = getRenderedWorkerCount(t.floor);
  for (let i = 0; i < count; i++) {
    clickWorker(t.floor, i, now);
    activateBoosted(t.floor, i, now);
  }
  if (count > 0) playBloop();
});

// 0..1 through a ring's dance
function danceAt(ring: Ring, ms: number): number {
  return clamp01((ms - ring.startMs) / (ring.leapMs - ring.startMs));
}

// how far round a ring has turned, its spin rising with the square of time
function turnAt(ring: Ring, ms: number): number {
  const span = (ring.leapMs - ring.startMs) / 1000;
  const s = clamp01((ms - ring.startMs) / (ring.leapMs - ring.startMs)) * span;
  return (
    Math.PI *
    2 *
    (SPIN_HZ[0] * s +
      ((SPIN_HZ[1] - SPIN_HZ[0]) * s * s * s) / (3 * span * span))
  );
}

// a ring's middle at ms (live), swaying more as it spins up
function hubAt(state: State, ring: Ring, ms: number, out: Point): Point {
  const bar = state.bars[ring.bar];
  const u = danceAt(ring, ms);
  out.x =
    bar.x -
    BTN_W / 2 -
    GAP -
    ring.radius +
    SWAY * u * Math.sin(ms * 0.011 + ring.bar);
  out.y = bar.y + SWAY * 0.4 * u * Math.sin(ms * 0.017 + ring.bar * 2);
  return out;
}

// dancer j of a ring at ms, hand in hand round its tilted, tightening ring
function danceSpot(
  state: State,
  ring: Ring,
  j: number,
  ms: number,
  out: Point,
): Point {
  hubAt(state, ring, ms, hub);
  const u = danceAt(ring, ms);
  const collapse = clamp01((ms - ring.collapseMs) / COLLAPSE_MS);
  const r = ring.radius * lerp(1, TIGHT, u ** 1.4) * (1 - collapse * collapse);
  const a = turnAt(ring, ms) + (j / ring.count) * Math.PI * 2;
  const cos = Math.cos(a);
  const tilt = TILT * u * Math.sin(ms * 0.009 + ring.bar);
  out.x = hub.x + cos * r;
  out.y = hub.y + Math.sin(a) * r * SQUASH + cos * r * tilt;
  return out;
}

registerFloorCrit("ringDanceCrit", {
  reward(t) {
    pepTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const rings: Ring[] = [];
    const state: State = {
      bars,
      rings,
      charge: planCharge(0, 1),
      laps: 0,
    };
    let leap = IN_MS + DANCE_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const count = own ? OWN_DANCERS : DANCERS;
      const pourMs = IN_MS + k * RING_STAGGER_MS;
      const startMs = pourMs + POUR_MS;
      if (k > 0)
        leap += lerp(
          RIPPLE_MS[0],
          RIPPLE_MS[1],
          k / Math.max(1, order.length - 1),
        );
      const leapMs = own ? leap + OWN_EXTRA_MS : leap;
      const ring: Ring = {
        bar,
        own,
        count,
        radius: own ? OWN_RADIUS : RADIUS,
        pourMs,
        startMs,
        collapseMs: leapMs - COLLAPSE_MS,
        leapMs,
        landMs: leapMs + LEAP_MS,
        hub: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
        spots: [],
        dancers: [],
        leader: () => null,
      };
      for (let j = 0; j < count; j++) {
        const at: Point = { x: 0, y: 0 };
        const leave = pourMs + j * POUR_STAGGER_MS;
        ring.spots.push({ x: 0, y: 0 });
        // out of the number in a hop, snapping into its place in the ring
        ring.dancers.push((ms) => {
          if (ms < leave || ms >= leapMs) return null;
          danceSpot(state, ring, j, ms, at);
          const p = (ms - leave) / POUR_MS;
          if (p >= 1) return at;
          const e = p * p * (3 - 2 * p);
          at.x *= e;
          at.y = at.y * e - ARC * 4 * e * (1 - e);
          return at;
        });
      }
      const lead: Point = { x: 0, y: 0 };
      // the ring's light gathered at its middle, trembling, then leaping in
      ring.leader = (ms) => {
        if (ms < ring.collapseMs || ms > ring.landMs) return null;
        hubAt(state, ring, ms, lead);
        if (ms < leapMs) {
          trembleAt(
            clamp01((ms - ring.collapseMs) / COLLAPSE_MS),
            ms,
            TREMBLE,
            shiver,
          );
          lead.x += shiver.x;
          lead.y += shiver.y;
          return lead;
        }
        const u = ((ms - leapMs) / LEAP_MS) ** 2;
        const to = state.bars[bar];
        lead.x = lerp(lead.x, to.x - BTN_W / 2, u);
        lead.y = lerp(lead.y, to.y, u) - HOP * 4 * u * (1 - u);
        return lead;
      };
      rings.push(ring);
      hit(bar, leapMs, 0);
      hit(bar, ring.landMs, own ? 2 : 1);
    });
    const first = rings[0].startMs;
    state.charge = planCharge(first, rings[0].leapMs - first, {
      climaxShake: 1.2,
      bang: false,
    });
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { rings } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    tickCharge(state.charge, ms, r.shake);
    // a tick every half lap of its own ring, closing up as it spins up
    const own = rings[rings.length - 1];
    if (ms >= own.startMs && ms < own.leapMs) {
      const lap = Math.floor(turnAt(own, ms) / Math.PI);
      while (state.laps < lap) playSpinTick(1 + 0.12 * state.laps++);
    }
    for (let k = 0; k < rings.length; k++) {
      const ring = rings[k];
      hubAt(state, ring, ms, ring.hub);
      const bar = bars[ring.bar];
      ring.end.x = bar.x - BTN_W / 2;
      ring.end.y = bar.y;
      if (ms < ring.pourMs || ms > ring.landMs + DETONATION_MS) continue;
      const u = danceAt(ring, ms);
      const collapse = clamp01((ms - ring.collapseMs) / COLLAPSE_MS);
      if (ms < ring.leapMs) {
        drawChargeGlow(
          ctx,
          ring.hub,
          chargeAt(state.charge, ms) * (0.4 + 0.6 * u),
          GLOW * (ring.own ? 1.4 : 1),
          now,
        );
        // hands joined between neighbours that are in the ring
        let joined = 0;
        for (let j = 0; j < ring.count; j++) {
          if (ms < ring.pourMs + j * POUR_STAGGER_MS + POUR_MS) break;
          danceSpot(state, ring, j, ms, ring.spots[j]);
          joined++;
        }
        if (joined > 1) {
          const width = lerp(HAND_WIDTH[0], HAND_WIDTH[1], u);
          const alpha = lerp(HAND_ALPHA[0], HAND_ALPHA[1], u) * (1 - collapse);
          beginLightBatch(ctx);
          for (let j = 1; j < joined; j++)
            drawBeam(ctx, ring.spots[j - 1], ring.spots[j], width, alpha);
          if (joined === ring.count)
            drawBeam(ctx, ring.spots[joined - 1], ring.spots[0], width, alpha);
          endLightBatch(ctx);
        }
      }
      const size = WISP_SIZE * lerp(DANCER[0], DANCER[1], u);
      for (let j = 0; j < ring.count; j++)
        drawWispBetween(
          ctx,
          ring.dancers[j],
          ms,
          now,
          size,
          u,
          ring.pourMs + j * POUR_STAGGER_MS,
          ring.leapMs,
        );
      drawWispBetween(
        ctx,
        ring.leader,
        ms,
        now,
        WISP_SIZE *
          lerp(LEADER[0], LEADER[1], collapse) *
          (ring.own ? OWN_LEADER : 1),
        1,
        ring.collapseMs,
        ring.landMs,
      );
      drawDetonation(ctx, ring.hub, ms - ring.leapMs, POP, now);
      drawDetonation(
        ctx,
        ring.end,
        ms - ring.landMs,
        ring.own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
