// the "Stork" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a stork wisp swoops out of the clicked floor's
// button and flies across the top of the screen in long rolling beats,
// carrying a bundle for every empty spot; over each spot it lets one go, and
// the bundle swings down in a wide arc and lands with a pop, a bloop and a
// jolt as a new worker forms there; the last bundle lands in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "stork";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const EDGE = 30;
const TOP = 160;
const ENTER_MS = 250;
const SWING = 120;
const STORK = 0.6;
const BUNDLE = 0.32;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceStorkEvent = registerWispEvent(
  KEY,
  "Stork",
  () => CONFIG.storkEvent.chance,
  (floor, context, area) => {
    const { flyMs, dropMs, holdMs, mergeMs } = CONFIG.storkEvent;
    const ltr = Math.random() < 0.5;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => (ltr ? a.x - b.x : b.x - a.x));
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const from = ltr ? area.left + EDGE : area.right - EDGE;
    const to = ltr ? area.right - EDGE : area.left + EDGE;
    const y = area.top + TOP;
    const xAt = (ms: number) =>
      lerp([from, to], clamp01((ms - ENTER_MS) / flyMs));
    const endFly = ENTER_MS + flyMs;
    const bundles = hires.map((hire) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const releases =
        ENTER_MS + flyMs * clamp01((hire.x - from) / (to - from));
      const release: Point = { x: hire.x, y: y + 20 };
      const ctrl: Point = {
        x: hire.x + (ltr ? SWING : -SWING),
        y: (release.y + spot.y) / 2,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        releases,
        lands: releases + dropMs,
        at: (ms: number): Point =>
          bezier(
            release,
            ctrl,
            spot,
            clamp01((ms - releases) / dropMs) ** 1.4,
            at,
          ),
      };
    });
    const last = bundles.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = Math.max(last.lands, endFly);
    const storkAt: Point = { x: 0, y: 0 };
    const stork = (ms: number): Point => {
      if (ms < ENTER_MS) {
        const u = easeOut(ms / ENTER_MS);
        storkAt.x = lerp([button.x, from], u);
        storkAt.y = lerp([button.y, y], u);
        return storkAt;
      }
      storkAt.x = xAt(ms);
      storkAt.y = y + Math.sin(ms / 110) * 14;
      return storkAt;
    };

    const releasing = createBeats(
      bundles,
      (b) => b.releases,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      bundles,
      (b) => b.lands,
      (b, k) => {
        giveHire(b.hire);
        if (b === last) {
          cover!.blast(b.spot);
          return;
        }
        cover!.burst(b.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, bundles.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          releasing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            stork,
            ms,
            now,
            WISP_SIZE * STORK,
            0.6,
            0,
            endFly,
          );
          for (const b of bundles)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BUNDLE,
              0.8,
              b.releases,
              b.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
