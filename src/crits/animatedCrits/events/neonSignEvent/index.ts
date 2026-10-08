// the "Neon Sign" event (beam; cash): it covers its crit, whose click
// freezes the screen while a giant neon sign buzzes to life across the
// middle of it: letter by letter, C, A, S, H, !, each tube of light
// sputtering and flickering on with a buzz, a jolt and a puff of coins,
// ever faster; then the whole sign surges blinding bright and blows in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "neonSign";
const REWARD = 4;
// each letter's tubes on a unit grid, 1 wide and TALL tall
const TALL = 1.4;
const LETTERS: [number, number][][][] = [
  [
    [
      [1, 0.2],
      [0.7, 0],
      [0.3, 0],
      [0, 0.35],
      [0, 1.05],
      [0.3, 1.4],
      [0.7, 1.4],
      [1, 1.2],
    ],
  ],
  [
    [
      [0, 1.4],
      [0.5, 0],
      [1, 1.4],
    ],
    [
      [0.22, 0.85],
      [0.78, 0.85],
    ],
  ],
  [
    [
      [1, 0.2],
      [0.7, 0],
      [0.3, 0],
      [0, 0.3],
      [0.3, 0.65],
      [0.7, 0.75],
      [1, 1.1],
      [0.7, 1.4],
      [0.3, 1.4],
      [0, 1.2],
    ],
  ],
  [
    [
      [0, 0],
      [0, 1.4],
    ],
    [
      [1, 0],
      [1, 1.4],
    ],
    [
      [0, 0.7],
      [1, 0.7],
    ],
  ],
  [
    [
      [0.5, 0],
      [0.5, 1],
    ],
    [
      [0.5, 1.28],
      [0.5, 1.4],
    ],
  ],
];
const GAP = 0.45;
const MAX_LETTER = 70;
const TUBE = 7;
const GLOW = 22;
const FLICKER_MS = 220;
const SURGE_MS = 220;
const PUFF = 8;
const PUFF_REACH: [number, number] = [30, 110];
const LIGHT_SHAKE: [number, number] = [0.4, 1.1];

export const forceNeonSignEvent = registerWispEvent(
  KEY,
  "Neon Sign",
  () => CONFIG.neonSignEvent.chance,
  (floor, context, area) => {
    const { gapsMs, holdMs, mergeMs } = CONFIG.neonSignEvent;
    const count = LETTERS.length;
    const size = Math.min(
      MAX_LETTER,
      (area.right - area.left) / (count + (count - 1) * GAP + 1),
    );
    const width = size * (count + (count - 1) * GAP);
    const left = (area.left + area.right) / 2 - width / 2;
    const top = (area.top + area.bottom) / 2 - (size * TALL) / 2;
    let clock = 150;
    const letters = LETTERS.map((tubes, k) => {
      const x0 = left + k * size * (1 + GAP);
      const on = clock;
      clock += lerp(gapsMs, k / (count - 1));
      const segments: [Point, Point][] = [];
      for (const tube of tubes)
        for (let i = 0; i < tube.length - 1; i++)
          segments.push([
            { x: x0 + tube[i][0] * size, y: top + tube[i][1] * size },
            { x: x0 + tube[i + 1][0] * size, y: top + tube[i + 1][1] * size },
          ]);
      return {
        on,
        segments,
        middle: { x: x0 + size / 2, y: top + (size * TALL) / 2 },
      };
    });
    const surgeAt = letters[count - 1].on + FLICKER_MS + 200;
    const endAt = surgeAt + SURGE_MS;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: top + (size * TALL) / 2,
    };
    // a letter sputters on: a few blinks, then steady
    const brightness = (on: number, ms: number) => {
      if (ms < on) return 0;
      const t = ms - on;
      if (t < FLICKER_MS)
        return Math.sin(t * 0.09) * Math.sin(t * 0.23) > 0 ? 1 : 0.15;
      return 0.8 + 0.1 * Math.sin(ms / 70 + on);
    };

    const lighting = createBeats(
      letters,
      (l) => l.on + FLICKER_MS,
      (l, k) => {
        cover!.launchFrom(l.middle, ringTargets(l.middle, PUFF, PUFF_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LIGHT_SHAKE, k / (count - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          lighting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms > endAt + 300) return;
          const surge = clamp01((ms - surgeAt) / SURGE_MS);
          const fade = ms > endAt ? 1 - (ms - endAt) / 300 : 1;
          for (const l of letters) {
            const b = Math.min(1, brightness(l.on, ms) + surge) * fade;
            if (b <= 0) continue;
            for (const [from, to] of l.segments) {
              drawBeam(ctx, from, to, GLOW * (1 + surge), 0.3 * b);
              drawBeam(ctx, from, to, TUBE * (1 + surge * 0.5), b);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
