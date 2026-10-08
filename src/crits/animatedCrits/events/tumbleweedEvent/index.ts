// the "Tumbleweed" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a tumbleweed wisp rolls out of the clicked
// floor's button and bounces across the bottom of the screen in hops that
// grow with the wind, every bounce a pop, a jolt and a burst of coins; at
// the far side a gust catches it and hurls it back in three giant bounds,
// the last slamming down in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
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
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "tumbleweed";
const REWARD = 4;
const OUT = 6;
const BACK = 3;
const EDGE = 80;
const BOTTOM = 100;
const HOP: [number, number] = [50, 150];
const BOUND = 300;
const WEED = 0.5;
const COINS = 16;
const COIN_REACH: [number, number] = [30, 120];
const BOUNCE_SHAKE: [number, number] = [0.4, 1.3];

export const forceTumbleweedEvent = registerWispEvent(
  KEY,
  "Tumbleweed",
  () => CONFIG.tumbleweedEvent.chance,
  (floor, context, area) => {
    const { hopsMs, boundsMs, holdMs, mergeMs } = CONFIG.tumbleweedEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x < (area.left + area.right) / 2;
    const near = ltr ? area.left + EDGE : area.right - EDGE;
    const far = ltr ? area.right - EDGE : area.left + EDGE;
    const ground = area.bottom - BOTTOM;
    // out with the wind in growing hops, then back in giant bounds
    const spots: Point[] = [
      ...Array.from({ length: OUT }, (_, i) => ({
        x: lerp([near, far], ((i + 1) / OUT) ** 1.3),
        y: ground,
      })),
      ...Array.from({ length: BACK }, (_, i) => ({
        x: lerp([far, (near + far) / 2], (i + 1) / BACK),
        y: ground,
      })),
    ];
    let clock = 0;
    let from: Point = button;
    const hops = spots.map((to, k) => {
      const back = k >= OUT;
      const a = from;
      const lift = back ? BOUND : lerp(HOP, k / (OUT - 1));
      const ctrl: Point = {
        x: (a.x + to.x) / 2,
        y: Math.min(a.y, to.y) - lift * 2,
      };
      const leaves = clock;
      clock += back ? boundsMs : lerp(hopsMs, k / (OUT - 1));
      const lands = clock;
      from = to;
      const at: Point = { x: 0, y: 0 };
      return {
        to,
        back,
        leaves,
        lands,
        at: (ms: number): Point =>
          bezier(a, ctrl, to, clamp01((ms - leaves) / (lands - leaves)), at),
      };
    });
    const last = hops[hops.length - 1];
    const endAt = last.lands;
    const weed = (ms: number): Point => {
      let h = hops[0];
      for (const hop of hops) if (ms >= hop.leaves) h = hop;
      return h.at(ms);
    };

    const gusting = createBeats(
      [hops[OUT].leaves],
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(0.6);
      },
    );
    const bouncing = createBeats(
      hops,
      (h) => h.lands,
      (h, k) => {
        cover!.launchFrom(
          h.to,
          ringTargets(h.to, h.back ? COINS * 2 : COINS, COIN_REACH),
        );
        if (h === last) {
          cover!.blast(h.to);
          return;
        }
        cover!.burst(h.to, h.back ? 0.7 : 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, k / (hops.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          gusting.tick(ms, now);
          bouncing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              weed,
              ms,
              now,
              WISP_SIZE * WEED,
              0.5,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
