// the "Slide Puzzle" event (experiment: the frozen screen turns into a
// sliding tile puzzle; cash): it covers its crit, whose click freezes the
// screen and it splits into a grid of tiles with one missing, like the old
// fifteen puzzle; the tiles slide about at a furious pace, scrambling the
// picture, each slide a click, a jolt and a spurt of coins, then slide right
// back again, ever faster, solving it; the missing tile slams into its gap
// and the screen goes off in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "slidePuzzle";
const REWARD = 4;
const BEHIND = "#0B0814";
const COLS = 4;
const ROWS = 5;
const SCRAMBLE = 7;
const GAP = 3;
const SPLIT_MS = 150;
const SLAM_MS = 170;
// the missing tile slams in from SLAM_SCALE times its size
const SLAM_SCALE = 1.8;
const SLIDE_COINS = 12;
const SLIDE_SHAKE: [number, number] = [0.4, 1.1];

export const forceSlidePuzzleEvent = registerWispEvent(
  KEY,
  "Slide Puzzle",
  () => CONFIG.slidePuzzleEvent.chance,
  (floor, context, area) => {
    const { slidesMs, holdMs, mergeMs } = CONFIG.slidePuzzleEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cw = width / COLS;
    const ch = height / ROWS;
    const cellX = (c: number) => left + (c % COLS) * cw;
    const cellY = (c: number) => top + Math.floor(c / COLS) * ch;
    const neighbours = (c: number) =>
      [
        c % COLS > 0 ? c - 1 : -1,
        c % COLS < COLS - 1 ? c + 1 : -1,
        c >= COLS ? c - COLS : -1,
        c < COLS * (ROWS - 1) ? c + COLS : -1,
      ].filter((n) => n >= 0);
    // the blank wanders SCRAMBLE steps, then retraces them
    const missing = Math.floor(Math.random() * COLS * ROWS);
    const walk: number[] = [missing];
    for (let i = 0; i < SCRAMBLE; i++) {
      const here = walk[walk.length - 1];
      const options = neighbours(here).filter(
        (n) => n !== walk[walk.length - 2],
      );
      walk.push(options[Math.floor(Math.random() * options.length)]);
    }
    for (let i = SCRAMBLE - 1; i >= 0; i--) walk.push(walk[i]);
    // each slide moves the tile at walk[m + 1] into the blank at walk[m]
    const states: number[][] = [
      Array.from({ length: COLS * ROWS }, (_, c) => c),
    ];
    const slides = walk.slice(1).map((into, m) => {
      const blank = walk[m];
      const state = [...states[m]];
      const tile = state[into];
      state[blank] = tile;
      state[into] = missing;
      states.push(state);
      return { tile, from: into, to: blank, startsAt: 0, ms: 0 };
    });
    let clock: number = SPLIT_MS;
    slides.forEach((slide, m) => {
      slide.startsAt = clock;
      slide.ms = lerp(slidesMs, m / (slides.length - 1));
      clock += slide.ms;
    });
    const solvedAt = clock;
    const endAt = solvedAt + SLAM_MS;

    let shot: ScreenCopy | null = null;
    const clicking = createBeats(
      slides,
      (s) => s.startsAt + s.ms,
      (s, m) => {
        const at = { x: cellX(s.to) + cw / 2, y: cellY(s.to) + ch / 2 };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, SLIDE_COINS, [60, 200]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SLIDE_SHAKE, m / (slides.length - 1)));
      },
    );
    const slamming = createBeats(
      [endAt],
      (ms) => ms,
      () =>
        cover!.blast({
          x: cellX(missing) + cw / 2,
          y: cellY(missing) + ch / 2,
        }),
    );
    const tile = (
      ctx: CanvasRenderingContext2D,
      copy: ScreenCopy,
      t: number,
      x: number,
      y: number,
      scale = 1,
    ) => {
      const w = (cw - GAP * 2) * scale;
      const h = (ch - GAP * 2) * scale;
      drawScreenPart(
        ctx,
        copy,
        cellX(t) + GAP,
        cellY(t) + GAP,
        cw - GAP * 2,
        ch - GAP * 2,
        x + cw / 2 - w / 2,
        y + ch / 2 - h / 2,
        w,
        h,
      );
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          clicking.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          let m = 0;
          while (
            m < slides.length - 1 &&
            ms >= slides[m].startsAt + slides[m].ms
          )
            m++;
          const slide = slides[m];
          const u = easeOut(clamp01((ms - slide.startsAt) / slide.ms));
          // the board before this slide, its sliding tile drawn on its way
          const state = states[m];
          for (let c = 0; c < state.length; c++) {
            const t = state[c];
            if (t === missing || (u > 0 && t === slide.tile)) continue;
            tile(ctx, shot, t, cellX(c), cellY(c));
          }
          if (u > 0)
            tile(
              ctx,
              shot,
              slide.tile,
              lerp([cellX(slide.from), cellX(slide.to)], u),
              lerp([cellY(slide.from), cellY(slide.to)], u),
            );
          if (ms >= solvedAt) {
            const s = easeIn(clamp01((ms - solvedAt) / SLAM_MS));
            tile(
              ctx,
              shot,
              missing,
              cellX(missing),
              cellY(missing),
              lerp([SLAM_SCALE, 1], s),
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
