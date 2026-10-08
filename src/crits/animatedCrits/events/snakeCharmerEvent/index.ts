// the "Snake Charmer" event (mix; worker perma tiers and cash): it covers
// its crit, whose click freezes the screen while a wisp charmer sways over
// the clicked floor's button and a cobra of cash rises out of it, a thick
// rope of coins swaying to the tune with a blazing wisp for a head; it
// strikes at a worker in view, lunging out and snapping back with a hiss,
// a flash and a jolt that lights the worker up a perma tier, strike after
// strike, ever faster; then it rears up and dives into the total in a huge
// blast and shake. Pays floor income × floor number × REWARD, plus the
// tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "snakeCharmer";
const REWARD = 2;
const MAX_WORKERS = 5;
const COINS = 520;
const COIN = 0.5;
// it rears RISE px over the button, swaying SWAY px; its body is up to
// THICK px across, waving WAVES times along its length
const RISE = 220;
const SWAY = 40;
const THICK = 18;
const WAVES = 1.5;
const LUNGE = 0.45;
const HEAD = 0.75;
const CHARMER = 0.5;
const STRIKE_SHAKE: [number, number] = [0.6, 1.3];

export const forceSnakeCharmerEvent = registerWispEvent(
  KEY,
  "Snake Charmer",
  () => CONFIG.snakeCharmerEvent.chance,
  (floor, context, area) => {
    const { riseMs, strikesMs, diveMs, holdMs, mergeMs } =
      CONFIG.snakeCharmerEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const base: Point = { x: button.x, y: button.y };
    const rest: Point = { x: button.x, y: button.y - RISE };
    let clock: number = riseMs;
    const strikes = workers.map((worker, k) => {
      const starts = clock;
      const span = lerp(strikesMs, k / Math.max(1, workers.length - 1));
      clock += span;
      return { worker, starts, hits: starts + span * LUNGE, span };
    });
    const diveAt = clock;
    const endAt = diveAt + diveMs;
    // the head: rising, swaying, lunging out and back, then diving
    const head: Point = { x: 0, y: 0 };
    const headAt = (ms: number, into: Point): Point => {
      const sway = Math.sin(ms / 160) * SWAY;
      if (ms < riseMs) {
        const u = easeOut(ms / riseMs);
        into.x = base.x + sway * u;
        into.y = lerp([base.y, rest.y], u);
        return into;
      }
      into.x = rest.x + sway;
      into.y = rest.y;
      if (ms >= diveAt) {
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - diveAt) / diveMs));
        into.x = lerp([into.x, total.x], u);
        into.y = lerp([into.y, total.y], u);
        return into;
      }
      for (const s of strikes) {
        const u = (ms - s.starts) / s.span;
        if (u < 0 || u >= 1) continue;
        // a snap out to the worker, a slower draw back
        const out =
          u < LUNGE
            ? easeIn(u / LUNGE)
            : 1 - easeOut((u - LUNGE) / (1 - LUNGE));
        into.x = lerp([into.x, s.worker.at.x], out);
        into.y = lerp([into.y, s.worker.at.y], out);
      }
      return into;
    };
    const headWisp = (ms: number) => (ms > endAt ? null : headAt(ms, head));
    const charmerAt: Point = { x: 0, y: 0 };
    const charmer = (ms: number): Point => {
      charmerAt.x = base.x - 50 + Math.sin(ms / 160 + 1) * 8;
      charmerAt.y = base.y - 20;
      return charmerAt;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const s = i / (COINS - 1);
      const off = (Math.random() - 0.5) * THICK * (1 - 0.6 * s);
      const tip: Point = { x: 0, y: 0 };
      const root: Point = { x: 0, y: 0 };
      const ctrl: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        // each coin follows the head s of the way up the body
        const grown = clamp01(ms / riseMs);
        if (s > grown) return { x: base.x, y: base.y, scale: 0 };
        headAt(ms, tip);
        // diving, the tail is dragged in after the head
        const drag = ms > diveAt ? easeIn(clamp01((ms - diveAt) / diveMs)) : 0;
        root.x = lerp([base.x, tip.x], drag);
        root.y = lerp([base.y, tip.y], drag);
        ctrl.x = root.x;
        ctrl.y = lerp([root.y, tip.y], 0.6);
        bezier(root, ctrl, tip, s, at);
        const wave =
          Math.sin(s * WAVES * Math.PI * 2 - ms / 120) * SWAY * 0.4 * s;
        return { x: at.x + wave + off, y: at.y, scale: COIN };
      };
    });

    const striking = createBeats(
      strikes,
      (s) => s.hits,
      (s, k) => {
        cover!.promote(s.worker);
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, strikes.length - 1)));
      },
    );
    const lunging = createBeats(
      strikes,
      (s) => s.starts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const finale = createBeats(
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
        workers,
        tick: (ms, now) => {
          lunging.tick(ms, now);
          striking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            charmer,
            ms,
            now,
            WISP_SIZE * CHARMER,
            0.4,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            headWisp,
            ms,
            now,
            WISP_SIZE * HEAD,
            0.9,
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
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
