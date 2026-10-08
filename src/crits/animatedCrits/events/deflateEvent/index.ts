// the "Deflate" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a wisp blows cash out of the
// clicked floor's button into a swelling balloon of coins round itself;
// then it lets go and the balloon goes zipping and squealing wildly about
// the screen, a jet of cash spraying out behind it as it shrinks, whizzing
// past every income bar with a jolt and free levels; it sputters its last
// into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
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
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "deflate";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 700;
const COIN = 0.5;
const ABOVE = 260;
const BALLOON: [number, number] = [30, 160];
const SHRUNK = 18;
// how far off each bar's middle its pass wobbles
const WOBBLE = 140;
const JET: [number, number] = [120, 360];
const JET_SPREAD = 0.9;
const JET_MS = 380;
const WISP = 0.7;
const PASS_SHAKE: [number, number] = [0.5, 1.2];

export const forceDeflateEvent = registerWispEvent(
  KEY,
  "Deflate",
  () => CONFIG.deflateEvent.chance,
  (floor, context, area) => {
    const { blowMs, zipMs, levelShare, holdMs, mergeMs } = CONFIG.deflateEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const start: Point = {
      x: button.x,
      y: Math.max(area.top + 300, button.y - ABOVE),
    };
    // a wild route past every bar, looping out to the edges between them
    const route: Point[] = [start];
    bars.forEach((bar, k) => {
      route.push({
        x: k % 2 === 0 ? area.left + 120 : area.right - 120,
        y: lerp([route[route.length - 1].y, bar.center.y], 0.5),
      });
      route.push({
        x: bar.center.x + (Math.random() - 0.5) * WOBBLE,
        y: bar.center.y - 40,
      });
    });
    route.push(total);
    // u along the route at ms: it zips off slow and races on
    const zipU = (ms: number) => easeIn(clamp01((ms - blowMs) / zipMs)) ** 0.8;
    const spot: Point = { x: 0, y: 0 };
    const balloonAt = (ms: number): Point => {
      if (ms < blowMs) {
        spot.x = start.x + Math.sin(ms * 0.03) * 4;
        spot.y = start.y;
        return spot;
      }
      return alongRoute(route, zipU(ms), spot);
    };
    const radiusAt = (ms: number) =>
      ms < blowMs
        ? lerp(BALLOON, easeOut(clamp01(ms / blowMs)))
        : lerp([BALLOON[1], SHRUNK], clamp01((ms - blowMs) / zipMs));
    const endAt = blowMs + zipMs;
    const travel = endAt + JET_MS;
    // the moment the balloon is nearest each bar's pass point
    const passes = bars.map((bar, k) => {
      const share = (2 * k + 2) / (route.length - 1);
      let ms = blowMs;
      while (ms < endAt && zipU(ms) < share) ms += 4;
      return { bar, ms, at: route[2 * k + 2] };
    });
    const centre: Point = { x: 0, y: 0 };
    const behind: Point = { x: 0, y: 0 };
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const joins = (i / COINS) * blowMs * 0.8;
      const leaves = blowMs + (i / COINS) * zipMs * 0.97;
      // squirted out backwards from where the balloon was heading
      alongRoute(route, zipU(leaves), centre);
      alongRoute(route, zipU(leaves - 30), behind);
      const back =
        Math.atan2(behind.y - centre.y, behind.x - centre.x) +
        (Math.random() - 0.5) * JET_SPREAD;
      const reach = lerp(JET, Math.random());
      const from = { x: centre.x, y: centre.y };
      return (f: number) => {
        const ms = f * travel;
        if (ms < joins) return { x: button.x, y: button.y, scale: 0 };
        if (ms < leaves) {
          const at = balloonAt(ms);
          const radius = radiusAt(ms) * r;
          const u = easeOut(clamp01((ms - joins) / 200));
          return {
            x: lerp([button.x, at.x + Math.cos(a) * radius], u),
            y: lerp([button.y, at.y + Math.sin(a) * radius], u),
            scale: COIN * u,
          };
        }
        const u = easeOut(clamp01((ms - leaves) / JET_MS));
        return {
          x: from.x + Math.cos(back) * reach * u,
          y: from.y + Math.sin(back) * reach * u,
          scale: COIN,
        };
      };
    });

    const releasing = createBeats(
      [blowMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const passing = createBeats(
      passes,
      (p) => p.ms,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), p.at);
        cover!.burst(p.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const landing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(cover!.total() ?? total);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          releasing.tick(ms, now);
          passing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            balloonAt,
            ms,
            now,
            WISP_SIZE * WISP,
            0.9,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
