// the "Water Tower" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while four wisps take up their posts
// high over the screen and a river of cash pumps up out of the clicked
// floor's button into a great quivering tank of cash held between them,
// swelling and shuddering harder as it fills; then the wisps fly apart, the
// tank bursts, and it dumps in torrents straight down onto every income bar,
// each jolting with free levels as its torrent crashes in, the last in a
// huge blast and shake. Pays floor income × floor number × REWARD, plus the
// levels
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
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "waterTower";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 640;
const COIN = 0.5;
const HIGH = 0.2;
const TANK_W = 170;
const TANK_H = 110;
const POSTS: Point[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];
const POST_GAP = 1.25;
const SHUDDER = 10;
const RISE_MS = 420;
const GRAVITY = 0.0028;
const GUARD = 0.5;
const BURST_SHAKE = 1.0;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceWaterTowerEvent = registerWispEvent(
  KEY,
  "Water Tower",
  () => CONFIG.waterTowerEvent.chance,
  (floor, context, area) => {
    const { fillMs, swellMs, levelShare, holdMs, mergeMs } =
      CONFIG.waterTowerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const tank: Point = {
      x: area.left + width / 2,
      y: area.top + (area.bottom - area.top) * HIGH,
    };
    const burstAt = fillMs + swellMs;
    // a rising bend so the river climbs out wide of the tank
    const bend: Point = {
      x: lerp([button.x, tank.x], 0.5) + (button.x < tank.x ? -1 : 1) * 160,
      y: lerp([button.y, tank.y], 0.6),
    };
    const shudderAt = (ms: number) =>
      clamp01((ms - fillMs * 0.5) / (burstAt - fillMs * 0.5)) ** 2;
    const into: Point = { x: 0, y: 0 };
    const drops = Array.from({ length: COINS }, (_, i) => {
      // a spot in the tank, filled from the bottom up
      const fill = i / COINS;
      const dx = (Math.random() * 2 - 1) * TANK_W;
      const dy = TANK_H * (1 - 2 * fill) + (Math.random() - 0.5) * 20;
      const bar = bars.length
        ? bars[Math.floor(Math.random() * bars.length)]
        : null;
      const land: Point = bar
        ? {
            x: bar.box.x + Math.random() * bar.box.width,
            y: bar.center.y + (Math.random() - 0.5) * bar.box.height,
          }
        : { x: tank.x + dx * 1.6, y: area.bottom - 60 - Math.random() * 200 };
      const from: Point = { x: tank.x + dx, y: tank.y + dy };
      const falls = burstAt + (1 - fill) * 90 + Math.random() * 60;
      const lands =
        falls + Math.sqrt((2 * Math.max(40, land.y - from.y)) / GRAVITY);
      return { dx, dy, bar, land, from, joins: fill * fillMs, falls, lands };
    });
    const travel = Math.max(...drops.map((d) => d.lands)) + 40;
    const paths: CoinPath[] = drops.map((d) => (f) => {
      const ms = f * travel;
      if (ms < d.joins) return { x: button.x, y: button.y, scale: 0 };
      if (ms < d.joins + RISE_MS) {
        const p = bezier(
          button,
          bend,
          d.from,
          easeOut((ms - d.joins) / RISE_MS),
          into,
        );
        return { x: p.x, y: p.y, scale: COIN };
      }
      if (ms < d.falls) {
        const s = shudderAt(ms) * SHUDDER;
        return {
          x: d.from.x + Math.sin(ms * 0.07 + d.dy) * s,
          y: d.from.y + Math.cos(ms * 0.05 + d.dx) * s * 0.6,
          scale: COIN,
        };
      }
      const t = clamp01((ms - d.falls) / (d.lands - d.falls));
      return {
        x: lerp([d.from.x, d.land.x], t),
        y: lerp([d.from.y, d.land.y], easeIn(t)),
        scale: COIN,
      };
    });
    const hits = bars
      .map((bar) => {
        const mine = drops
          .filter((d) => d.bar === bar)
          .map((d) => d.lands)
          .sort((a, b) => a - b);
        return {
          bar,
          ms: mine.length ? mine[Math.floor(mine.length * 0.4)] : burstAt + 400,
        };
      })
      .sort((a, b) => a.ms - b.ms);
    const last = hits[hits.length - 1];
    const posts = POSTS.map((p) => {
      const home: Point = {
        x: tank.x + p.x * TANK_W * POST_GAP,
        y: tank.y + p.y * TANK_H * POST_GAP,
      };
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const t = Math.max(0, ms);
        const flung = easeIn(clamp01((t - burstAt) / 260));
        const s = shudderAt(t) * SHUDDER * 0.6;
        at.x = home.x + p.x * flung * 400 + Math.sin(t * 0.05) * s;
        at.y = home.y + p.y * flung * 300 + Math.sin(t * 0.004 + p.x) * 6;
        return at;
      };
    });

    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        cover!.burst(tank, 0.9);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BURST_SHAKE);
      },
    );
    const crashing = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.levels(
          h.bar,
          levelsFor(h.bar.floor, levelShare, 2),
          h.bar.center,
        );
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const finishing = createBeats(
      bars.length ? [] : [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? tank),
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
          bursting.tick(ms, now);
          crashing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > burstAt + 400) return;
          for (const post of posts)
            drawWispBetween(
              ctx,
              post,
              ms,
              now,
              WISP_SIZE * GUARD,
              lerp([0.5, 1], shudderAt(ms)),
              0,
              burstAt + 300,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
