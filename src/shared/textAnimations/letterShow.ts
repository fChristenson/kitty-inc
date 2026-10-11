// a letter show: some of a text's letters (a label's 7s, a group of digits in
// the total) put through one text effect one after another, each landing on
// its beat (onLand, e.g. a sound or a payout), with glitter on each landing,
// over the whole group on the last, or none. Start one with startLetterShow,
// draw it every frame with drawLetterShow (false once it's over); the caller
// draws the rest of the text, leaving the show's letters out (drawLettersExcept
// does it letter by letter)
import { createBeats, type Beats } from "../eventBeats";
import { drawSlamText, slamTextLetterCenter } from "../eventEndSlam";
import {
  createLetterPose,
  drawGlitterBurst,
  drawLetter,
  TEXT_EFFECTS,
  type TextEffect,
} from "./effects";

export function pickTextEffect(): TextEffect {
  return TEXT_EFFECTS[Math.floor(Math.random() * TEXT_EFFECTS.length)];
}

export interface LetterStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  // digits in fixed cells, as a counting number lays them out
  tabular: boolean;
}

export type LetterBurst = "each" | "group" | "none";

export interface LetterShowOptions {
  // a random one from TEXT_EFFECTS if left out
  effect?: TextEffect;
  staggerMs: number;
  burst?: LetterBurst;
  onLand?: (index: number, last: boolean) => void;
  // what each letter shows, if not the text's own (a group caught as it was)
  chars?: string;
}

export interface LetterShow {
  readonly effect: TextEffect;
  readonly startedAt: number;
  // the letters, as indices into the text from where drawLetterShow is told
  // it starts
  readonly letters: readonly number[];
  // whole show, every letter back at rest
  readonly ms: number;
  landAt(index: number): number;
}

interface Show extends LetterShow {
  readonly staggerMs: number;
  readonly burst: LetterBurst;
  readonly chars: string | null;
  readonly beats: Beats<number>;
}

export function startLetterShow(
  letters: readonly number[],
  {
    effect = pickTextEffect(),
    staggerMs,
    burst = "each",
    onLand,
    chars,
  }: LetterShowOptions,
): LetterShow {
  const last = letters.length - 1;
  const landAt = (i: number): number => i * staggerMs + effect.landMs;
  const show: Show = {
    effect,
    startedAt: Date.now(),
    letters,
    ms: last * staggerMs + effect.ms,
    landAt,
    staggerMs,
    burst,
    chars: chars ?? null,
    beats: createBeats(
      letters.map((_, i) => i),
      landAt,
      (i) => onLand?.(i, i === last),
    ),
  };
  return show;
}

const pose = createLetterPose();

// the show's letters over text drawn at x, top, its letters height tall
// (ctx's font, textAlign and textBaseline top), the letters counted from
// text index `at`; fires each landing's beat. False once it's over
export function drawLetterShow(
  ctx: CanvasRenderingContext2D,
  letterShow: LetterShow,
  text: string,
  at: number,
  x: number,
  top: number,
  height: number,
  style: LetterStyle,
): boolean {
  const show = letterShow as Show;
  const ms = Date.now() - show.startedAt;
  show.beats.tick(ms, performance.now());
  if (ms >= show.ms) return false;
  const { letters, effect, staggerMs, chars, burst } = show;
  const { fill, stroke, strokeWidth, tabular } = style;
  const cy = top + height / 2;
  for (let i = 0; i < letters.length; i++) {
    const index = at + letters[i];
    if (index < 0 || index >= text.length) continue;
    const cx = slamTextLetterCenter(ctx, text, index, x, tabular);
    effect.pose(ms - i * staggerMs, chars?.[i] ?? text[index], pose);
    drawLetter(ctx, pose, cx, cy, height, fill, stroke, strokeWidth, tabular);
    if (burst === "each")
      drawGlitterBurst(ctx, cx, cy, height, ms - show.landAt(i));
  }
  if (burst === "group" && letters.length > 0) {
    const first = at + letters[0];
    const lastIndex = at + letters[letters.length - 1];
    if (first >= 0 && lastIndex < text.length) {
      const left = slamTextLetterCenter(ctx, text, first, x, tabular);
      const right = slamTextLetterCenter(ctx, text, lastIndex, x, tabular);
      drawGlitterBurst(
        ctx,
        (left + right) / 2,
        cy,
        height,
        ms - show.landAt(letters.length - 1),
        1 + (right - left) / (height * 2),
      );
    }
  }
  return true;
}

// text at rest, letter by letter where the whole text puts them, leaving out
// the letters at `skip` (ascending); ctx's font, textAlign and textBaseline top
export function drawLettersExcept(
  ctx: CanvasRenderingContext2D,
  text: string,
  skip: readonly number[],
  x: number,
  top: number,
  height: number,
  { fill, stroke, strokeWidth, tabular }: LetterStyle,
): void {
  let next = 0;
  for (let k = 0; k < text.length; k++) {
    if (k === skip[next]) {
      next++;
      continue;
    }
    if (text[k] === " ") continue;
    const cx = slamTextLetterCenter(ctx, text, k, x, tabular);
    ctx.save();
    ctx.textAlign = "center";
    drawSlamText(
      ctx,
      null,
      text[k],
      cx,
      top,
      height,
      fill,
      stroke,
      strokeWidth,
      tabular,
    );
    ctx.restore();
  }
}
