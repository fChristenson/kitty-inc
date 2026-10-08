// the "Dambuster" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a fat bomb wisp, fuse fizzing, is lobbed out of
// the clicked floor's button and comes down skipping across the bottom of
// the screen like a stone on a lake, every skip a splash of coins, a thud
// and a jolt, each skip shorter, lower and quicker than the last; it
// slams into the far side of the screen and goes off in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawLitFuse } from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "dambuster";
const REWARD = 4;
const SKIPS = 7;
// it skims LOW px up off the bottom; skips shrink by SHRINK each, the
// first HIGH px high
const LOW = 70;
const SHRINK = 0.72;
const HIGH = 140;
const EDGE = 30;
const BOMB = 0.6;
const FUSE = 26;
const SPLASH = 12;
const SPLASH_REACH: [number, number] = [30, 120];
const SKIP_SHAKE: [number, number] = [0.5, 1.2];

export const forceDambusterEvent = registerWispEvent(
  KEY,
  "Dambuster",
  () => CONFIG.dambusterEvent.chance,
  (floor, context, area) => {
    const { lobMs, skipsMs, holdMs, mergeMs } = CONFIG.dambusterEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const y = area.bottom - LOW;
    const ltr = button.x < (area.left + area.right) / 2;
    const start = ltr ? area.left + EDGE : area.right - EDGE;
    const wall = ltr ? area.right - EDGE : area.left + EDGE;
    // skip lengths shrinking geometrically, filling the width
    const lengths = Array.from({ length: SKIPS }, (_, k) => SHRINK ** k);
    const sum = lengths.reduce((s, l) => s + l, 0);
    let x = start;
    let clock: number = lobMs;
    const skips = lengths.map((l, k) => {
      const from = x;
      x += ((wall - start) * l) / sum;
      const span = skipsMs * (l / sum) * (1 + (0.15 * (SKIPS - k)) / SKIPS);
      const s = {
        from,
        to: x,
        starts: clock,
        lands: clock + span,
        high: HIGH * l,
      };
      clock = s.lands;
      return s;
    });
    const endAt = clock;
    const blastAt: Point = { x: wall, y };
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point | null => {
      if (ms > endAt) return null;
      if (ms < lobMs) {
        const u = ms / lobMs;
        bombAt.x = lerp([button.x, start], u);
        bombAt.y = lerp([button.y, y], u) - Math.sin(Math.PI * u) * HIGH;
        return bombAt;
      }
      for (const s of skips) {
        if (ms > s.lands) continue;
        const u = (ms - s.starts) / (s.lands - s.starts);
        bombAt.x = lerp([s.from, s.to], u);
        bombAt.y = y - Math.sin(Math.PI * u) * s.high;
        return bombAt;
      }
      return blastAt;
    };
    const splashes = [
      { at: lobMs, x: start },
      ...skips.slice(0, -1).map((s) => ({ at: s.lands, x: s.to })),
    ];

    const skipping = createBeats(
      splashes,
      (s) => s.at,
      (s, k) => {
        const spot = { x: s.x, y };
        cover!.launchFrom(spot, ringTargets(spot, SPLASH, SPLASH_REACH));
        cover!.burst(spot, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SKIP_SHAKE, k / (splashes.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(blastAt),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          skipping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          const p = bomb(ms);
          if (p) drawLitFuse(ctx, p, clamp01(ms / endAt), FUSE, now);
          drawWispBetween(ctx, bomb, ms, now, WISP_SIZE * BOMB, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
