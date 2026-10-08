// the "Bubble Wand" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a wisp floats up off the clicked
// floor's button and, swaying like a wand, blows one wobbling bubble of cash
// after another, quicker each time; each swells out of the wisp, its skin
// a ring of coins round a slosh of cash, and drifts off to an empty spot on
// a floor in view, where it pops with a flash, a bloop and a jolt and a new
// worker drops in out of the splash; then the wisp shoots into the total in
// a huge blast and shake. Pays floor income × floor number × REWARD, plus
// the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "bubbleWand";
const REWARD = 2;
const MAX_HIRES = 4;
// the wand floats RISE px over the button, swaying SWAY px either side
const RISE = 130;
const SWAY = 45;
const SWAY_RATE = 0.006;
// each bubble is RADIUS px round, its skin SKIN coins and its slosh FILL,
// wobbling WOBBLE of its size; it pops POP px out
const RADIUS = 80;
const SKIN = 240;
const FILL = 110;
const COIN = 0.55;
const WOBBLE = 0.1;
const POP: [number, number] = [40, 200];
// it drifts LOFT px over the higher end of its flight, bowing DRIFT px aside
const LOFT = 130;
const DRIFT = 90;
// it pops ABOVE px over where the hire will stand
const ABOVE = 40;
const FORM_MS = 280;
const POP_SHAKE: [number, number] = [0.7, 1.5];

export const forceBubbleWandEvent = registerWispEvent(
  KEY,
  "Bubble Wand",
  () => CONFIG.bubbleWandEvent.chance,
  (floor, context, area) => {
    const {
      riseMs,
      gapsMs,
      inflateMs,
      floatMs,
      popMs,
      diveMs,
      holdMs,
      mergeMs,
    } = CONFIG.bubbleWandEvent;
    const hires = findRewardHires(floor, context)
      .sort((a, b) => a.x - b.x)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const wandY = button.y - RISE;
    const wandX = (ms: number) =>
      button.x + Math.sin(ms * SWAY_RATE) * SWAY * clamp01(ms / riseMs);
    let clock: number = riseMs;
    const bubbles = hires.map((hire, k) => {
      const blowAt = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const from: Point = { x: wandX(blowAt), y: wandY };
      const to: Point = { x: hire.x, y: hire.y - ABOVE };
      const side = to.x < from.x ? -1 : 1;
      return {
        hire,
        from,
        start: { x: from.x, y: from.y - RADIUS },
        to,
        bow: {
          x: (from.x + to.x) / 2 + side * DRIFT,
          y: Math.min(from.y, to.y) - LOFT,
        },
        blowAt,
        floatAt: blowAt + inflateMs,
        popAt: blowAt + inflateMs + floatMs,
      };
    });
    const lastPop = bubbles[bubbles.length - 1].popAt;
    const endAt = lastPop + Math.max(diveMs, popMs);
    // a bubble's middle and size at ms, written into `into`
    const centre = (
      b: (typeof bubbles)[number],
      ms: number,
      into: Point,
    ): number => {
      if (ms < b.floatAt) {
        const grow = easeOut(clamp01((ms - b.blowAt) / inflateMs));
        into.x = b.from.x;
        into.y = b.from.y - RADIUS * grow;
        return grow;
      }
      const u = smoothstep(clamp01((ms - b.floatAt) / floatMs));
      bezier(b.start, b.bow, b.to, u, into);
      return 1;
    };

    const paths: CoinPath[] = bubbles.flatMap((b, k) =>
      Array.from({ length: SKIN + FILL }, (_, i) => {
        const skin = i < SKIN;
        const angle = skin
          ? (i / SKIN) * Math.PI * 2 + Math.random() * 0.05
          : Math.random() * Math.PI * 2;
        const reach = skin
          ? 1 + (Math.random() * 2 - 1) * 0.04
          : 0.85 * Math.sqrt(Math.random());
        const phase = Math.random() * Math.PI * 2;
        const flung = between(POP);
        const mid: Point = { x: 0, y: 0 };
        const popped: Point = { x: 0, y: 0 };
        let poppedSet = false;
        return (f) => {
          const ms = f * endAt;
          if (ms < b.blowAt) return { x: b.from.x, y: b.from.y, scale: 0 };
          const t = Math.min(ms, b.popAt);
          const grow = centre(b, t, mid);
          const wobble =
            1 +
            WOBBLE * Math.sin(2 * angle + t * 0.015 + k + (skin ? 0 : phase));
          const r = RADIUS * grow * reach * wobble;
          const x = mid.x + Math.cos(angle) * r;
          const y = mid.y + Math.sin(angle) * r;
          if (ms < b.popAt) return { x, y, scale: COIN * (skin ? 1 : 0.8) };
          if (!poppedSet) {
            popped.x = x;
            popped.y = y;
            poppedSet = true;
          }
          const u = easeOut(clamp01((ms - b.popAt) / popMs));
          return {
            x: popped.x + Math.cos(angle) * flung * u,
            y: popped.y + Math.sin(angle) * flung * u,
            scale: COIN,
          };
        };
      }),
    );
    const diving: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      if (ms < lastPop) {
        diving.x = wandX(ms);
        diving.y = lerp([button.y, wandY], easeOut(clamp01(ms / riseMs)));
        return diving;
      }
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - lastPop) / (endAt - lastPop)));
      const fromX = wandX(lastPop);
      diving.x = lerp([fromX, total.x], u);
      diving.y = lerp([wandY, total.y], u);
      return diving;
    };

    const popping = createBeats(
      bubbles,
      (b) => b.popAt,
      (b, k) => {
        const t = k / Math.max(1, bubbles.length - 1);
        giveHire(b.hire);
        cover!.burst(b.to, 0.7 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(POP_SHAKE, t));
      },
    );
    const finishing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / endAt),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
