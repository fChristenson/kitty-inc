// the "Fuel Line" event (mix; a crit tier, free upgrade levels and cash): it
// covers its crit, whose click freezes the screen while a wisp dives out of
// the total-income readout down onto the end of the clicked floor's income
// bar, dragging a sagging hose of flowing cash behind it, and plugs in with a
// bang; then the hose pumps: fat slugs of cash surge down it one after
// another, ever faster, each gulped by the bar with a jolt, a bang and free
// levels as the wisp glows hotter; the last pump jumps the bar a crit tier
// and blows the hose off in a huge blast of cash and shake. Pays floor
// income × floor number × REWARD, plus the levels and the tier
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pointAlong,
  riverHead,
  sampleLine,
  totalSpot,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "fuelLine";
const REWARD = 2;
const PUMPS = 4;
// the hose sags SAG px, its coins up to SPREAD px off its middle
const SAG = 180;
const SPREAD = 9;
const FILL_COINS = 240;
const PUMP_COINS = 150;
const COIN = 0.7;
const PUMP_SHAKE: [number, number] = [0.8, 1.6];

export const forceFuelLineEvent = registerWispEvent(
  KEY,
  "Fuel Line",
  () => CONFIG.fuelLineEvent.chance,
  (floor, context, area) => {
    const {
      plugMs,
      fillMs,
      pumpGapsMs,
      pumpTravelMs,
      pulseMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.fuelLineEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const top = totalSpot(area);
    const right = Math.random() < 0.5;
    const plug: Point = {
      x: own.box.x + own.box.width * (right ? 0.9 : 0.1),
      y: own.box.y - 6,
    };
    const sag: Point = {
      x: (top.x + plug.x) / 2 + (right ? -1 : 1) * 120,
      y: (top.y + plug.y) / 2 + SAG,
    };
    const line = sampleLine(
      (u) => bezier(top, sag, plug, u, { x: 0, y: 0 }),
      60,
    );
    const along = measure(line);
    // the fill trails the wisp down; then each pump surges down faster
    const pumps: number[] = [];
    let clock = plugMs;
    for (let k = 0; k < PUMPS; k++) {
      clock += lerp(pumpGapsMs, k / (PUMPS - 1));
      pumps.push(clock);
    }
    const arrivals = pumps.map((at) => at + pumpTravelMs);
    const endAt = arrivals[PUMPS - 1] + pulseMs;
    const slugs = [
      { leaves: 0, streamMs: fillMs, travelMs: plugMs, coins: FILL_COINS },
      ...pumps.map((leaves) => ({
        leaves,
        streamMs: pulseMs,
        travelMs: pumpTravelMs,
        coins: PUMP_COINS,
      })),
    ];
    const paths: CoinPath[] = slugs.flatMap((slug) =>
      Array.from({ length: slug.coins }, () => {
        const leaves = slug.leaves + Math.random() * slug.streamMs;
        const dx = (Math.random() * 2 - 1) * SPREAD;
        const dy = (Math.random() * 2 - 1) * SPREAD;
        const at: Point = { x: 0, y: 0 };
        return (f: number) => {
          const u = (f * endAt - leaves) / slug.travelMs;
          if (u < 0) return { x: top.x, y: top.y, scale: 0 };
          if (u >= 1) return { x: plug.x, y: plug.y, scale: 0 };
          pointAlong(line, along, u, at);
          return { x: at.x + dx, y: at.y + dy, scale: COIN };
        };
      }),
    );
    const head = riverHead(line, plugMs);
    const wisp = (ms: number): Point | null =>
      ms < 0 ? null : (head(ms) ?? plug);

    const plugging = createBeats(
      [plugMs],
      (ms) => ms,
      () => {
        cover!.burst(plug, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(0.8);
      },
    );
    const pumping = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 2), sag);
        if (k === PUMPS - 1) {
          cover!.tierUp(own, sag);
          cover!.slam(own);
          cover!.blast(plug);
          return;
        }
        cover!.burst(plug, 0.6 + 0.2 * k);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PUMP_SHAKE, k / (PUMPS - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars: [own],
        tick: (ms, now) => {
          plugging.tick(ms, now);
          pumping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / arrivals[PUMPS - 1]),
            0,
            arrivals[PUMPS - 1],
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
