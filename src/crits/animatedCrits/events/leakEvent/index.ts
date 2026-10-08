// the "Leak" event: it covers its crit, whose click freezes the screen while
// a wisp swells up over the clicked floor's button like an overfilled
// balloon, shaking harder and harder; it springs leak after leak, each a pop
// and a jolt, a thin jet of cash spurting out of its side and curling up into
// the total-income readout, until it bursts in a huge blast and shake and a
// fat gush of cash roars up out of it into the total, and the coins sweep
// into the total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "leak";
const REWARD = 4;
// each leak spurts out this way (degrees, 0 = right, -90 = up) SPURT of the
// screen's width (or height, if less) before it curls up into the total
const LEAKS = [-160, -20, 170, 10, -125, -55];
const SPURT = 0.45;
// the balloon, swelling over BALLOON of the screen's width, shaking up to
// SHIVER px
const BALLOON: [number, number] = [0.07, 0.17];
const SHIVER = 6;
const POP_MS = 200;
// each leak: a burst on the balloon's skin, a bloop and a jolt, growing
const LEAK_BURST: [number, number] = [0.4, 0.8];
const LEAK_SHAKE: [number, number] = [0.8, 1.8];

export const forceLeakEvent = registerWispEvent(
  KEY,
  "Leak",
  () => CONFIG.leakEvent.chance,
  (floor, context, area) => {
    const { leadMs, gapMs, travelMs, gushMs, holdMs, mergeMs } =
      CONFIG.leakEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const flip = Math.random() < 0.5 ? -1 : 1;
    const burstAt = leadMs + LEAKS.length * gapMs;
    const leaks = LEAKS.map((deg, k) => {
      const a = (deg * Math.PI) / 180;
      const dir = { x: Math.cos(a) * flip, y: Math.sin(a) };
      const out = {
        x: button.x + dir.x * span * SPURT,
        y: button.y + dir.y * span * SPURT,
      };
      const start = leadMs + k * gapMs;
      return {
        dir,
        start,
        line: sampleLine(
          (u) => bezier(button, out, total, u, { x: 0, y: 0 }),
          60,
        ),
        pour: {
          coinsAlong: 200,
          width: 26,
          streamMs: burstAt - start,
          travelMs,
        } as Pour,
      };
    });
    const gush = sampleLine(
      (u) => ({
        x: button.x + (total.x - button.x) * u,
        y: button.y + (total.y - button.y) * u,
      }),
      30,
    );
    const gushPour: Pour = {
      coinsAlong: 1_200,
      width: 140,
      streamMs: gushMs,
      travelMs,
    };
    const durationMs = Math.max(
      pourDurationMs(burstAt, gushPour),
      burstAt + holdMs + mergeMs,
    );
    const sizeAt = (ms: number) =>
      Math.max(WISP_SIZE, width * lerp(BALLOON, clamp01(ms / burstAt)));
    const wobble = { x: 0, y: 0 };
    const balloonAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= burstAt) return null;
      const t = clamp01(ms / burstAt);
      wobble.x = button.x + Math.sin(ms * 0.8) * SHIVER * t;
      wobble.y = button.y + Math.sin(ms * 1.1) * SHIVER * t;
      return wobble;
    };

    const springs = createBeats(
      leaks,
      (l) => l.start,
      (leak, k) => {
        const t = k / (leaks.length - 1);
        const r = sizeAt(leak.start) * 0.5;
        cover!.burst(
          { x: button.x + leak.dir.x * r, y: button.y + leak.dir.y * r },
          lerp(LEAK_BURST, t),
        );
        pourLine(cover!, leak.line, leak.pour);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LEAK_SHAKE, t));
      },
    );
    const pop = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        cover!.blast(button);
        pourLine(cover!, gush, gushPour);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          springs.tick(ms, now);
          pop.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size = sizeAt(ms) * easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(
            ctx,
            balloonAt,
            ms,
            now,
            size,
            clamp01(ms / burstAt),
            0,
            burstAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
