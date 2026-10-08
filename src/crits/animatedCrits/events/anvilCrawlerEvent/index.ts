// the "Anvil Crawler" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while a crawler of lightning creeps
// out across the top of the sky like the spidery bolts under a storm's
// anvil, crackling from side to side, ever faster; on every pass it drops
// a jagged fork straight down onto an income bar in a blinding strike, a
// crack and a jolt that lands free levels; the last fork splits the sky in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "anvilCrawler";
const MAX_BARS = 4;
// the crawler runs HIGH px under the top, LINKS bolts long, LINK px each,
// wandering WANDER px up and down
const HIGH = 50;
const LINKS = 6;
const LINK = 46;
const WANDER = 26;
const EDGE = 20;
const FORK_MS = 240;
const DROP_AT = 0.55;
const STRIKE_SHAKE: [number, number] = [0.8, 1.5];

export const forceAnvilCrawlerEvent = registerWispEvent(
  KEY,
  "Anvil Crawler",
  () => CONFIG.anvilCrawlerEvent.chance,
  (floor, context, area) => {
    const { passesMs, levelShare, holdMs, mergeMs } = CONFIG.anvilCrawlerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const y0 = area.top + HIGH;
    let clock = 0;
    const passes = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const span = lerp(passesMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      clock += span;
      const drops = starts + span * DROP_AT;
      const x = lerp(ltr ? [left, right] : [right, left], DROP_AT);
      return {
        bar,
        ltr,
        starts,
        span,
        drops,
        fork: createBolt({ x, y: y0 }, bar.center, 3),
      };
    });
    const last = passes[passes.length - 1];
    const endAt = last.drops;
    // the head's spot at ms, and a link's spot that far behind it
    const wander = (x: number) => y0 + Math.sin(x / 47) * WANDER;
    const headX = (ms: number) => {
      let p = passes[0];
      for (const pass of passes) if (ms >= pass.starts) p = pass;
      const u = clamp01((ms - p.starts) / p.span);
      return {
        x: lerp(p.ltr ? [left, right] : [right, left], u),
        dir: p.ltr ? 1 : -1,
      };
    };
    const joints: Point[] = Array.from({ length: LINKS + 1 }, () => ({
      x: 0,
      y: 0,
    }));
    const links: Bolt[] = joints
      .slice(1)
      .map((to, i) => createBolt(joints[i], to, 1));

    const striking = createBeats(
      passes,
      (p) => p.drops,
      (p, k) => {
        cover!.levels(
          p.bar,
          levelsFor(p.bar.floor, levelShare, 2),
          p.fork.from,
        );
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, passes.length - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FORK_MS) return;
          if (ms <= endAt) {
            const { x, dir } = headX(ms);
            for (let i = 0; i <= LINKS; i++) {
              const jx = Math.min(right, Math.max(left, x - dir * LINK * i));
              joints[i].x = jx;
              joints[i].y = wander(jx + ms * 0.05);
            }
            const grow = clamp01(ms / 200);
            for (let i = 0; i < LINKS; i++)
              drawBolt(ctx, links[i], 0.8 * grow * (1 - i / (LINKS + 1)), 0.45);
          }
          for (const p of passes) {
            const t = (ms - p.drops) / FORK_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, p.fork, 1 - t, 0.9);
            drawStrike(ctx, p.bar.center, 1 - t, 1.2, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
