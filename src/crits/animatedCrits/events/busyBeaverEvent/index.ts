// the "Busy Beaver" event (experiment: the 4-state busy beaver Turing
// machine; free hires): it covers its crit, whose click freezes the screen
// while a tape of glitter cells stretches across the screen and a head wisp
// drops onto it and runs the champion 4-state busy beaver: 107 steps of
// reading, writing and shuttling left and right, each 1 it writes flaring
// gold and each it wipes popping dark, the head changing size with its
// state, faster and faster; when it halts in a bang the tape holds 13 gold
// marks, which fly off onto the empty spots in view, each landing as a new
// worker, the last in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "busyBeaver";
const MAX_HIRES = 4;
// [write, move, next] for each state on reading 0 and 1; -1 halts
const RULES: [number, number, number][][] = [
  [
    [1, 1, 1],
    [1, -1, 1],
  ],
  [
    [1, -1, 0],
    [0, -1, 2],
  ],
  [
    [1, 1, -1],
    [1, -1, 3],
  ],
  [
    [1, 1, 3],
    [0, 1, 0],
  ],
];
// px the tape keeps from the screen's sides, and the head's height over it
const SIDE = 80;
const OVER = 70;
const CELL = 16;
const HEAD = WISP_SIZE * 0.7;
const STATE_GROW = 0.15;
const BEND = 160;
const SOUND_GAP_MS = 70;
const STEP_SHAKE = 0.12;
const HALT_SHAKE = 1.2;
const HIRE_SHAKE = 1.1;

interface Step {
  cell: number;
  write: number;
  // what the cell held before
  was: number;
  state: number;
  ms: number;
}

// the machine run to its halt from a blank tape: every step's cell, what it
// wrote there and the state it was in, cells counted from the leftmost used
function run(): { steps: Omit<Step, "ms">[]; cells: number } {
  const tape = new Map<number, number>();
  const raw: { pos: number; write: number; was: number; state: number }[] = [];
  let pos = 0;
  let state = 0;
  let lo = 0;
  let hi = 0;
  while (state >= 0) {
    const was = tape.get(pos) ?? 0;
    const [write, move, next] = RULES[state][was];
    tape.set(pos, write);
    raw.push({ pos, write, was, state });
    pos += move;
    state = next;
    lo = Math.min(lo, pos);
    hi = Math.max(hi, pos);
  }
  return {
    steps: raw.map((s) => ({
      cell: s.pos - lo,
      write: s.write,
      was: s.was,
      state: s.state,
    })),
    cells: hi - lo + 1,
  };
}

export const forceBusyBeaverEvent = registerWispEvent(
  KEY,
  "Busy Beaver",
  () => CONFIG.busyBeaverEvent.chance,
  (floor, context, area) => {
    const { bootMs, stepMs, flyMs, holdMs, mergeMs } = CONFIG.busyBeaverEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const machine = run();
    const tapeY = (area.top + area.bottom) / 2;
    const cellX = (i: number) =>
      lerp([area.left + SIDE, area.right - SIDE], i / (machine.cells - 1));
    let clock: number = bootMs;
    const steps: Step[] = machine.steps.map((s, k) => {
      const step = { ...s, ms: clock };
      clock += lerp(stepMs, k / (machine.steps.length - 1));
      return step;
    });
    const haltAt = clock;
    // the tape it leaves: every cell's last write
    const final = new Int8Array(machine.cells);
    for (const s of steps) final[s.cell] = s.write;
    const ones = Array.from(final.keys()).filter((i) => final[i] === 1);
    const flights = ones.map((cell, i) => {
      const hire = hires[i % hires.length];
      const from: Point = { x: cellX(cell), y: tapeY };
      const to: Point = { x: hire.x, y: hire.y - 40 };
      const departs = haltAt + 120 + i * 30;
      return {
        cell,
        hire,
        from,
        to,
        bend: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - BEND },
        departs,
        arrives: departs + flyMs,
        spot: { x: 0, y: 0 },
      };
    });
    const firstLanding = hires.map((h) =>
      Math.min(...flights.filter((f) => f.hire === h).map((f) => f.arrives)),
    );
    const lastHire = Math.max(...firstLanding);
    const endAt = Math.max(...flights.map((f) => f.arrives));
    const flightAts = flights.map(
      (f) =>
        (ms: number): Point | null =>
          ms > f.arrives
            ? null
            : bezier(
                f.from,
                f.bend,
                f.to,
                easeIn(clamp01((ms - f.departs) / flyMs)),
                f.spot,
              ),
    );
    // the head reaches each step's cell as that step runs, sliding over from
    // the last one's in between
    const head: Point = { x: 0, y: 0 };
    const headAt = (ms: number): Point | null => {
      if (ms > haltAt + 120) return null;
      let lo = 0;
      let hi = steps.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (steps[mid].ms <= ms) lo = mid + 1;
        else hi = mid;
      }
      // steps[lo] is the next step still to come
      if (lo === 0) head.x = cellX(steps[0].cell);
      else if (lo === steps.length) head.x = cellX(steps[lo - 1].cell);
      else {
        const a = steps[lo - 1];
        const b = steps[lo];
        head.x = lerp(
          [cellX(a.cell), cellX(b.cell)],
          easeOut(clamp01((ms - a.ms) / (b.ms - a.ms))),
        );
      }
      head.y = tapeY - OVER * easeOut(clamp01(ms / bootMs));
      return head;
    };
    const tape = new Int8Array(machine.cells);
    let soundAt = -Infinity;

    const booting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const writing = createBeats(
      steps,
      (s) => s.ms,
      (s, _, now) => {
        if (s.write === s.was || !cover!.isLive()) return;
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
        shakeScreen(STEP_SHAKE);
      },
    );
    const halting = createBeats(
      [haltAt],
      (ms) => ms,
      () => {
        cover!.burst(headAt(haltAt) ?? { x: cellX(0), y: tapeY }, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HALT_SHAKE);
      },
    );
    const hiring = createBeats(
      hires,
      (_, i) => firstLanding[i],
      (h, i) => {
        giveHire(h);
        const at = { x: h.x, y: h.y - 40 };
        if (firstLanding[i] === lastHire) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIRE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          booting.tick(ms, now);
          writing.tick(ms, now);
          halting.tick(ms, now);
          hiring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endAt + 600) return;
          // the tape as the machine has left it so far
          tape.fill(0);
          let state = 0;
          for (const s of steps) {
            if (s.ms > ms) break;
            tape[s.cell] = s.write;
            state = s.state;
          }
          const grow = easeOut(clamp01(ms / bootMs));
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < machine.cells; i++) {
            const lit = tape[i] === 1;
            // a gold mark that's flown off leaves its cell dark
            if (lit && ms >= haltAt + 120) continue;
            stampGlimmer(
              ctx,
              cellX(i),
              tapeY,
              CELL * grow * (lit ? 1.6 : 0.6),
              ms * 0.003 + i,
              lit ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          drawWispBetween(
            ctx,
            headAt,
            ms,
            now,
            HEAD * (1 + STATE_GROW * state),
            0.4 + 0.2 * state,
            0,
            haltAt + 120,
          );
          for (let i = 0; i < flights.length; i++)
            drawWispBetween(
              ctx,
              flightAts[i],
              ms,
              now,
              WISP_SIZE * 0.5,
              1,
              flights[i].departs,
              flights[i].arrives,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
