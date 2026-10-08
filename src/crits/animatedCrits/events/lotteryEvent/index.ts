// the "Lottery" event (experiment: a lottery draw; free upgrade levels): it
// covers its crit, whose click freezes the screen while a drum of light
// spins up in the middle of it, numbered ball wisps tumbling madly inside;
// one after another a ball pops out of the top, rolls to its place in the
// row of winning numbers with its number blazing beside it, then shoots
// down into an income bar with a pop and a jolt that lands free levels,
// the draws ever faster; the last ball lands in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawCachedCritText } from "../../../critFlash/critText";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "lottery";
const MAX_BARS = 5;
const BALLS = 10;
const DRAWS = 5;
// the drum is DRUM px round; drawn balls sit in a row ROW px under the top
const DRUM = 90;
const RIM = 22;
const ROW = 80;
const POP_MS = 260;
const SHOW_MS = 220;
const SHOOT_MS = 260;
const FONT = 26;
const BALL = 0.4;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceLotteryEvent = registerWispEvent(
  KEY,
  "Lottery",
  () => CONFIG.lotteryEvent.chance,
  (floor, context, area) => {
    const { spinMs, drawsMs, levelShare, holdMs, mergeMs } =
      CONFIG.lotteryEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const drum: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const numbers = Array.from({ length: 49 }, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5)
      .slice(0, BALLS);
    const rowY = area.top + ROW;
    const rowX = (k: number) =>
      lerp(
        [area.left + 60, area.right - 60],
        DRAWS > 1 ? k / (DRAWS - 1) : 0.5,
      );
    // tumbling inside the drum: a few sines, never quite repeating
    const tumble = (i: number, ms: number, into: Point) => {
      const t = ms / 1000;
      const r = DRUM * 0.75 * (0.5 + 0.5 * Math.sin(t * 3.1 + i * 1.7));
      const a = t * (4 + i * 0.37) + i * 2.1;
      into.x = drum.x + Math.cos(a) * r;
      into.y = drum.y + Math.sin(a * 1.3) * r;
      return into;
    };
    let clock: number = spinMs;
    const draws = Array.from({ length: DRAWS }, (_, k) => {
      const pops = clock;
      clock += lerp(drawsMs, k / (DRAWS - 1));
      const slot: Point = { x: rowX(k), y: rowY };
      const shows = pops + POP_MS;
      const shoots = shows + SHOW_MS;
      const bar = bars[k % bars.length];
      return {
        ball: k,
        label: String(numbers[k]),
        slot,
        pops,
        shows,
        shoots,
        lands: shoots + SHOOT_MS,
        bar,
      };
    });
    const last = draws[DRAWS - 1];
    const endAt = last.lands;
    const balls = Array.from({ length: BALLS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      const draw = draws.find((d) => d.ball === i);
      const exit: Point = draw ? tumble(i, draw.pops, { x: 0, y: 0 }) : drum;
      return {
        draw,
        until: draw ? draw.lands : endAt,
        at: (ms: number): Point | null => {
          if (ms > endAt) return null;
          if (!draw || ms < draw.pops) return tumble(i, ms, at);
          if (ms < draw.shows) {
            const u = easeOut((ms - draw.pops) / POP_MS);
            at.x = lerp([exit.x, draw.slot.x], u);
            at.y = lerp([exit.y, draw.slot.y], u) - Math.sin(Math.PI * u) * 40;
            return at;
          }
          if (ms < draw.shoots) {
            at.x = draw.slot.x;
            at.y = draw.slot.y;
            return at;
          }
          if (ms >= draw.lands) return null;
          const u = easeIn((ms - draw.shoots) / SHOOT_MS);
          at.x = lerp([draw.slot.x, draw.bar.center.x], u);
          at.y = lerp([draw.slot.y, draw.bar.center.y], u);
          return at;
        },
      };
    });
    const rim: Point[] = Array.from({ length: RIM }, () => ({ x: 0, y: 0 }));

    const popping = createBeats(
      draws,
      (d) => d.pops,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      draws,
      (d) => d.lands,
      (d, k) => {
        cover!.levels(d.bar, levelsFor(d.bar.floor, levelShare, 2), d.slot);
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / (DRAWS - 1)));
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
        tick: (ms, now) => {
          popping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 600) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 600 : 1;
          // the drum, turning
          const turn = ms / 300;
          const grow = clamp01(ms / 250);
          for (let i = 0; i < RIM; i++) {
            const a = turn + (i / RIM) * Math.PI * 2;
            rim[i].x = drum.x + Math.cos(a) * DRUM * grow;
            rim[i].y = drum.y + Math.sin(a) * DRUM * grow;
          }
          for (let i = 0; i < RIM; i += 2)
            drawBeam(ctx, rim[i], rim[(i + 1) % RIM], 5, 0.6 * fade);
          for (const b of balls)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BALL,
              b.draw ? 0.9 : 0.4,
              0,
              b.until,
            );
          ctx.globalAlpha = fade;
          for (const d of draws)
            if (ms >= d.shows)
              drawCachedCritText(
                ctx,
                d.label,
                d.slot.x,
                d.slot.y - 34,
                COLOR.heavenlyGold,
                {
                  fontSize: FONT,
                  strokeWidth: 5,
                },
              );
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
