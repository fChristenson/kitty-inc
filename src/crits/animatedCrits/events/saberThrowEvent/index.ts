// the "Saber Throw" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while the clicked floor's button hurls a spinning blade
// of blazing light; it whirls through the air in a great curving arc,
// slicing through income bar after income bar, each cut a shower of sparks,
// a crack and a big jolt as the bar jumps a crit tier, spinning ever faster,
// and the last cut ends in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "saberThrow";
const MAX_BARS = 3;
// a blade BLADE px long, spinning SPIN turns a ms, quickening
const BLADE = 130;
const BLADE_W = 16;
const SPIN = 0.006;
const SWING = 160;
const HILT = 0.4;
const FLARE = 36;
const FLARE_MS = 220;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceSaberThrowEvent = registerWispEvent(
  KEY,
  "Saber Throw",
  () => CONFIG.saberThrowEvent.chance,
  (floor, context) => {
    const { throwMs, holdMs, mergeMs } = CONFIG.saberThrowEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // through each bar, swinging out wide between them
    const route: Point[] = [button];
    const cutIndex: number[] = [];
    bars.forEach((bar, k) => {
      if (k > 0)
        route.push({
          x: bar.center.x + (k % 2 === 0 ? -SWING : SWING),
          y: (bars[k - 1].center.y + bar.center.y) / 2,
        });
      route.push(bar.center);
      cutIndex.push(route.length - 1);
    });
    const lastIndex = route.length - 1;
    // time runs u ** 1.3 along the route, so it speeds up
    const timeOf = (i: number) => throwMs * (i / lastIndex) ** (1 / 1.3);
    const cuts = bars.map((bar, k) => ({ bar, ms: timeOf(cutIndex[k]) }));
    const last = cuts[cuts.length - 1];
    const endAt = last.ms;
    const hiltAt: Point = { x: 0, y: 0 };
    const hilt = (ms: number): Point =>
      alongRoute(route, clamp01(ms / throwMs) ** 1.3, hiltAt);
    const tipA: Point = { x: 0, y: 0 };
    const tipB: Point = { x: 0, y: 0 };

    const cutting = createBeats(
      cuts,
      (c) => c.ms,
      (c, k) => {
        cover!.tierUp(c.bar, button);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, cuts.length - 1)));
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
        tick: (ms, now) => cutting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLARE_MS) return;
          if (ms <= endAt) {
            const at = hilt(ms);
            const a = ms * SPIN * Math.PI * 2 * (1 + ms / endAt);
            tipA.x = at.x + (Math.cos(a) * BLADE) / 2;
            tipA.y = at.y + (Math.sin(a) * BLADE) / 2;
            tipB.x = at.x - (Math.cos(a) * BLADE) / 2;
            tipB.y = at.y - (Math.sin(a) * BLADE) / 2;
            drawBeam(ctx, tipB, tipA, BLADE_W, 1);
          }
          for (const c of cuts) {
            const f = (ms - c.ms) / FLARE_MS;
            if (f >= 0 && f < 1)
              drawBeamFlare(ctx, c.bar.center, FLARE, 1 - f, now);
          }
          if (ms <= endAt)
            drawWispBetween(ctx, hilt, ms, now, WISP_SIZE * HILT, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
    playSwoosh();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
