// Deep Bore, a button crit: drills swing up under every button at once and
// bite their bottoms together, stalling and juddering in a rumble; then they
// bore in like engine pistons, one after another round the buttons, faster
// and faster, sparks gushing; they punch through together, a jet of sparks
// shooting up from each: its next taps also level the floor above
import { defineTapPerk } from "../../buttonBonus";
import { CONFIG } from "../../../../config";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  drawDrillHead,
  drawDrillSpray,
} from "../../../../shared/animationStyles/drill";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { WISP_SIZE } from "../../../../shared/wisp";
import { BTN_H } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
const UP = -Math.PI / 2;
// the drills rise RISE px over RISE_MS to UNDER px below the buttons, bite,
// stall STALL_MS, then shove SHOVE px in at a time, ROUNDS rounds of the
// buttons, a shove every SHOVE_GAP ms (for SHOVE_BUTTONS buttons; quicker
// with more), then punch through
const RISE_MS = 160;
const RISE = 200;
const UNDER = 40;
const STALL_MS = 380;
const STALL_JOLTS = [0, 120, 240];
const STALL_SHAKE = 0.5;
const ROUNDS = 5;
const SHOVE = 14;
const SHOVE_MS = 50;
const SHOVE_GAP: [number, number] = [150, 45];
const SHOVE_BUTTONS = 4;
const SHOVE_SHAKE: [number, number] = [0.25, 0.7];
const THROUGH_GAP = 120;
const HEAD = 85;
const OWN_HEAD = 100;
const SPIN = 0.04;
const JUDDER = 7;
const BORE_JUDDER = 3;
const SPRAY = 1;
const SPRAY_GROW = 0.6;
const SPARK = WISP_SIZE * 0.9;
// each drill's spray: full while they stall, then BORE_SPRAY between shoves
// and a gush of SHOVE_SPRAY on each, fading over SHOVE_SPRAY_MS; all of them
// together held to SPRAY_BUDGET drills' worth
const BORE_SPRAY = 0.3;
const SHOVE_SPRAY = 1.2;
const SHOVE_SPRAY_MS = 120;
const SPRAY_BUDGET = 2;
const FADE_MS = 250;
const PUNCH_MS = 180;
// the jet of sparks up off each button once through
const JET_MS = 300;
const JET_RISE_MS = 120;
const JET_REACH = 260;
const JET = 60;
const BLAST = 130;
const OWN_BLAST = 220;
const TAIL_MS = 900;
// shakes by step: a jolt, through a button, through its own
const SHAKES = [0.3, 1.2, 2.6];

interface State {
  bars: number[];
  bite: number;
  // each shove's drill (its place in bars) and when it lands, in order
  shoves: { drill: number; at: number }[];
  through: number;
  jolts: { at: number; power: number }[];
  // each drill's depth and spray this frame, by its place in bars
  depth: number[];
  spray: number[];
}
const states = new WeakMap<Running, State>();
const tip: Point = { x: 0, y: 0 };
const jetFrom: Point = { x: 0, y: 0 };
const jetTo: Point = { x: 0, y: 0 };

// each tap levelling the floor above too
const boreTaps = defineTapPerk("Bore", (t) => {
  const above = t.floors[t.floors.indexOf(t.floor) + 1];
  if (above) t.levelUp(above, 1, "+1 Lvl");
});

registerFloorCrit("deepBoreCrit", {
  // boring taps, twice as many on its own
  reward(t) {
    const taps = Math.max(1, Math.round(t.count * CONFIG.crit.deepBoreTaps));
    boreTaps.add(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const bite = IN_MS + RISE_MS;
    const quicker = Math.min(1, SHOVE_BUTTONS / order.length);
    const total = ROUNDS * order.length;
    const shoves: State["shoves"] = [];
    const jolts: State["jolts"] = STALL_JOLTS.map((d) => ({
      at: bite + d,
      power: STALL_SHAKE,
    }));
    let t = bite + STALL_MS;
    for (let round = 0; round < ROUNDS; round++)
      for (let drill = 0; drill < order.length; drill++) {
        const k = shoves.length / total;
        shoves.push({ drill, at: t });
        jolts.push({ at: t, power: lerp(SHOVE_SHAKE[0], SHOVE_SHAKE[1], k) });
        t += lerp(SHOVE_GAP[0], SHOVE_GAP[1], k) * quicker;
      }
    const through = t + THROUGH_GAP;
    for (const bar of order) hit(bar, through, bar === 0 ? 2 : 1);
    states.set(r, {
      bars: order,
      bite,
      shoves,
      through,
      jolts,
      depth: order.map(() => 0),
      spray: order.map(() => 0),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    while (r.kicked < state.jolts.length && ms >= state.jolts[r.kicked].at)
      r.shake(state.jolts[r.kicked++].power);
    const { bite, through, depth, spray } = state;
    const fade = 1 - clamp01((ms - through) / FADE_MS);
    const punch = clamp01((ms - through) / PUNCH_MS);
    const rise = clamp01((ms - IN_MS) / RISE_MS);
    const grow = SPRAY + SPRAY_GROW * clamp01((ms - bite) / (through - bite));
    const stalling = ms < bite + STALL_MS;
    // each drill's depth and its spray: a gush on every shove
    depth.fill(0);
    spray.fill(stalling ? 1 : BORE_SPRAY);
    for (const s of state.shoves) {
      if (ms < s.at) break;
      const k = s.drill;
      depth[k] += SHOVE * clamp01((ms - s.at) / SHOVE_MS);
      if (!stalling)
        spray[k] = Math.max(
          spray[k],
          BORE_SPRAY + SHOVE_SPRAY * Math.exp(-(ms - s.at) / SHOVE_SPRAY_MS),
        );
    }
    let total = 0;
    for (const s of spray) total += s;
    const budget = Math.min(1, SPRAY_BUDGET / total) * grow * fade;
    for (let k = 0; k < state.bars.length; k++) {
      const bar = state.bars[k];
      const button = bars[bar];
      const own = bar === 0;
      if (ms >= IN_MS && fade > 0) {
        const judder =
          ms >= through
            ? 0
            : (stalling ? JUDDER : BORE_JUDDER) * Math.sin(ms * 0.9 + bar * 2);
        tip.x = button.x + judder;
        tip.y =
          button.y +
          BTN_H / 2 +
          UNDER -
          depth[k] +
          (1 - rise) * RISE -
          BTN_H * punch;
        drawDrillHead(
          ctx,
          tip,
          UP,
          own ? OWN_HEAD : HEAD,
          ms * SPIN,
          now,
          fade,
        );
        if (ms >= bite)
          drawDrillSpray(
            ctx,
            tip,
            UP,
            ms - bite,
            spray[k] * budget,
            SPARK,
            now,
          );
      }
      const jet = ms - through;
      if (jet >= 0 && jet < JET_MS) {
        jetFrom.x = jetTo.x = button.x;
        jetFrom.y = button.y - BTN_H / 2;
        jetTo.y = jetFrom.y - JET_REACH * clamp01(jet / JET_RISE_MS);
        drawBeam(ctx, jetFrom, jetTo, JET, 1 - jet / JET_MS);
      }
      drawDetonation(ctx, button, jet, own ? OWN_BLAST : BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
