// the "Bulldozer" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// sprays cash along the top of every income bar in view; a bulldozer wisp
// drops onto each bar in turn and ploughs along it, the cash heaping up
// into a growing mound in front of its blade, and shoves the whole heap
// off the bar's end with a rumble and a jolt that lands free levels, the
// heap flying up into the total; bar after bar, ever faster, the last
// heap in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
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
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "bulldozer";
const REWARD = 3;
const MAX_BARS = 3;
const PER_BAR = 180;
const COIN = 0.42;
// cash lies ON px over a bar; the heap grows HEAP px tall and DEEP px deep
// ahead of the blade
const ON = 10;
const HEAP = 50;
const DEEP = 26;
const INSET = 16;
const SPRAY_MS = 350;
const DROP_MS = 160;
const DOZER = 0.6;
const SHOVE_SHAKE: [number, number] = [0.7, 1.4];

export const forceBulldozerEvent = registerWispEvent(
  KEY,
  "Bulldozer",
  () => CONFIG.bulldozerEvent.chance,
  (floor, context, area) => {
    const { pushesMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.bulldozerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = SPRAY_MS;
    const pushes = bars.map((bar, k) => {
      const rightward = k % 2 === 0;
      const left = bar.box.x + INSET;
      const right = bar.box.x + bar.box.width - INSET;
      const y = bar.box.y - ON;
      const span = lerp(pushesMs, k / Math.max(1, bars.length - 1));
      const starts = clock + DROP_MS;
      clock = starts + span;
      return {
        bar,
        rightward,
        from: rightward ? left : right,
        to: rightward ? right : left,
        y,
        drops: starts - DROP_MS,
        starts,
        shoves: clock,
        span,
        end: { x: rightward ? right : left, y: y - 12 },
      };
    });
    const last = pushes[pushes.length - 1];
    const endAt = last.shoves + flightMs;
    const bladeX = (p: (typeof pushes)[number], ms: number) =>
      lerp(
        [p.from, p.to],
        easeIn(clamp01((ms - p.starts) / p.span)) * 0.6 +
          clamp01((ms - p.starts) / p.span) * 0.4,
      );

    const paths: CoinPath[] = [];
    for (const p of pushes) {
      for (let i = 0; i < PER_BAR; i++) {
        const s = Math.random();
        const x = lerp([p.from, p.to], s);
        // when the blade reaches it, at roughly share s of the push
        let reached = p.shoves;
        for (let t = 0; t <= 1; t += 0.02) {
          if (
            Math.abs(bladeX(p, p.starts + t * p.span) - p.from) >=
            Math.abs(x - p.from)
          ) {
            reached = p.starts + t * p.span;
            break;
          }
        }
        const sprayed = Math.random() * SPRAY_MS * 0.7;
        const depth = Math.random();
        const height = Math.random();
        const dir = p.rightward ? 1 : -1;
        const shoved: Point = { x: 0, y: 0 };
        const lift: Point = { x: 0, y: 0 };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < sprayed) return { x: button.x, y: button.y, scale: 0 };
          if (ms < sprayed + SPRAY_MS * 0.3) {
            const u = easeOut((ms - sprayed) / (SPRAY_MS * 0.3));
            return {
              x: lerp([button.x, x], u),
              y: lerp([button.y, p.y], u),
              scale: COIN,
            };
          }
          if (ms < reached) return { x, y: p.y, scale: COIN };
          const heap = clamp01((ms - p.starts) / p.span);
          if (ms < p.shoves)
            return {
              x: bladeX(p, ms) + dir * depth * DEEP,
              y: p.y - height * HEAP * Math.sqrt(heap) * (1 - depth * 0.5),
              scale: COIN,
            };
          shoved.x = p.to + dir * depth * DEEP;
          shoved.y = p.y - height * HEAP * (1 - depth * 0.5);
          lift.x = shoved.x + dir * 60;
          lift.y = shoved.y - 80;
          const total = cover?.total() ?? fallback;
          bezier(
            shoved,
            lift,
            total,
            easeIn(clamp01((ms - p.shoves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    }
    const dozerAt: Point = { x: 0, y: 0 };
    const dozer = (ms: number): Point | null => {
      if (ms > last.shoves) return null;
      let prev: Point = button;
      for (const p of pushes) {
        if (ms < p.starts) {
          const u = easeOut(clamp01((ms - p.drops) / DROP_MS));
          dozerAt.x = lerp([prev.x, p.from], u);
          dozerAt.y = lerp([prev.y, p.y - 12], u);
          return dozerAt;
        }
        if (ms <= p.shoves) {
          dozerAt.x = bladeX(p, ms) - (p.rightward ? 1 : -1) * 16;
          dozerAt.y = p.y - 12;
          return dozerAt;
        }
        prev = p.end;
      }
      return null;
    };

    const shoving = createBeats(
      pushes,
      (p) => p.shoves,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), {
          x: p.to,
          y: p.y,
        });
        cover!.burst({ x: p.to, y: p.y }, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOVE_SHAKE, k / Math.max(1, pushes.length - 1)));
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
        bars,
        tick: (ms, now) => {
          shoving.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            dozer,
            ms,
            now,
            WISP_SIZE * DOZER,
            0.7,
            0,
            last.shoves,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
