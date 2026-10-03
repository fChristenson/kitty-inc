// the "Leaf Blower" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp shoots out of the clicked floor's button
// to one side of the screen and starts blasting gusts of cash across it,
// sweeping up and down as it blows, each gust a broad river of coins
// roaring over to the far wall with a whoosh and smashing into it with a
// jolt, then swept up the wall into the total; the last gust hits in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "leafBlower";
const REWARD = 4;
const GUSTS = 5;
const EDGE = 40;
const TOP = 230;
const BLOWER = 0.55;
const HIT_SHAKE: [number, number] = [0.6, 1.4];

export const forceLeafBlowerEvent = registerWispEvent(
  KEY,
  "Leaf Blower",
  () => CONFIG.leafBlowerEvent.chance,
  (floor, context, area) => {
    const { flyMs, gapsMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.leafBlowerEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x > (area.left + area.right) / 2;
    const near = ltr ? area.left + EDGE : area.right - EDGE;
    const far = ltr ? area.right - EDGE : area.left + EDGE;
    const total = totalSpot(area);
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    let clock: number = flyMs;
    const gusts = Array.from({ length: GUSTS }, (_, k) => {
      const y = lerp([top, bottom], 0.5 + 0.5 * Math.sin(k * 2.1));
      const wall: Point = { x: far, y };
      const line = sampleLine(
        (u) =>
          u < 0.7
            ? {
                x: lerp([near, far], u / 0.7),
                y: y - Math.sin((Math.PI * u) / 0.7) * 40,
              }
            : {
                x: lerp([far, total.x], ((u - 0.7) / 0.3) ** 2),
                y: lerp([y, total.y], (u - 0.7) / 0.3),
              },
        80,
      );
      const along = measure(line);
      const hitShare = along[56] / along[along.length - 1];
      const blows = clock;
      clock += lerp(gapsMs, k / (GUSTS - 1));
      return { y, wall, line, blows, hits: blows + travelMs * hitShare };
    });
    const pour: Pour = { coinsAlong: 700, width: 60, streamMs, travelMs };
    const last = gusts[gusts.length - 1];
    const endAt = last.hits;
    const durationMs = Math.max(
      pourDurationMs(last.blows, pour),
      endAt + holdMs + mergeMs,
    );
    const at: Point = { x: 0, y: 0 };
    const blower = (ms: number): Point | null => {
      if (ms > last.blows + streamMs) return null;
      if (ms < flyMs) {
        const u = easeOut(ms / flyMs);
        at.x = lerp([button.x, near], u);
        at.y = lerp([button.y, gusts[0].y], u);
        return at;
      }
      let g = gusts[0];
      let next = gusts[0];
      for (let k = 0; k < gusts.length; k++)
        if (ms >= gusts[k].blows) {
          g = gusts[k];
          next = gusts[Math.min(k + 1, gusts.length - 1)];
        }
      const u = clamp01(
        (ms - g.blows - streamMs * 0.6) /
          (next.blows - g.blows - streamMs * 0.6 || 1),
      );
      at.x = near;
      at.y = lerp([g.y, next.y], u);
      return at;
    };

    const blowing = createBeats(
      gusts,
      (g) => g.blows,
      (g) => {
        pourLine(cover!, g.line, pour);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      gusts,
      (g) => g.hits,
      (g, k) => {
        if (g === last) {
          cover!.blast(g.wall);
          return;
        }
        cover!.burst(g.wall, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (GUSTS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          blowing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            blower,
            ms,
            now,
            WISP_SIZE * BLOWER,
            0.7,
            0,
            last.blows + streamMs,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
