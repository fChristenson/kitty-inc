// Fender Bender, a button crit: the number bursts into a pair of wisps
// beside every button, circling one hub in opposite directions, faster and
// faster and tighter and tighter, a spark and a click every time they pass;
// then they crash head-on in a blast and the wreck darts into the button,
// which turns over: each of its next taps also levels the building's top and
// bottom floors; button by button, quicker each, its own last and biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the hub SIDE px left of a button's middle, the pair circling it RADIUS px
// out (SQUASH as tall), closing in to TIGHT of that
const SIDE = -(BTN_W / 2 + 90);
const RADIUS = 80;
const OWN_RADIUS = 105;
const SQUASH = 0.8;
const TIGHT = 0.3;
// each orbit ORBIT_MS long (quicker each, its own OWN_ORBIT_MS), LAPS laps
// speeding up as u^SPEED_UP, the next button starting STAGGER of the way in
const ORBIT_MS: [number, number] = [760, 500];
const OWN_ORBIT_MS = 940;
const LAPS = 3;
const OWN_LAPS = 4;
const SPEED_UP = 1.7;
const STAGGER = 0.45;
// the crash, then the wreck darting into the button
const DART_MS = 90;
const PASS_BLAST: [number, number] = [40, 75];
const PASS_SHAKE: [number, number] = [0.2, 0.5];
const CRASH_BLAST = 110;
const OWN_CRASH_BLAST = 170;
const LAND_BLAST = 80;
const OWN_LAND_BLAST = 140;
const WISP: [number, number] = [0.6, 1.1];
const TAIL_MS = 900;
// shakes by step: the crash, a button, its own
const SHAKES = [1.2, 0.8, 2];

interface Pair {
  bar: number;
  own: boolean;
  startMs: number;
  crashMs: number;
  lands: number;
  wisps: ((ms: number) => Point | null)[];
  dart: (ms: number) => Point | null;
}
interface Pass {
  bar: number;
  ms: number;
  // from the hub
  x: number;
  y: number;
  // 0..1 through its orbit
  u: number;
}
interface State {
  bars: Point[];
  pairs: Pair[];
  passes: Pass[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

// the building's lowest and highest floors that can still level
function ends(floors: Floor[]): Floor[] {
  const open = floors.filter((f) => f.unlocked && !isFloorMaxed(f));
  return open.length > 1 ? [open[0], open[open.length - 1]] : open;
}

// each tap also levelling the top and bottom floors
const crashTaps = defineTapPerk("Crash", (t) => {
  for (const floor of ends(t.floors)) t.levelUp(floor, 1, "+1 Lvl");
});

registerFloorCrit("fenderBenderCrit", {
  reward(t) {
    crashTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const state: State = { bars, pairs: [], passes: [] };
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const orbitMs = own
        ? OWN_ORBIT_MS
        : lerp(ORBIT_MS[0], ORBIT_MS[1], k / Math.max(1, order.length - 2));
      const laps = own ? OWN_LAPS : LAPS;
      const radius = own ? OWN_RADIUS : RADIUS;
      const startMs = t;
      const crashMs = startMs + orbitMs;
      const lands = crashMs + DART_MS;
      const turn = (u: number) => Math.PI * 2 * laps * u ** SPEED_UP;
      const reach = (u: number) => radius * lerp(1, TIGHT, u * u);
      // one wisp from the right going round, the other from the left back
      const wisps = [1, -1].map((dir) => {
        const at: Point = { x: 0, y: 0 };
        return (ms: number): Point | null => {
          if (ms < startMs || ms > crashMs) return null;
          const u = (ms - startMs) / orbitMs;
          const a = dir > 0 ? turn(u) : Math.PI - turn(u);
          const hub = state.bars[bar];
          const out = reach(u) * (1 - Math.max(0, (u - 0.94) / 0.06));
          at.x = hub.x + SIDE + Math.cos(a) * out;
          at.y = hub.y + Math.sin(a) * out * SQUASH;
          return at;
        };
      });
      // they pass where the turn is a quarter or three quarters round
      for (let n = 0; ; n++) {
        const a = Math.PI / 2 + n * Math.PI;
        if (a >= turn(1)) break;
        const u = (a / turn(1)) ** (1 / SPEED_UP);
        state.passes.push({
          bar,
          ms: startMs + u * orbitMs,
          x: Math.cos(a) * reach(u),
          y: Math.sin(a) * reach(u) * SQUASH,
          u,
        });
      }
      const dartAt: Point = { x: 0, y: 0 };
      const dart = (ms: number): Point | null => {
        if (ms < crashMs || ms > lands) return null;
        const u = (ms - crashMs) / DART_MS;
        const to = state.bars[bar];
        dartAt.x = to.x + SIDE * (1 - u);
        dartAt.y = to.y;
        return dartAt;
      };
      state.pairs.push({ bar, own, startMs, crashMs, lands, wisps, dart });
      hit(bar, crashMs, 0);
      hit(bar, lands, own ? 2 : 1);
      t += orbitMs * STAGGER;
    });
    state.passes.sort((a, b) => a.ms - b.ms);
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
    // a click and a jolt at every pass, harder as the orbit tightens
    while (r.kicked < state.passes.length && ms >= state.passes[r.kicked].ms) {
      const pass = state.passes[r.kicked++];
      r.shake(lerp(PASS_SHAKE[0], PASS_SHAKE[1], pass.u));
      playSpinTick(1 + pass.u);
    }
    for (const pass of state.passes) {
      const hub = bars[pass.bar];
      spot.x = hub.x + SIDE + pass.x;
      spot.y = hub.y + pass.y;
      drawDetonation(
        ctx,
        spot,
        ms - pass.ms,
        lerp(PASS_BLAST[0], PASS_BLAST[1], pass.u),
        now,
      );
    }
    for (const pair of state.pairs) {
      const u = Math.max(
        0,
        (ms - pair.startMs) / (pair.crashMs - pair.startMs),
      );
      const size = WISP_SIZE * lerp(WISP[0], WISP[1], Math.min(1, u));
      drawWispBetween(
        ctx,
        pair.wisps[0],
        ms,
        now,
        size,
        u,
        pair.startMs,
        pair.crashMs,
      );
      drawWispBetween(
        ctx,
        pair.wisps[1],
        ms,
        now,
        size,
        u,
        pair.startMs,
        pair.crashMs,
      );
      drawWispBetween(
        ctx,
        pair.dart,
        ms,
        now,
        size * 1.3,
        1,
        pair.crashMs,
        pair.lands,
      );
      const hub = bars[pair.bar];
      spot.x = hub.x + SIDE;
      spot.y = hub.y;
      drawDetonation(
        ctx,
        spot,
        ms - pair.crashMs,
        pair.own ? OWN_CRASH_BLAST : CRASH_BLAST,
        now,
      );
      drawDetonation(
        ctx,
        hub,
        ms - pair.lands,
        pair.own ? OWN_LAND_BLAST : LAND_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
