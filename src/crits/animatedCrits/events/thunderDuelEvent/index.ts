// the "Thunder Duel" event (lightning; levels + crit tier): it covers its
// crit, whose click freezes the screen while two storm wisps square off on
// either side of the screen and trade bolts across it, every bolt forking
// down through a bar on its way in a strike and free levels, quicker and
// quicker, each wisp swelling with the charge it takes; then both fire at
// once, the bolts meet mid-screen in a huge blast that forks down onto
// every bar, and the clicked bar climbs a crit tier. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "thunderDuel";
const VOLLEYS = 14;
// the wisps sit this share of the screen's width in from its sides, this
// big, swelling by SWELL a bolt they take
const SIDE = 0.09;
const STORM = WISP_SIZE * 1.1;
const SWELL = 0.06;
// the gap between volleys shrinks from GAP by QUICKEN each down to MIN_GAP
const GAP = 260;
const QUICKEN = 0.88;
const MIN_GAP = 70;
// where along a bar a bolt forks through it
const ALONG: [number, number] = [0.1, 0.9];
const BOLT_MS = 150;
const CLASH_MS = 260;
const FORK_MS = 220;
const FORK_LAG = 60;
const STRIKE_BLAST = 150;
const CLASH_BLAST = 850;
const STRIKE_SHAKE: [number, number] = [0.5, 1];
const CLASH_SHAKE = 1.8;
const SOUND_GAP_MS = 55;

interface Volley {
  at: number;
  bar: RewardBar;
  via: Point;
  left: boolean;
  bolts: [Bolt, Bolt];
}

export const forceThunderDuelEvent = registerWispEvent(
  KEY,
  "Thunder Duel",
  () => CONFIG.thunderDuelEvent.chance,
  (floor, context, area) => {
    const { growMs, levelShare, holdMs, mergeMs } = CONFIG.thunderDuelEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const width = area.right - area.left;
    const middle: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const left: Point = { x: area.left + width * SIDE, y: middle.y };
    const right: Point = { x: area.right - width * SIDE, y: middle.y };

    let clock = growMs;
    const volleys: Volley[] = Array.from({ length: VOLLEYS }, (_, k) => {
      const fromLeft = k % 2 === 0;
      const bar = bars[Math.floor(Math.random() * bars.length)];
      const via: Point = {
        x: bar.box.x + bar.box.width * lerp(ALONG, Math.random()),
        y: bar.center.y,
      };
      const from = fromLeft ? left : right;
      const to = fromLeft ? right : left;
      const volley: Volley = {
        at: clock,
        bar,
        via,
        left: fromLeft,
        bolts: [createBolt(from, via, 1), createBolt(via, to, 1)],
      };
      clock += Math.max(MIN_GAP, GAP * QUICKEN ** k);
      return volley;
    });
    const clashAt = clock + FORK_LAG * 2;
    const clash = [createBolt(left, middle, 2), createBolt(right, middle, 2)];
    const forks = bars.map((b) => createBolt(middle, b.center, 2));
    const endMs = clashAt + DETONATION_MS;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );
    // each wisp's size, swelling with every bolt it takes
    const sizeOf = (isLeft: boolean, ms: number) => {
      let taken = 0;
      for (const v of volleys) if (v.at <= ms && v.left !== isLeft) taken++;
      return STORM * easeOutBack(clamp01(ms / growMs)) * (1 + SWELL * taken);
    };

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const striking = createBeats(
      volleys,
      (v) => v.at,
      (v, k, now) => {
        cover!.levels(v.bar, levels.get(v.bar)!, v.via);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, volleys.length - 1)));
        bang(now);
      },
    );
    const clashing = createBeats(
      [clashAt],
      (ms) => ms,
      () => {
        cover!.tierUp(clicked, middle);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(middle);
        if (cover!.isLive()) shakeScreen(CLASH_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: clashAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          striking.tick(ms, now);
          clashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          if (ms < clashAt) {
            drawWisp(ctx, () => left, ms, now, sizeOf(true, ms), 0.5);
            drawWisp(ctx, () => right, ms, now, sizeOf(false, ms), 0.5);
          }
          for (const v of volleys) {
            const since = ms - v.at;
            if (since < 0 || since >= BOLT_MS) continue;
            const a = 1 - since / BOLT_MS;
            drawBolt(ctx, v.bolts[0], a, 1.2);
            drawBolt(ctx, v.bolts[1], a, 1.2);
            drawStrike(ctx, v.via, a, 1, now);
          }
          for (const v of volleys)
            drawDetonation(ctx, v.via, ms - v.at, STRIKE_BLAST, now);
          const clashSince = ms - clashAt + FORK_LAG;
          if (clashSince >= 0 && clashSince < CLASH_MS)
            for (const b of clash)
              drawBolt(ctx, b, 1 - clashSince / CLASH_MS, 2.2);
          const forkSince = ms - clashAt - FORK_LAG;
          if (forkSince >= 0 && forkSince < FORK_MS)
            for (const b of forks)
              drawBolt(ctx, b, 1 - forkSince / FORK_MS, 1.6);
          drawDetonation(ctx, middle, ms - clashAt, CLASH_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
