// the "Dots and Boxes" event (experiment: the pencil game playing itself;
// cash): it covers its crit, whose click freezes the screen while a grid of
// glittering dots pops up mid-screen and a pen wisp plays dots and boxes
// against itself, lines of light snapping in between the dots faster and
// faster; whoever closes a box takes it and goes again, the box flaring gold
// and bursting into coins with a pop and a jolt, until the endgame's long
// chains are taken in rippling runs, every capture shaking harder; then the
// whole board blows in a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { drawBeam } from "../../shared/beam";
import { drawSprayCoat } from "../../shared/spray";

const KEY = "dotsAndBoxes";
const REWARD = 4;
const COLS = 4;
const ROWS = 3;
const POP_MS = 200;
const GROW_MS = 60;
const CAPTURE_PAUSE = 40;
const LINE = 8;
const DOT = 12;
const PEN = 0.45;
const COINS = 8;
const REACH: [number, number] = [60, 200];
const FLARE_MS = 300;
const FINALE_PAUSE = 250;
const BLOOP_GAP_MS = 50;
const CAPTURE_SHAKE: [number, number] = [0.35, 1.2];

interface Move {
  from: Point;
  to: Point;
  mid: Point;
  ms: number;
  captures: number[];
}

// the game played out: a box's closer always takes it, else a line that
// gives nothing away, else whatever's left
function playGame(): { line: number; captures: number[] }[] {
  const hLines = (ROWS + 1) * COLS;
  const count = hLines + ROWS * (COLS + 1);
  const boxesOf = (id: number) => {
    if (id < hLines) {
      const r = Math.floor(id / COLS);
      const c = id % COLS;
      return [r - 1, r]
        .filter((row) => row >= 0 && row < ROWS)
        .map((row) => row * COLS + c);
    }
    const j = id - hLines;
    const r = Math.floor(j / (COLS + 1));
    const c = j % (COLS + 1);
    return [c - 1, c]
      .filter((col) => col >= 0 && col < COLS)
      .map((col) => r * COLS + col);
  };
  const sides = new Array(ROWS * COLS).fill(0);
  const free = Array.from({ length: count }, (_, i) => i);
  const pick = (ids: number[]) => ids[Math.floor(Math.random() * ids.length)];
  const moves: { line: number; captures: number[] }[] = [];
  while (free.length) {
    const closing = free.filter((id) =>
      boxesOf(id).some((b) => sides[b] === 3),
    );
    const safe = free.filter((id) => boxesOf(id).every((b) => sides[b] < 2));
    const line = pick(closing.length ? closing : safe.length ? safe : free);
    free.splice(free.indexOf(line), 1);
    const captures = boxesOf(line).filter((b) => ++sides[b] === 4);
    moves.push({ line, captures });
  }
  return moves;
}

export const forceDotsAndBoxesEvent = registerWispEvent(
  KEY,
  "Dots and Boxes",
  () => CONFIG.dotsAndBoxesEvent.chance,
  (floor, context, area) => {
    const { movesMs, holdMs, mergeMs } = CONFIG.dotsAndBoxesEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const gap = Math.min((width * 0.8) / COLS, (height * 0.5) / ROWS);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * 0.5,
    };
    const dot = (r: number, c: number): Point => ({
      x: centre.x + (c - COLS / 2) * gap,
      y: centre.y + (r - ROWS / 2) * gap,
    });
    const dots: Point[] = [];
    for (let r = 0; r <= ROWS; r++)
      for (let c = 0; c <= COLS; c++) dots.push(dot(r, c));
    const boxCentres = Array.from({ length: ROWS * COLS }, (_, b) =>
      dot(Math.floor(b / COLS) + 0.5, (b % COLS) + 0.5),
    );
    const hLines = (ROWS + 1) * COLS;
    const ends = (id: number): [Point, Point] => {
      if (id < hLines) {
        const r = Math.floor(id / COLS);
        const c = id % COLS;
        return [dot(r, c), dot(r, c + 1)];
      }
      const j = id - hLines;
      const r = Math.floor(j / (COLS + 1));
      const c = j % (COLS + 1);
      return [dot(r, c), dot(r + 1, c)];
    };

    const game = playGame();
    let clock: number = POP_MS;
    const moves: Move[] = game.map(({ line, captures }, k) => {
      const [from, to] = ends(line);
      const ms = clock;
      clock += lerp(movesMs, k / Math.max(1, game.length - 1));
      if (captures.length) clock += CAPTURE_PAUSE;
      return {
        from,
        to,
        mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
        ms,
        captures,
      };
    });
    const captures = moves.flatMap((m) =>
      m.captures.map((box) => ({ box, ms: m.ms + GROW_MS })),
    );
    const capturedAt = new Array(ROWS * COLS).fill(Infinity);
    for (const c of captures) capturedAt[c.box] = c.ms;
    const finaleAt = moves[moves.length - 1].ms + GROW_MS + FINALE_PAUSE;
    const endAt = finaleAt + FLARE_MS;

    // the pen hops to each new line as it's drawn
    const pen: Point = { x: 0, y: 0 };
    const penAt = (ms: number): Point | null => {
      if (ms < POP_MS * 0.5 || ms > finaleAt) return null;
      let k = 0;
      while (k < moves.length - 1 && ms >= moves[k + 1].ms) k++;
      const prev = k > 0 ? moves[k - 1].mid : centre;
      const u = easeOut(
        clamp01(
          (ms - (k > 0 ? moves[k - 1].ms : 0)) /
            Math.max(1, moves[k].ms - (k > 0 ? moves[k - 1].ms : 0)),
        ),
      );
      pen.x = lerp([prev.x, moves[k].mid.x], u);
      pen.y = lerp([prev.y, moves[k].mid.y], u);
      return pen;
    };

    let bloop = -Infinity;
    const capturing = createBeats(
      captures,
      (c) => c.ms,
      (c, k) => {
        const at = boxCentres[c.box];
        cover!.burst(at, 0.35);
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, COINS, REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        if (c.ms - bloop >= BLOOP_GAP_MS) {
          bloop = c.ms;
          playBloop();
        }
        shakeScreen(lerp(CAPTURE_SHAKE, k / Math.max(1, captures.length - 1)));
      },
    );
    const finishing = createBeats(
      [finaleAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );
    const tip: Point = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          capturing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - finaleAt) / FLARE_MS);
          for (let b = 0; b < boxCentres.length; b++) {
            const t = ms - capturedAt[b];
            if (t < 0) continue;
            drawSprayCoat(
              ctx,
              boxCentres[b],
              gap * 0.9,
              gap * 0.9,
              0.7 * fade,
              Math.max(1 - t / FLARE_MS, ms >= finaleAt ? fade : 0),
            );
          }
          for (const m of moves) {
            if (ms < m.ms) break;
            const g = clamp01((ms - m.ms) / GROW_MS);
            tip.x = lerp([m.from.x, m.to.x], g);
            tip.y = lerp([m.from.y, m.to.y], g);
            drawBeam(ctx, m.from, tip, LINE, fade);
          }
          const pop = easeOut(clamp01(ms / POP_MS));
          for (let i = 0; i < dots.length; i++)
            drawGlitterLight(
              ctx,
              dots[i].x,
              dots[i].y,
              DOT * pop,
              i,
              fade,
              now,
            );
          drawWisp(ctx, penAt, ms, now, WISP_SIZE * PEN, 0.7);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
