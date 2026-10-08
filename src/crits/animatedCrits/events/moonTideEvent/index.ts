// the "Moon Tide" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// floods the bottom of the screen with a sea of cash and a moon wisp rises
// over it; as the moon swings across the sky the sea heaves up under it in
// a great tidal bulge that climbs ever higher, every income bar its crest
// rises past jolting with a splash and free levels; then the moon soars up
// into the total and drags the whole tide in after it in a huge blast and
// shake. Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "moonTide";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 1_400;
const COIN = 0.5;
// the sea lies SEA px deep along the bottom; the bulge is BULGE px wide and
// its crest climbs to PEAK of the way up the screen
const SEA = 90;
const BULGE = 140;
const PEAK = 0.75;
const MOON = 1.2;
// the moon hangs HANG px over the crest
const HANG = 140;
const POUR_MS = 300;
const SURGE_SPREAD = 300;
const CREST_SHAKE: [number, number] = [0.6, 1.4];

export const forceMoonTideEvent = registerWispEvent(
  KEY,
  "Moon Tide",
  () => CONFIG.moonTideEvent.chance,
  (floor, context, area) => {
    const { riseMs, pullMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.moonTideEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const surface = area.bottom - SEA;
    const peak = PEAK * height;
    const pullAt = riseMs + pullMs;
    const endAt = pullAt + SURGE_SPREAD + flightMs;
    const fromLeft = Math.random() < 0.5;
    // the moon swings across; the bulge under it climbs as it goes
    const moonX = (ms: number) =>
      area.left +
      width *
        lerp(
          fromLeft ? [0.15, 0.85] : [0.85, 0.15],
          smoothstep(clamp01(ms / pullAt)),
        );
    const swell = (ms: number) => peak * easeIn(clamp01(ms / pullAt));
    const crestY = (ms: number) => surface - swell(ms);
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context)
          .filter((b) => b.center.y > surface - peak && b.center.y < surface)
          .slice(-MAX_BARS)
      : [];

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x = area.left + Math.random() * width;
      const depth = SEA * Math.random();
      const pours = Math.random() * POUR_MS;
      const leaves =
        pullAt +
        (1 - Math.exp(-(((x - moonX(pullAt)) / BULGE) ** 2))) * SURGE_SPREAD;
      const start: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const place = (ms: number, into: { x: number; y: number }) => {
        const near = Math.exp(-(((x - moonX(ms)) / BULGE) ** 2));
        into.x = x + (moonX(ms) - x) * near * 0.15;
        into.y = surface + depth - swell(ms) * near * (1 - depth / SEA / 2);
        return into;
      };
      place(leaves, start);
      const lift: Point = { x: start.x, y: start.y - 80 };
      return (f) => {
        const ms = f * endAt;
        if (ms < pours) return { x: button.x, y: button.y, scale: 0 };
        if (ms < leaves) {
          place(ms, at);
          if (ms < pours + POUR_MS) {
            const u = easeOut((ms - pours) / POUR_MS);
            at.x = lerp([button.x, at.x], u);
            at.y = lerp([button.y, at.y], u);
          }
          return { x: at.x, y: at.y, scale: COIN };
        }
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - leaves) / flightMs));
        bezier(start, lift, total, u, at);
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const moonAt = { x: 0, y: 0 };
    const moon = (ms: number) => {
      if (ms < 0 || ms > pullAt + flightMs) return null;
      if (ms <= pullAt) {
        moonAt.x = moonX(ms);
        moonAt.y =
          Math.min(crestY(ms) - HANG, area.top + height * 0.35) -
          20 * (1 - clamp01(ms / 300));
        return moonAt;
      }
      const total = cover?.total() ?? fallback;
      const u = easeIn((ms - pullAt) / flightMs);
      moonAt.x = lerp([moonX(pullAt), total.x], u);
      moonAt.y = lerp(
        [Math.min(crestY(pullAt) - HANG, area.top + height * 0.35), total.y],
        u,
      );
      return moonAt;
    };

    // the crest passes y when easeIn(ms / pullAt) reaches its share
    const crests = bars
      .map((bar) => ({
        bar,
        at: pullAt * Math.sqrt(clamp01((surface - bar.center.y) / peak)),
      }))
      .sort((a, b) => a.at - b.at);
    const cresting = createBeats(
      crests,
      (c) => c.at,
      (c, k) => {
        const t = k / Math.max(1, crests.length - 1);
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 2));
        cover!.burst({ x: moonX(c.at), y: c.bar.center.y }, 0.4 + 0.3 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CREST_SHAKE, t));
      },
    );
    const pulling = createBeats(
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
          cresting.tick(ms, now);
          pulling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            moon,
            ms,
            now,
            WISP_SIZE * MOON,
            clamp01(ms / pullAt),
            0,
            pullAt + flightMs,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
