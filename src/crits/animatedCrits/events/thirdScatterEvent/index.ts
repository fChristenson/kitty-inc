// the "Third Scatter" event (explosion; levels + crit tier): it covers its
// crit, whose click freezes the screen while scatter wisps fly out of the
// clicked button one by one and slam onto bars; the third climbs high and
// hovers over its bar, flaring brighter, the screen rumbling harder and
// harder, then drops: beams link all three and every bar blows in a rolling
// chain of blasts along it, top to bottom, each taking its levels, the
// clicked one last in a huge blast that climbs a crit tier. Then the crit's
// tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { levelsFor } from "../../../../gameState";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "thirdScatter";
const SCATTER = WISP_SIZE * 1.6;
const GLOW = 60;
const HOVER_GLOW = 90;
const HOVER_FLARE = 30;
// where along its bar each scatter lands
const ALONG = [0.2, 0.8, 0.5];
// the flights: up off the button, bowed LIFT over the higher end
const LIFT = 300;
// the third hovers HIGH over its bar (kept OFF_TOP below the screen's top),
// wobbling, then drops in DROP_MS
const HIGH = 420;
const OFF_TOP = 120;
const WOBBLE: [number, number] = [22, 18];
const DROP_MS = 120;
const RUMBLE_MS = 60;
const RUMBLE: [number, number] = [0.15, 0.7];
const LAND_BLAST = [80, 80, 110];
const LAND_SHAKE = [0.8, 0.8, 1.6];
// the beams linking the three
const LINK = 26;
const LINK_ALPHA = 0.8;
// the chain along each bar: CHAIN blasts CHAIN_GAP_MS apart, the bars
// BAR_GAP_MS apart top to bottom
const CHAIN = 5;
const CHAIN_GAP_MS = 45;
const BAR_GAP_MS = 200;
const CHAIN_BLAST = 60;
const CHAIN_SHAKE = 0.4;
const OWN_CHAIN_BLAST = 90;
const BOOM_BLAST = 240;
const BOOM_SHAKE = 2.6;
const SOUND_GAP_MS = 55;

interface Scatter {
  bar: RewardBar;
  spot: Point;
  launchAt: number;
  landAt: number;
}

export const forceThirdScatterEvent = registerWispEvent(
  KEY,
  "Third Scatter",
  () => meta.chance,
  (floor, context, area) => {
    const { landsMs, hoverMs, linkMs, levelShare, holdMs, mergeMs } =
      meta.values;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const button = getButtonCenter(context.isGroundFloor);
    // three bars, the clicked one last if there's a choice
    const pool = bars.filter((b) => b !== clicked);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = Array.from(
      { length: 3 },
      (_, i) => pool[i % Math.max(1, pool.length)] ?? clicked,
    );
    const scatters: Scatter[] = picks.map((bar, i) => ({
      bar,
      spot: {
        x: bar.box.x + bar.box.width * ALONG[i],
        y: bar.center.y,
      },
      launchAt: i === 0 ? 0 : landsMs[i - 1] - 80,
      landAt: landsMs[i],
    }));
    const third = scatters[2];
    const over: Point = {
      x: third.spot.x,
      y: Math.max(area.top + OFF_TOP, third.spot.y - HIGH),
    };
    const hoverAt = third.landAt - hoverMs - DROP_MS;
    const linkAt = third.landAt + linkMs;
    // the chain: every bar top to bottom, the clicked one last
    const order = [...bars]
      .filter((b) => b !== clicked)
      .sort((a, b) => a.center.y - b.center.y);
    order.push(clicked);
    const chainAt = linkAt + 200;
    const blasts = order.flatMap((bar, j) =>
      Array.from({ length: CHAIN }, (_, k) => ({
        bar,
        at: chainAt + j * BAR_GAP_MS + k * CHAIN_GAP_MS,
        spot: {
          x: bar.box.x + bar.box.width * ((k + 0.5) / CHAIN),
          y: bar.center.y,
        },
        own: bar === clicked,
      })),
    );
    const boomAt =
      chainAt + (order.length - 1) * BAR_GAP_MS + CHAIN * CHAIN_GAP_MS + 60;
    const endMs = boomAt + DETONATION_MS;

    // where scatter i is, ms in; null before its launch
    const flight = (from: Point, to: Point, t: number, into: Point) => {
      const top = Math.min(from.y, to.y) - LIFT;
      const u = 1 - t;
      into.x =
        u * u * from.x + 2 * u * t * ((from.x + to.x) / 2) + t * t * to.x;
      into.y = u * u * from.y + 2 * u * t * top + t * t * to.y;
      return into;
    };
    const paths = scatters.map((s, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < s.launchAt) return null;
        if (ms >= s.landAt) return s.spot;
        if (i < 2) {
          const t = clamp01((ms - s.launchAt) / (s.landAt - s.launchAt));
          return flight(button, s.spot, t * t, at);
        }
        if (ms < hoverAt)
          return flight(
            button,
            over,
            clamp01((ms - s.launchAt) / (hoverAt - s.launchAt)),
            at,
          );
        if (ms < s.landAt - DROP_MS) {
          at.x = over.x + Math.sin(ms * 0.03) * WOBBLE[0];
          at.y = over.y + Math.sin(ms * 0.017) * WOBBLE[1];
          return at;
        }
        const t = clamp01((ms - (s.landAt - DROP_MS)) / DROP_MS);
        at.x = lerp([over.x, s.spot.x], t);
        at.y = lerp([over.y, s.spot.y], t * t);
        return at;
      };
    });

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );
    const landing = createBeats(
      scatters,
      (s) => s.landAt,
      (_, i, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE[i]);
        bang(now);
      },
    );
    const rumbles = Array.from(
      { length: Math.floor((third.landAt - DROP_MS - hoverAt) / RUMBLE_MS) },
      (_, k) => hoverAt + k * RUMBLE_MS,
    );
    const rumbling = createBeats(
      rumbles,
      (at) => at,
      (_, k) => {
        if (cover!.isLive())
          shakeScreen(lerp(RUMBLE, k / Math.max(1, rumbles.length - 1)));
      },
    );
    const chaining = createBeats(
      blasts,
      (b) => b.at,
      (b, k, now) => {
        // a bar's levels land with its first blast
        if (k % CHAIN === 0) cover!.levels(b.bar, levels.get(b.bar)!, b.spot);
        if (!cover!.isLive()) return;
        shakeScreen(CHAIN_SHAKE);
        bang(now);
      },
    );
    const booming = createBeats(
      [boomAt],
      (ms) => ms,
      (_, __, now) => {
        cover!.tierUp(clicked, clicked.center);
        for (const bar of bars) cover!.slam(bar);
        if (!cover!.isLive()) return;
        shakeScreen(BOOM_SHAKE);
        bang(now);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: boomAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          landing.tick(ms, now);
          rumbling.tick(ms, now);
          chaining.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          // the scatters' glows, the beams linking them, then the wisps
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < 3 && ms < boomAt; i++) {
            const at = paths[i](ms);
            if (!at) continue;
            const hovering = i === 2 && ms >= hoverAt && ms < third.landAt;
            stampGlimmer(
              ctx,
              at.x,
              at.y,
              hovering
                ? HOVER_GLOW + HOVER_FLARE * Math.abs(Math.sin(ms * 0.03))
                : GLOW,
              i,
              COLOR.heavenlyGold,
            );
          }
          if (ms >= linkAt && ms < boomAt) {
            const a = LINK_ALPHA * (0.7 + 0.3 * Math.sin(ms * 0.07));
            for (let i = 0; i < 3; i++)
              drawBeam(
                ctx,
                scatters[i].spot,
                scatters[(i + 1) % 3].spot,
                LINK,
                a,
              );
          }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
          if (ms < boomAt)
            for (let i = 0; i < 3; i++) {
              const hovering = i === 2 && ms >= hoverAt && ms < third.landAt;
              drawWisp(ctx, paths[i], ms, now, SCATTER, hovering ? 1 : 0.4);
            }
          scatters.forEach((s, i) =>
            drawDetonation(ctx, s.spot, ms - s.landAt, LAND_BLAST[i], now),
          );
          for (const b of blasts)
            drawDetonation(
              ctx,
              b.spot,
              ms - b.at,
              b.own ? OWN_CHAIN_BLAST : CHAIN_BLAST,
              now,
            );
          drawDetonation(ctx, clicked.center, ms - boomAt, BOOM_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
