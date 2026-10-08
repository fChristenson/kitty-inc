// the "Checkers" event (experiment: checkers; crit tiers): it covers its
// crit, whose click freezes the screen while a checker wisp hops out of the
// clicked floor's button and leaps diagonally up the screen in big double
// and triple jumps, zigzagging from income bar to income bar, every jump
// landing on a bar with a "JUMP!", a flash and a jolt; reaching the far
// side it crowns itself, "KING ME!", and every bar it jumped on jumps a crit
// tier in a cascade, the last in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "checkers";
const MAX_BARS = 4;
const SIDE = 0.32;
const ZIG = 150;
const HOP_HIGH = 110;
const KING_TOP = 230;
const CALL_MS = 320;
const JUMP_STYLE = { fontSize: 48, strokeWidth: 8 };
const KING_STYLE = { fontSize: 84, strokeWidth: 13 };
const CHECKER = 0.6;
const JUMP_SHAKE: [number, number] = [0.6, 1.1];
const TIER_SHAKE: [number, number] = [0.8, 1.3];

interface Hop {
  from: Point;
  to: Point;
  ctrl: Point;
  leaves: number;
  lands: number;
  bar: RewardBar | null;
  king: boolean;
}

export const forceCheckersEvent = registerWispEvent(
  KEY,
  "Checkers",
  () => CONFIG.checkersEvent.chance,
  (floor, context, area) => {
    const { hopsMs, cascadeMs, holdMs, mergeMs } = CONFIG.checkersEvent;
    // bottom to top: the far side is the top of the screen
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const king: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + KING_TOP,
    };
    const legs: { to: Point; bar: RewardBar | null; king: boolean }[] = [];
    let prev: Point = button;
    bars.forEach((bar, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const target: Point = {
        x: bar.center.x + side * bar.box.width * SIDE,
        y: bar.center.y,
      };
      // a double jump, then a triple, and so on
      const subs = i % 2 === 0 ? 2 : 3;
      for (let j = 1; j < subs; j++)
        legs.push({
          to: {
            x:
              lerp([prev.x, target.x], j / subs) +
              (j % 2 === 0 ? -1 : 1) * side * ZIG,
            y: lerp([prev.y, target.y], j / subs),
          },
          bar: null,
          king: false,
        });
      legs.push({ to: target, bar, king: false });
      prev = target;
    });
    legs.push({ to: king, bar: null, king: true });
    let clock = 0;
    let from: Point = button;
    const hops: Hop[] = legs.map((leg, k) => {
      const leaves = clock;
      clock += lerp(hopsMs, k / Math.max(1, legs.length - 1));
      const hop: Hop = {
        from,
        to: leg.to,
        ctrl: {
          x: (from.x + leg.to.x) / 2,
          y: Math.min(from.y, leg.to.y) - HOP_HIGH,
        },
        leaves,
        lands: clock,
        bar: leg.bar,
        king: leg.king,
      };
      from = leg.to;
      return hop;
    });
    const kingAt = hops[hops.length - 1].lands;
    const tiers = bars.map((bar, i) => ({
      bar,
      at: kingAt + (i + 1) * cascadeMs,
      last: i === bars.length - 1,
    }));
    const endAt = tiers[tiers.length - 1].at;
    const jump = createCritTextSprite("JUMP!", COLOR.heavenlyGold, JUMP_STYLE);
    const kingMe = createCritTextSprite(
      "KING ME!",
      COLOR.heavenlyGold,
      KING_STYLE,
    );
    const checkerAt: Point = { x: 0, y: 0 };
    const checker = (ms: number): Point => {
      let h = hops[0];
      for (const hop of hops) if (ms >= hop.leaves) h = hop;
      return bezier(
        h.from,
        h.ctrl,
        h.to,
        clamp01((ms - h.leaves) / (h.lands - h.leaves)),
        checkerAt,
      );
    };

    const landing = createBeats(
      hops,
      (h) => h.lands,
      (h, k) => {
        const t = k / Math.max(1, hops.length - 1);
        if (h.bar) {
          cover!.levels(h.bar, 0, h.from);
          cover!.burst(h.to, 0.6);
        } else cover!.burst(h.to, h.king ? 0.9 : 0.3);
        if (!cover!.isLive()) return;
        if (h.bar || h.king) playExplosion();
        else playBloop();
        shakeScreen(h.bar || h.king ? lerp(JUMP_SHAKE, t) : 0.35);
      },
    );
    const crowning = createBeats(
      tiers,
      (c) => c.at,
      (c, k) => {
        cover!.tierUp(c.bar, king);
        if (c.last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TIER_SHAKE, k / Math.max(1, tiers.length - 1)));
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
          landing.tick(ms, now);
          crowning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const h of hops) {
            if (!h.bar) continue;
            const c = (ms - h.lands) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              jump,
              h.to.x,
              h.to.y - 70,
              1 + 0.5 * (1 - clamp01(c * 3)),
            );
            ctx.globalAlpha = 1;
          }
          if (ms >= kingAt) {
            const c = (ms - kingAt) / CALL_MS;
            ctx.globalAlpha = 1 - clamp01((ms - endAt) / CALL_MS);
            drawCritTextSprite(
              ctx,
              kingMe,
              king.x,
              king.y - 90,
              1 + 0.6 * (1 - clamp01(c * 3)),
            );
            ctx.globalAlpha = 1;
          }
          drawWispBetween(
            ctx,
            checker,
            ms,
            now,
            WISP_SIZE * CHECKER * (ms >= kingAt ? 1.4 : 1),
            ms >= kingAt ? 1 : 0.6,
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
