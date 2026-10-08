// the "Graze" event (gunfire; crit tiers): it covers its crit, whose click
// freezes the screen while a boss wisp at the top of the screen sprays a
// whirling bullet-hell spiral, and a tiny dodger wisp darts out of the
// clicked floor's button and threads straight through the storm, weaving
// between the bullets, every near miss a graze spark and a tick; each time
// it dives through onto an income bar the bar jumps a crit tier with a bang
// and a big jolt; the last dive ends in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { bulletSpiral, drawBullets } from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "graze";
const MAX_BARS = 3;
const EDGE = 20;
const TOP = 150;
const WEAVE = 110;
const GRAZES = 12;
const SPEED = 1.4;
const BOSS = 0.9;
const DODGER = 0.35;
const BULLET = WISP_SIZE * 0.26;
const GRAZE_SHAKE = 0.2;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceGrazeEvent = registerWispEvent(
  KEY,
  "Graze",
  () => CONFIG.grazeEvent.chance,
  (floor, context, area) => {
    const { runMs, holdMs, mergeMs } = CONFIG.grazeEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const boss: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const spiral = bulletSpiral(
      boss,
      {
        arms: 4,
        rateHz: [10, 18],
        lapsHz: [0.3, 0.7],
        fromMs: 0,
        toMs: runMs,
        turn: Math.random() * Math.PI * 2,
        spin: Math.random() < 0.5 ? 1 : -1,
      },
      SPEED,
      box,
    );
    // weave through the storm onto each bar in turn
    const route: Point[] = [button];
    const hitIndex: number[] = [];
    bars.forEach((bar, k) => {
      const prev = route[route.length - 1];
      route.push({
        x: (prev.x + bar.center.x) / 2 + (k % 2 === 0 ? WEAVE : -WEAVE),
        y: (prev.y + bar.center.y) / 2 - 60,
      });
      route.push(bar.center);
      hitIndex.push(route.length - 1);
    });
    const last = route.length - 1;
    const hits = bars.map((bar, k) => ({
      bar,
      ms: runMs * (hitIndex[k] / last),
    }));
    const lastHit = hits[hits.length - 1];
    const endAt = runMs;
    const grazes = Array.from(
      { length: GRAZES },
      (_, k) => runMs * ((k + 0.5) / GRAZES),
    );
    const dodgerAt: Point = { x: 0, y: 0 };
    const dodger = (ms: number): Point => {
      alongRoute(route, clamp01(ms / runMs), dodgerAt);
      dodgerAt.x += Math.sin(ms / 45) * 10;
      return dodgerAt;
    };
    const spark: Point = { x: 0, y: 0 };
    const bossSpot = () => boss;

    const grazing = createBeats(
      grazes,
      (ms) => ms,
      (ms) => {
        const at = dodger(ms);
        spark.x = at.x + 14;
        spark.y = at.y - 10;
        cover!.burst(spark, 0.08);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(GRAZE_SHAKE);
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.tierUp(h.bar, boss);
        if (h === lastHit) {
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

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          grazing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, spiral, ms, now, BULLET);
          drawWispBetween(
            ctx,
            bossSpot,
            ms,
            now,
            WISP_SIZE * BOSS,
            0.8,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            dodger,
            ms,
            now,
            WISP_SIZE * DODGER,
            1,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
