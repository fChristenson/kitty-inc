// the "Ion Haze" event (spray + lightning; levels): it covers its crit,
// whose click freezes the screen while a nozzle wisp sweeps back and forth
// down the whole screen in a fine gold mist that hangs glittering in the
// air; then a bolt cracks down into the haze and lightning crawls through
// it in every direction, branching across the screen, the mist going off
// behind it in a rolling wave of blasts, every bar it reaches jolting with
// free levels, into a huge blast on the clicked bar. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawSpray, planSpray } from "../../../../shared/spray";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "ionHaze";
// the mist: its specks, kept this far in from the screen's sides, between
// these shares of its height, drifting this far
const SPECKS = 420;
const INSET = 60;
const BAND: [number, number] = [0.1, 0.97];
const DRIFT = 8;
const SPECK = 16;
// the nozzle sweeps ROWS rows, hovering this far above each, its spray this
// long; each speck lands this long after it passes
const ROWS = 5;
const HOVER = 120;
const SPRAY_REACH = 200;
const SPRAY_SPREAD = 0.5;
const LAND_MS = 120;
const NOZZLE = WISP_SIZE * 0.8;
const DROPLET = WISP_SIZE * 0.6;
// the strike comes down this far over the haze, off centre; the lightning
// then crawls out from it this many px a ms along CRAWLERS branches
const STRIKE_DROP = 150;
const STRIKE_SIDE = 60;
const STRIKE_MS = 220;
const CRAWL = 1.6;
const CRAWLERS = 16;
const CRAWLER_FORKS = 3;
// one speck in BLAST_EVERY goes off in a blast as it ignites
const BLAST_EVERY = 6;
const SPECK_BLAST = 90;
const FINALE_LAG = 120;
const FINALE_BLAST = 850;
const STRIKE_SHAKE = 1.2;
const BAR_SHAKE = 0.8;
const BLAST_SHAKE = 0.25;
const SOUND_GAP_MS = 55;

interface Speck {
  at: Point;
  lands: number;
  ignites: number;
  blasts: boolean;
}

export const forceIonHazeEvent = registerWispEvent(
  KEY,
  "Ion Haze",
  () => CONFIG.ionHazeEvent.chance,
  (floor, context, area) => {
    const { sprayMs, strikeLagMs, levelShare, holdMs, mergeMs } =
      CONFIG.ionHazeEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const left = area.left + INSET;
    const right = area.right - INSET;
    const top = lerp([area.top, area.bottom], BAND[0]);
    const bottom = lerp([area.top, area.bottom], BAND[1]);
    const rowY = (row: number) =>
      lerp([top, bottom], (row + 0.5) / ROWS) - HOVER;

    // the nozzle's sweep, back and forth down the rows
    const nozzle: Point = { x: 0, y: 0 };
    const nozzleAt = (ms: number): Point => {
      const u = clamp01(ms / sprayMs) * ROWS;
      const row = Math.min(ROWS - 1, Math.floor(u));
      const f = u - row;
      nozzle.x = row % 2 ? lerp([right, left], f) : lerp([left, right], f);
      nozzle.y = rowY(row);
      return nozzle;
    };
    const spray = planSpray(nozzleAt, Math.PI / 2, {
      startMs: 0,
      endMs: sprayMs,
      reach: SPRAY_REACH,
      spread: SPRAY_SPREAD,
    });

    const strikeAt = sprayMs + strikeLagMs;
    const origin: Point = { x: (area.left + area.right) / 2, y: top };
    const specks: Speck[] = Array.from({ length: SPECKS }, (_, i) => {
      const at = {
        x: lerp([left, right], Math.random()),
        y: lerp([top, bottom], Math.random()),
      };
      const row = Math.min(
        ROWS - 1,
        Math.floor(((at.y - top) / (bottom - top)) * ROWS),
      );
      const across = (at.x - left) / (right - left);
      const f = row % 2 ? 1 - across : across;
      return {
        at,
        lands: ((row + f) / ROWS) * sprayMs + LAND_MS,
        ignites:
          strikeAt + Math.hypot(at.x - origin.x, at.y - origin.y) / CRAWL,
        blasts: i % BLAST_EVERY === 0,
      };
    });
    const reach = Math.max(
      ...[
        [area.left, area.bottom],
        [area.right, area.bottom],
      ].map(([x, y]) => Math.hypot(x - origin.x, y - origin.y)),
    );
    // the crawlers fan out down and across from the strike
    const crawlers = Array.from({ length: CRAWLERS }, (_, k) => {
      const a = ((k + 0.5) / CRAWLERS) * Math.PI;
      const to = {
        x: origin.x + Math.cos(a) * reach,
        y: origin.y + Math.sin(a) * reach,
      };
      return { bolt: createBolt(origin, { ...to }, CRAWLER_FORKS), to };
    });
    const strikeBolt: Bolt = createBolt(
      { x: origin.x + STRIKE_SIDE, y: area.top - STRIKE_DROP },
      origin,
      3,
    );
    const reached = bars.map((bar) => ({
      bar,
      ms: strikeAt + Math.abs(bar.center.y - origin.y) / CRAWL,
    }));
    const finaleAt = Math.max(...specks.map((s) => s.ignites)) + FINALE_LAG;
    const endMs = finaleAt + DETONATION_MS;

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const spraying = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const striking = createBeats(
      [strikeAt],
      (ms) => ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(STRIKE_SHAKE);
        soundAt = -Infinity;
        bang(now);
      },
    );
    const igniting = createBeats(
      specks.filter((s) => s.blasts),
      (s) => s.ignites,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(BLAST_SHAKE);
        bang(now);
      },
    );
    const reaching = createBeats(
      reached,
      (r) => r.ms,
      (r) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor, levelShare, 1), origin);
        if (cover!.isLive()) shakeScreen(BAR_SHAKE);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(clicked.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          spraying.tick(ms, now);
          striking.tick(ms, now);
          igniting.tick(ms, now);
          reaching.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < specks.length; i++) {
            const s = specks[i];
            if (ms < s.lands || ms >= s.ignites) continue;
            stampGlimmer(
              ctx,
              s.at.x + Math.sin(ms * 0.002 + i) * DRIFT,
              s.at.y + Math.cos(ms * 0.0017 + i) * DRIFT,
              SPECK + (i % 3) * 4,
              now * 0.003 + i,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.restore();
          drawSpray(ctx, spray, ms, now, DROPLET);
          drawWispBetween(ctx, nozzleAt, ms, now, NOZZLE, 0.6, 0, sprayMs);
          const since = ms - strikeAt;
          if (since >= 0 && since < STRIKE_MS) {
            const a = 1 - since / STRIKE_MS;
            drawBolt(ctx, strikeBolt, a, 2);
            drawStrike(ctx, origin, a, 1.6, now);
          }
          if (since >= 0 && ms < finaleAt) {
            const u = Math.min(1, (since * CRAWL) / reach);
            const flicker = 0.6 + 0.3 * Math.sin(now * 0.05);
            for (const c of crawlers) {
              c.bolt.to.x = lerp([origin.x, c.to.x], u);
              c.bolt.to.y = lerp([origin.y, c.to.y], u);
              drawBolt(ctx, c.bolt, flicker, 0.9);
            }
          }
          for (const s of specks)
            if (s.blasts)
              drawDetonation(ctx, s.at, ms - s.ignites, SPECK_BLAST, now);
          drawDetonation(ctx, clicked.center, ms - finaleAt, FINALE_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
