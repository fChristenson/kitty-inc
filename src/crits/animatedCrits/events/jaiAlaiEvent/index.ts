// the "Jai Alai" event (bounce; levels): it covers its crit, whose click
// freezes the screen while a player wisp pops up in the middle of it with a
// ball wisp; it whips the ball round in its curved basket, a quick loop, and
// hurls it like a bullet onto a bar, which jolts with free levels as the
// ball smacks off it in a splash; the ball arcs back down, the player darts
// under it, catches it in the basket, loops it round and hurls it at the next
// bar, ever faster; the last throw smashes into the clicked floor's bar in
// a big blast and every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBounceSplash, type Bounce } from "../../../../shared/bounce";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "jaiAlai";
const MAX_THROWS = 6;
// the player roams this band of the screen; the basket loop's radius
const COURT: [number, number] = [0.42, 0.58];
const MARGIN = 120;
const LOOP = 46;
const LOOP_TURN = 1.5;
// the rebound arcs this high
const LIFT = 180;
const BALL = WISP_SIZE * 0.7;
const PLAYER = WISP_SIZE;
const HIT_SHAKE: [number, number] = [0.4, 0.9];
const CATCH_SHAKE = 0.2;

interface Throw {
  bar: RewardBar;
  catchAt: Point;
  hit: Point;
  normal: number;
  catches: number;
  hurls: number;
  hits: number;
}

export const forceJaiAlaiEvent = registerWispEvent(
  KEY,
  "Jai Alai",
  () => CONFIG.jaiAlaiEvent.chance,
  (floor, context, area) => {
    const { growMs, loopMs, hurlMs, backMs, levelShare, holdMs, mergeMs } =
      CONFIG.jaiAlaiEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const others = bars.filter((b) => b !== clicked);
    const count = Math.min(MAX_THROWS, Math.max(3, others.length * 2 + 1));
    const targets = Array.from({ length: count }, (_, k) =>
      k === count - 1 || others.length === 0
        ? clicked
        : others[k % others.length],
    );
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );
    const courtY = (k: number) =>
      lerp([area.top, area.bottom], lerp(COURT, (k % 3) / 2));

    // each throw: caught, looped round the basket, hurled onto its bar's
    // near face, then arcing back down to the next catch
    let clock: number = growMs;
    const throws: Throw[] = targets.map((bar, k) => {
      const pace = lerp([1.25, 0.7], k / Math.max(1, count - 1));
      const catchAt: Point = {
        x: lerp([area.left + MARGIN, area.right - MARGIN], Math.random()),
        y: courtY(k),
      };
      const below = catchAt.y > bar.center.y;
      const hit: Point = {
        x: bar.box.x + bar.box.width * lerp([0.15, 0.85], Math.random()),
        y: below ? bar.box.y + bar.box.height : bar.box.y,
      };
      const catches = clock;
      const hurls = catches + loopMs * pace;
      const hits = hurls + hurlMs * pace;
      clock = hits + backMs * pace;
      return {
        bar,
        catchAt,
        hit,
        normal: below ? Math.PI / 2 : -Math.PI / 2,
        catches,
        hurls,
        hits,
      };
    });
    const last = throws[throws.length - 1];
    const endMs = last.hits;
    const bounces: Bounce[] = throws.map((t) => ({
      at: t.hit,
      ms: t.hits,
      normal: t.normal,
    }));

    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      if (ms < growMs || ms > endMs) return null;
      for (let k = 0; k < throws.length; k++) {
        const t = throws[k];
        const next = throws[k + 1];
        if (next && ms >= next.catches) continue;
        if (ms < t.hurls) {
          // round the basket, swinging out of it toward the bar
          const out = Math.atan2(t.hit.y - t.catchAt.y, t.hit.x - t.catchAt.x);
          const a =
            out -
            Math.PI *
              2 *
              LOOP_TURN *
              (1 - smoothstep((ms - t.catches) / (t.hurls - t.catches)));
          ball.x = t.catchAt.x + Math.cos(a) * LOOP;
          ball.y = t.catchAt.y + Math.sin(a) * LOOP;
          return ball;
        }
        if (ms < t.hits) {
          const u = easeIn((ms - t.hurls) / (t.hits - t.hurls));
          const out = Math.atan2(t.hit.y - t.catchAt.y, t.hit.x - t.catchAt.x);
          const fx = t.catchAt.x + Math.cos(out) * LOOP;
          const fy = t.catchAt.y + Math.sin(out) * LOOP;
          ball.x = lerp([fx, t.hit.x], u);
          ball.y = lerp([fy, t.hit.y], u);
          return ball;
        }
        if (!next) return null;
        // the rebound arcing down onto the next catch
        const u = (ms - t.hits) / (next.catches - t.hits);
        ball.x = lerp([t.hit.x, next.catchAt.x], u);
        ball.y = lerp([t.hit.y, next.catchAt.y], u) - LIFT * 4 * u * (1 - u);
        return ball;
      }
      return null;
    };
    // the player darts under each rebound to make the catch
    const player: Point = { x: 0, y: 0 };
    const playerAt = (ms: number): Point | null => {
      if (ms < 0 || ms > endMs + 200) return null;
      let k = 0;
      while (k + 1 < throws.length && ms >= throws[k].hits) k++;
      const t = throws[k];
      const prev = throws[k - 1];
      const u = prev
        ? smoothstep(clamp01((ms - prev.hits) / (t.catches - prev.hits)))
        : 1;
      player.x = lerp([prev ? prev.catchAt.x : t.catchAt.x, t.catchAt.x], u);
      player.y = lerp([prev ? prev.catchAt.y : t.catchAt.y, t.catchAt.y], u);
      return player;
    };

    const catching = createBeats(
      throws,
      (t) => t.catches,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k > 0) shakeScreen(CATCH_SHAKE);
        playSwoosh();
      },
    );
    const hitting = createBeats(
      throws,
      (t) => t.hits,
      (t, k) => {
        cover!.levels(t.bar, levels.get(t.bar)!, t.catchAt);
        if (t === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(t.hit);
          return;
        }
        cover!.burst(t.hit, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, count - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          catching.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 400) return;
          for (const b of bounces)
            drawBounceSplash(ctx, b, ms - b.ms, 120, now);
          const pop = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - endMs) / 400);
          drawWisp(ctx, playerAt, ms, now, PLAYER * pop * fade, 0.4);
          drawWisp(ctx, ballAt, ms, now, BALL, 0.9);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
