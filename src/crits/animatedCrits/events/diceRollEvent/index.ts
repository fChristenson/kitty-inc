// the "Dice Roll" event (experiment: a giant dice throw; free upgrade
// levels): it covers its crit, whose click freezes the screen while two
// giant dice made of glowing wisp pips are flung out of the clicked
// floor's button and tumble across the screen, their faces flickering as
// they bounce, each bounce a clack and a jolt; they settle on a roll, then
// every pip shoots off onto an income bar, each a pop and free levels,
// ever faster; the last pip lands in a huge blast and shake as every bar
// slams. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "diceRoll";
const MAX_BARS = 4;
// each face's pips on a 3 by 3 grid, -1..1
const FACES: [number, number][][] = [
  [[0, 0]],
  [
    [-1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
];
// pips sit SPACING px apart; the dice bounce BOUNCES times, the first
// HIGH px high, flickering faces every FLICKER ms
const SPACING = 26;
const BOUNCES = 3;
const HIGH = 180;
const FLICKER = 90;
const PIP = 0.42;
const LOFT = 90;
const BOUNCE_SHAKE: [number, number] = [0.5, 1];
const PIP_SHAKE: [number, number] = [0.4, 1.2];

export const forceDiceRollEvent = registerWispEvent(
  KEY,
  "Dice Roll",
  () => CONFIG.diceRollEvent.chance,
  (floor, context, area) => {
    const { rollMs, restMs, pipsMs, flyMs, levelShare, holdMs, mergeMs } =
      CONFIG.diceRollEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const w = area.right - area.left;
    const floorY = area.top + (area.bottom - area.top) * 0.55;
    const dice = [0.38, 0.62].map((share, d) => {
      const rest: Point = { x: area.left + w * share, y: floorY };
      const value = 1 + Math.floor(Math.random() * 6);
      const seeds = Array.from({ length: Math.ceil(rollMs / FLICKER) }, () =>
        Math.floor(Math.random() * 6),
      );
      const center: Point = { x: 0, y: 0 };
      // tumbling from the button to its rest spot in shrinking bounces
      const centerAt = (ms: number): Point => {
        const u = clamp01(ms / rollMs);
        center.x = lerp([button.x, rest.x], 1 - (1 - u) ** 2);
        const hop = u * BOUNCES;
        const k = Math.min(BOUNCES - 1, Math.floor(hop));
        const v = hop - k;
        center.y =
          lerp([button.y, rest.y], Math.min(1, u * 3)) -
          Math.sin(Math.PI * v) * HIGH * 0.5 ** k * (1 - u * 0.3);
        return center;
      };
      const faceAt = (ms: number) =>
        ms >= rollMs ? value - 1 : (seeds[Math.floor(ms / FLICKER) + d] ?? 0);
      const slots = Array.from({ length: 6 }, (_, j) => {
        const at: Point = { x: 0, y: 0 };
        return (ms: number): Point | null => {
          const face = FACES[faceAt(ms)];
          if (j >= face.length) return null;
          const c = centerAt(ms);
          const spin = ms < rollMs ? Math.sin(ms / 70 + d) * 0.4 : 0;
          const [gx, gy] = face[j];
          at.x = c.x + (gx * Math.cos(spin) - gy * Math.sin(spin)) * SPACING;
          at.y = c.y + (gx * Math.sin(spin) + gy * Math.cos(spin)) * SPACING;
          return at;
        };
      });
      return { value, slots, centerAt };
    });
    const flyAt = rollMs + restMs;
    // every pip, die by die, flies to a bar in turn
    const pips = dice.flatMap((die, d) =>
      FACES[die.value - 1].map((_, j) => ({ die, d, j })),
    );
    const flights = pips.map((pip, k) => {
      const from = { ...pip.die.slots[pip.j](rollMs)! };
      const bar = bars[k % bars.length];
      const to: Point = {
        x: bar.center.x + (Math.random() - 0.5) * 60,
        y: bar.center.y,
      };
      const ctrl: Point = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - LOFT,
      };
      const leaves =
        flyAt + pipsMs * Math.sqrt(k / Math.max(1, pips.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        pip,
        bar,
        to,
        leaves,
        lands: leaves + flyMs,
        at: (ms: number): Point | null =>
          ms < leaves || ms >= leaves + flyMs
            ? null
            : bezier(from, ctrl, to, easeIn((ms - leaves) / flyMs), at),
      };
    });
    const last = flights.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = last.lands;
    const leavesOf = new Map(
      flights.map((f) => [`${f.pip.d}:${f.pip.j}`, f.leaves]),
    );
    const resting = dice.map((die, d) =>
      die.slots.map((slot, j) => ({
        slot,
        leaves: leavesOf.get(`${d}:${j}`) ?? 0,
      })),
    );

    const bouncing = createBeats(
      Array.from({ length: BOUNCES }, (_, k) => (rollMs * (k + 1)) / BOUNCES),
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, k / (BOUNCES - 1)));
      },
    );
    const landing = createBeats(
      flights,
      (f) => f.lands,
      (f, k) => {
        cover!.levels(f.bar, levelsFor(f.bar.floor, levelShare, 1), f.to);
        if (f === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(f.to);
          return;
        }
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(PIP_SHAKE, k / Math.max(1, flights.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const die of resting)
            for (const pip of die)
              if (ms < flyAt || ms < pip.leaves)
                drawWispHead(ctx, pip.slot, ms, now, WISP_SIZE * PIP, 0.6);
          for (const f of flights)
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * PIP,
              0.8,
              f.leaves,
              f.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
