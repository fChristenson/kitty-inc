// the "Bomb Yo-Yo" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while a hand wisp at the top of the screen flings
// a lit bomb wisp down on a string of glitter onto an income bar, where it
// goes off in a big blast bursting into a cluster along the bar, a bang and a
// hard jolt, and the bar jumps a crit tier; the hand yanks the bomb back up,
// its fuse sparking alight again, and flings it at the next bar, faster
// each time, the last throw blowing in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "bombYoYo";
const MAX_BARS = 4;
const HAND_Y = 140;
const DROP = 0.5;
const BLAST = 230;
const CLUSTER_BLAST = 110;
const STRING_GAP = 26;
const GLITTER = 7;
const BOMB = 0.55;
const HAND = 0.4;
const FUSE = 18;
const BANG_GAP_MS = 60;
const THROW_SHAKE: [number, number] = [0.9, 1.6];

interface Throw {
  bar: RewardBar;
  starts: number;
  blows: number;
  ends: number;
  final: boolean;
}

export const forceBombYoYoEvent = registerWispEvent(
  KEY,
  "Bomb Yo-Yo",
  () => CONFIG.bombYoYoEvent.chance,
  (floor, context, area) => {
    const { throwsMs, holdMs, mergeMs } = CONFIG.bombYoYoEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const hand: Point = { x: bars[0].center.x, y: area.top + HAND_Y };
    let clock = 0;
    const throws: Throw[] = bars.map((bar, k) => {
      const span = lerp(throwsMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      clock += span;
      return {
        bar,
        starts,
        blows: starts + span * DROP,
        ends: clock,
        final: k === bars.length - 1,
      };
    });
    const last = throws[throws.length - 1];
    const endAt = last.blows;
    const blasts = throws.flatMap((t, k) => [
      {
        at: t.bar.center,
        ms: t.blows,
        size: t.final ? BLAST * 1.6 : BLAST,
        shake: lerp(THROW_SHAKE, k / Math.max(1, throws.length - 1)),
      },
      ...[-1, 1].map((side, i) => ({
        at: {
          x: t.bar.center.x + side * t.bar.box.width * 0.33,
          y: t.bar.center.y,
        },
        ms: t.blows + 50 + i * 40,
        size: CLUSTER_BLAST,
        shake: 0.5,
      })),
    ]);
    const throwAt = (ms: number): Throw => {
      let t = throws[0];
      for (const th of throws) if (ms >= th.starts) t = th;
      return t;
    };
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point => {
      const t = Math.max(0, ms);
      const th = throwAt(t);
      const going = t < th.blows;
      const u = going
        ? easeIn(clamp01((t - th.starts) / (th.blows - th.starts)))
        : 1 - easeOut(clamp01((t - th.blows) / (th.ends - th.blows)));
      bombAt.x = hand.x;
      bombAt.y = lerp([hand.y, th.bar.center.y], u);
      return bombAt;
    };
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const tiering = createBeats(
      throws,
      (t) => t.blows,
      (t) => {
        cover!.tierUp(t.bar, hand);
        if (!t.final) return;
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(t.bar.center);
      },
    );

    const handAt = (): Point => hand;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          booming.tick(ms, now);
          tiering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 900) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          if (ms >= endAt) return;
          const at = bomb(ms);
          for (let y = hand.y, i = 0; y < at.y; y += STRING_GAP, i++)
            drawGlitterLight(ctx, hand.x, y, GLITTER, i, 0.8, now);
          const th = throwAt(ms);
          const burn =
            ms < th.blows ? (ms - th.starts) / (th.blows - th.starts) : 0.2;
          drawLitFuse(ctx, at, burn, FUSE, now);
          drawWispBetween(ctx, bomb, ms, now, WISP_SIZE * BOMB, 0.5, 0, endAt);
          drawWispBetween(
            ctx,
            handAt,
            ms,
            now,
            WISP_SIZE * HAND,
            0.4,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
