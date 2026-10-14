// Link Up, a button crit: the number dives onto its own button; aim lasers
// flicker out of it onto every other button in view and lock on as beams one
// by one, quicker each, each linked button lit; the own button taps itself
// and pulses race down the beams, then it slams: its next taps each land a
// level on every linked button too
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";

// the number's arc onto its own button
const DIVE_MS = 180;
const DIVE_RISE = 140;
const DIVE_BLAST = 120;
// each aim flickers AIM_MS, then locks; the next starts sooner each time
const FIRST_AIM_MS = DIVE_MS + 60;
const AIM_MS = 120;
const AIM_GAP_MS: [number, number] = [150, 90];
const BEAM = 26;
const LOCK_BEAM = 80;
const LOCK_FADE_MS = 120;
const FLARE = 50;
const LOCK_BLAST = 110;
// the own button tapping itself, pulses racing down the beams
const TAP_DELAY_MS = 220;
const TAPS_MS = [0, 220, 380];
const PULSE_MS = 120;
const PULSE_BEAM = 40;
const TAP_BLAST = 60;
const PULSE_BLAST = 70;
const SLAM_GAP_MS = 200;
const SLAM_BLAST = 220;
const TAIL_MS = 900;

interface State {
  bars: Point[];
  // the other buttons nearest first, each locked at its time
  order: number[];
  aims: number[];
  locks: number[];
  taps: number[];
  pulses: ((ms: number) => Point | null)[];
  dive: (ms: number) => Point | null;
  slam: number;
}

const states = new WeakMap<Running, State>();

// the buttons linked to each own one (not a snapshotMap: a snapshot would
// deep-copy the linked floors themselves)
const links = new WeakMap<Floor, Floor[]>();
// each tap pressing every button linked to it too; the links go with the last
const linkedTaps = defineTapPerk("Linked", (t, left) => {
  const linked = links.get(t.floor);
  if (!left) links.delete(t.floor);
  for (const other of linked ?? []) {
    if (!t.floors.includes(other) || !other.unlocked || isFloorMaxed(other))
      continue;
    t.levelUp(other, 1);
    t.press(other);
  }
});

registerFloorCrit("linkUpCrit", {
  // every other button linked to the own one, whose taps (the crit's
  // multiple) then level them all
  reward(t) {
    if (t.own) {
      if (links.has(t.floor)) linkedTaps.add(t.floor, t.count);
    } else {
      const linked = links.get(t.ownFloor);
      if (!linked) links.set(t.ownFloor, [t.floor]);
      else if (!linked.includes(t.floor)) linked.push(t.floor);
    }
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = bars
      .map((_, i) => i)
      .filter((i) => i !== 0)
      .sort(
        (a, b) =>
          Math.abs(bars[a].y - bars[0].y) - Math.abs(bars[b].y - bars[0].y),
      );
    const state: State = {
      bars,
      order,
      aims: [],
      locks: [],
      taps: [],
      pulses: [],
      dive: () => null,
      slam: 0,
    };
    let t = FIRST_AIM_MS;
    order.forEach((bar, k) => {
      state.aims.push(t);
      state.locks.push(t + AIM_MS);
      hit(bar, t + AIM_MS, 1);
      t += lerp(
        AIM_GAP_MS[0],
        AIM_GAP_MS[1],
        k / Math.max(1, order.length - 1),
      );
    });
    const tapFrom = order.length
      ? state.locks[order.length - 1] + TAP_DELAY_MS
      : FIRST_AIM_MS;
    state.taps = order.length ? TAPS_MS.map((d) => tapFrom + d) : [];
    for (const tap of state.taps) {
      hit(0, tap, 0);
      for (const bar of order) {
        const at: Point = { x: 0, y: 0 };
        state.pulses.push((ms) => {
          if (ms < tap || ms > tap + PULSE_MS) return null;
          const a = state.bars[0];
          const b = state.bars[bar];
          const u = (ms - tap) / PULSE_MS;
          at.x = lerp(a.x, b.x, u);
          at.y = lerp(a.y, b.y, u);
          return at;
        });
      }
    }
    state.slam =
      (state.taps.length ? state.taps[state.taps.length - 1] + PULSE_MS : t) +
      SLAM_GAP_MS;
    hit(0, state.slam, 2);
    hit(0, DIVE_MS, 0);
    const at: Point = { x: 0, y: 0 };
    state.dive = (ms) => {
      if (ms > DIVE_MS) return null;
      const to = state.bars[0];
      const u = Math.max(0, ms) / DIVE_MS;
      const p = u * u * (3 - 2 * u);
      at.x = to.x * p;
      at.y = to.y * p - DIVE_RISE * 4 * p * (1 - p);
      return at;
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const own = bars[0];
    if (ms < DIVE_MS) {
      const at = state.dive(ms)!;
      drawText(ctx, r.glyphs, r.label, at.x, at.y, r.flashFont);
    }
    drawDetonation(ctx, own, ms - DIVE_MS, DIVE_BLAST, now);
    const { order, aims, locks, taps } = state;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < order.length; k++) {
      const to = bars[order[k]];
      if (ms >= aims[k] && ms < locks[k]) drawAimLaser(ctx, own, to);
      if (ms < locks[k] || ms > state.slam + TAIL_MS) continue;
      let width = lerp(
        BEAM,
        LOCK_BEAM,
        Math.exp(-(ms - locks[k]) / LOCK_FADE_MS),
      );
      let alpha = ms > state.slam ? 1 - (ms - state.slam) / TAIL_MS : 0.6;
      for (let j = 0; j < taps.length; j++) {
        const u = (ms - taps[j]) / PULSE_MS;
        if (u < 0 || u > 1.5) continue;
        width += PULSE_BEAM * Math.exp(-Math.abs(u - 0.5) * 3);
        alpha = 1;
      }
      drawBeam(ctx, own, to, width, alpha);
      drawBeamFlare(ctx, to, FLARE, alpha, now);
    }
    ctx.restore();
    for (let i = 0; i < state.pulses.length; i++) {
      const tap = taps[Math.floor(i / order.length)];
      drawWispBetween(
        ctx,
        state.pulses[i],
        ms,
        now,
        WISP_SIZE * 0.9,
        1,
        tap,
        tap + PULSE_MS,
      );
    }
    for (let k = 0; k < order.length; k++) {
      const to = bars[order[k]];
      drawDetonation(ctx, to, ms - locks[k], LOCK_BLAST, now);
      for (let j = 0; j < taps.length; j++)
        drawDetonation(ctx, to, ms - taps[j] - PULSE_MS, PULSE_BLAST, now);
    }
    for (let j = 0; j < taps.length; j++)
      drawDetonation(ctx, own, ms - taps[j], TAP_BLAST, now);
    drawDetonation(ctx, own, ms - state.slam, SLAM_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.4 : step === 1 ? 1 : 0.5),
});
