// the "Shuffle" event (experiment: the frozen screen shuffled like a deck of
// cards; cash): it covers its crit, whose click freezes the screen and it
// splits into strips like a deck of cards; the deck cuts in two, the halves
// pulling apart sideways, then riffles back together strip by strip, each
// snapping in with a click, a jolt and a spurt of coins, twice over and
// faster the second time; then the jumbled deck squares up with a slap,
// every strip back in its place, in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "shuffle";
const REWARD = 4;
const BEHIND = "#0B0814";
const STRIPS = 6;
const GAP = 3;
// a cut pulls each half OUT of the width aside; in a riffle each strip waits
// STAGGER of it after the one before
const OUT = 0.24;
const STAGGER = 0.11;
const SNAP_COINS = 10;
const SNAP_SHAKE: [number, number] = [0.4, 1.1];

interface Move {
  start: number;
  span: number;
  fromX: number;
  fromSlot: number;
  toX: number;
  toSlot: number;
  ease: (t: number) => number;
}

export const forceShuffleEvent = registerWispEvent(
  KEY,
  "Shuffle",
  () => CONFIG.shuffleEvent.chance,
  (floor, context, area) => {
    const { cutMs, rifflesMs, squareMs, holdMs, mergeMs } = CONFIG.shuffleEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const strip = height / STRIPS;
    const out = width * OUT;
    // each strip's moves, and where each lands in a riffle
    const moves: Move[][] = Array.from({ length: STRIPS }, () => []);
    const snaps: { at: number; slot: number }[] = [];
    let deck = Array.from({ length: STRIPS }, (_, i) => i);
    let clock = 0;
    for (const riffleMs of rifflesMs) {
      const half = Math.ceil(STRIPS / 2);
      deck.forEach((s, slot) =>
        moves[s].push({
          start: clock,
          span: cutMs,
          fromX: 0,
          fromSlot: slot,
          toX: slot < half ? -out : out,
          toSlot: slot,
          ease: easeOut,
        }),
      );
      clock += cutMs;
      const a = deck.slice(0, half);
      const b = deck.slice(half);
      const next: number[] = [];
      const bFirst = Math.random() < 0.5;
      for (let i = 0; i < half; i++) {
        if (bFirst && b[i] !== undefined) next.push(b[i]);
        next.push(a[i]);
        if (!bFirst && b[i] !== undefined) next.push(b[i]);
      }
      const snapMs = riffleMs * (1 - STAGGER * (STRIPS - 1));
      next.forEach((s, slot) => {
        const start = clock + slot * STAGGER * riffleMs;
        const from = deck.indexOf(s);
        moves[s].push({
          start,
          span: snapMs,
          fromX: from < half ? -out : out,
          fromSlot: from,
          toX: 0,
          toSlot: slot,
          ease: smoothstep,
        });
        snaps.push({ at: start + snapMs, slot });
      });
      clock += riffleMs;
      deck = next;
    }
    deck.forEach((s, slot) =>
      moves[s].push({
        start: clock,
        span: squareMs,
        fromX: 0,
        fromSlot: slot,
        toX: 0,
        toSlot: s,
        ease: easeIn,
      }),
    );
    const endAt = clock + squareMs;
    const centre = { x: left + width / 2, y: top + height / 2 };
    // strip s's offset and slot at ms
    const placed = { x: 0, slot: 0 };
    const place = (s: number, ms: number) => {
      const list = moves[s];
      let move = list[0];
      for (const m of list) if (ms >= m.start) move = m;
      const u = move.ease(clamp01((ms - move.start) / move.span));
      placed.x = lerp([move.fromX, move.toX], u);
      placed.slot = lerp([move.fromSlot, move.toSlot], u);
      return placed;
    };

    let shot: ScreenCopy | null = null;
    const snapping = createBeats(
      snaps,
      (s) => s.at,
      (s, k) => {
        const at = { x: centre.x, y: top + (s.slot + 0.5) * strip };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, SNAP_COINS, [80, 240]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SNAP_SHAKE, k / Math.max(1, snaps.length - 1)));
      },
    );
    const cutting = createBeats(
      rifflesMs.map((_, r) =>
        rifflesMs.slice(0, r).reduce((sum, ms) => sum + ms + cutMs, 0),
      ),
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const squaring = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          cutting.tick(ms, now);
          snapping.tick(ms, now);
          squaring.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          for (let s = 0; s < STRIPS; s++) {
            const p = place(s, ms);
            drawScreenPart(
              ctx,
              shot,
              left,
              top + s * strip,
              width,
              strip - GAP,
              left + p.x,
              top + p.slot * strip,
              width,
              strip - GAP,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
