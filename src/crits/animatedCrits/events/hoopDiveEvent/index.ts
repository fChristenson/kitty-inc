// the "Hoop Dive" event (mix; crit tiers and cash): it covers its crit, whose
// click freezes the screen while a spinning hoop of cash springs out of the
// clicked floor's button and hangs over an income bar; a wisp arcs up high
// over it and dives straight down through the middle of the hoop, which
// snaps shut behind it and slams onto the bar with a bang and a jolt, the
// bar jumping a crit tier; the next hoop is already spinning over the next
// bar, quicker each time, the last dive a huge blast and shake as all the
// cash pours into the total. Pays floor income × floor number × REWARD,
// plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
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
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "hoopDive";
const REWARD = 2;
const MAX_BARS = 4;
const HOOP_COINS = 130;
const COIN = 0.5;
const HOOP: Point = { x: 150, y: 46 };
const ABOVE = 170;
const SPIN = 1.4;
const APEX = 300;
// the dive's share of each leg, the rest climbing
const DIVE = 0.4;
const COLLAPSE_MS = 140;
const PILE = 40;
const WISP = 0.6;
const DIVE_SHAKE: [number, number] = [0.7, 1.5];

interface Hoop {
  bar: RewardBar;
  at: Point;
  forms: number;
  climbs: number;
  dives: number;
  hits: number;
  from: Point;
}

export const forceHoopDiveEvent = registerWispEvent(
  KEY,
  "Hoop Dive",
  () => CONFIG.hoopDiveEvent.chance,
  (floor, context) => {
    const { legsMs, formMs, holdMs, mergeMs } = CONFIG.hoopDiveEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = formMs;
    let from: Point = button;
    const hoops: Hoop[] = bars.map((bar, k) => {
      const leg = lerp(legsMs, k / Math.max(1, bars.length - 1));
      const climbs = clock;
      const hits = climbs + leg;
      clock = hits;
      const hoop: Hoop = {
        bar,
        at: { x: bar.center.x, y: bar.center.y - ABOVE },
        forms: k === 0 ? 0 : climbs - formMs,
        climbs,
        dives: climbs + leg * (1 - DIVE),
        hits,
        from,
      };
      from = bar.center;
      return hoop;
    });
    const last = hoops[hoops.length - 1];
    const endAt = last.hits;
    const travel = endAt + COLLAPSE_MS + 100;

    const paths: CoinPath[] = hoops.flatMap((h) =>
      Array.from({ length: HOOP_COINS }, () => {
        const phi = Math.random() * Math.PI * 2;
        const pile = {
          x: h.bar.center.x + (Math.random() - 0.5) * PILE * 2,
          y: h.bar.center.y + (Math.random() - 0.5) * PILE,
        };
        return (f: number) => {
          const ms = f * travel;
          if (ms < h.forms) return { x: button.x, y: button.y, scale: 0 };
          const a = phi + (ms / 1000) * SPIN * Math.PI * 2;
          const ringX = h.at.x + Math.cos(a) * HOOP.x;
          const ringY = h.at.y + Math.sin(a) * HOOP.y;
          // the back of the hoop a touch smaller than the front
          const scale = COIN * (0.85 + 0.2 * Math.sin(a));
          if (ms < h.forms + formMs) {
            const u = easeOut((ms - h.forms) / formMs);
            return {
              x: lerp([button.x, ringX], u),
              y: lerp([button.y, ringY], u),
              scale: scale * u,
            };
          }
          if (ms < h.hits) return { x: ringX, y: ringY, scale };
          const u = easeIn(clamp01((ms - h.hits) / COLLAPSE_MS));
          return {
            x: lerp([ringX, pile.x], u),
            y: lerp([ringY, pile.y], u),
            scale,
          };
        };
      }),
    );
    const at: Point = { x: 0, y: 0 };
    const diver = (ms: number): Point | null => {
      if (ms > endAt) return null;
      let h = hoops[0];
      for (const hoop of hoops) if (ms >= hoop.climbs) h = hoop;
      if (ms < h.dives) {
        const u = easeOut(clamp01((ms - h.climbs) / (h.dives - h.climbs)));
        at.x = lerp([h.from.x, h.at.x], u);
        at.y = lerp([h.from.y, h.at.y - APEX], u);
        return at;
      }
      const u = easeIn(clamp01((ms - h.dives) / (h.hits - h.dives)));
      at.x = h.at.x;
      at.y = lerp([h.at.y - APEX, h.bar.center.y], u);
      return at;
    };

    const diving = createBeats(
      hoops,
      (h) => h.hits,
      (h, k) => {
        cover!.tierUp(h.bar, h.at);
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DIVE_SHAKE, k / Math.max(1, hoops.length - 1)));
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
        tick: (ms, now) => diving.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            diver,
            ms,
            now,
            WISP_SIZE * WISP,
            0.8,
            formMs,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
