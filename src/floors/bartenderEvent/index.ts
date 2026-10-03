// the "Bartender" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while two wisps fly out of the clicked
// floor's button to either side of the screen and start flair-tossing a
// slug of cash between them in high arcs like bartenders, each catch a
// splash, a bloop and a jolt, the tosses ever quicker and lower; then the
// last one pours the lot out in streams onto the income bars, each jumping
// a crit tier with a bang, the last in a huge blast and shake as the coins
// sweep into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardBars } from "../eventRewards";

const KEY = "bartender";
const REWARD = 2;
const MAX_BARS = 3;
const TOSSES = 6;
const EDGE = 80;
const HIGH: [number, number] = [320, 140];
const ENTER_MS = 250;
const POUR_GAP_MS = 90;
const TENDER = 0.55;
const CATCH_SHAKE: [number, number] = [0.3, 1];
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceBartenderEvent = registerWispEvent(
  KEY,
  "Bartender",
  () => CONFIG.bartenderEvent.chance,
  (floor, context, area) => {
    const { tossesMs, pourMs, holdMs, mergeMs } = CONFIG.bartenderEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const y = (area.top + area.bottom) / 2 + 40;
    const hands: Point[] = [
      { x: area.left + EDGE, y },
      { x: area.right - EDGE, y },
    ];
    let clock = ENTER_MS;
    const tosses = Array.from({ length: TOSSES }, (_, k) => {
      const from = hands[k % 2];
      const to = hands[(k + 1) % 2];
      const u = k / (TOSSES - 1);
      const ctrl: Point = { x: (from.x + to.x) / 2, y: y - lerp(HIGH, u) };
      const line = sampleLine(
        (v) => bezier(from, ctrl, to, v, { x: 0, y: 0 }),
        40,
      );
      const flight = lerp(tossesMs, u);
      const starts = clock;
      clock += flight;
      return {
        to,
        line,
        starts,
        lands: clock,
        pour: {
          coinsAlong: 700,
          width: 30,
          streamMs: flight * 0.35,
          travelMs: flight,
        } as Pour,
      };
    });
    const pourer = hands[TOSSES % 2];
    const pour: Pour = {
      coinsAlong: 600,
      width: 28,
      streamMs: 260,
      travelMs: pourMs,
    };
    const pours = bars.map((bar, k) => {
      const starts = clock + k * POUR_GAP_MS;
      const ctrl: Point = {
        x: (pourer.x + bar.center.x) / 2,
        y: Math.min(pourer.y, bar.center.y) - 100,
      };
      const line = sampleLine(
        (v) => bezier(pourer, ctrl, bar.center, v, { x: 0, y: 0 }),
        30,
      );
      return { bar, line, starts, lands: starts + pourMs };
    });
    const last = pours[pours.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      endAt + holdMs + mergeMs,
    );
    const tenders = hands.map((hand, k) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(Math.min(1, ms / ENTER_MS));
        at.x = lerp([button.x, hand.x], u);
        at.y = lerp([button.y, hand.y], u) + Math.sin(ms / 110 + k * 2) * 5;
        return at;
      };
    });

    const tossing = createBeats(
      tosses,
      (t) => t.starts,
      (t) => pourLine(cover!, t.line, t.pour),
    );
    const catching = createBeats(
      tosses,
      (t) => t.lands,
      (t, k) => {
        cover!.burst(t.to, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CATCH_SHAKE, k / (TOSSES - 1)));
      },
    );
    const pouring = createBeats(
      pours,
      (p) => p.starts,
      (p) => pourLine(cover!, p.line, pour),
    );
    const landing = createBeats(
      pours,
      (p) => p.lands,
      (p, k) => {
        cover!.tierUp(p.bar, pourer);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, pours.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          tossing.tick(ms, now);
          catching.tick(ms, now);
          pouring.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const t of tenders)
            drawWispBetween(ctx, t, ms, now, WISP_SIZE * TENDER, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
