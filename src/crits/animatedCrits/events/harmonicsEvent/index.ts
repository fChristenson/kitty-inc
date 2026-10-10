// the "Harmonics" event (experiment: standing waves on a string; free
// hires): it covers its crit, whose click freezes the screen while a string
// of light stretches across it between two peg wisps; it's plucked and hums
// in its fundamental, one big loop, then each pluck jumps it up a harmonic,
// two loops, three, four, each vibrating faster than the last, still nodes
// glinting between the swinging loops, every pluck a twang and a jolt; on
// the last harmonic each loop flings a wisp off its crest, arcing down onto
// an empty spot as a new worker, the last in a big blast. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "harmonics";
const MAX_LOOPS = 5;
// the string this far down the screen, MARGIN in from the sides, swinging
// up to AMPLITUDE px, drawn in SEGMENTS beams
const STRING_AT = 0.36;
const MARGIN = 70;
const AMPLITUDE = 110;
const SEGMENTS = 60;
const STRING_W = 7;
const PEG = WISP_SIZE * 0.8;
const NODE = 18;
// the fundamental's swings a second; harmonic n swings n times as fast
const BASE_HZ = 2.2;
const PIECE = WISP_SIZE * 0.8;
const FLING = 160;
const PLUCK_SHAKE: [number, number] = [0.35, 0.8];
const LAND_SHAKE = 0.6;

interface Piece {
  hire: RewardHire;
  flings: number;
  lands: number;
  flight: (ms: number) => Point | null;
}

export const forceHarmonicsEvent = registerWispEvent(
  KEY,
  "Harmonics",
  () => CONFIG.harmonicsEvent.chance,
  (floor, context, area) => {
    const { growMs, modeMs, gapMs, dropMs, holdMs, mergeMs } =
      CONFIG.harmonicsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_LOOPS);
    if (hires.length === 0) return;
    const left = area.left + MARGIN;
    const right = area.right - MARGIN;
    const y0 = lerp([area.top, area.bottom], STRING_AT);
    const length = right - left;
    // harmonics 1 up to as many loops as there are spots (at least 3 plucks)
    const top = Math.max(hires.length, 3);
    const plucks = Array.from({ length: top }, (_, k) => k + 1);
    const starts: number[] = [];
    let clock: number = growMs;
    for (let k = 0; k < top; k++) {
      starts.push(clock);
      clock += modeMs * lerp([1.2, 0.75], k / Math.max(1, top - 1));
    }
    const flingAt = clock;
    const modeAt = (ms: number) => {
      let k = 0;
      while (k + 1 < top && ms >= starts[k + 1]) k++;
      return k;
    };
    // the string's height at x along it, in harmonic n, swinging with time
    const swing = (n: number, ms: number, since: number) => {
      const envelope = clamp01(since / 120) * (1 - 0.3 * clamp01(since / 600));
      return (
        AMPLITUDE * envelope * Math.sin((ms / 1000) * BASE_HZ * n * Math.PI * 2)
      );
    };
    const heightAt = (x: number, n: number, s: number) =>
      Math.sin((n * Math.PI * (x - left)) / length) * s;

    // on the last harmonic each loop throws a piece off its crest
    const finalN = top;
    const loops = Array.from({ length: finalN }, (_, k) => k).filter(
      (k) => k < hires.length,
    );
    const pieces: Piece[] = loops.map((k) => {
      const hire = hires[k];
      const x = left + ((k + 0.5) * length) / finalN;
      const flings = flingAt + k * gapMs;
      const from: Point = {
        x,
        y: y0 - AMPLITUDE * (k % 2 === 0 ? 1 : -1) * 0.8,
      };
      const bow: Point = { x, y: from.y - FLING };
      const to: Point = { x: hire.x, y: hire.y };
      const spot: Point = { x: 0, y: 0 };
      const lands = flings + dropMs;
      return {
        hire,
        flings,
        lands,
        flight: (ms) =>
          ms < flings || ms > lands
            ? null
            : bezier(from, bow, to, easeIn((ms - flings) / dropMs), spot),
      };
    });
    const last = pieces[pieces.length - 1];
    const endMs = last.lands;

    const plucking = createBeats(
      plucks,
      (_, k) => starts[k],
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PLUCK_SHAKE, k / Math.max(1, top - 1)));
      },
    );
    const flinging = createBeats(
      pieces,
      (p) => p.flings,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      pieces,
      (p) => p.lands,
      (p) => {
        giveHire(p.hire);
        const at = { x: p.hire.x, y: p.hire.y };
        if (p === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        playBloop();
      },
    );

    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const pegs: Point[] = [
      { x: left, y: y0 },
      { x: right, y: y0 },
    ];
    const pegAt = pegs.map((p) => () => p);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          plucking.tick(ms, now);
          flinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - flingAt) / 400);
          if (fade > 0) {
            const k = modeAt(ms);
            const n = k + 1;
            const s = ms < growMs ? 0 : swing(n, ms, ms - starts[k]);
            const half = (length / 2) * grow;
            const mid = (left + right) / 2;
            for (let i = 0; i < SEGMENTS; i++) {
              a.x = mid - half + (2 * half * i) / SEGMENTS;
              b.x = mid - half + (2 * half * (i + 1)) / SEGMENTS;
              a.y = y0 - heightAt(a.x, n, s);
              b.y = y0 - heightAt(b.x, n, s);
              drawBeam(ctx, a, b, STRING_W, 0.85 * fade);
            }
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            for (let j = 1; j < n; j++)
              stampGlimmer(
                ctx,
                left + (j * length) / n,
                y0,
                NODE * fade,
                now / 300 + j,
                COLOR.white,
              );
            endLightBatch(ctx);
            ctx.restore();
            for (const p of pegAt)
              drawWisp(ctx, p, ms, now, PEG * grow * fade, 0.5);
          }
          for (const p of pieces)
            drawWispBetween(
              ctx,
              p.flight,
              ms,
              now,
              PIECE,
              1,
              p.flings,
              p.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
