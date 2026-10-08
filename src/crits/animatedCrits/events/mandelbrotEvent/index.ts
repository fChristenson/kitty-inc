// the "Mandelbrot" event (experiment: the Mandelbrot set; cash): it covers
// its crit, whose click freezes the screen while a sheet of cash fans up
// out of the clicked floor's button into a tall grid of coins, each one a
// point of the plane; then the plane is iterated, z → z² + c: every coin
// whose point flies off to infinity peels away outward and arcs into the
// total, the step it escapes at deciding when, so the grid erodes from the
// edges inward in ripples, every step a bloop and a jolt, until only the
// Mandelbrot set stands in gold, bulbs, cardioid and antenna; it holds a
// beat, then surges into the total in a huge blast. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";

const KEY = "mandelbrot";
const REWARD = 4;
const COLS = 32;
// the plane shown: real part down the screen (the antenna up top), the
// imaginary part across, as a WIDTH share of the screen, from TOP down
const RE: [number, number] = [-2.15, 0.65];
const IM: [number, number] = [-1.25, 1.25];
const WIDTH = 0.88;
const TOP = 0.12;
const ITER = 24;
// the set's heart, which escapees fly away from, REACH px before turning
const HEART: [number, number] = [-0.5, 0];
const REACH: [number, number] = [140, 320];
const FILL_SHAKE = 0.4;
const STEP_SHAKE: [number, number] = [0.5, 0.2];
const SURGE_SHAKE = 0.9;

export const forceMandelbrotEvent = registerWispEvent(
  KEY,
  "Mandelbrot",
  () => CONFIG.mandelbrotEvent.chance,
  (floor, context, area) => {
    const { fillMs, iterMs, flyMs, surgeMs, holdMs, mergeMs } =
      CONFIG.mandelbrotEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const button = getButtonCenter(context.isGroundFloor);
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const unit = Math.min(
      (w * WIDTH) / (IM[1] - IM[0]),
      (h * (1 - 2 * TOP)) / (RE[1] - RE[0]),
    );
    const rows = Math.round((COLS * (RE[1] - RE[0])) / (IM[1] - IM[0]));
    const cx = (area.left + area.right) / 2;
    const top = area.top + h * TOP;
    const toScreen = (re: number, im: number): Point => ({
      x: cx + im * unit,
      y: top + (re - RE[0]) * unit,
    });
    const heart = toScreen(HEART[0], HEART[1]);

    // every coin's point and the step it escapes at (Infinity: in the set)
    const coins: { spot: Point; row: number; escape: number }[] = [];
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < COLS; col++) {
        const re = lerp(RE, (row + 0.5) / rows);
        const im = lerp(IM, (col + 0.5) / COLS);
        let zr = 0;
        let zi = 0;
        let escape = Infinity;
        for (let n = 1; n <= ITER; n++) {
          const t = zr * zr - zi * zi + re;
          zi = 2 * zr * zi + im;
          zr = t;
          if (zr * zr + zi * zi > 4) {
            escape = n;
            break;
          }
        }
        coins.push({ spot: toScreen(re, im), row, escape });
      }

    // the escapes run at a steady rate, each step's coins in their own slice
    const escaped = coins.filter((c) => c.escape < Infinity);
    const before = new Array<number>(ITER + 2).fill(0);
    for (const c of escaped) before[c.escape + 1]++;
    for (let n = 1; n < before.length; n++) before[n] += before[n - 1];
    const steps = [...new Set(escaped.map((c) => c.escape))].sort(
      (a, b) => a - b,
    );
    const stepAt = (n: number) =>
      fillMs + (iterMs * before[n]) / Math.max(1, escaped.length);
    const leaveAt = (c: { escape: number }) =>
      lerp([stepAt(c.escape), stepAt(c.escape + 1)], Math.random());
    const surgeAt = fillMs + iterMs + flyMs * 0.5;
    const inAt = surgeAt + surgeMs;
    const travelMs = inAt;

    const paths: CoinPath[] = coins.map((c) => {
      const appears = (c.row / rows) * fillMs * 0.5;
      const fly = fillMs * 0.5;
      const leaves =
        c.escape < Infinity
          ? leaveAt(c)
          : surgeAt + Math.random() * surgeMs * 0.4;
      const lands = c.escape < Infinity ? leaves + flyMs : inAt;
      const dx = c.spot.x - heart.x;
      const dy = c.spot.y - heart.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = lerp(REACH, Math.random());
      const out: Point = {
        x: c.spot.x + (dx / d) * reach,
        y: c.spot.y + (dy / d) * reach,
      };
      const rise: Point = { x: c.spot.x, y: button.y };
      return (f: number) => {
        const ms = f * travelMs;
        if (ms < appears) return { x: button.x, y: button.y, scale: 0 };
        if (ms < appears + fly)
          return bezier(button, rise, c.spot, easeOut((ms - appears) / fly), {
            x: 0,
            y: 0,
          });
        if (ms < leaves) return { x: c.spot.x, y: c.spot.y };
        const to = total();
        const p = bezier(
          c.spot,
          out,
          to,
          easeIn(clamp01((ms - leaves) / (lands - leaves))),
          {
            x: 0,
            y: 0,
          },
        );
        return { x: p.x, y: p.y, scale: ms >= lands ? 0 : 1 };
      };
    });

    const filling = createBeats(
      [fillMs * 0.5, fillMs],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FILL_SHAKE);
      },
    );
    const stepping = createBeats(
      steps,
      (n) => stepAt(n),
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STEP_SHAKE, k / Math.max(1, steps.length - 1)));
      },
    );
    const arriving = createBeats(
      [...steps.map((n) => stepAt(n) + flyMs), surgeAt, inAt],
      (ms) => ms,
      (ms) => {
        if (ms >= inAt) cover!.blast(total());
        else if (ms === surgeAt) {
          if (cover!.isLive()) shakeScreen(SURGE_SHAKE);
        } else cover!.burst(total(), 0.4);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          filling.tick(ms, now);
          stepping.tick(ms, now);
          arriving.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
