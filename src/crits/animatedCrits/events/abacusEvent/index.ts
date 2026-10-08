// the "Abacus" event (experiment: an abacus counting itself up; cash): it
// covers its crit, whose click freezes the screen while four rods of light
// strung with glowing beads snap across the screen and it starts to count,
// beads clicking across the bottom rod one by one, then faster and faster,
// every ten carrying up a bead on the rod above, the carries rippling up
// until the bottom rods blur and every carry onto the top rod is a click
// and a jolt; at 9999 the last count carries all the way up, every rod
// sweeping clear at once onto a fifth rod's single bead, and every bead
// bursts into cash in a huge blast. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawGlitterLight, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";

const KEY = "abacus";
const REWARD = 4;
const RODS = 4;
const BEADS = 9;
const LAST = 10 ** RODS - 1;
const WIDTH = 0.72;
const ROD_GAP = 78;
const BEAD_GAP = 30;
const BEAD = 17;
const SLIDE_MS = 90;
const CARRY_MS = 140;
const POP_MS = 260;
const STRING_MS = 200;
const COINS = 4;
const REACH: [number, number] = [40, 160];
const CARRY_SHAKE: [number, number] = [0.25, 0.7];
const SWEEP_SHAKE = 1.2;

export const forceAbacusEvent = registerWispEvent(
  KEY,
  "Abacus",
  () => CONFIG.abacusEvent.chance,
  (floor, context, area) => {
    const { countMs, holdMs, mergeMs } = CONFIG.abacusEvent;
    const width = area.right - area.left;
    const left = area.left + (width * (1 - WIDTH)) / 2;
    const right = area.right - (width * (1 - WIDTH)) / 2;
    const middle = area.top + (area.bottom - area.top) * 0.5;
    // the fifth rod, for the overflow's carry, on top
    const rodY = (r: number) => middle + (RODS / 2 - r) * ROD_GAP;
    const beadX = (j: number, right_: boolean) =>
      right_
        ? right - 20 - (BEADS - 1 - j) * BEAD_GAP
        : left + 20 + j * BEAD_GAP;
    // when it reaches count n: slow at first, then ever faster
    const msOf = (n: number) =>
      (countMs * Math.log(n + 1)) / Math.log(LAST + 1);
    // every change of each rod's digit, and when
    const changes = Array.from({ length: RODS }, (_, r) => {
      const step = 10 ** r;
      const count = Math.floor(LAST / step);
      const times = new Float32Array(count + 1);
      for (let k = 1; k <= count; k++) times[k] = STRING_MS + msOf(k * step);
      return times;
    });
    const sweepAt = STRING_MS + countMs + CARRY_MS;
    const popAt = sweepAt + POP_MS;
    const endAt = popAt + 400;
    // a rod's digit at ms, the one before, and how far it's slid from it
    const digitAt = (r: number, ms: number) => {
      if (ms >= sweepAt)
        return { now: 0, was: 9, slid: clamp01((ms - sweepAt) / SLIDE_MS) };
      const times = changes[r];
      let lo = 0;
      let hi = times.length - 1;
      if (ms < times[1]) return { now: 0, was: 0, slid: 1 };
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (times[m] <= ms) lo = m;
        else hi = m;
      }
      if (times[hi] <= ms) lo = hi;
      return {
        now: lo % 10,
        was: (lo - 1) % 10,
        slid: clamp01((ms - times[lo]) / SLIDE_MS),
      };
    };
    const isRight = (j: number, digit: number) => j >= BEADS - digit;
    const beadsAt = (ms: number, into: Point[]) => {
      let i = 0;
      for (let r = 0; r < RODS; r++) {
        const d = digitAt(r, ms);
        for (let j = 0; j < BEADS; j++) {
          const from = beadX(j, isRight(j, d.was));
          const to = beadX(j, isRight(j, d.now));
          into[i].x = lerp([from, to], smoothstep(d.slid));
          into[i].y = rodY(r);
          i++;
        }
      }
      return into;
    };
    const beads: Point[] = Array.from({ length: RODS * BEADS }, () => ({
      x: 0,
      y: 0,
    }));
    const overflow: Point = { x: 0, y: rodY(RODS) };
    const rodLeft: Point = { x: 0, y: 0 };
    const rodRight: Point = { x: 0, y: 0 };

    const carrying = createBeats(
      Array.from(changes[RODS - 1]).slice(1),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CARRY_SHAKE, k / (BEADS - 1)));
      },
    );
    const sweeping = createBeats(
      [sweepAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SWEEP_SHAKE);
      },
    );
    const popping = createBeats(
      [popAt],
      (ms) => ms,
      () => {
        beadsAt(popAt, beads);
        for (const b of beads)
          cover!.launchFrom(
            b,
            clampTargetsY(
              ringTargets(b, COINS, REACH),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        cover!.blast({ x: beadX(BEADS - 1, true), y: overflow.y });
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          carrying.tick(ms, now);
          sweeping.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > popAt) return;
          const strung = easeOut(clamp01(ms / STRING_MS));
          for (let r = 0; r <= RODS; r++) {
            const y = rodY(r);
            rodLeft.x = lerp([(left + right) / 2, left], strung);
            rodRight.x = lerp([(left + right) / 2, right], strung);
            rodLeft.y = rodRight.y = y;
            drawBeam(ctx, rodLeft, rodRight, 6, 0.45);
          }
          if (ms < STRING_MS) return;
          beadsAt(ms, beads);
          for (let i = 0; i < beads.length; i++)
            drawGlitterLight(ctx, beads[i].x, beads[i].y, BEAD, i, 1, now);
          overflow.x = lerp(
            [beadX(BEADS - 1, false), beadX(BEADS - 1, true)],
            smoothstep(clamp01((ms - sweepAt) / SLIDE_MS)),
          );
          drawGlitterLight(ctx, overflow.x, overflow.y, BEAD * 1.4, 99, 1, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
