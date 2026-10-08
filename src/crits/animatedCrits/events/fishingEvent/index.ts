// the "Fishing" event (mix): it covers its crit, whose click freezes the
// screen while a wisp lure is cast out of the clicked floor's button in a
// long high arc, paying out a line of flowing cash behind it, and plops down
// on the far side with a splash; it bobs, then two bites yank it under, each
// a splash, a jolt and coins; then it's struck and whipped up out of the
// water into the total-income readout in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "fishing";
const REWARD = 4;
// the lure lands LAND (shares across and down) on the far side, cast over a
// peak HIGH of the screen's height down; bobbing BOB px, ducked DUCK px by
// each bite
const LAND = { x: 0.82, y: 0.68 };
const HIGH = 0.15;
const BOB = 5;
const DUCK = 26;
const BITE_MS = 160;
const LURE = 0.06;
const SPLASH_COINS = [10, 16, 22];
const SPLASH_REACH: [number, number] = [25, 80];
const SPLASH_SHAKE = [1, 1.4, 1.8];

export const forceFishingEvent = registerWispEvent(
  KEY,
  "Fishing",
  () => CONFIG.fishingEvent.chance,
  (floor, context, area) => {
    const { castMs, streamMs, bitesMs, strikeMs, holdMs, mergeMs } =
      CONFIG.fishingEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const farRight = button.x < (area.left + area.right) / 2;
    const land = {
      x: area.left + width * (farRight ? LAND.x : 1 - LAND.x),
      y: area.top + height * LAND.y,
    };
    const peak = { x: (button.x + land.x) / 2, y: area.top + height * HIGH };
    const line = sampleLine(
      (u) => bezier(button, peak, land, u, { x: 0, y: 0 }),
      60,
    );
    const pour: Pour = {
      coinsAlong: 1_500,
      width: 26,
      streamMs,
      travelMs: castMs,
    };
    const lure = riverHead(line, castMs);
    const bites = bitesMs.map((at) => castMs + at);
    const strikeAt = castMs + bitesMs[bitesMs.length - 1] + BITE_MS;
    const inAt = strikeAt + strikeMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      inAt + holdMs + mergeMs,
    );
    const bob = { x: 0, y: 0 };
    const lureAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= inAt) return null;
      if (ms < castMs) return lure(ms);
      if (ms < strikeAt) {
        let duck = 0;
        for (const at of bites)
          duck = Math.max(
            duck,
            Math.sin(Math.PI * clamp01((ms - at) / BITE_MS)),
          );
        bob.x = land.x;
        bob.y = land.y + Math.sin(ms / 90) * BOB + duck * DUCK;
        return bob;
      }
      const total = cover?.total() ?? fallback;
      return bezier(
        land,
        { x: land.x, y: total.y },
        total,
        easeIn(clamp01((ms - strikeAt) / strikeMs)),
        bob,
      );
    };

    const splashes = createBeats(
      [castMs, ...bites],
      (ms) => ms,
      (_, k) => {
        cover!.burst(land, 0.6 + 0.2 * k);
        cover!.launchFrom(
          land,
          ringTargets(land, SPLASH_COINS[k], SPLASH_REACH),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SPLASH_SHAKE[k]);
      },
    );
    const strike = createBeats(
      [strikeAt],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          splashes.tick(ms, now);
          strike.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            lureAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * LURE),
            lerp([0.4, 1], clamp01(ms / inAt)),
            0,
            inAt,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
