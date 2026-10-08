// the "Iris" event (beam; cash): it covers its crit, whose click freezes the
// screen while a ring of blazing beams fans in from all round its edges,
// every beam pointing at its middle like the blades of a camera's iris; with
// a click, a flash, a jolt and a ring of coins at every step the iris
// snaps tighter and twists, ever faster, until its blades meet in a single
// blinding point that bursts in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";

const KEY = "iris";
const REWARD = 4;
const BLADES = 10;
const STEPS = 6;
// blades reach in from OUTER of the screen's bigger side to an opening of
// OPEN of its smaller side, twisting TWIST rad as it closes
const OUTER = 0.75;
const OPEN = 0.42;
const TWIST = 1.2;
const BLADE = 12;
const SNAP_MS = 120;
const COINS = 10;
const STEP_SHAKE: [number, number] = [0.4, 1.3];

export const forceIrisEvent = registerWispEvent(
  KEY,
  "Iris",
  () => CONFIG.irisEvent.chance,
  (floor, context, area) => {
    const { fanMs, stepsMs, holdMs, mergeMs } = CONFIG.irisEvent;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const outer =
      Math.max(area.right - area.left, area.bottom - area.top) * OUTER;
    const open =
      Math.min(area.right - area.left, area.bottom - area.top) * OPEN;
    let clock: number = fanMs;
    const steps = Array.from({ length: STEPS }, (_, k) => {
      const at = clock;
      clock += lerp(stepsMs, k / (STEPS - 1));
      return { at, closed: (k + 1) / STEPS };
    });
    const endAt = steps[STEPS - 1].at;
    // how closed the iris is at ms, snapping shut a step at a time
    const closure = (ms: number) => {
      let c = 0;
      let prev = 0;
      for (const s of steps) {
        if (ms < s.at) break;
        prev = c;
        c = s.closed;
        const u = clamp01((ms - s.at) / SNAP_MS);
        c = lerp([prev, c], easeOutBack(u));
      }
      return Math.min(1, c);
    };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };

    const snapping = createBeats(
      steps,
      (s) => s.at,
      (s, k) => {
        if (s === steps[STEPS - 1]) {
          cover!.blast(center);
          return;
        }
        const r = open * (1 - s.closed);
        cover!.launchFrom(
          center,
          ringTargets(center, COINS, [r * 0.6, r + 40]),
        );
        cover!.burst(center, 0.3 + 0.08 * k);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STEP_SHAKE, k / (STEPS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => snapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 250) return;
          const fade =
            clamp01(ms / fanMs) * (ms > endAt ? 1 - (ms - endAt) / 250 : 1);
          const c = closure(ms);
          const r = open * (1 - c);
          for (let i = 0; i < BLADES; i++) {
            const a = (i / BLADES) * Math.PI * 2 + TWIST * c;
            from.x = center.x + Math.cos(a) * outer;
            from.y = center.y + Math.sin(a) * outer;
            // each blade's tip sits off the middle, tangent to the opening
            to.x = center.x + Math.cos(a + 0.5) * r;
            to.y = center.y + Math.sin(a + 0.5) * r;
            drawBeam(ctx, from, to, BLADE, 0.55 * fade);
          }
          drawBeamFlare(ctx, center, (16 + 30 * c) * fade, fade, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
