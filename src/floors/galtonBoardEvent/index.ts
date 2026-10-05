// the "Galton Board" event (money; cash): it covers its crit, whose click
// freezes the screen while a triangle of gold pegs pops up across the top
// of the screen and a jet of cash gushes up out of the clicked floor's
// button onto its apex; the torrent pours down through the pegs, every coin
// bouncing left or right off each one, and piles into bins along the
// bottom, the heaps rising into a bell curve, every few hundred coins a
// rumble and a jolt; then the heaps surge up into the total one after
// another, the tall middle one last in a huge blast. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { stampGlimmer } from "../../shared/twinkle";
import type { CoinPath } from "../coins";
import { totalSpot } from "../cashFlow";

const KEY = "galtonBoard";
const REWARD = 4;
const COINS = 900;
const ROWS = 9;
// the board's width and its apex, as shares of the screen; each bounce's
// rise as a share of a row, and a coin's jitter as a share of a peg gap
const WIDTH = 0.82;
const APEX = 0.2;
const BOTTOM = 0.05;
const HOP = 0.45;
const JITTER = 0.14;
// coins side by side in a bin
const ACROSS = 4;
const PEG = 18;
const WALL_W = 5;
const WALL_ALPHA = 0.35;
// rumbles as the bins fill, and each heap's lag top to bottom as it lifts
const FILL_BEATS = 5;
const FILL_SHAKE: [number, number] = [0.25, 0.8];
const SURGE_SHAKE: [number, number] = [0.3, 0.7];
const LIFT_LAG = 120;

export const forceGaltonBoardEvent = registerWispEvent(
  KEY,
  "Galton Board",
  () => CONFIG.galtonBoardEvent.chance,
  (floor, context, area) => {
    const {
      growMs,
      riseMs,
      pegMs,
      streamMs,
      fallMs,
      surgeMs,
      liftMs,
      holdMs,
      mergeMs,
    } = CONFIG.galtonBoardEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const button = getButtonCenter(context.isGroundFloor);
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const cx = (area.left + area.right) / 2;
    const gap = (w * WIDTH) / ROWS;
    const apexY = area.top + h * APEX;
    const floorY = area.bottom - h * BOTTOM;
    const row = Math.min(gap * 0.9, ((floorY - apexY) * 0.5) / ROWS);
    const binTop = apexY + ROWS * row;
    const pegs: Point[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let j = 0; j <= r; j++)
        pegs.push({ x: cx + (j - r / 2) * gap, y: apexY + r * row });
    const binX = (k: number) => cx + (k - ROWS / 2) * gap;

    // every coin's bounces, and so its bin, its turn in it and its slot
    const bits = Array.from({ length: COINS }, () => {
      let b = 0;
      for (let r = 0; r < ROWS; r++) if (Math.random() < 0.5) b |= 1 << r;
      return b;
    });
    const bins = bits.map((b) => {
      let k = 0;
      for (let r = 0; r < ROWS; r++) k += (b >> r) & 1;
      return k;
    });
    const counts = new Array<number>(ROWS + 1).fill(0);
    const turns = bins.map((k) => counts[k]++);
    const tallest = Math.ceil(Math.max(...counts) / ACROSS);
    const across = gap / ACROSS;
    const layer = Math.min(across * 0.8, (floorY - binTop - row) / tallest);
    const landsAfter = riseMs + ROWS * pegMs + fallMs;
    const lastLands = streamMs + landsAfter;
    // the heaps lift off outer first, the middle last
    const surgeAt = lastLands + 120;
    const order = Array.from({ length: ROWS + 1 }, (_, k) => k).sort(
      (a, b) => Math.abs(b - ROWS / 2) - Math.abs(a - ROWS / 2),
    );
    const surgeGap = surgeMs / ROWS;
    const lifts = order.map((_, k) => surgeAt + order.indexOf(k) * surgeGap);
    const arrives = lifts.map((ms) => ms + LIFT_LAG + liftMs);
    const inAt = Math.max(...arrives);
    const travelMs = inAt;

    const paths: CoinPath[] = bits.map((b, i) => {
      const startsAt = (streamMs * i) / COINS;
      const jx = (Math.random() - 0.5) * JITTER * gap;
      const k = bins[i];
      const t = turns[i];
      const tier = Math.floor(t / ACROSS);
      const slot: Point = {
        x:
          binX(k) +
          ((t % ACROSS) - (ACROSS - 1) / 2) * across +
          (tier % 2 ? across / 4 : -across / 4),
        y: floorY - (tier + 0.5) * layer,
      };
      const liftsAt =
        lifts[k] + LIFT_LAG * (1 - tier / Math.max(1, tallest - 1));
      const pegX = (r: number) => {
        let j = 0;
        for (let q = 0; q < r; q++) j += (b >> q) & 1;
        return cx + (j - r / 2) * gap + jx;
      };
      const entry: Point = { x: pegX(0), y: apexY - PEG };
      const jet: Point = { x: button.x, y: apexY - row * 2 };
      return (f: number) => {
        const ms = f * travelMs - startsAt;
        if (ms < 0) return { x: button.x, y: button.y, scale: 0 };
        if (ms < riseMs) {
          const p = bezier(button, jet, entry, easeOut(ms / riseMs), {
            x: 0,
            y: 0,
          });
          return p;
        }
        const down = ms - riseMs;
        if (down < ROWS * pegMs) {
          const r = Math.floor(down / pegMs);
          const u = (down - r * pegMs) / pegMs;
          const x0 = pegX(r);
          const y0 = apexY + r * row - PEG;
          const x1 = r + 1 < ROWS ? pegX(r + 1) : binX(k) + jx;
          const y1 = r + 1 < ROWS ? y0 + row : binTop;
          return {
            x: lerp([x0, x1], u),
            y: lerp([y0, y1], u * u) - HOP * row * 4 * u * (1 - u),
          };
        }
        const settle = ms - riseMs - ROWS * pegMs;
        const atMs = ms + startsAt;
        if (atMs < liftsAt) {
          const u = easeIn(clamp01(settle / fallMs));
          return {
            x: lerp([binX(k) + jx, slot.x], u),
            y: lerp([binTop, slot.y], u),
          };
        }
        const to = total();
        const p = bezier(
          slot,
          { x: slot.x, y: to.y },
          to,
          easeIn(clamp01((atMs - liftsAt) / liftMs)),
          { x: 0, y: 0 },
        );
        return {
          x: p.x,
          y: p.y,
          scale: atMs >= liftsAt + liftMs ? 0 : 1,
        };
      };
    });

    const fills = Array.from(
      { length: FILL_BEATS },
      (_, b) => landsAfter + ((b + 0.5) * streamMs) / FILL_BEATS,
    );
    const opening = createBeats(
      [growMs],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FILL_SHAKE[0]);
      },
    );
    const filling = createBeats(
      fills,
      (ms) => ms,
      (_, b) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FILL_SHAKE, b / (FILL_BEATS - 1)));
      },
    );
    const surging = createBeats(
      lifts,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SURGE_SHAKE, order.indexOf(k) / ROWS));
      },
    );
    const arriving = createBeats(
      arrives,
      (ms) => ms,
      (ms) => {
        if (ms >= inAt) cover!.blast(total());
        else cover!.burst(total(), 0.5);
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
          opening.tick(ms, now);
          filling.tick(ms, now);
          surging.tick(ms, now);
          arriving.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms > surgeAt + surgeMs) return;
          const grow = easeOut(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - surgeAt) / surgeMs);
          const alpha = WALL_ALPHA * grow * fade;
          // the bins' walls and floor
          for (let k = 0; k <= ROWS + 1; k++) {
            const x = binX(k) - gap / 2;
            drawBeam(ctx, { x, y: binTop }, { x, y: floorY }, WALL_W, alpha);
          }
          drawBeam(
            ctx,
            { x: binX(0) - gap / 2, y: floorY },
            { x: binX(ROWS) + gap / 2, y: floorY },
            WALL_W,
            alpha,
          );
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < pegs.length; i++)
            stampGlimmer(
              ctx,
              pegs[i].x,
              pegs[i].y,
              PEG * grow * fade * (0.85 + 0.15 * Math.sin(ms / 60 + i)),
              ms * 0.003 + i,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
