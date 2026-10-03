// the "Mjolnir" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while a big hammer wisp flies up out of the
// clicked floor's button to the top of the screen and whirls there as
// lightning cracks in from the screen's edges and charges it; then it
// comes smashing straight down onto an income bar, dragging a huge bolt
// with it, in a blinding strike, a crack and a jolt that jumps the bar a
// crit tier; it flies back up, charges and smashes again, ever faster, bar
// after bar; the last strike slams every bar in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardBars } from "../eventRewards";

const KEY = "mjolnir";
const MAX_BARS = 3;
const FEEDS = 3;
// the hammer hovers HIGH px under the screen's top, whirling WHIRL px round
const HIGH = 90;
const WHIRL = 22;
const SLAM_MS = 130;
const BOLT_MS = 260;
const HAMMER = 0.9;
const STRIKE_SHAKE: [number, number] = [1, 1.6];

export const forceMjolnirEvent = registerWispEvent(
  KEY,
  "Mjolnir",
  () => CONFIG.mjolnirEvent.chance,
  (floor, context, area) => {
    const { chargesMs, holdMs, mergeMs } = CONFIG.mjolnirEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const smashes = bars.map((bar, k) => {
      const hover: Point = { x: bar.center.x, y: area.top + HIGH };
      const charge = lerp(chargesMs, k / Math.max(1, bars.length - 1));
      const s = {
        bar,
        from,
        hover,
        starts: clock,
        slams: clock + charge,
        hits: clock + charge + SLAM_MS,
        charge,
        feeds: Array.from({ length: FEEDS }, (_, i) =>
          createBolt(
            {
              x:
                i === 1
                  ? hover.x + (Math.random() - 0.5) * 200
                  : i === 0
                    ? area.left
                    : area.right,
              y: i === 1 ? area.top : area.top + Math.random() * 200,
            },
            hover,
            1,
          ),
        ),
        bolt: createBolt({ x: bar.center.x, y: area.top - 40 }, bar.center, 3),
      };
      clock = s.hits;
      from = bar.center;
      return s;
    });
    const endAt = clock;
    const hammerAt: Point = { x: 0, y: 0 };
    const hammer = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      for (const s of smashes) {
        if (ms > s.hits) continue;
        if (ms < s.slams) {
          const rise = easeOut(clamp01((ms - s.starts) / (s.charge * 0.4)));
          const whirl = rise * WHIRL;
          const a = ms / 70;
          hammerAt.x = lerp([s.from.x, s.hover.x], rise) + Math.cos(a) * whirl;
          hammerAt.y =
            lerp([s.from.y, s.hover.y], rise) + Math.sin(a) * whirl * 0.5;
          return hammerAt;
        }
        const u = easeIn((ms - s.slams) / SLAM_MS);
        hammerAt.x = s.hover.x;
        hammerAt.y = lerp([s.hover.y, s.bar.center.y], u);
        return hammerAt;
      }
      return null;
    };

    const striking = createBeats(
      smashes,
      (s) => s.hits,
      (s, k) => {
        cover!.tierUp(s.bar, s.hover);
        if (k === smashes.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, smashes.length - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const s of smashes) {
            const charging = (ms - s.starts) / s.charge;
            if (charging > 0.4 && ms < s.slams) {
              const flicker = Math.random() < 0.7 ? 1 : 0.3;
              for (const feed of s.feeds)
                drawBolt(ctx, feed, flicker * 0.8, 0.5);
            }
            const t = (ms - s.slams) / (SLAM_MS + BOLT_MS);
            if (t > 0 && t < 1) {
              drawBolt(ctx, s.bolt, 1 - t, 1.2);
              if (ms > s.hits) drawStrike(ctx, s.bar.center, 1 - t, 1.6, now);
            }
          }
          let heat = 0;
          for (const s of smashes)
            if (ms > s.starts && ms < s.hits)
              heat = (ms - s.starts) / (s.hits - s.starts);
          drawWispBetween(
            ctx,
            hammer,
            ms,
            now,
            WISP_SIZE * HAMMER,
            heat,
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
