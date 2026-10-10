// the "Smoke Rings" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while the clicked floor's button
// puffs fat rolling rings of cash, each a doughnut of coins churning round
// itself like a smoke ring, that sail up the screen swelling as they go;
// every income bar a ring passes jolts with a whoomp and free levels; each
// ring is bigger and quicker than the last, and they stack up near the top,
// still rolling, until the last arrives in a huge blast and shake and they
// all pour into the total. Pays floor income × floor number × REWARD, plus
// the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "smokeRings";
const REWARD = 2;
const RINGS = 4;
const RING_COINS = 220;
const COIN = 0.5;
// each ring's size, the first to the last, growing from GROW_FROM as it rises
const RING: [number, number] = [80, 150];
const GROW_FROM = 0.4;
const TUBE = 0.36;
const TILT = 0.3;
// turns a second the coins roll round the tube
const ROLL = 1.6;
// where the rings park, the first highest, STACK px apart
const PARK = 200;
const STACK = 80;
const PUFF_SHAKE = 0.4;
const PASS_SHAKE: [number, number] = [0.6, 1.4];

export const forceSmokeRingsEvent = registerWispEvent(
  KEY,
  "Smoke Rings",
  () => CONFIG.smokeRingsEvent.chance,
  (floor, context, area) => {
    const { puffsMs, riseMs, levelShare, holdMs, mergeMs } =
      CONFIG.smokeRingsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const midX = (area.left + area.right) / 2;
    let clock = 0;
    const rings = Array.from({ length: RINGS }, (_, k) => {
      const t = k / (RINGS - 1);
      const puffs = clock;
      clock += lerp(puffsMs, t);
      const rise = lerp([riseMs, riseMs * 0.7], t);
      const park = area.top + PARK + STACK * (RINGS - 1 - k);
      return {
        puffs,
        arrives: puffs + rise,
        rise,
        park,
        size: lerp(RING, t),
      };
    });
    const last = rings[RINGS - 1];
    const endAt = last.arrives;
    const travel = endAt + 300;
    const centerAt = (
      ring: (typeof rings)[number],
      ms: number,
      into: Point,
    ) => {
      const u = easeOut(clamp01((ms - ring.puffs) / ring.rise));
      into.x = lerp([button.x, midX], u);
      into.y = lerp([button.y, ring.park], u);
      return u;
    };

    const center: Point = { x: 0, y: 0 };
    const paths: CoinPath[] = rings.flatMap((ring) =>
      Array.from({ length: RING_COINS }, () => {
        const phi = Math.random() * Math.PI * 2;
        const psi = Math.random() * Math.PI * 2;
        return (f: number) => {
          const ms = f * travel;
          if (ms < ring.puffs) return { x: button.x, y: button.y, scale: 0 };
          const u = centerAt(ring, ms, center);
          const grow = GROW_FROM + (1 - GROW_FROM) * u;
          const big = ring.size * grow;
          const tube = big * TUBE;
          // rolling up through the middle and down round the outside
          const spin = psi - ((ms - ring.puffs) / 1000) * ROLL * Math.PI * 2;
          const across = big + tube * Math.cos(spin);
          return {
            x: center.x + across * Math.cos(phi),
            y: center.y - tube * Math.sin(spin) + across * TILT * Math.sin(phi),
            scale: COIN * (0.8 + 0.25 * Math.sin(phi)) * grow,
          };
        };
      }),
    );

    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).filter(
          (b) => b.center.y < button.y - 20 && b.center.y > area.top + PARK,
        )
      : [];
    // a ring's middle passes y once easeOut(u) reaches its share of the climb
    const passes = rings.flatMap((ring, k) =>
      bars
        .map((bar) => {
          const share = (button.y - bar.center.y) / (button.y - ring.park);
          return {
            ring,
            k,
            bar,
            ms: ring.puffs + ring.rise * (1 - Math.sqrt(1 - clamp01(share))),
            share,
          };
        })
        .filter((p) => p.share > 0 && p.share < 1),
    );

    const puffing = createBeats(
      rings,
      (r) => r.puffs,
      () => {
        cover!.burst(button, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(PUFF_SHAKE);
      },
    );
    const passing = createBeats(
      passes,
      (p) => p.ms,
      (p) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 1), button);
        cover!.burst(p.bar.center, 0.4 + 0.1 * p.k);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, p.k / (RINGS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast({ x: midX, y: last.park });
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
          puffing.tick(ms, now);
          passing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
