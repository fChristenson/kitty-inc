// the "Cotton Candy" event (money; crit tiers and cash): it covers its crit,
// whose click freezes the screen while cash spins out of the clicked floor's
// button into a fluffy whirling cloud in the middle of the screen, spun
// round faster and swelling bigger like cotton candy on a stick; then it
// tears apart into puffs that fling off onto the income bars one after
// another, each landing in a flash and a jolt that jumps its bar a crit
// tier, the last in a huge blast and shake. Pays floor income × floor number
// × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "cottonCandy";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 600;
const COIN = 0.5;
const HIGH = 0.4;
const CLOUD = 150;
const FLUFF = 0.18;
// laps a second the cloud spins, from the first coin to tearing apart
const SPIN: [number, number] = [0.4, 1.6];
const JOIN_MS = 260;
const LIFT = 120;
const TEAR_SHAKE = 0.8;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceCottonCandyEvent = registerWispEvent(
  KEY,
  "Cotton Candy",
  () => CONFIG.cottonCandyEvent.chance,
  (floor, context, area) => {
    const { spinMs, puffsMs, flyMs, holdMs, mergeMs } = CONFIG.cottonCandyEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cloud: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HIGH,
    };
    let clock = spinMs;
    const puffs = bars.map((bar, k) => {
      const leaves = clock;
      clock += lerp(puffsMs, k / Math.max(1, bars.length - 1));
      return { bar, leaves };
    });
    const hitsOf = (k: number) => puffs[k].leaves + flyMs;
    const travel = hitsOf(puffs.length - 1) + 40;
    const spinAt = (ms: number) => {
      const t = Math.min(Math.max(0, ms), spinMs) / 1000;
      const span = spinMs / 1000;
      return (
        Math.PI * 2 * (SPIN[0] * t + ((SPIN[1] - SPIN[0]) * t * t) / (2 * span))
      );
    };
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const k = i % puffs.length;
      const puff = puffs[k];
      const r = CLOUD * Math.sqrt(Math.random());
      const a0 = Math.random() * Math.PI * 2;
      const joins = (i / COINS) * spinMs * 0.7;
      const phase = Math.random() * Math.PI * 2;
      const land: Point = {
        x: puff.bar.box.x + Math.random() * puff.bar.box.width,
        y: puff.bar.center.y + (Math.random() - 0.5) * puff.bar.box.height,
      };
      const leaves = puff.leaves + Math.random() * 60;
      const lands = hitsOf(k) - Math.random() * 80;
      const spot: Point = { x: 0, y: 0 };
      const inCloud = (ms: number) => {
        const grow = easeOut(clamp01((ms - joins) / JOIN_MS));
        const rr = r * grow * (1 + FLUFF * Math.sin(ms * 0.01 + phase));
        const a = a0 + spinAt(ms) * (1 - r / (CLOUD * 2));
        spot.x = cloud.x + Math.cos(a) * rr;
        spot.y = cloud.y + Math.sin(a) * rr * 0.8;
        return spot;
      };
      return (f) => {
        const ms = f * travel;
        if (ms < joins) return { x: button.x, y: button.y, scale: 0 };
        if (ms < joins + JOIN_MS) {
          const p = inCloud(ms);
          const u = easeOut((ms - joins) / JOIN_MS);
          return {
            x: lerp([button.x, p.x], u),
            y: lerp([button.y, p.y], u),
            scale: COIN,
          };
        }
        if (ms < leaves) {
          const p = inCloud(ms);
          return { x: p.x, y: p.y, scale: COIN };
        }
        const from = inCloud(leaves);
        const u = clamp01((ms - leaves) / (lands - leaves));
        return {
          x: lerp([from.x, land.x], easeOut(u)),
          y: lerp([from.y, land.y], easeIn(u)) - 4 * LIFT * u * (1 - u),
          scale: COIN,
        };
      };
    });

    const tearing = createBeats(
      [spinMs],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(TEAR_SHAKE);
      },
    );
    const landing = createBeats(
      puffs,
      (_, k) => hitsOf(k),
      (puff, k) => {
        cover!.tierUp(puff.bar, puff.bar.center);
        if (k === puffs.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(puff.bar.center);
          return;
        }
        cover!.burst(puff.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, puffs.length - 1)));
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
        tick: (ms, now) => {
          tearing.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
