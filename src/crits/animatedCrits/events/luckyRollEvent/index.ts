// the "Lucky Roll" event (experiment: a board game of ladders; free upgrade
// levels): it covers its crit, whose click freezes the screen while a token
// wisp pops out of the clicked floor's button and the dice roll: a number
// slams up ("4!"), and the token hops that many squares, a bloop for every
// hop, landing at the foot of a ladder of light that flashes up to an
// income bar; it scrambles up the ladder onto the bar with a bang and a
// jolt as the bar lands free levels; roll after roll it climbs the bars
// from the bottom up, ever faster, until a "6!" sends it up the last
// ladder in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars, levelsFor } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "luckyRoll";
const MAX_BARS = 4;
const STYLE = { fontSize: 56, strokeWidth: 9 };
// a ladder FOOT px below each bar, RAIL px wide, a rung every RUNG px
const FOOT = 130;
const RAIL = 34;
const RUNG = 22;
const HOP = 30;
const HOP_HEIGHT = 26;
const RAIL_WIDTH = 7;
const CALL_MS = 340;
const TOKEN = 0.42;
const CLIMB_SHAKE: [number, number] = [0.7, 1.3];

export const forceLuckyRollEvent = registerWispEvent(
  KEY,
  "Lucky Roll",
  () => CONFIG.luckyRollEvent.chance,
  (floor, context) => {
    const { rollMs, hopMs, climbMs, holdMs, mergeMs } = CONFIG.luckyRollEvent;
    // bottom bar first
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const sprites = new Map<number, CritTextSprite>();
    const sprite = (n: number) => {
      if (!sprites.has(n))
        sprites.set(
          n,
          createCritTextSprite(`${n}!`, COLOR.heavenlyGold, STYLE),
        );
      return sprites.get(n)!;
    };
    let clock = 0;
    let from: Point = button;
    const rolls = bars.map((bar, k) => {
      const final = k === bars.length - 1;
      const pips = final ? 6 : 2 + Math.floor(Math.random() * 4);
      const dir = from.x < bar.center.x ? 1 : -1;
      const foot: Point = {
        x: from.x + dir * pips * HOP,
        y: bar.center.y + FOOT,
      };
      const rolls = clock;
      const hops = rolls + rollMs;
      const climbs = hops + pips * hopMs;
      const tops = climbs + climbMs;
      clock = tops;
      const rungs: [Point, Point][] = [];
      for (let y = foot.y; y > bar.center.y; y -= RUNG)
        rungs.push([
          { x: foot.x - RAIL / 2, y },
          { x: foot.x + RAIL / 2, y },
        ]);
      const roll = {
        bar,
        pips,
        sprite: sprite(pips),
        start: from,
        foot,
        top: { x: foot.x, y: bar.center.y },
        rails: [
          [
            { x: foot.x - RAIL / 2, y: foot.y },
            { x: foot.x - RAIL / 2, y: bar.center.y },
          ],
          [
            { x: foot.x + RAIL / 2, y: foot.y },
            { x: foot.x + RAIL / 2, y: bar.center.y },
          ],
        ] as [Point, Point][],
        rungs,
        rolls,
        hops,
        climbs,
        tops,
        final,
      };
      from = roll.top;
      return roll;
    });
    const last = rolls[rolls.length - 1];
    const endAt = last.tops;
    const hopBeats = rolls.flatMap((r) =>
      Array.from({ length: r.pips }, (_, i) => r.hops + (i + 1) * hopMs),
    );
    const tokenAt: Point = { x: 0, y: 0 };
    const token = (ms: number): Point => {
      let r = rolls[0];
      for (const roll of rolls) if (ms >= roll.rolls) r = roll;
      if (ms < r.hops) {
        tokenAt.x = r.start.x;
        tokenAt.y = r.start.y;
        return tokenAt;
      }
      if (ms < r.climbs) {
        // hopping square by square toward the ladder's foot (dropping to its level)
        const f = (ms - r.hops) / hopMs;
        const i = Math.floor(f);
        const u = f - i;
        const x0 = lerp([r.start.x, r.foot.x], i / r.pips);
        const x1 = lerp([r.start.x, r.foot.x], (i + 1) / r.pips);
        const y = lerp([r.start.y, r.foot.y], easeOut(clamp01(f / r.pips)));
        tokenAt.x = lerp([x0, x1], u);
        tokenAt.y = y - Math.sin(u * Math.PI) * HOP_HEIGHT;
        return tokenAt;
      }
      const u = clamp01((ms - r.climbs) / (r.tops - r.climbs));
      tokenAt.x = r.foot.x + Math.sin(u * Math.PI * 6) * 6;
      tokenAt.y = lerp([r.foot.y, r.top.y], u);
      return tokenAt;
    };

    const rolling = createBeats(
      rolls,
      (r) => r.rolls,
      () => {
        if (cover?.isLive()) shakeScreen(0.4);
      },
    );
    const hopping = createBeats(
      hopBeats,
      (ms) => ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const topping = createBeats(
      rolls,
      (r) => r.tops,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor), r.foot);
        if (r.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.top);
          return;
        }
        cover!.burst(r.top, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CLIMB_SHAKE, k / Math.max(1, rolls.length - 1)));
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
          rolling.tick(ms, now);
          hopping.tick(ms, now);
          topping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const r of rolls) {
            const c = (ms - r.rolls) / CALL_MS;
            if (c >= 0 && c < 1) {
              ctx.globalAlpha = 1 - c * c;
              drawCritTextSprite(
                ctx,
                r.sprite,
                r.start.x,
                r.start.y - 70,
                (r.final ? 1.4 : 1) * (1 + 0.5 * (1 - clamp01(c * 3))),
              );
              ctx.globalAlpha = 1;
            }
            // the ladder flashes up as the token reaches its foot
            if (ms < r.climbs - hopMs || ms > r.tops + 200) continue;
            const show =
              clamp01((ms - (r.climbs - hopMs)) / hopMs) *
              (1 - clamp01((ms - r.tops) / 200));
            for (const [a, b] of r.rails) drawBeam(ctx, a, b, RAIL_WIDTH, show);
            for (const [a, b] of r.rungs)
              drawBeam(ctx, a, b, RAIL_WIDTH * 0.7, show * 0.8);
          }
          drawWispBetween(
            ctx,
            token,
            ms,
            now,
            WISP_SIZE * TOKEN,
            0.8,
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
