// the "Crossfire" event: it covers its crit, whose click freezes the screen
// while four wisps light up in its corners and open fire on the clicked
// floor's button, each blasting a river of cash at it in a bowed arc; the
// four rivers crash together on the button in a flash, a bang and a big jolt
// and burst straight up out of it in one roaring geyser of cash, a wisp
// riding its crest into the total-income readout in a huge blast and shake,
// and the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "crossfire";
const REWARD = 4;
// the gunners, INSET of the screen in from its corners, firing STAGGER_MS
// apart, each river bowed BOW of the screen's height
const INSET = 0.1;
const STAGGER_MS = 70;
const BOW = 0.18;
// the wisps, as shares of the screen's width
const GUNNER = 0.06;
const CREST = 0.07;
const POP_MS = 180;
// the crash: a burst, a bang and a big jolt
const CRASH_BURST = 1.2;
const CRASH_SHAKE = 2.2;

export const forceCrossfireEvent = registerWispEvent(
  KEY,
  "Crossfire",
  () => CONFIG.crossfireEvent.chance,
  (floor, context, area) => {
    const { fireMs, travelMs, geyserMs, holdMs, mergeMs } =
      CONFIG.crossfireEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const corners: Point[] = [
      { x: area.left + width * INSET, y: area.top + height * INSET },
      { x: area.right - width * INSET, y: area.top + height * INSET },
      { x: area.left + width * INSET, y: area.bottom - height * INSET },
      { x: area.right - width * INSET, y: area.bottom - height * INSET },
    ];
    const shots = corners.map((from) => {
      const bend = {
        x: (from.x + button.x) / 2,
        y: (from.y + button.y) / 2 - height * BOW,
      };
      return sampleLine((u) => bezier(from, bend, button, u, { x: 0, y: 0 }));
    });
    const pour: Pour = {
      coinsAlong: 330,
      width: 50,
      streamMs: fireMs,
      travelMs,
    };
    const crashAt = travelMs + STAGGER_MS * (corners.length - 1);
    const geyser = sampleLine((u) => ({
      x: button.x + (total.x - button.x) * u * u,
      y: button.y + (total.y - button.y) * u,
    }));
    const gush: Pour = {
      coinsAlong: 1_100,
      width: 110,
      streamMs: geyserMs,
      travelMs,
    };
    const crest = riverHead(geyser, travelMs, crashAt);
    const topAt = crashAt + travelMs;
    const durationMs = Math.max(
      pourDurationMs(crashAt, gush),
      topAt + holdMs + mergeMs,
    );
    const gunnerAt =
      (k: number) =>
      (ms: number): Point | null =>
        ms < 0 || ms >= STAGGER_MS * k + fireMs ? null : corners[k];
    const gunners = corners.map((_, k) => gunnerAt(k));

    const beats = createBeats(
      [...corners.map((_, k) => STAGGER_MS * k), crashAt, topAt],
      (ms) => ms,
      (_, k) => {
        if (k < corners.length) {
          pourLine(cover!, shots[k], pour);
          if (cover!.isLive()) playSwoosh();
          return;
        }
        if (k === corners.length) {
          cover!.burst(button, CRASH_BURST);
          pourLine(cover!, geyser, gush);
          if (!cover!.isLive()) return;
          playExplosion();
          shakeScreen(CRASH_SHAKE);
          return;
        }
        cover!.blast(cover!.total() ?? total);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / topAt);
          const pop = easeOutBack(clamp01(ms / POP_MS));
          const gunner = Math.max(WISP_SIZE, width * GUNNER) * pop;
          gunners.forEach((at, k) =>
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              gunner,
              heat,
              0,
              STAGGER_MS * k + fireMs,
            ),
          );
          drawWispBetween(
            ctx,
            crest,
            ms,
            now,
            Math.max(WISP_SIZE, width * CREST),
            1,
            crashAt,
            topAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
