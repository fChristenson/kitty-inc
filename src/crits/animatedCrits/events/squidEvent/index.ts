// the "Squid" event (mix; cash): it covers its crit, whose click freezes the
// screen while a squid wisp shoots out of the clicked floor's button and
// jets up the screen in sharp spurts, zigzagging side to side; with every
// spurt it squirts a thick gush of cash out behind it, each a whoosh and a
// jolt, the spurts ever quicker; the last fires it up into the total in a
// huge blast and shake as the cash sweeps in after it. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "squid";
const REWARD = 4;
const SPURTS = 7;
const EDGE = 70;
const TOP = 140;
// each squirt sprays SQUIRT px back the way it came
const SQUIRT = 260;
const SQUID = 0.65;
const SPURT_SHAKE: [number, number] = [0.3, 1];

export const forceSquidEvent = registerWispEvent(
  KEY,
  "Squid",
  () => CONFIG.squidEvent.chance,
  (floor, context, area) => {
    const { spurtsMs, squirtMs, travelMs, holdMs, mergeMs } = CONFIG.squidEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const stops: Point[] = [button];
    for (let k = 1; k < SPURTS; k++)
      stops.push({
        x: k % 2 === 1 ? left + Math.random() * 60 : right - Math.random() * 60,
        y: lerp([button.y, area.top + TOP + 60], k / (SPURTS - 1)),
      });
    stops.push(total);
    const pour: Pour = {
      coinsAlong: 600,
      width: 36,
      streamMs: squirtMs,
      travelMs,
    };
    let clock = 0;
    const spurts = stops.slice(1).map((to, k) => {
      const from = stops[k];
      const starts = clock;
      clock += lerp(spurtsMs, k / (SPURTS - 1));
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const length = Math.hypot(dx, dy) || 1;
      const back: Point = {
        x: from.x + (dx / length) * SQUIRT,
        y: from.y + (dy / length) * SQUIRT,
      };
      const line = sampleLine(
        (u) => ({ x: lerp([from.x, back.x], u), y: lerp([from.y, back.y], u) }),
        20,
      );
      return { from, to, starts, ends: clock, line };
    });
    const last = spurts[spurts.length - 1];
    const endAt = last.ends;
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      endAt + holdMs + mergeMs,
    );
    const squidAt: Point = { x: 0, y: 0 };
    const squid = (ms: number): Point => {
      let s = spurts[0];
      for (const spurt of spurts) if (ms >= spurt.starts) s = spurt;
      const to = s === last ? (cover?.total() ?? total) : s.to;
      const u = easeOutCubic(clamp01((ms - s.starts) / (s.ends - s.starts)));
      squidAt.x = lerp([s.from.x, to.x], u);
      squidAt.y = lerp([s.from.y, to.y], u);
      return squidAt;
    };

    const spurting = createBeats(
      spurts,
      (s) => s.starts,
      (s, k) => {
        pourLine(cover!, s.line, pour);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SPURT_SHAKE, k / (SPURTS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          spurting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            squid,
            ms,
            now,
            WISP_SIZE * SQUID,
            0.7,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
