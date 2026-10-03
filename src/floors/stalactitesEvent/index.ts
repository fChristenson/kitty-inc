// the "Stalactites" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while cash oozes down off the top
// of the screen into great dripping stalactites, one over each income bar,
// growing longer and fatter as the screen rumbles; one after another, ever
// faster, they snap off and plunge onto their bars, each smashing into a
// splash with a bang and a jolt that lands free levels; then all the
// splashed cash surges up into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "stalactites";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 320;
const COIN = 0.55;
// each hangs up to LENGTH px, BASE px wide at its root, wobbling WOBBLE px
const LENGTH = 220;
const BASE = 70;
const WOBBLE = 5;
// it splashes SPLASH px out across its bar, SQUASH as tall
const SPLASH: [number, number] = [20, 130];
const SQUASH = 0.3;
const SPLASH_MS = 160;
const SURGE_SPREAD = 260;
const LIFT = 70;
const RUMBLE_MS = 160;
const SMASH_SHAKE: [number, number] = [0.8, 1.6];

export const forceStalactitesEvent = registerWispEvent(
  KEY,
  "Stalactites",
  () => CONFIG.stalactitesEvent.chance,
  (floor, context, area) => {
    const { growMs, gapsMs, fallMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.stalactitesEvent;
    const fallback = totalSpot(area);
    const bars = findRewardBars(floor, context).slice(-MAX_BARS);
    if (bars.length === 0) return;
    const roof = area.top - 10;
    let clock: number = growMs;
    const drips = bars.map((bar, k) => {
      const snaps = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const x =
        bar.box.x +
        bar.box.width * (0.15 + (0.7 * k) / Math.max(1, bars.length - 1));
      return { bar, x, snaps, lands: snaps + fallMs, phase: Math.random() * 6 };
    });
    const lastLand = drips[drips.length - 1].lands + SPLASH_MS;
    const endAt = lastLand + SURGE_SPREAD + flightMs;
    const length = (ms: number) => LENGTH * easeOut(clamp01(ms / growMs));

    const paths: CoinPath[] = drips.flatMap((drip) =>
      Array.from({ length: COINS }, () => {
        const h = Math.sqrt(Math.random());
        const side = (Math.random() * 2 - 1) * (1 - h);
        const angle = Math.random() * Math.PI * 2;
        const flung = between(SPLASH);
        // the tip of the stalactite lands on the bar's top
        const drop = drip.bar.box.y - (roof + LENGTH);
        const splat: Point = {
          x: drip.x + Math.cos(angle) * flung,
          y: drip.bar.box.y - Math.abs(Math.sin(angle)) * flung * SQUASH - 6,
        };
        const leaves = lastLand + Math.random() * SURGE_SPREAD;
        const lift: Point = { x: splat.x, y: splat.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        return (f: number) => {
          const ms = f * endAt;
          const grown = length(ms);
          if (ms < drip.snaps) {
            // it oozes down as the stalactite grows
            if (h * LENGTH > grown) return { x: drip.x, y: roof, scale: 0 };
            const wobble = Math.sin(ms * 0.01 + drip.phase) * WOBBLE * h;
            return {
              x: drip.x + side * BASE * 0.5 + wobble,
              y: roof + h * LENGTH,
              scale: COIN,
            };
          }
          if (ms < drip.lands) {
            const u = easeIn((ms - drip.snaps) / fallMs);
            return {
              x: drip.x + side * BASE * 0.5,
              y: roof + h * LENGTH + drop * u,
              scale: COIN,
            };
          }
          if (ms < leaves) {
            const u = easeOut(clamp01((ms - drip.lands) / SPLASH_MS));
            return {
              x: lerp([drip.x + side * BASE * 0.5, splat.x], u),
              y: lerp([roof + h * LENGTH + drop, splat.y], u),
              scale: COIN,
            };
          }
          const total = cover?.total() ?? fallback;
          bezier(
            splat,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        };
      }),
    );

    const rumbles = Array.from(
      { length: Math.floor(growMs / RUMBLE_MS) },
      (_, i) => i * RUMBLE_MS,
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive())
          shakeScreen(lerp([0.3, 0.9], k / Math.max(1, rumbles.length - 1)));
      },
    );
    const smashing = createBeats(
      drips,
      (d) => d.lands,
      (d, k) => {
        const t = k / Math.max(1, drips.length - 1);
        cover!.levels(d.bar, levelsFor(d.bar.floor, levelShare, 2), {
          x: d.x,
          y: roof,
        });
        cover!.burst({ x: d.x, y: d.bar.box.y }, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SMASH_SHAKE, t));
      },
    );
    const surging = createBeats(
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
          rumbling.tick(ms, now);
          smashing.tick(ms, now);
          surging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
