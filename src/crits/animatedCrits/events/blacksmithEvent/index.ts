// the "Blacksmith" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while an anvil wisp glows up low in the middle;
// bolt after bolt of lightning hammers down onto it from the sky, each blow
// a blinding flash, a crack and a jolt, throwing a spray of forked sparks,
// one of them arcing onto an income bar to forge it a crit tier; the blows
// fall faster and faster, the anvil glowing hotter, until a last colossal
// blow sends sparks onto every bar at once in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "blacksmith";
const MAX_BARS = 4;
const WARMUPS = 2;
const SPARKS = 3;
const SPARK_REACH: [number, number] = [120, 240];
const HEIGHT = 0.74;
const ANVIL = 0.9;
const BLOW_MS = 150;
const SPARK_MS = 220;
const BLOW_SHAKE: [number, number] = [0.5, 1.2];

interface Blow {
  ms: number;
  hammer: Bolt;
  sparks: Bolt[];
  // the bars its sparks forge
  bars: RewardBar[];
  last: boolean;
}

export const forceBlacksmithEvent = registerWispEvent(
  KEY,
  "Blacksmith",
  () => CONFIG.blacksmithEvent.chance,
  (floor, context, area) => {
    const { warmMs, blowsMs, holdMs, mergeMs } = CONFIG.blacksmithEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const anvil: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HEIGHT,
    };
    const anvilAt = () => anvil;
    const count = WARMUPS + bars.length + 1;
    let clock = warmMs;
    const blows: Blow[] = Array.from({ length: count }, (_, k) => {
      const ms = clock;
      clock += lerp(blowsMs, k / Math.max(1, count - 2));
      const last = k === count - 1;
      const forged = last ? bars : k >= WARMUPS ? [bars[k - WARMUPS]] : [];
      const sky: Point = {
        x: anvil.x + (Math.random() - 0.5) * 160,
        y: area.top - 30,
      };
      return {
        ms,
        hammer: createBolt(sky, anvil, last ? 3 : 1),
        sparks: [
          ...Array.from({ length: SPARKS }, () => {
            const a = -Math.PI * (0.1 + 0.8 * Math.random());
            const r = lerp(SPARK_REACH, Math.random());
            return createBolt(
              anvil,
              {
                x: anvil.x + Math.cos(a) * r,
                y: anvil.y + Math.sin(a) * r * 0.7,
              },
              1,
            );
          }),
          ...forged.map((bar) => createBolt(anvil, bar.center, 1)),
        ],
        bars: forged,
        last,
      };
    });
    const endAt = blows[count - 1].ms;

    const hammering = createBeats(
      blows,
      (b) => b.ms,
      (blow, k) => {
        for (const bar of blow.bars) cover!.tierUp(bar, anvil);
        if (blow.last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(anvil);
          return;
        }
        for (const bar of blow.bars) cover!.burst(bar.center, 0.6);
        cover!.burst(anvil, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLOW_SHAKE, k / (count - 2)));
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
        tick: (ms, now) => hammering.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + SPARK_MS) return;
          if (ms < endAt)
            drawWisp(
              ctx,
              anvilAt,
              ms,
              now,
              WISP_SIZE * ANVIL * clamp01(ms / warmMs),
              lerp([0.4, 1], ms / endAt),
            );
          for (const blow of blows) {
            const t = ms - blow.ms;
            if (t < 0 || t >= SPARK_MS) continue;
            const scale = blow.last ? 2 : 1;
            if (t < BLOW_MS) {
              const fade = 1 - t / BLOW_MS;
              drawBolt(ctx, blow.hammer, fade, scale);
              drawStrike(ctx, anvil, fade, scale, now);
            }
            const fade = 1 - t / SPARK_MS;
            for (const spark of blow.sparks)
              drawBolt(ctx, spark, fade, 0.5 * scale);
            for (const bar of blow.bars)
              drawStrike(ctx, bar.center, fade, 0.8, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
